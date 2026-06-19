import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "crypto";
import { generateSecret, generateURI, verify as verifyOTP } from "otplib";
import * as QRCode from "qrcode";
import type { Response } from "express";
import { envs } from "../../config";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionTokenService } from "./session-token.service";

const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
export const TRUSTED_DEVICE_COOKIE = "trusted_device";
const TRUSTED_DEVICE_DAYS = 30;

@Injectable()
export class TwoFactorService {
  private readonly rateLimitMap = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly sessionTokenService: SessionTokenService,
  ) {}

  private generateBackupCode(): string {
    return randomBytes(6)
      .toString("base64url")
      .replace(/[-_]/g, "")
      .toUpperCase()
      .slice(0, BACKUP_CODE_LENGTH);
  }

  private async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map((c) => this.hashService.hash(c)));
  }

  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const attempts = this.rateLimitMap.get(userId) ?? [];
    const recent = attempts.filter((t) => now - t < RATE_LIMIT_WINDOW);
    this.rateLimitMap.set(userId, recent);
    return recent.length >= RATE_LIMIT_MAX;
  }

  private recordAttempt(userId: string) {
    const attempts = this.rateLimitMap.get(userId) ?? [];
    attempts.push(Date.now());
    this.rateLimitMap.set(userId, attempts);
  }

  async generateTwoFactor(userId: string) {
    const user = await this.usersService.findOne({ id: userId });
    const secret = generateSecret();
    const uri = generateURI({ issuer: "PayFlow", label: user.email, secret });
    const qrCode = await QRCode.toDataURL(uri);

    await this.usersService.updateTwoFactor(userId, {
      twoFactorSecret: secret,
    });

    return { qrCode, manualEntryKey: secret };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorSecret) {
      throw new BadRequestException("Call /auth/2fa/generate first");
    }

    const { valid } = await verifyOTP({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!valid) throw new UnauthorizedException("Invalid two-factor code");

    await this.usersService.updateTwoFactor(userId, { twoFactorEnabled: true });

    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      codes.push(this.generateBackupCode());
    }

    const hashed = await this.hashBackupCodes(codes);

    await this.prisma.userBackupCode.createMany({
      data: hashed.map((h) => ({ userId, code: h })),
    });

    return {
      message: "Two-factor authentication enabled",
      backupCodes: codes,
    };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor is not enabled");
    }

    const { valid } = await verifyOTP({
      token: code,
      secret: user.twoFactorSecret,
    });
    if (!valid) throw new UnauthorizedException("Invalid two-factor code");

    await this.usersService.updateTwoFactor(userId, {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    });

    await this.prisma.userBackupCode.deleteMany({ where: { userId } });

    return { message: "Two-factor authentication disabled" };
  }

  async verifyTwoFactor(
    userId: string,
    code: string,
    res: Response,
    userAgent?: string,
    ip?: string,
  ) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor is not enabled");
    }

    if (this.isRateLimited(userId)) {
      throw new HttpException(
        "Too many 2FA attempts. Try again in 15 minutes.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.recordAttempt(userId);

    const isBackupCode = code.length === BACKUP_CODE_LENGTH;

    if (isBackupCode) {
      const backupCodes = await this.prisma.userBackupCode.findMany({
        where: { userId, usedAt: null },
      });

      let matched = false;
      for (const bc of backupCodes) {
        const ok = await this.hashService.verify(bc.code, code);
        if (ok) {
          await this.prisma.userBackupCode.update({
            where: { id: bc.id },
            data: { usedAt: new Date() },
          });
          matched = true;
          break;
        }
      }

      if (!matched) throw new UnauthorizedException("Invalid backup code");
    } else {
      const { valid } = await verifyOTP({
        token: code,
        secret: user.twoFactorSecret,
      });
      if (!valid) throw new UnauthorizedException("Invalid two-factor code");
    }

    res.clearCookie("two_factor_pending");
    await this.sessionTokenService.createSessionWithTokens(
      user.id,
      res,
      userAgent,
      ip,
    );

    const isProd = process.env.NODE_ENV === "production";
    const trustedToken = this.jwtService.sign(
      { sub: userId },
      { secret: envs.JWT_REFRESH_SECRET, expiresIn: `${TRUSTED_DEVICE_DAYS}d` },
    );

    res.cookie(TRUSTED_DEVICE_COOKIE, trustedToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
    });

    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async regenerateBackupCodes(userId: string) {
    await this.prisma.userBackupCode.deleteMany({ where: { userId } });

    const codes: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      codes.push(this.generateBackupCode());
    }

    const hashed = await this.hashBackupCodes(codes);

    await this.prisma.userBackupCode.createMany({
      data: hashed.map((h) => ({ userId, code: h })),
    });

    return { backupCodes: codes };
  }
}
