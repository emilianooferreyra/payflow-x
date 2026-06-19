import { Test } from "@nestjs/testing";
import { ConflictException } from "@nestjs/common";
import { DepositService } from "./deposit.service";
import { WebhookService } from "../webhook/webhook.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma, makeWallet } from "../../common/testing";
import { Prisma } from "../../generated/prisma/client.js";

describe("DepositService", () => {
  let service: DepositService;

  const mockWebhookService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  function mockUpdateMany(affected: number) {
    return mockPrisma.wallet.updateMany.mockResolvedValue({ count: affected });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DepositService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();
    service = module.get<DepositService>(DepositService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
    mockWebhookService.dispatch.mockResolvedValue(undefined);
  });

  it("should increase balance and create a transaction", async () => {
    const wallet = makeWallet({ balance: new Prisma.Decimal(1000) });
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
    mockUpdateMany(1);
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      walletId: wallet.id,
      type: "DEPOSIT",
      amount: "500",
      currency: "ARS",
      status: "COMPLETED",
    });

    const result = await service.execute({
      userId: wallet.userId,
      currency: "ARS",
      amount: "500",
    });

    expect(result.type).toBe("DEPOSIT");
    expect(mockPrisma.wallet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: { increment: new Prisma.Decimal("500") },
          version: { increment: 1 },
        },
      }),
    );
  });

  it("should create wallet on first deposit", async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue(null);
    mockPrisma.wallet.create.mockResolvedValue(
      makeWallet({ balance: new Prisma.Decimal(500) }),
    );
    mockUpdateMany(1);
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      type: "DEPOSIT",
      amount: "500",
    });

    const result = await service.execute({
      userId: "user-1",
      currency: "ARS",
      amount: "500",
    });

    expect(result.type).toBe("DEPOSIT");
  });

  it("should retry on optimistic lock conflict", async () => {
    const wallet = makeWallet({ balance: new Prisma.Decimal(1000) });
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
    mockUpdateMany(0);
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      type: "DEPOSIT",
      amount: "500",
    });

    await expect(
      service.execute({
        userId: wallet.userId,
        currency: "ARS",
        amount: "500",
      }),
    ).rejects.toThrow(ConflictException);
  });
});
