import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PortfolioService } from "./portfolio.service";
import { PricesService } from "../prices/prices.service";
import { createTestingModule, mockPrisma } from "../../common/testing";

describe("PortfolioService", () => {
  let service: PortfolioService;

  const mockPricesService = {
    getPrices: jest.fn(),
  };

  const userId = "user-1";
  const otherUserId = "user-2";

  const portfolio = {
    id: "portfolio-1",
    userId,
    name: "Mi Tech Portfolio",
    description: null,
    visibility: "PRIVATE",
    assets: [],
    createdAt: new Date("2026-07-01"),
    updatedAt: new Date("2026-07-01"),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await createTestingModule([
      PortfolioService,
      { provide: PricesService, useValue: mockPricesService },
    ]);

    service = module.get(PortfolioService);
  });

  describe("create (R1)", () => {
    it("creates the portfolio owned by the authenticated user", async () => {
      mockPrisma.portfolio.create.mockResolvedValue(portfolio);

      const result = await service.create(userId, {
        name: "Mi Tech Portfolio",
      });

      expect(mockPrisma.portfolio.create).toHaveBeenCalledWith({
        data: { userId, name: "Mi Tech Portfolio" },
      });
      expect(result).toEqual(portfolio);
    });
  });

  describe("findAll (R2)", () => {
    it("returns data with null nextCursor when there are no more rows", async () => {
      mockPrisma.portfolio.findMany.mockResolvedValue([portfolio]);

      const result = await service.findAll(userId, { limit: 20 });

      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId }, take: 21 }),
      );
      expect(result).toEqual({ data: [portfolio], nextCursor: null });
    });

    it("returns nextCursor when there are more rows than the limit", async () => {
      const rows = [
        { ...portfolio, id: "p1" },
        { ...portfolio, id: "p2" },
        { ...portfolio, id: "p3" },
      ];
      mockPrisma.portfolio.findMany.mockResolvedValue(rows);

      const result = await service.findAll(userId, { limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.nextCursor).toBe("p2");
    });

    it("passes cursor and skip to Prisma when paginating", async () => {
      mockPrisma.portfolio.findMany.mockResolvedValue([]);

      await service.findAll(userId, { limit: 2, cursor: "p2" });

      expect(mockPrisma.portfolio.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: "p2" }, skip: 1 }),
      );
    });
  });

  describe("findOne (R3)", () => {
    it("returns the portfolio with its assets", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);

      const result = await service.findOne(userId, portfolio.id);

      expect(mockPrisma.portfolio.findUnique).toHaveBeenCalledWith({
        where: { id: portfolio.id },
        include: { assets: true },
      });
      expect(result).toEqual(portfolio);
    });

    it("throws NotFoundException for a nonexistent portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(null);

      await expect(service.findOne(userId, "nope")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ForbiddenException when the portfolio belongs to another user", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);

      await expect(
        service.findOne(otherUserId, portfolio.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("update (R4)", () => {
    it("verifies ownership before updating", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);

      await expect(
        service.update(otherUserId, portfolio.id, { name: "Hack" }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.portfolio.update).not.toHaveBeenCalled();
    });

    it("updates when the user is the owner", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.portfolio.update.mockResolvedValue({
        ...portfolio,
        name: "Nuevo nombre",
      });

      const result = await service.update(userId, portfolio.id, {
        name: "Nuevo nombre",
      });

      expect(mockPrisma.portfolio.update).toHaveBeenCalledWith({
        where: { id: portfolio.id },
        data: { name: "Nuevo nombre" },
      });
      expect(result.name).toBe("Nuevo nombre");
    });
  });

  describe("delete (R5)", () => {
    it("verifies ownership before deleting", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);

      await expect(
        service.delete(otherUserId, portfolio.id),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.portfolio.delete).not.toHaveBeenCalled();
    });

    it("deletes when the user is the owner", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.portfolio.delete.mockResolvedValue(portfolio);

      await service.delete(userId, portfolio.id);

      expect(mockPrisma.portfolio.delete).toHaveBeenCalledWith({
        where: { id: portfolio.id },
      });
    });
  });

  describe("addAsset (R6)", () => {
    it("creates the asset scoped to the owned portfolio", async () => {
      const dto = {
        symbol: "AAPL",
        type: "STOCK" as never,
        quantity: 10,
        avgBuyPrice: 150,
        currency: "USD",
      };
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.portfolioAsset.create.mockResolvedValue({
        id: "asset-1",
        portfolioId: portfolio.id,
        ...dto,
      });

      const result = await service.addAsset(userId, portfolio.id, dto);

      expect(mockPrisma.portfolioAsset.create).toHaveBeenCalledWith({
        data: { portfolioId: portfolio.id, ...dto },
      });
      expect(result.id).toBe("asset-1");
    });
  });

  describe("removeAsset (R7)", () => {
    it("throws NotFoundException when the asset does not belong to the portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.portfolioAsset.findFirst.mockResolvedValue(null);

      await expect(
        service.removeAsset(userId, portfolio.id, "ghost"),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.portfolioAsset.delete).not.toHaveBeenCalled();
    });

    it("deletes the asset when it belongs to the owned portfolio", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolio);
      mockPrisma.portfolioAsset.findFirst.mockResolvedValue({ id: "asset-1" });
      mockPrisma.portfolioAsset.delete.mockResolvedValue({ id: "asset-1" });

      await service.removeAsset(userId, portfolio.id, "asset-1");

      expect(mockPrisma.portfolioAsset.delete).toHaveBeenCalledWith({
        where: { id: "asset-1" },
      });
    });
  });

  describe("getValuation (R8)", () => {
    const portfolioWithAssets = {
      ...portfolio,
      assets: [
        {
          id: "asset-1",
          symbol: "AAPL",
          quantity: "10",
          avgBuyPrice: "100",
        },
        {
          id: "asset-2",
          symbol: "BTC",
          quantity: "0.5",
          avgBuyPrice: "40000",
        },
      ],
    };

    it("computes totalValueUSD, pnl and pnlPercent per asset", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolioWithAssets);
      mockPricesService.getPrices.mockResolvedValue([
        { symbol: "AAPL", price: 150, source: "FINNHUB" },
        { symbol: "BTC", price: 60000, source: "COINGECKO" },
      ]);

      const result = await service.getValuation(userId, portfolio.id);

      expect(mockPricesService.getPrices).toHaveBeenCalledWith([
        "AAPL",
        "BTC",
      ]);
      expect(result.assets[0]).toEqual({
        symbol: "AAPL",
        quantity: 10,
        currentPrice: 150,
        valueUSD: 1500,
        pnl: 500,
        pnlPercent: 50,
      });
      expect(result.assets[1]).toEqual({
        symbol: "BTC",
        quantity: 0.5,
        currentPrice: 60000,
        valueUSD: 30000,
        pnl: 10000,
        pnlPercent: 50,
      });
      expect(result.totalValueUSD).toBe(31500);
    });

    it("keeps assets with null price without breaking the others", async () => {
      mockPrisma.portfolio.findUnique.mockResolvedValue(portfolioWithAssets);
      mockPricesService.getPrices.mockResolvedValue([
        null,
        { symbol: "BTC", price: 60000, source: "COINGECKO" },
      ]);

      const result = await service.getValuation(userId, portfolio.id);

      expect(result.assets[0]).toEqual({
        symbol: "AAPL",
        quantity: 10,
        currentPrice: null,
        valueUSD: null,
        pnl: null,
        pnlPercent: null,
      });
      expect(result.assets[1].valueUSD).toBe(30000);
      expect(result.totalValueUSD).toBe(30000);
    });
  });
});
