import { Test, TestingModule } from "@nestjs/testing";
import { BrokersController } from "./brokers.controller";
import { BrokersService } from "./brokers.service";
import { MARKET_META } from "./constants/market.constants";

describe("BrokersController", () => {
  let controller: BrokersController;

  const mockBrokersService = {
    getTariff: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BrokersController],
      providers: [{ provide: BrokersService, useValue: mockBrokersService }],
    }).compile();

    controller = module.get(BrokersController);
  });

  it("returns the tariff from the service", async () => {
    const tariff = {
      meta: MARKET_META,
      brokers: [{ slug: "cocos", name: "Cocos Capital" }],
    };
    mockBrokersService.getTariff.mockResolvedValue(tariff);

    const result = await controller.getTariff();

    expect(mockBrokersService.getTariff).toHaveBeenCalled();
    expect(result).toEqual(tariff);
  });
});
