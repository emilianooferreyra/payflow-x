import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { envs } from "../../../config";
import { SessionService } from "../../session/session.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(private readonly sessionService: SessionService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.access_token ?? null,
      ]),
      secretOrKey: envs.JWT_ACCESS_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; sessionId: string }) {
    const session = await this.sessionService.findOne({
      id: payload.sessionId,
      userId: payload.sub,
    });

    if (!session || !session.isActive) {
      throw new UnauthorizedException("Session expired or revoked");
    }

    return { userId: payload.sub, sessionId: payload.sessionId };
  }
}
