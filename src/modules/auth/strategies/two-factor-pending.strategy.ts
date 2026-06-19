import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { envs } from "../../../config";

@Injectable()
export class TwoFactorPendingStrategy extends PassportStrategy(
  Strategy,
  "two-factor-pending",
) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.two_factor_pending ?? null,
      ]),
      secretOrKey: envs.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; type: "2fa_pending" }) {
    return { userId: payload.sub };
  }
}
