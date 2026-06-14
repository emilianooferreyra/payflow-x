import { NotFoundException } from "@nestjs/common";
import { ExchangeRateService } from "./exchange-rate.service";
import { mockPrisma, createTestingModule } from "../../common/testing";

describe("ExchangeRateService", () => {
  let service: ExchangeRateService;

  function mockRate(
    overrides: Partial<{
      id: string;
      fromCurrency: string;
      toCurrency: string;
      rate: number;
      date: Date;
    }> = {},
  ) {
    return {
      id: overrides.id ?? "rate-1",
      fromCurrency: overrides.fromCurrency ?? "USD",
      toCurrency: overrides.toCurrency ?? "ARS",
      rate: overrides.rate ?? 1200,
      date: overrides.date ?? new Date("2026-06-14"),
    };
  }

  beforeEach(async () => {
    const module = await createTestingModule([ExchangeRateService]);
    service = module.get<ExchangeRateService>(ExchangeRateService);
    jest.clearAllMocks();
  });

  describe("getCurrent", () => {
    it("returns all 6 supported pairs with correct shape", async () => {
      const pairs = [
        { fromCurrency: "USD", toCurrency: "ARS", rate: 1200 },
        { fromCurrency: "ARS", toCurrency: "USD", rate: 0.00083333 },
        { fromCurrency: "USD", toCurrency: "USDT", rate: 1.0002 },
        { fromCurrency: "USDT", toCurrency: "USD", rate: 0.9998 },
        { fromCurrency: "USDT", toCurrency: "ARS", rate: 1199.76 },
        { fromCurrency: "USD", toCurrency: "BRL", rate: 5.5 },
      ];

      mockPrisma.exchangeRate.findFirst
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USD", toCurrency: "ARS", rate: 1200 }),
        )
        .mockResolvedValueOnce(
          mockRate({
            fromCurrency: "ARS",
            toCurrency: "USD",
            rate: 0.00083333,
          }),
        )
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USD", toCurrency: "USDT", rate: 1.0002 }),
        )
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USDT", toCurrency: "USD", rate: 0.9998 }),
        )
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USDT", toCurrency: "ARS", rate: 1199.76 }),
        )
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USD", toCurrency: "BRL", rate: 5.5 }),
        );

      const result = await service.getCurrent();

      expect(result).toHaveLength(6);
      expect(result).toEqual(
        expect.arrayContaining(pairs.map((p) => expect.objectContaining(p))),
      );
      result.forEach((r) => {
        expect(r).toHaveProperty("fromCurrency");
        expect(r).toHaveProperty("toCurrency");
        expect(r).toHaveProperty("rate");
        expect(r).toHaveProperty("date");
      });
    });

    it("filters out null results when some pairs have no rate", async () => {
      mockPrisma.exchangeRate.findFirst
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USD", toCurrency: "ARS", rate: 1200 }),
        )
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          mockRate({ fromCurrency: "USD", toCurrency: "BRL", rate: 5.5 }),
        );

      const result = await service.getCurrent();

      expect(result).toHaveLength(2);
      expect(result[0].fromCurrency).toBe("USD");
      expect(result[0].toCurrency).toBe("ARS");
      expect(result[1].fromCurrency).toBe("USD");
      expect(result[1].toCurrency).toBe("BRL");
    });

    it("returns empty array when no rates exist in database", async () => {
      mockPrisma.exchangeRate.findFirst
        .mockResolvedValue(null)
        .mockResolvedValue(null)
        .mockResolvedValue(null)
        .mockResolvedValue(null)
        .mockResolvedValue(null)
        .mockResolvedValue(null);

      const result = await service.getCurrent();

      expect(result).toEqual([]);
    });

    it("queries each SUPPORTED_PAIR with findFirst ordered by date desc", async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      await service.getCurrent();

      expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledTimes(6);
      expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromCurrency: "USD", toCurrency: "ARS" },
          orderBy: { date: "desc" },
        }),
      );
    });
  });

  describe("getRate", () => {
    it("returns the latest rate for a valid currency pair", async () => {
      const expected = mockRate({
        fromCurrency: "USD",
        toCurrency: "ARS",
        rate: 1200,
      });
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(expected);

      const result = await service.getRate("USD", "ARS");

      expect(result.fromCurrency).toBe("USD");
      expect(result.toCurrency).toBe("ARS");
      expect(result.rate).toBe(1200);
      expect(result.date).toEqual(expected.date);
    });

    it("throws NotFoundException when the pair has no rate", async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

      await expect(service.getRate("USD" as any, "BRL" as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("queries with findFirst ordered by date desc", async () => {
      mockPrisma.exchangeRate.findFirst.mockResolvedValue(
        mockRate({ fromCurrency: "USD", toCurrency: "ARS" }),
      );

      await service.getRate("USD", "ARS");

      expect(mockPrisma.exchangeRate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromCurrency: "USD", toCurrency: "ARS" },
          orderBy: { date: "desc" },
        }),
      );
    });
  });

  describe("getHistory", () => {
    it("returns last 30 rates in ascending order", async () => {
      const rates = Array.from({ length: 30 }, (_, i) =>
        mockRate({
          id: `rate-${i}`,
          rate: 1200 + i,
          date: new Date(2026, 5, 1 + i),
        }),
      );
      mockPrisma.exchangeRate.findMany.mockResolvedValue(rates);

      const result = await service.getHistory("USD", "ARS");

      expect(result).toHaveLength(30);
      expect(result[0].rate).toBe(1200);
      expect(result[29].rate).toBe(1229);
      result.forEach((r) => {
        expect(r).toHaveProperty("rate");
        expect(r).toHaveProperty("date");
      });
    });

    it("throws NotFoundException when no history exists", async () => {
      mockPrisma.exchangeRate.findMany.mockResolvedValue([]);

      await expect(
        service.getHistory("USD" as any, "BRL" as any),
      ).rejects.toThrow(NotFoundException);
    });

    it("queries with take 30 ordered by date asc", async () => {
      mockPrisma.exchangeRate.findMany.mockResolvedValue([
        mockRate({ fromCurrency: "USD", toCurrency: "ARS" }),
      ]);

      await service.getHistory("USD", "ARS");

      expect(mockPrisma.exchangeRate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { fromCurrency: "USD", toCurrency: "ARS" },
          orderBy: { date: "asc" },
          take: 30,
        }),
      );
    });
  });

  describe("refresh", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...OLD_ENV };
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it("returns message when EXCHANGE_RATE_API_KEY is not configured", async () => {
      delete process.env.EXCHANGE_RATE_API_KEY;

      const result = await service.refresh();

      expect(result).toEqual({
        message: "EXCHANGE_RATE_API_KEY not configured",
      });
    });

    it("fetches from external API and creates 6 rate pairs", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      const mockResponse = {
        conversion_rates: { ARS: 1200, BRL: 5.5 },
      };
      jest.spyOn(global, "fetch").mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any);
      mockPrisma.exchangeRate.createMany.mockResolvedValue({ count: 6 });

      const result = await service.refresh();

      expect(global.fetch).toHaveBeenCalledWith(
        "https://v6.exchangerate-api.com/v6/test-key-123/latest/USD",
      );
      expect(mockPrisma.exchangeRate.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            fromCurrency: "USD",
            toCurrency: "ARS",
            rate: 1200,
          }),
          expect.objectContaining({ fromCurrency: "ARS", toCurrency: "USD" }),
          expect.objectContaining({
            fromCurrency: "USD",
            toCurrency: "BRL",
            rate: 5.5,
          }),
          expect.objectContaining({
            fromCurrency: "USD",
            toCurrency: "USDT",
            rate: 1.0002,
          }),
          expect.objectContaining({
            fromCurrency: "USDT",
            toCurrency: "USD",
            rate: 0.9998,
          }),
          expect.objectContaining({ fromCurrency: "USDT", toCurrency: "ARS" }),
        ]),
      });
      expect(mockPrisma.exchangeRate.createMany).toHaveBeenCalledTimes(1);
      expect(result.message).toBe("Rates refreshed");
      expect(result.pairs).toBe(6);
      expect(result.date).toBeInstanceOf(Date);
    });

    it("derives ARS/USD rate as inverse of USD/ARS", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      jest.spyOn(global, "fetch").mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          conversion_rates: { ARS: 1200, BRL: 5.5 },
        }),
      } as any);
      mockPrisma.exchangeRate.createMany.mockResolvedValue({ count: 6 });

      await service.refresh();

      const dataArg = mockPrisma.exchangeRate.createMany.mock.calls[0][0].data;
      const arsToUsd = dataArg.find(
        (p: any) => p.fromCurrency === "ARS" && p.toCurrency === "USD",
      );
      expect(arsToUsd.rate).toBe(parseFloat((1 / 1200).toFixed(8)));
    });

    it("derives USDT/ARS rate as USD/ARS * 0.9998", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      jest.spyOn(global, "fetch").mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue({
          conversion_rates: { ARS: 1200, BRL: 5.5 },
        }),
      } as any);
      mockPrisma.exchangeRate.createMany.mockResolvedValue({ count: 6 });

      await service.refresh();

      const dataArg = mockPrisma.exchangeRate.createMany.mock.calls[0][0].data;
      const usdtToArs = dataArg.find(
        (p: any) => p.fromCurrency === "USDT" && p.toCurrency === "ARS",
      );
      expect(usdtToArs.rate).toBe(parseFloat((1200 * 0.9998).toFixed(4)));
    });

    it("propagates network error when fetch fails", async () => {
      process.env.EXCHANGE_RATE_API_KEY = "test-key-123";
      jest
        .spyOn(global, "fetch")
        .mockRejectedValueOnce(new Error("getaddrinfo ENOTFOUND"));

      await expect(service.refresh()).rejects.toThrow("getaddrinfo ENOTFOUND");
    });
  });
});
