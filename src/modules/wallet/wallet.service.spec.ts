import { Test } from "@nestjs/testing";
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { WalletService } from "./wallet.service";
import { WebhookService } from "../webhook/webhook.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  mockPrisma,
  makeWallet,
} from "../../common/testing";

describe("WalletService", () => {
  let service: WalletService;

  const mockWebhookService = { dispatch: jest.fn() };

  function mockUpdateMany(affected: number) {
    return mockPrisma.wallet.updateMany.mockResolvedValue({ count: affected });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();
    service = module.get<WalletService>(WalletService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
  });

  describe("getWallets", () => {
    it("should return all wallets for a user", async () => {
      const wallets = [makeWallet(), makeWallet({ currency: "USD" })];
      mockPrisma.wallet.findMany.mockResolvedValue(wallets);

      const result = await service.getWallets("user-id");

      expect(result).toEqual(wallets);
    });

    it("should return empty array if no wallets", async () => {
      mockPrisma.wallet.findMany.mockResolvedValue([]);

      const result = await service.getWallets("user-id");

      expect(result).toEqual([]);
    });
  });

  describe("deposit", () => {
    it("should increase balance and create a transaction", async () => {
      const wallet = makeWallet({ balance: 1000 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockUpdateMany(1);
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: 500,
        currency: "ARS",
        status: "COMPLETED",
      });

      const result = await service.deposit({
        userId: wallet.userId,
        currency: "ARS",
        amount: 500,
      });

      expect(result.type).toBe("DEPOSIT");
      expect(mockPrisma.wallet.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: wallet.id, version: wallet.version },
          data: { balance: { increment: 500 }, version: { increment: 1 } },
        }),
      );
    });

    it("should create wallet on first deposit", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);
      mockPrisma.wallet.create.mockResolvedValue(makeWallet({ balance: 500 }));
      mockUpdateMany(1);
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        type: "DEPOSIT",
        amount: 500,
      });

      const result = await service.deposit({
        userId: "user-1",
        currency: "ARS" as any,
        amount: 500,
      });

      expect(result.type).toBe("DEPOSIT");
    });

    it("should retry on optimistic lock conflict", async () => {
      const wallet = makeWallet({ balance: 1000 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockUpdateMany(0);
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        type: "DEPOSIT",
        amount: 500,
      });

      await expect(
        service.deposit({
          userId: wallet.userId,
          currency: "ARS",
          amount: 500,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("withdraw", () => {
    it("should decrease balance and create a transaction", async () => {
      const wallet = makeWallet({ balance: 1000 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
      mockUpdateMany(1);
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amount: 500,
        currency: "ARS",
        status: "COMPLETED",
      });

      const result = await service.withdraw({
        userId: wallet.userId,
        currency: "ARS",
        amount: 500,
      });

      expect(result.type).toBe("WITHDRAWAL");
    });

    it("should throw on insufficient balance", async () => {
      const wallet = makeWallet({ balance: 100 });
      mockPrisma.wallet.findUnique.mockResolvedValue(wallet);

      await expect(
        service.withdraw({
          userId: wallet.userId,
          currency: "ARS" as any,
          amount: 500,
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("should throw if wallet not found", async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(
        service.withdraw({
          userId: "invalid",
          currency: "ARS" as any,
          amount: 500,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("exchange", () => {
    it("should exchange between currencies", async () => {
      const sourceWallet = makeWallet({ balance: 1000, currency: "ARS" });
      const targetWallet = makeWallet({ balance: 0, currency: "USD" });
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
        rate: 0.001,
        date: new Date(),
      });
      mockUpdateMany(1);
      mockPrisma.transaction.create.mockResolvedValue({
        id: "tx-1",
        walletId: sourceWallet.id,
        toWalletId: targetWallet.id,
        type: "EXCHANGE",
        amount: 500,
        status: "COMPLETED",
      } as any);

      const result = await service.exchange({
        userId: sourceWallet.userId,
        fromCurrency: "ARS",
        toCurrency: "USD",
        amount: 500,
      });

      expect(result.type).toBe("EXCHANGE");
    });

    it("should throw if same currency", async () => {
      await expect(
        service.exchange({
          userId: "user-1",
          fromCurrency: "ARS" as any,
          toCurrency: "ARS" as any,
          amount: 500,
        }),
      ).rejects.toThrow("Source and destination currency must differ");
    });
  });
});
