import { Test } from "@nestjs/testing";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { SendService } from "./send.service";
import { WebhookService } from "../webhook/webhook.service";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrisma, makeWallet, makeBeneficiary } from "../../common/testing";
import { Prisma } from "../../generated/prisma/client.js";

describe("SendService", () => {
  let service: SendService;

  const mockWebhookService = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SendService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WebhookService, useValue: mockWebhookService },
      ],
    }).compile();
    service = module.get<SendService>(SendService);
    jest.resetAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) =>
      fn(mockPrisma),
    );
    mockWebhookService.dispatch.mockResolvedValue(undefined);
  });

  it("should send to a beneficiary and create TRANSFER transaction", async () => {
    const beneficiary = makeBeneficiary({ currency: "ARS" });
    const wallet = makeWallet({
      balance: new Prisma.Decimal(5000),
      currency: "ARS",
    });
    mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);
    mockPrisma.wallet.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.transaction.create.mockResolvedValue({
      id: "tx-1",
      walletId: wallet.id,
      type: "TRANSFER",
      amount: "1000",
      status: "COMPLETED",
      description: `Envío a ${beneficiary.alias}`,
    });

    const result = await service.execute({
      userId: wallet.userId,
      beneficiaryId: beneficiary.id,
      amount: "1000",
    });

    expect(result.type).toBe("TRANSFER");
    expect(result.description).toContain(beneficiary.alias);
    expect(mockPrisma.wallet.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: { decrement: new Prisma.Decimal("1000") },
          version: { increment: 1 },
        },
      }),
    );
  });

  it("should throw if beneficiary not found", async () => {
    mockPrisma.beneficiary.findFirst.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: "user-1",
        beneficiaryId: "invalid",
        amount: "100",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw if wallet not found for beneficiary currency", async () => {
    const beneficiary = makeBeneficiary({ currency: "USD" });
    mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);
    mockPrisma.wallet.findUnique.mockResolvedValue(null);

    await expect(
      service.execute({
        userId: "user-1",
        beneficiaryId: beneficiary.id,
        amount: "100",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw on insufficient balance", async () => {
    const beneficiary = makeBeneficiary({ currency: "ARS" });
    const wallet = makeWallet({
      balance: new Prisma.Decimal(100),
      currency: "ARS",
    });
    mockPrisma.beneficiary.findFirst.mockResolvedValue(beneficiary);
    mockPrisma.wallet.findUnique.mockResolvedValue(wallet);

    await expect(
      service.execute({
        userId: wallet.userId,
        beneficiaryId: beneficiary.id,
        amount: "500",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});
