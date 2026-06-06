import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { VerifyTwoFactorDto } from "./dto/verify-2fa.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RefreshTokenGuard } from "./guards/refresh-token.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { TwoFactorPendingGuard } from "./guards/two-factor-pending.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res, @Request() req) {
    return this.authService.register(dto, res, req.headers["user-agent"], req.ip);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res, @Request() req) {
    return this.authService.login(dto, res, req.headers["user-agent"], req.ip);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async refresh(@CurrentUser() user, @Res({ passthrough: true }) res) {
    return this.authService.refresh(user.userId, user.sessionId, user.refreshToken, res);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user, @Res({ passthrough: true }) res) {
    return this.authService.logout(user.userId, user.sessionId, res);
  }

  @Post("2fa/generate")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async generate2FA(@CurrentUser() user) {
    return this.authService.generateTwoFactor(user.userId);
  }

  @Post("2fa/enable")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async enable2FA(@CurrentUser() user, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.enableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/disable")
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async disable2FA(@CurrentUser() user, @Body() dto: VerifyTwoFactorDto) {
    return this.authService.disableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(TwoFactorPendingGuard)
  async verify2FA(@CurrentUser() user, @Body() dto: VerifyTwoFactorDto, @Res({ passthrough: true }) res, @Request() req) {
    return this.authService.verifyTwoFactor(user.userId, dto.code, res, req.headers["user-agent"], req.ip);
  }

  @Get("google")
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@CurrentUser() user, @Res({ passthrough: true }) res, @Request() req) {
    return this.authService.googleLogin(user, res, req.headers["user-agent"], req.ip);
  }
}
