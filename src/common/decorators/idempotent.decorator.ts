import { UseInterceptors, applyDecorators } from "@nestjs/common";
import { IdempotencyGuard } from "../guards/idempotency.guard";

export function Idempotent() {
  return applyDecorators(UseInterceptors(IdempotencyGuard));
}
