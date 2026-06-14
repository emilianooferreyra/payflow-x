import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from "@nestjs/terminus";
import { createClient } from "redis";
import { envs } from "../../config";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const client = createClient({ url: envs.REDIS_URL });
    try {
      await client.connect();
      await client.ping();
      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        "Redis health check failed",
        this.getStatus(key, false, { message: (error as Error).message }),
      );
    } finally {
      await client.disconnect().catch(() => {});
    }
  }
}
