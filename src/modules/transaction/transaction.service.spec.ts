import { NotFoundException } from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import { mockPrisma, createTestingModule } from "../../common/testing";

describe("TransactionService", () => {
  let service: TransactionService;

  beforeEach(async () => {
    const module = await createTestingModule([TransactionService]);
    service = module.get<TransactionService>(TransactionService);
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return paginated transactions", async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([{ id: "wallet-1" }]);
      mockPrisma.transaction.findMany.mockResolvedValue([
        {
          id: "tx-1",
          walletId: "wallet-1",
          type: "DEPOSIT",
          amount: 500,
          status: "COMPLETED",
          createdAt: new Date(),
          wallet: { currency: "ARS" },
          toWallet: null,
        },
      ]);
      mockPrisma.transaction.count.mockResolvedValue(1);

      const result = await service.findAll({
        userId: "user-1",
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it("should filter by transaction type", async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([{ id: "wallet-1" }]);
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockPrisma.transaction.count.mockResolvedValue(0);

      await service.findAll({
        userId: "user-1",
        page: 1,
        limit: 10,
        type: "DEPOSIT",
      });

      expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: "DEPOSIT" }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("should return a transaction if found", async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([{ id: "wallet-1" }]);
      mockPrisma.transaction.findFirst.mockResolvedValue({
        id: "tx-1",
        walletId: "wallet-1",
        type: "DEPOSIT",
        amount: 500,
        status: "COMPLETED",
        createdAt: new Date(),
        wallet: { currency: "ARS" },
        toWallet: null,
      });

      const result = await service.findOne("tx-1", "user-1");

      expect(result.id).toBe("tx-1");
    });

    it("should throw NotFoundException if not found", async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([{ id: "wallet-1" }]);
      mockPrisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findOne("invalid", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
