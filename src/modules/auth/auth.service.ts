import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

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
import type { Request, Response } from "express";
import type { GoogleUser } from "./strategies/google.strategy";
import type { AppleUser } from "./strategies/apple.strategy";

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

  async register(dto: RegisterDto, res: Response, userAgent?: string, ip?: string) {
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
    res: Response,
    req?: Request,
    userAgent?: string,
    ip?: string,
  ) {
    const user = await this.usersService.findOne({ email: dto.email });

    if (!user.password) {
      throw new UnauthorizedException(
        "No password set. Sign in with your OAuth provider or use 'Forgot Password' to set one.",
      );
    }

    const isValid = await this.hashService.verify(user.password, dto.password);
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

  async refresh(userId: string, sessionId: string, version: number, refreshToken: string, res: Response) {
    try {
      const session = await this.sessionService
        .findOne({ id: sessionId, userId })
        .catch((err) => {
          this.logger.error(`Session lookup failed for ${sessionId}: ${(err as Error).message}`);
          return null;
        });

      if (!session || !session.isActive) {
        throw new UnauthorizedException("Session invalid or inactive");
      }

      const isHashValid = await this.hashService.verify(
        session.refreshToken,
        refreshToken,
      );

      if (!isHashValid) {
        await this.sessionService.delete({ id: sessionId, userId }).catch(() => null);
        this.sessionTokenService.clearTokenCookies(res);
        this.logger.warn(
          `Invalid refresh token hash — session ${sessionId} terminated for user ${userId}`,
        );
        throw new UnauthorizedException("Invalid refresh token credentials. Session revoked.");
      }

      if (session.refreshTokenVersion !== version) {
        const withinGrace = Date.now() - session.lastUsedAt.getTime() <= envs.REFRESH_GRACE_PERIOD_MS;

        if (withinGrace) {
          this.logger.warn(
            `Version mismatch within grace period (likely network retry) for session ${sessionId}`,
          );
          throw new UnauthorizedException("Concurrent request in progress. Retry syncing.");
        }

        this.logger.error(
          `CRITICAL: Token reuse outside grace period for session ${sessionId} — user ${userId}`,
        );
        await this.sessionService.delete({ id: sessionId, userId }).catch(() => null);
        this.sessionTokenService.clearTokenCookies(res);
        throw new UnauthorizedException("Security breach suspected. Session revoked.");
      }

      const nextVersion = version + 1;
      const tokens = await this.sessionTokenService.generateTokens(
        userId,
        sessionId,
        nextVersion,
      );
      const hashedRefresh = await this.hashService.hash(tokens.refreshToken);

      await this.sessionService.update({
        id: sessionId,
        userId,
        refreshToken: hashedRefresh,
        refreshTokenVersion: nextVersion,
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

  async googleLogin(googleUser: GoogleUser, res: Response, userAgent?: string, ip?: string) {
    return this.oauthLogin(
      { email: googleUser.email, name: googleUser.name, lastName: googleUser.lastName, avatar: googleUser.avatar },
      AuthProviderEnum.GOOGLE,
      res,
      userAgent,
      ip,
    );
  }

  async appleLogin(appleUser: AppleUser, res: Response, userAgent?: string, ip?: string) {
    return this.oauthLogin(
      { email: appleUser.email, name: appleUser.name, lastName: appleUser.lastName },
      AuthProviderEnum.APPLE,
      res,
      userAgent,
      ip,
    );
  }

  private async oauthLogin(
    oauthUser: { email: string; name?: string; lastName?: string; avatar?: string },
    provider: AuthProviderEnum,
    res: Response,
    userAgent?: string,
    ip?: string,
  ) {
    try {
      const existingUser = await this.usersService
        .findOne({ email: oauthUser.email })
        .catch(() => null);

      let userId: string;

      if (!existingUser) {
        const newUser = await this.usersService.create({
          email: oauthUser.email,
          name: oauthUser.name,
          lastName: oauthUser.lastName,
          avatar: oauthUser.avatar,
          authProvider: provider,
          emailConfirm: true,
        });
        userId = newUser.id;
      } else {
        userId = existingUser.id;
      }

      await this.sessionTokenService.createSessionWithTokens(userId, res, userAgent, ip);

      return {
        user: {
          id: userId,
          email: oauthUser.email,
          name: existingUser ? existingUser.name : oauthUser.name,
        },
      };
    } catch (error) {
      const providerName = provider.toLowerCase();
      this.logger.warn(`${providerName} login failed: ${(error as Error).message}`);
      throw new BadRequestException(`There was an error with ${providerName} login.`);
    }
  }

  async logout(userId: string, sessionId: string, res: Response) {
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
