import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes, randomUUID } from "crypto";
import { generateSecret, generateURI, verify as verifyOTP } from "otplib";
import * as QRCode from "qrcode";
import { envs } from "../../config";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
import { TokensService } from "../tokens/tokens.service";
import { EmailsService } from "../emails/emails.service";
import { AuthorizationTokenEnum } from "../../common/enums/authorization-token.enum";
import { AuthProviderEnum } from "../../generated/prisma/enums.js";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { Request } from "express";

const BACKUP_CODE_LENGTH = 8;
const BACKUP_CODE_COUNT = 10;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000;
const TRUSTED_DEVICE_COOKIE = "trusted_device";
const TRUSTED_DEVICE_DAYS = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly rateLimitMap = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
    private readonly tokensService: TokensService,
    private readonly emailsService: EmailsService,
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

  private async generateTokens(userId: string, sessionId: string) {
    const payload = { sub: userId, sessionId };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: envs.JWT_REFRESH_SECRET,
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  private setTokenCookies(res, accessToken: string, refreshToken: string) {
    const isProd = process.env.NODE_ENV === "production";

    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearTokenCookies(res) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
  }

  private async createSessionWithTokens(
    userId: string,
    res,
    userAgent?: string,
    ip?: string,
  ) {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const session = await this.sessionService.create({
        userId,
        refreshToken: "pending",
        userAgent,
        ipAddress: ip,
        expiresAt,
      });

      const tokens = await this.generateTokens(userId, session.id);
      const hashedRefresh = await this.hashService.hash(tokens.refreshToken);

      await this.sessionService.update({
        id: session.id,
        userId,
        refreshToken: hashedRefresh,
      });

      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      return session;
    } catch (error) {
      this.logger.warn(
        `Session creation failed for user ${userId}: ${(error as Error).message}`,
      );
      throw new BadRequestException("There was an error creating the session.");
    }
  }

  async register(dto: RegisterDto, res, userAgent?: string, ip?: string) {
    const user = await this.usersService.create(dto);
    await this.createSessionWithTokens(user.id, res, userAgent, ip);
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(
    dto: LoginDto,
    res,
    req?: Request,
    userAgent?: string,
    ip?: string,
  ) {
    const user = await this.usersService.findOne({ email: dto.email });

    const isValid = await this.hashService.verify(user.password!, dto.password);
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    if (user.twoFactorEnabled) {
      const isTrusted = req?.cookies?.[TRUSTED_DEVICE_COOKIE];
      if (isTrusted) {
        try {
          this.jwtService.verify(isTrusted, { secret: envs.JWT_REFRESH_SECRET });
          await this.createSessionWithTokens(user.id, res, userAgent, ip);
          return { user: { id: user.id, email: user.email, name: user.name } };
        } catch {}
      }

      const pendingToken = this.jwtService.sign(
        { sub: user.id, type: "2fa_pending" },
        { expiresIn: "5m" },
      );

      const isProd = process.env.NODE_ENV === "production";
      res.cookie("two_factor_pending", pendingToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: 5 * 60 * 1000,
      });

      return { requiresTwoFactor: true };
    }

    await this.createSessionWithTokens(user.id, res, userAgent, ip);
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async refresh(userId: string, sessionId: string, refreshToken: string, res) {
    try {
      const session = await this.sessionService.findOne({
        id: sessionId,
        userId,
      });

      const isValid = await this.hashService.verify(
        session.refreshToken,
        refreshToken,
      );
      if (!isValid) throw new UnauthorizedException("Invalid refresh token");

      const tokens = await this.generateTokens(userId, sessionId);
      const hashedRefresh = await this.hashService.hash(tokens.refreshToken);

      await this.sessionService.update({
        id: sessionId,
        userId,
        refreshToken: hashedRefresh,
      });
      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      return { message: "Tokens refreshed" };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.warn(
        `Token refresh failed for user ${userId}: ${(error as Error).message}`,
      );
      throw new BadRequestException("There was an error refreshing tokens.");
    }
  }

  async googleLogin(googleUser: any, res, userAgent?: string, ip?: string) {
    try {
      const existing = await this.usersService
        .findOne({ email: googleUser.email })
        .catch(() => null);

      if (!existing) {
        await this.usersService.create({
          email: googleUser.email,
          password: await this.hashService.hash(randomUUID()),
          name: googleUser.name,
          lastName: googleUser.lastName,
          avatar: googleUser.avatar,
          authProvider: AuthProviderEnum.GOOGLE,
          emailConfirm: true,
        });
      }

      const user = await this.usersService.findOne({ email: googleUser.email });

      await this.createSessionWithTokens(user.id, res, userAgent, ip);

      return { user: { id: user.id, email: user.email, name: user.name } };
    } catch (error) {
      this.logger.warn(`Google login failed: ${(error as Error).message}`);
      throw new BadRequestException("There was an error with Google login.");
    }
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
    res,
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
    await this.createSessionWithTokens(user.id, res, userAgent, ip);

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

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne({ email }).catch(() => null);

    if (user) {
      const code = await this.tokensService.generateToken({
        userId: user.id,
        type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
        ttl: 600000,
      });

      await this.emailsService.sendEmail({
        to: email,
        subject: "PayFlow — Recuperación de contraseña",
        html: `<p>Tu código de recuperación es: <strong>${code}</strong></p><p>Expira en 10 minutos.</p>`,
      });
    }

    return { message: "If the email exists, you will receive a recovery code" };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.usersService.findOne({ email });

    await this.tokensService.validateToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
      token: code,
    });

    return { valid: true };
  }

  async resetPassword(email: string, code: string, password: string) {
    const user = await this.usersService.findOne({ email });

    await this.tokensService.validateToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
      token: code,
    });

    await this.usersService.update({ id: user.id, password });
    await this.tokensService.revokeToken({
      userId: user.id,
      type: AuthorizationTokenEnum.RECOVERY_PASSWORD,
    });

    return { message: "Password updated successfully" };
  }

  async logout(userId: string, sessionId: string, res) {
    try {
      await this.sessionService.delete({ id: sessionId, userId });
      this.clearTokenCookies(res);
      return { message: "Logged out successfully" };
    } catch (error) {
      this.logger.warn(
        `Logout failed for user ${userId}: ${(error as Error).message}`,
      );
      throw new BadRequestException("There was an error logging out.");
    }
  }
}
