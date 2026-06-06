import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { generateSecret, generateURI, verify as verifyOTP } from "otplib";
import * as QRCode from "qrcode";
import { envs } from "../../config";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
import { AuthProviderEnum } from "../../generated/prisma/enums.js";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly sessionService: SessionService,
    private readonly jwtService: JwtService,
  ) {}

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

  private async createSessionWithTokens(userId: string, res, userAgent?: string, ip?: string) {
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
      throw new BadRequestException("There was an error creating the session.");
    }
  }

  async register(dto: RegisterDto, res, userAgent?: string, ip?: string) {
    const user = await this.usersService.create(dto);
    await this.createSessionWithTokens(user.id, res, userAgent, ip);
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async login(dto: LoginDto, res, userAgent?: string, ip?: string) {
    const user = await this.usersService.findOne({ email: dto.email });

    const isValid = await this.hashService.verify(user.password!, dto.password);
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    if (user.twoFactorEnabled) {
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
      const session = await this.sessionService.findOne({ id: sessionId, userId });

      const isValid = await this.hashService.verify(session.refreshToken, refreshToken);
      if (!isValid) throw new UnauthorizedException("Invalid refresh token");

      const tokens = await this.generateTokens(userId, sessionId);
      const hashedRefresh = await this.hashService.hash(tokens.refreshToken);

      await this.sessionService.update({ id: sessionId, userId, refreshToken: hashedRefresh });
      this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

      return { message: "Tokens refreshed" };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new BadRequestException("There was an error refreshing tokens.");
    }
  }

  async googleLogin(googleUser: any, res, userAgent?: string, ip?: string) {
    try {
      const existing = await this.usersService.findOne({ email: googleUser.email }).catch(() => null);

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
      throw new BadRequestException("There was an error with Google login.");
    }
  }

  async generateTwoFactor(userId: string) {
    const user = await this.usersService.findOne({ id: userId });
    const secret = generateSecret();
    const uri = generateURI({ issuer: "PayFlow", label: user.email, secret });
    const qrCode = await QRCode.toDataURL(uri);

    await this.usersService.updateTwoFactor(userId, { twoFactorSecret: secret });

    return { qrCode, manualEntryKey: secret };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorSecret) {
      throw new BadRequestException("Call /auth/2fa/generate first");
    }

    const { valid } = await verifyOTP({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException("Invalid two-factor code");

    await this.usersService.updateTwoFactor(userId, { twoFactorEnabled: true });
    return { message: "Two-factor authentication enabled" };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor is not enabled");
    }

    const { valid } = await verifyOTP({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException("Invalid two-factor code");

    await this.usersService.updateTwoFactor(userId, { twoFactorEnabled: false, twoFactorSecret: null });
    return { message: "Two-factor authentication disabled" };
  }

  async verifyTwoFactor(userId: string, code: string, res, userAgent?: string, ip?: string) {
    const user = await this.usersService.findOne({ id: userId });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("Two-factor is not enabled");
    }

    const { valid } = await verifyOTP({ token: code, secret: user.twoFactorSecret });
    if (!valid) throw new UnauthorizedException("Invalid two-factor code");

    res.clearCookie("two_factor_pending");
    await this.createSessionWithTokens(user.id, res, userAgent, ip);

    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async logout(userId: string, sessionId: string, res) {
    try {
      await this.sessionService.delete({ id: sessionId, userId });
      this.clearTokenCookies(res);
      return { message: "Logged out successfully" };
    } catch (error) {
      throw new BadRequestException("There was an error logging out.");
    }
  }
}
