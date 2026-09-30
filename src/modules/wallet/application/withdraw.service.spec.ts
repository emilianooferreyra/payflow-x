import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { WebhookService } from "../../webhook/webhook.service";
import { InMemoryUnitOfWork } from "../testing/in-memory-unit-of-work";
import { WithdrawService } from "./withdraw.service";

describe("WithdrawService", () => {
  let uow: InMemoryUnitOfWork;
  let service: WithdrawService;
  const webhooks = { dispatch: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    webhooks.dispatch.mockResolvedValue(undefined);
    uow = new InMemoryUnitOfWork();
    service = new WithdrawService(uow, webhooks as unknown as WebhookService);
  });

  it("decreases the balance and records a completed WITHDRAWAL", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });

    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "400",
    });

    expect(result.type).toBe("WITHDRAWAL");
    expect(result.status).toBe("COMPLETED");
    expect(result.description).toBe("Retiro ARS");
    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("600.00");
  });

  it("allows withdrawing the entire balance", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "250" });

    await service.execute({ userId: "u1", currency: "ARS", amount: "250" });

    expect(uow.walletOf("u1", "ARS")?.balance.isZero()).toBe(true);
  });

  it("answers 404 when the user has no wallet in that currency", async () => {
    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "10" }),
    ).rejects.toThrow(new NotFoundException("Wallet ARS not found"));

    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("answers 422 and writes nothing when the balance is not enough", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "100" });

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "100.01" }),
    ).rejects.toThrow(new UnprocessableEntityException("Insufficient balance"));

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("100.00");
    expect(uow.transactions).toHaveLength(0);
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("still serves a wallet whose stored balance has legacy precision", async () => {
    uow.seedWallet({ userId: "u1", currency: "USD", balance: "1.0005" });

    await expect(
      service.execute({ userId: "u1", currency: "USD", amount: "1.01" }),
    ).rejects.toThrow(UnprocessableEntityException);

    await service.execute({ userId: "u1", currency: "USD", amount: "1.00" });

    expect(uow.walletOf("u1", "USD")?.balance.isZero()).toBe(false);
    expect(uow.transactions).toHaveLength(1);
  });

  it("fails with a conflict and writes nothing when the wallet version moved", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });
    uow.injectVersionConflicts(1);

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "100" }),
    ).rejects.toThrow(ConflictException);

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1000.00");
    expect(uow.transactions).toHaveLength(0);
  });

  it("rolls the balance back when the transaction record cannot be written", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });
    uow.injectTransactionFailure(new Error("insert failed"));

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "100" }),
    ).rejects.toThrow("insert failed");

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1000.00");
  });

  it("rejects more decimals than the currency allows", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "1.005" }),
    ).rejects.toThrow(BadRequestException);

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1000.00");
  });

  it("dispatches withdraw.completed with the raw amount after the commit", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });

    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "400",
    });

    expect(webhooks.dispatch).toHaveBeenCalledWith({
      type: "withdraw.completed",
      data: {
        walletId: result.walletId,
        userId: "u1",
        amount: "400",
        currency: "ARS",
        transactionId: result.id,
      },
    });
  });

  it("still succeeds when the webhook dispatch fails", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });
    webhooks.dispatch.mockRejectedValue(new Error("endpoint down"));

    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "400",
    });

    expect(result.type).toBe("WITHDRAWAL");
  });
});
