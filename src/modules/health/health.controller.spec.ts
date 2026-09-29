import { ServiceUnavailableException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HealthCheckError, TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { RedisHealthIndicator } from "./redis-health.indicator";

// The real Terminus module is used on purpose: the 200/503 semantics belong to
// Terminus, and mocking HealthCheckService would only prove our own mock.
describe("HealthController", () => {
  let controller: HealthController;
  const prisma = { isHealthy: jest.fn() };
  const redis = { isHealthy: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.isHealthy.mockResolvedValue({ database: { status: "up" } });
    redis.isHealthy.mockResolvedValue({ redis: { status: "up" } });

    const module: TestingModule = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [
        { provide: PrismaHealthIndicator, useValue: prisma },
        { provide: RedisHealthIndicator, useValue: redis },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  describe("live", () => {
    it("stays green when the dependencies are down and never calls them", async () => {
      prisma.isHealthy.mockRejectedValue(new Error("database down"));
      redis.isHealthy.mockRejectedValue(new Error("redis down"));

      await expect(controller.live()).resolves.toEqual({ status: "ok" });

      expect(prisma.isHealthy).not.toHaveBeenCalled();
      expect(redis.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe("ready", () => {
    it("reports database and redis as up when both answer", async () => {
      const result = await controller.ready();

      expect(result.status).toBe("ok");
      expect(result.info).toEqual({
        database: { status: "up" },
        redis: { status: "up" },
      });
      expect(prisma.isHealthy).toHaveBeenCalledWith("database");
      expect(redis.isHealthy).toHaveBeenCalledWith("redis");
    });

    it("fails with 503 and reports redis as down when redis is unreachable", async () => {
      redis.isHealthy.mockRejectedValue(
        new HealthCheckError("Redis health check failed", {
          redis: { status: "down" },
        }),
      );

      const failure = await controller.ready().catch((e: unknown) => e);

      expect(failure).toBeInstanceOf(ServiceUnavailableException);
      const body = (failure as ServiceUnavailableException).getResponse();
      expect(body).toMatchObject({
        status: "error",
        error: { redis: { status: "down" } },
        info: { database: { status: "up" } },
      });
    });
  });

  describe("check (deprecated alias)", () => {
    it("runs the same checks as ready", async () => {
      await controller.check();

      expect(prisma.isHealthy).toHaveBeenCalledWith("database");
      expect(redis.isHealthy).toHaveBeenCalledWith("redis");
    });
  });
});
