import { Test } from "@nestjs/testing";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { WithdrawService } from "./withdraw.service";
import { WebhookService } from "../webhook/webhook.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma, makeWallet } from "../../common/testing";
import { Prisma } from "../../generated/prisma/client.js";

describe("WithdrawService", () => {
  let service: WithdrawService;

  const mockWebhookService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  function mockUpdateMany(affected: number) {
    return mockPrisma.wallet.updateMany.mockResolvedValue({ count: affected });
  }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WithdrawService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();
    service = module.get<WithdrawService>(WithdrawService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
    mockWebhookService.dispatch.mockResolvedValue(undefined);
  });

  it("should decrease balance and create a transaction", async () => {
    const wallet = makeWallet({ balance: new Prisma.Decimal(1000) });
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
    mockUpdateMany(1);
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      walletId: wallet.id,
      type: "WITHDRAWAL",
      amount: "500",
      currency: "ARS",
      status: "COMPLETED",
    });

    const result = await service.execute({
      userId: wallet.userId,
      currency: "ARS",
      amount: "500",
    });

    expect(result.type).toBe("WITHDRAWAL");
  });

  it("should throw on insufficient balance", async () => {
    const wallet = makeWallet({ balance: new Prisma.Decimal(100) });
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);

    await expect(
      service.execute({
        userId: wallet.userId,
        currency: "ARS" as any,
        amount: "500",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("should throw if wallet not found", async () => {
    mockPrisma.wallet.findUnique.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: "invalid",
        currency: "ARS" as any,
        amount: "500",
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
