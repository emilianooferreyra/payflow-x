import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { PrismaService } from "../../modules/prisma/prisma.service";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // every hour

@Injectable()
export class IdempotencyCleanupService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(IdempotencyCleanupService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap() {
    this.cleanup();
    this.timer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async cleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - TTL_MS);

    try {
      const { count } = await this.prisma.idempotencyRecord.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired idempotency records`);
      }
    } catch (error) {
      this.logger.error(
        "Failed to clean up expired idempotency records",
        error,
      );
    }
  }
}
