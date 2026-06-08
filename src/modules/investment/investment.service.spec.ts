import { NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { InvestmentService } from "./investment.service";
import { mockPrisma, createTestingModule, makeWallet } from "../../common/testing";

describe("InvestmentService", () => {
  let service: InvestmentService;

  beforeEach(async () => {
    const module = await createTestingModule([InvestmentService]);
    service = module.get<InvestmentService>(InvestmentService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
  });

  describe("getAssets", () => {
    it("should return all assets ordered by symbol", async () => {
      const assets = [
        { id: "asset-1", symbol: "AAPL", name: "Apple", type: "STOCK", currentPrice: 150, dailyChange: 0, logoUrl: null, updatedAt: new Date() },
        { id: "asset-2", symbol: "MSFT", name: "Microsoft", type: "STOCK", currentPrice: 300, dailyChange: 0, logoUrl: null, updatedAt: new Date() },
      ];
      mockPrisma.asset.findMany.mockResolvedValue(assets);

      const result = await service.getAssets();

      expect(result).toEqual(assets);
    });
  });

  describe("getPortfolio", () => {
    it("should return portfolio with summary for a user", async () => {
      mockPrisma.investment.findMany.mockResolvedValue([
        {
          id: "inv-1",
          userId: "user-1",
          assetId: "asset-1",
          quantity: 10,
          avgBuyPrice: 100,
          currentValue: 1500,
          createdAt: new Date(),
          updatedAt: new Date(),
          asset: { symbol: "AAPL", name: "Apple" },
        },
      ]);

      const result = await service.getPortfolio("user-1");

      expect(result.investments).toHaveLength(1);
      expect(result.summary.totalValue).toBe(1500);
    });
  });

  describe("buy", () => {
    it("should buy an asset and create a new investment", async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({
        id: "asset-1",
        symbol: "AAPL",
        currentPrice: 150,
      });
      mockPrisma.wallet.findUnique.mockResolvedValue(makeWallet({ balance: 10000, currency: "USD" }));
      mockPrisma.investment.findUnique.mockResolvedValue(null);
      mockPrisma.investment.create.mockResolvedValue({
        id: "inv-1",
        userId: "user-1",
        assetId: "asset-1",
        quantity: 6.66666667,
        avgBuyPrice: 150,
        currentValue: 1000,
        asset: { symbol: "AAPL" },
      });

      const result = await service.buy({
        userId: "user-1",
        assetId: "asset-1",
        amount: 1000,
      });

      expect(result.avgBuyPrice).toBe(150);
    });

    it("should throw if asset not found", async () => {
      mockPrisma.asset.findUnique.mockResolvedValue(null);

      await expect(
        service.buy({ userId: "user-1", assetId: "invalid", amount: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if insufficient USD balance", async () => {
      mockPrisma.asset.findUnique.mockResolvedValue({ id: "asset-1", symbol: "AAPL", currentPrice: 150 });
      mockPrisma.wallet.findUnique.mockResolvedValue(makeWallet({ balance: 100, currency: "USD" }));

      await expect(
        service.buy({ userId: "user-1", assetId: "asset-1", amount: 1000 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe("sell", () => {
    it("should sell an asset partially", async () => {
      mockPrisma.investment.findUnique.mockResolvedValue({
        id: "inv-1",
        userId: "user-1",
        assetId: "asset-1",
        quantity: 10,
        avgBuyPrice: 100,
        currentValue: 1500,
        asset: { id: "asset-1", symbol: "AAPL", currentPrice: 150 },
      });
      mockPrisma.wallet.findUnique.mockResolvedValue(makeWallet({ balance: 0, currency: "USD" }));
      mockPrisma.investment.update.mockResolvedValue({
        id: "inv-1",
        quantity: 5,
        currentValue: 750,
        asset: { symbol: "AAPL" },
      });

      const result = await service.sell({
        userId: "user-1",
        assetId: "asset-1",
        quantity: 5,
      });

      expect(result.investment).toBeDefined();
      expect(result.proceeds).toBeGreaterThan(0);
    });

    it("should throw if insufficient quantity", async () => {
      mockPrisma.investment.findUnique.mockResolvedValue({
        id: "inv-1",
        userId: "user-1",
        assetId: "asset-1",
        quantity: 1,
        currentValue: 150,
        asset: { id: "asset-1", symbol: "AAPL", currentPrice: 150 },
      });
      mockPrisma.wallet.findUnique.mockResolvedValue(makeWallet({ balance: 0, currency: "USD" }));

      await expect(
        service.sell({ userId: "user-1", assetId: "asset-1", quantity: 5 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("should throw if investment not found", async () => {
      mockPrisma.investment.findUnique.mockResolvedValue(null);

      await expect(
        service.sell({ userId: "user-1", assetId: "invalid", quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
