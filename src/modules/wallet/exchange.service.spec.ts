import { Test } from "@nestjs/testing";
import { ExchangeService } from "./exchange.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma, makeWallet } from "../../common/testing";
import { Prisma } from "../../generated/prisma/client.js";

describe("ExchangeService", () => {
  let service: ExchangeService;

  function mockUpdateMany(affected: number) {
    return mockPrisma.wallet.updateMany.mockResolvedValue({ count: affected });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExchangeService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<ExchangeService>(ExchangeService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
  });

  it("should exchange between currencies", async () => {
    const sourceWallet = makeWallet({
      balance: new Prisma.Decimal(1000),
      currency: "ARS",
    });
    const targetWallet = makeWallet({
      balance: new Prisma.Decimal(0),
      currency: "USD",
    });
    mockPrisma.wallet.findUnique.mockImplementation(({ where }: any) => {
      if (where?.userId_currency?.currency === "ARS")
        return Promise.resolve(sourceWallet);
      if (where?.userId_currency?.currency === "USD")
        return Promise.resolve(targetWallet);
      return Promise.resolve(null);
    });
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      id: "rate-1",
      fromCurrency: "ARS",
      toCurrency: "USD",
      rate: new Prisma.Decimal("0.001"),
      date: new Date(),
    });
    mockUpdateMany(1);
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      walletId: sourceWallet.id,
      toWalletId: targetWallet.id,
      type: "EXCHANGE",
      amount: "500",
      status: "COMPLETED",
    } as any);

    const result = await service.execute({
      userId: sourceWallet.userId,
      fromCurrency: "ARS",
      toCurrency: "USD",
      amount: "500",
    });

    expect(result.type).toBe("EXCHANGE");
  });

  it("should throw if same currency", async () => {
    await expect(
      service.execute({
        userId: "user-1",
        fromCurrency: "ARS" as any,
        toCurrency: "ARS" as any,
        amount: "500",
      }),
    ).rejects.toThrow("Source and destination currency must differ");
  });
});
