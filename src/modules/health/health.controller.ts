import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { HealthCheckService, HealthCheck } from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { RedisHealthIndicator } from "./redis-health.indicator";

// Probes are polled by Docker and orchestrators from a single address, so they
// must not consume the per-IP rate limit that protects the public API.
@ApiTags("Health")
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  // Liveness: "should this process be restarted?". It deliberately checks no
  // dependency — restarting the API because Redis is down does not fix Redis.
  @Get("live")
  @ApiOperation({ summary: "Liveness probe (process only, no dependencies)" })
  live() {
    return Promise.resolve({ status: "ok" });
  }

  // Readiness: "should traffic be sent here?".
  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Readiness probe (database and Redis)" })
  ready() {
    return this.health.check([
      () => this.prisma.isHealthy("database"),
      () => this.redis.isHealthy("redis"),
    ]);
  }

  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: "Deprecated alias of /health/ready",
    deprecated: true,
  })
  check() {
    return this.ready();
  }
}
