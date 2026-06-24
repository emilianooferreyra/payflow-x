import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { SessionTokenService } from "./session-token.service";
import { TwoFactorService } from "./two-factor.service";
import { PasswordRecoveryService } from "./password-recovery.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshStrategy } from "./strategies/refresh.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { AppleStrategy } from "./strategies/apple.strategy";
import { TwoFactorPendingStrategy } from "./strategies/two-factor-pending.strategy";
import { GeolocationService } from "./geolocation/geolocation.service";
import { GeolocationListener } from "./geolocation/geolocation.listener";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { HashModule } from "../hash/hash.module";
import { SessionModule } from "../session/session.module";
import { TokensModule } from "../tokens/tokens.module";
import { EmailsModule } from "../emails/emails.module";
import { envs } from "../../config";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
    PrismaModule,
    UsersModule,
    HashModule,
    SessionModule,
    TokensModule,
    EmailsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionTokenService,
    TwoFactorService,
    PasswordRecoveryService,
    JwtStrategy,
    RefreshStrategy,
    GoogleStrategy,
    AppleStrategy,
    TwoFactorPendingStrategy,
    GeolocationService,
    GeolocationListener,
  ],
})
export class AuthModule {}
