import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PricesController } from "./prices.controller";
import { PricesService } from "./prices.service";
import { PriceResult } from "./interfaces/price.interfaces";

describe("PricesController", () => {
  let controller: PricesController;

  const mockPricesService = {
    getPrice: jest.fn(),
    getPrices: jest.fn(),
  };

  const applePrice: PriceResult = {
    symbol: "AAPL",
    price: 150.25,
    source: "FINNHUB",
    currency: "USD",
    timestamp: "2026-07-14T00:00:00.000Z",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PricesController],
      providers: [{ provide: PricesService, useValue: mockPricesService }],
    }).compile();

    controller = module.get(PricesController);
  });

  describe("getOne", () => {
    it("returns the price for a valid symbol", async () => {
      mockPricesService.getPrice.mockResolvedValue(applePrice);

      const result = await controller.getOne("AAPL");

      expect(mockPricesService.getPrice).toHaveBeenCalledWith("AAPL");
      expect(result).toEqual(applePrice);
    });

    it("throws NotFoundException when the symbol has no price", async () => {
      mockPricesService.getPrice.mockResolvedValue(null);

      await expect(controller.getOne("NONEXISTENT")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getBatch", () => {
    it("splits comma-separated symbols and delegates to the service", async () => {
      const btcPrice: PriceResult = {
        ...applePrice,
        symbol: "BTC",
        source: "COINGECKO",
      };
      mockPricesService.getPrices.mockResolvedValue([applePrice, btcPrice]);

      const result = await controller.getBatch("AAPL, BTC");

      expect(mockPricesService.getPrices).toHaveBeenCalledWith([
        "AAPL",
        "BTC",
      ]);
      expect(result).toEqual([applePrice, btcPrice]);
    });

    it("keeps null entries for symbols that failed without breaking the array", async () => {
      mockPricesService.getPrices.mockResolvedValue([applePrice, null]);

      const result = await controller.getBatch("AAPL,NONEXISTENT");

      expect(result).toEqual([applePrice, null]);
    });

    it("throws BadRequestException when symbols param is empty", async () => {
      await expect(controller.getBatch("")).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getBatch(undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPricesService.getPrices).not.toHaveBeenCalled();
    });
  });
});
