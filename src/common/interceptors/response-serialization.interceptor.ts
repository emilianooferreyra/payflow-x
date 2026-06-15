import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

function isPaginatedResponse(
  data: unknown,
): data is { data: unknown[]; meta: Record<string, unknown> } {
  return (
    data !== null &&
    typeof data === "object" &&
    "data" in data &&
    Array.isArray((data as Record<string, unknown>).data) &&
    "meta" in data &&
    typeof (data as Record<string, unknown>).meta === "object"
  );
}

@Injectable()
export class ResponseSerializationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (isPaginatedResponse(data)) {
          return {
            ...data,
            meta: { ...data.meta, timestamp: new Date().toISOString() },
          };
        }

        return {
          data,
          meta: { timestamp: new Date().toISOString() },
        };
      }),
    );
  }
}
