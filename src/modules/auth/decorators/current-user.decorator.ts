import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  userId: string;
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  <T = AuthenticatedUser>(data: keyof T | undefined, ctx: ExecutionContext): T[keyof T] | T => {
    const request = ctx.switchToHttp().getRequest();
    if (data) return request.user?.[data];
    return request.user ?? ({} as T);
  },
);
