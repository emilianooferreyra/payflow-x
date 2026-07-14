import { BrokersService } from "./brokers.service";
import { MARKET_META } from "./constants/market.constants";
import { createTestingModule, mockPrisma } from "../../common/testing";

describe("BrokersService", () => {
  let service: BrokersService;

  const brokers = [
    { id: "1", slug: "cocos", name: "Cocos Capital", feeBuyPct: "0.45" },
    { id: "2", slug: "iol", name: "IOL invertironline", feeBuyPct: "0.6" },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await createTestingModule([BrokersService]);
    service = module.get(BrokersService);
  });

  describe("findActive", () => {
    it("returns only active brokers ordered by buy fee ascending", async () => {
      mockPrisma.broker.findMany.mockResolvedValue(brokers);

      const result = await service.findActive();

      expect(mockPrisma.broker.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { feeBuyPct: "asc" },
      });
      expect(result).toEqual(brokers);
    });
  });

  describe("getTariff", () => {
    it("returns market meta and active brokers", async () => {
      mockPrisma.broker.findMany.mockResolvedValue(brokers);

      const result = await service.getTariff();

      expect(result.meta).toEqual(MARKET_META);
      expect(result.brokers).toEqual(brokers);
    });
  });
});
