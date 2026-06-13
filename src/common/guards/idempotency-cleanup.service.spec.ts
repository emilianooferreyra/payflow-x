import { Test } from "@nestjs/testing";
import { IdempotencyCleanupService } from "./idempotency-cleanup.service";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { mockPrisma } from "../testing";

describe("IdempotencyCleanupService", () => {
  let service: IdempotencyCleanupService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        IdempotencyCleanupService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<IdempotencyCleanupService>(IdempotencyCleanupService);
  });

  describe("cleanup", () => {
    it("should delete records older than 24 hours", async () => {
      mockPrisma.idempotencyRecord.deleteMany.mockResolvedValue({ count: 5 });

      await service.cleanup();

      expect(mockPrisma.idempotencyRecord.deleteMany).toHaveBeenCalledTimes(1);

      const callArg =
        mockPrisma.idempotencyRecord.deleteMany.mock.calls[0][0];
      expect(callArg.where.createdAt.lt).toBeInstanceOf(Date);

      // Verify the cutoff is approximately 24h ago
      const cutoff = callArg.where.createdAt.lt.getTime();
      const now = Date.now();
      const diffHours = (now - cutoff) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThanOrEqual(23);
      expect(diffHours).toBeLessThanOrEqual(25);
    });

    it("should handle no expired records gracefully", async () => {
      mockPrisma.idempotencyRecord.deleteMany.mockResolvedValue({ count: 0 });

      // Should not throw
      await service.cleanup();
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.idempotencyRecord.deleteMany.mockRejectedValue(
        new Error("Connection lost"),
      );

      // Should not throw
      await service.cleanup();
    });

    it("should run cleanup immediately on application bootstrap", () => {
      jest.spyOn(service, "cleanup");
      jest.spyOn(global, "setInterval");

      service.onApplicationBootstrap();

      expect(service.cleanup).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60 * 60 * 1000,
      );

      // Clean up the interval to avoid test leaks
      (service as any).onApplicationShutdown();
    });
  });
});
