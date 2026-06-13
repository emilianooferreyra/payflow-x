import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";
import { envs } from "../../config";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
import { AuthProviderEnum } from "../../generated/prisma/enums.js";
import { SessionTokenService } from "./session-token.service";
import { TwoFactorService, TRUSTED_DEVICE_COOKIE } from "./two-factor.service";
import { PasswordRecoveryService } from "./password-recovery.service";
import type { RegisterDto } from "./dto/register.dto";
import type { LoginDto } from "./dto/login.dto";
import type { Request } from "express";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly sessionTokenService: SessionTokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
  ) {}

  async register(dto: RegisterDto, res, userAgent?: string, ip?: string) {
    const user = await this.usersService.create(dto);
    await this.sessionTokenService.createSessionWithTokens(
      user.id,
      res,
      userAgent,
      ip,
    );
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

    const isValid = await this.hashService.verify(
      user.password!,
      dto.password,
    );
    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    if (user.twoFactorEnabled) {
      const isTrusted = req?.cookies?.[TRUSTED_DEVICE_COOKIE];
      if (isTrusted) {
        try {
          this.jwtService.verify(isTrusted, {
            secret: envs.JWT_REFRESH_SECRET,
          });
          await this.sessionTokenService.createSessionWithTokens(
            user.id,
            res,
            userAgent,
            ip,
          );
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

    await this.sessionTokenService.createSessionWithTokens(
      user.id,
      res,
      userAgent,
      ip,
    );
    return { user: { id: user.id, email: user.email, name: user.name } };
  }

  async refresh(
    userId: string,
    sessionId: string,
    refreshToken: string,
    res,
  ) {
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

      const tokens = await this.sessionTokenService.generateTokens(
        userId,
        sessionId,
      );
      const hashedRefresh = await this.hashService.hash(tokens.refreshToken);

      await this.sessionService.update({
        id: sessionId,
        userId,
        refreshToken: hashedRefresh,
      });
      this.sessionTokenService.setTokenCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
      );

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

      const user = await this.usersService.findOne({
        email: googleUser.email,
      });

      await this.sessionTokenService.createSessionWithTokens(
        user.id,
        res,
        userAgent,
        ip,
      );

      return { user: { id: user.id, email: user.email, name: user.name } };
    } catch (error) {
      this.logger.warn(`Google login failed: ${(error as Error).message}`);
      throw new BadRequestException("There was an error with Google login.");
    }
  }

  async logout(userId: string, sessionId: string, res) {
    try {
      await this.sessionService.delete({ id: sessionId, userId });
      this.sessionTokenService.clearTokenCookies(res);
      return { message: "Logged out successfully" };
    } catch (error) {
      this.logger.warn(
        `Logout failed for user ${userId}: ${(error as Error).message}`,
      );
      throw new BadRequestException("There was an error logging out.");
    }
  }

  async generateTwoFactor(userId: string) {
    return this.twoFactorService.generateTwoFactor(userId);
  }

  async enableTwoFactor(userId: string, code: string) {
    return this.twoFactorService.enableTwoFactor(userId, code);
  }

  async disableTwoFactor(userId: string, code: string) {
    return this.twoFactorService.disableTwoFactor(userId, code);
  }

  async verifyTwoFactor(
    userId: string,
    code: string,
    res,
    userAgent?: string,
    ip?: string,
  ) {
    return this.twoFactorService.verifyTwoFactor(
      userId,
      code,
      res,
      userAgent,
      ip,
    );
  }

  async regenerateBackupCodes(userId: string) {
    return this.twoFactorService.regenerateBackupCodes(userId);
  }

  async forgotPassword(email: string) {
    return this.passwordRecoveryService.forgotPassword(email);
  }

  async verifyOtp(email: string, code: string) {
    return this.passwordRecoveryService.verifyOtp(email, code);
  }

  async resetPassword(email: string, code: string, password: string) {
    return this.passwordRecoveryService.resetPassword(email, code, password);
  }
}
