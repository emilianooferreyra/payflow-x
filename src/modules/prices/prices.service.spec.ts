import { Test } from "@nestjs/testing";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { PricesService } from "./prices.service";
import { PriceResult } from "./interfaces/price.interfaces";

describe("PricesService", () => {
  let service: PricesService;

  const fetchSpy = jest.fn();
  const originalFetch = global.fetch;

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const cachedApple: PriceResult = {
    symbol: "AAPL",
    price: 150,
    source: "FINNHUB",
    currency: "USD",
    timestamp: "2026-07-14T00:00:00.000Z",
  };

  const jsonResponse = (data: unknown, ok = true) =>
    ({ ok, json: async () => data }) as Response;

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const module = await Test.createTestingModule({
      providers: [
        PricesService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(PricesService);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe("getPrice — cache", () => {
    it("returns the cached price without calling any external API (cache hit)", async () => {
      mockCache.get.mockResolvedValue(cachedApple);

      const result = await service.getPrice("AAPL");

      expect(result).toEqual(cachedApple);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("fetches from Finnhub and caches the result on cache miss (stock)", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockResolvedValue(jsonResponse({ c: 150 }));

      const result = await service.getPrice("AAPL");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("finnhub.io/api/v1/quote?symbol=AAPL"),
      );
      expect(result).toMatchObject({
        symbol: "AAPL",
        price: 150,
        source: "FINNHUB",
        currency: "USD",
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        "price:AAPL",
        expect.objectContaining({ symbol: "AAPL", price: 150 }),
        300_000,
      );
    });

    it("fetches from CoinGecko on cache miss for a known crypto symbol", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockResolvedValue(jsonResponse({ bitcoin: { usd: 60000 } }));

      const result = await service.getPrice("BTC");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("api.coingecko.com/api/v3/simple/price?ids=bitcoin"),
      );
      expect(result).toMatchObject({
        symbol: "BTC",
        price: 60000,
        source: "COINGECKO",
      });
    });

    it("fetches directly and still returns the price when Redis is down", async () => {
      mockCache.get.mockRejectedValue(new Error("Redis down"));
      mockCache.set.mockRejectedValue(new Error("Redis down"));
      fetchSpy.mockResolvedValue(jsonResponse({ c: 150 }));

      const result = await service.getPrice("AAPL");

      expect(result).toMatchObject({ symbol: "AAPL", price: 150 });
    });
  });

  describe("getPrice — provider errors", () => {
    it("returns null when Finnhub has no price for the symbol", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockResolvedValue(jsonResponse({ c: 0 }));

      const result = await service.getPrice("NONEXISTENT");

      expect(result).toBeNull();
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("returns null when the provider responds with a non-ok status", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockResolvedValue(jsonResponse({}, false));

      const result = await service.getPrice("AAPL");

      expect(result).toBeNull();
    });

    it("returns null when the fetch itself throws (network error)", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await service.getPrice("AAPL");

      expect(result).toBeNull();
    });
  });

  describe("getPrices — batch", () => {
    it("resolves each symbol independently, null entries do not break the batch", async () => {
      mockCache.get.mockResolvedValue(undefined);
      fetchSpy.mockImplementation((url: string) => {
        if (url.includes("symbol=AAPL")) {
          return Promise.resolve(jsonResponse({ c: 150 }));
        }
        return Promise.resolve(jsonResponse({}, false));
      });

      const result = await service.getPrices(["AAPL", "BAD"]);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ symbol: "AAPL", price: 150 });
      expect(result[1]).toBeNull();
    });
  });
});
