import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { envs } from "../../config";
import { UsersService } from "../users/users.service";
import { HashService } from "../hash/hash.service";
import { SessionService } from "../session/session.service";
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
