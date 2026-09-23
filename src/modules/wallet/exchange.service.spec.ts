import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { ExchangeService } from "./exchange.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma, runTransactionsInline, makeWallet } from "../../common/testing";
import { Prisma } from "../../generated/prisma/client.js";

type WalletLookupArgs = { where: { userId_currency?: { currency: string } } };
type WalletUpdateArgs = { where: { id: string } };

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
    runTransactionsInline();
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
    mockPrisma.wallet.findUnique.mockImplementation(({ where }: WalletLookupArgs) => {
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
    });

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
        fromCurrency: "ARS",
        toCurrency: "ARS",
        amount: "500",
      }),
    ).rejects.toThrow("Source and destination currency must differ");
  });

  describe("lock ordering", () => {
    function setupExchange(
      sourceId: string,
      targetId: string,
      conflictingId?: string,
    ) {
      const sourceWallet = makeWallet({
        id: sourceId,
        balance: new Prisma.Decimal(1000),
        currency: "ARS",
      });
      const targetWallet = makeWallet({
        id: targetId,
        balance: new Prisma.Decimal(0),
        currency: "USD",
      });
      mockPrisma.wallet.findUnique.mockImplementation(({ where }: WalletLookupArgs) => {
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
      const lockOrder: string[] = [];
      mockPrisma.wallet.updateMany.mockImplementation(
        ({ where }: WalletUpdateArgs) => {
          lockOrder.push(where.id);
          return Promise.resolve({ count: conflictingId === where.id ? 0 : 1 });
        },
      );
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        type: "EXCHANGE",
        amount: "500",
      });

      return { sourceWallet, targetWallet, lockOrder };
    }

    // Two opposite exchanges running at once (USD->ARS and ARS->USD) would take
    // row locks in reverse order and deadlock. Ordering by wallet id makes the
    // acquisition order identical for every caller.
    it("locks the lowest wallet id first when the source sorts after the target", async () => {
      const { sourceWallet, lockOrder } = setupExchange(
        "wallet-b",
        "wallet-a",
      );

      await service.execute({
        userId: sourceWallet.userId,
        fromCurrency: "ARS",
        toCurrency: "USD",
        amount: "500",
      });

      expect(lockOrder).toEqual(["wallet-a", "wallet-b"]);
    });

    it("locks the lowest wallet id first when the source sorts before the target", async () => {
      const { sourceWallet, lockOrder } = setupExchange(
        "wallet-a",
        "wallet-b",
      );

      await service.execute({
        userId: sourceWallet.userId,
        fromCurrency: "ARS",
        toCurrency: "USD",
        amount: "500",
      });

      expect(lockOrder).toEqual(["wallet-a", "wallet-b"]);
    });

    it("stops at the first conflicting leg instead of writing the second one", async () => {
      const { sourceWallet, lockOrder } = setupExchange(
        "wallet-a",
        "wallet-b",
        "wallet-a",
      );

      await expect(
        service.execute({
          userId: sourceWallet.userId,
          fromCurrency: "ARS",
          toCurrency: "USD",
          amount: "500",
        }),
      ).rejects.toThrow(ConflictException);

      // One update per attempt, not two: the second leg is never reached.
      expect(mockPrisma.wallet.updateMany).toHaveBeenCalledTimes(3);
      expect(lockOrder).toEqual(["wallet-a", "wallet-a", "wallet-a"]);
      expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
    });
  });
});
