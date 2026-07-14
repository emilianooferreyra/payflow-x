import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import { Reflector } from "@nestjs/core";
import { doubleCsrf } from "csrf-csrf";
import { envs } from "../../config";
import { SKIP_CSRF_KEY } from "../decorators/skip-csrf.decorator";

const { validateRequest, generateCsrfToken } = doubleCsrf({
  getSecret: () => envs.CSRF_SECRET,
  getSessionIdentifier: (req) => req.ip ?? "unknown",
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  },
});

export { generateCsrfToken };

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (!envs.CSRF_ENABLED) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<Request>();

    // CSRF protege mutaciones (double-submit); los métodos seguros no
    // cambian estado y validarlos rompe navegaciones y GETs sin header.
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;

    if (!validateRequest(req)) {
      throw new ForbiddenException("Invalid CSRF token");
    }

    return true;
  }
}
