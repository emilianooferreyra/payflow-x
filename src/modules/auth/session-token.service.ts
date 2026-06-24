import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Response } from "express";
import { envs } from "../../config";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";

@Injectable()
export class SessionTokenService {
  private readonly logger = new Logger(SessionTokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly hashService: HashService,
    private readonly sessionService: SessionService,
  ) {}

  async generateTokens(userId: string, sessionId: string, version: number) {
    const payload = { sub: userId, sessionId, version };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: envs.JWT_REFRESH_SECRET,
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
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

  clearTokenCookies(res: Response) {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
  }

  async createSessionWithTokens(
    userId: string,
    res: Response,
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

      const tokens = await this.generateTokens(userId, session.id, 0);
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
}
