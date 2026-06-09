import { ApiCookieAuth, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyTwoFactorDto } from "./dto/verify-2fa.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshTokenGuard } from "./guards/refresh-token.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { TwoFactorPendingGuard } from "./guards/two-factor-pending.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@ApiTags("Auth")
@ApiCookieAuth()
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.register(
      dto,
      res,
      req.headers["user-agent"],
      req.ip,
    );
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, res, req.headers["user-agent"], req.ip);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @CurrentUser()
    user: { userId: string; sessionId: string; refreshToken: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.refresh(
      user.userId,
      user.sessionId,
      user.refreshToken,
      res,
    );
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async logout(
    @CurrentUser() user: { userId: string; sessionId: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.userId, user.sessionId, res);
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("verify-otp")
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.password);
  }

  @Post("2fa/generate")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async generate2FA(@CurrentUser() user: { userId: string }) {
    return this.authService.generateTwoFactor(user.userId);
  }

  @Post("2fa/enable")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async enable2FA(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.authService.enableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/disable")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async disable2FA(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyTwoFactorDto,
  ) {
    return this.authService.disableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TwoFactorPendingGuard)
  async verify2FA(
    @CurrentUser() user: { userId: string },
    @Body() dto: VerifyTwoFactorDto,
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.verifyTwoFactor(
      user.userId,
      dto.code,
      res,
      req.headers["user-agent"],
      req.ip,
    );
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(
    @CurrentUser() user: any,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    await this.authService.googleLogin(
      user,
      res,
      req.headers["user-agent"],
      req.ip,
    );
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";
    return res.redirect(`${frontendUrl}/dashboard`);
  }
}
