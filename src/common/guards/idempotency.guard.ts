import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ConflictException, Logger } from "@nestjs/common";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { PrismaService } from "../../modules/prisma/prisma.service";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class IdempotencyGuard implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers["idempotency-key"];

    if (!key) return next.handle();

    const cached = await this.prisma.idempotencyRecord.findUnique({ where: { key } });

    if (cached) {
      const age = Date.now() - cached.createdAt.getTime();

      if (age > TTL_MS) {
        // Expired — delete and treat as miss
        await this.prisma.idempotencyRecord
          .delete({ where: { key } })
          .catch(() => {});
        this.logger.warn(`Expired idempotency key reused: ${key}`);
      } else {
        const response = context.switchToHttp().getResponse();
        response.status(cached.statusCode);
        return of(cached.response);
      }
    }

    return next.handle().pipe(
      tap(async (data) => {
        const response = context.switchToHttp().getResponse();
        try {
          await this.prisma.idempotencyRecord.create({
            data: {
              key,
              userId: request.user?.userId ?? "",
              route: request.route?.path ?? request.url,
              response: data,
              statusCode: response.statusCode,
            },
          });
        } catch {
          // Unique constraint violation — another request already cached this key
        }
      }),
    );
  }
}
