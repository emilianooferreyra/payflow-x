import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { RefreshStrategy } from "./strategies/refresh.strategy";
import { UsersModule } from "../users/users.module";
import { HashModule } from "../hash/hash.module";
import { SessionModule } from "../session/session.module";
import { envs } from "../../config";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: envs.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: "15m" },
    }),
    UsersModule,
    HashModule,
    SessionModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RefreshStrategy],
})
export class AuthModule {}
