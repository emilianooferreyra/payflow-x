import { Test, type TestingModule } from "@nestjs/testing";
import { GeolocationService } from "./geolocation.service";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";

const mockFetch = jest.fn();
(globalThis as any).fetch = mockFetch;

const mockCache: jest.Mocked<Pick<Cache, "get" | "set">> = {
  get: jest.fn(),
  set: jest.fn(),
};

describe("GeolocationService", () => {
  let service: GeolocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeolocationService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get<GeolocationService>(GeolocationService);
    jest.clearAllMocks();
  });

  describe("cache", () => {
    it("should return cached value when available", async () => {
      mockCache.get.mockResolvedValue("Buenos Aires, Argentina");

      const result = await service.resolve("181.1.1.1");

      expect(result).toBe("Buenos Aires, Argentina");
      expect(mockCache.get).toHaveBeenCalledWith("geo:181.1.1.1");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should store result in cache after API call", async () => {
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ city: "Buenos Aires", country: "Argentina" }),
      } as Response);

      const result = await service.resolve("181.1.1.1");

      expect(result).toBe("Buenos Aires, Argentina");
      expect(mockCache.set).toHaveBeenCalledWith(
        "geo:181.1.1.1",
        "Buenos Aires, Argentina",
        3600000,
      );
    });
  });

  describe("API failure", () => {
    it("should return null when API is unreachable", async () => {
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await service.resolve("181.1.1.1");

      expect(result).toBeNull();
    });

    it("should return null when API returns non-ok", async () => {
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
      } as Response);

      const result = await service.resolve("181.1.1.1");

      expect(result).toBeNull();
    });
  });

  describe("successful resolve", () => {
    it('should format location as "City, Country"', async () => {
      mockCache.get.mockResolvedValue(null);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ city: "New York", country: "United States" }),
      } as Response);

      const result = await service.resolve("8.8.8.8");

      expect(result).toBe("New York, United States");
      expect(mockFetch).toHaveBeenCalledWith(
        "http://ip-api.com/json/8.8.8.8?fields=city,country",
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });
  });
});
