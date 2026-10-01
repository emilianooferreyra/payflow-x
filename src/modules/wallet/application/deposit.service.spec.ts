import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { WebhookService } from "../../webhook/webhook.service";
import { InMemoryUnitOfWork } from "../testing/in-memory-unit-of-work";
import { DepositService } from "./deposit.service";

describe("DepositService", () => {
  let uow: InMemoryUnitOfWork;
  let service: DepositService;
  const webhooks = { dispatch: jest.fn() };

  beforeEach(() => {
    jest.resetAllMocks();
    webhooks.dispatch.mockResolvedValue(undefined);
    uow = new InMemoryUnitOfWork();
    service = new DepositService(uow, webhooks as unknown as WebhookService);
  });

  it("increases the balance and records a completed DEPOSIT", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });

    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "500",
    });

    expect(result.type).toBe("DEPOSIT");
    expect(result.status).toBe("COMPLETED");
    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1500.00");
    expect(uow.transactions).toHaveLength(1);
  });

  it("uses the description when given and a default otherwise", async () => {
    await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "1",
      description: "Sueldo",
    });
    await service.execute({ userId: "u1", currency: "USD", amount: "1" });

    expect(uow.transactions.map((t) => t.description)).toEqual([
      "Sueldo",
      "Depósito USD",
    ]);
  });

  it("creates the wallet on the first deposit", async () => {
    expect(uow.walletOf("new-user", "ARS")).toBeUndefined();

    await service.execute({
      userId: "new-user",
      currency: "ARS",
      amount: "500",
    });

    expect(uow.walletOf("new-user", "ARS")?.balance.toString()).toBe("500.00");
  });

  it("fails with a conflict and writes nothing when the wallet version moved", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });
    uow.injectVersionConflicts(1);

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "500" }),
    ).rejects.toThrow(ConflictException);

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1000.00");
    expect(uow.transactions).toHaveLength(0);
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("rolls the balance back when the transaction record cannot be written", async () => {
    uow.seedWallet({ userId: "u1", currency: "ARS", balance: "1000" });
    uow.injectTransactionFailure(new Error("insert failed"));

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "500" }),
    ).rejects.toThrow("insert failed");

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe("1000.00");
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("rejects more decimals than the currency allows before touching anything", async () => {
    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "10.123" }),
    ).rejects.toThrow(BadRequestException);

    expect(uow.walletOf("u1", "ARS")).toBeUndefined();
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("answers 422 and writes nothing when the deposit would push the balance past the ceiling", async () => {
    uow.seedWallet({
      userId: "u1",
      currency: "ARS",
      balance: "999999999999.99",
    });

    await expect(
      service.execute({ userId: "u1", currency: "ARS", amount: "0.02" }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe(
      "999999999999.99",
    );
    expect(uow.transactions).toHaveLength(0);
    expect(webhooks.dispatch).not.toHaveBeenCalled();
  });

  it("still accepts a deposit that lands exactly on the largest balance", async () => {
    uow.seedWallet({
      userId: "u1",
      currency: "ARS",
      balance: "999999999999.98",
    });

    await service.execute({ userId: "u1", currency: "ARS", amount: "0.01" });

    expect(uow.walletOf("u1", "ARS")?.balance.toString()).toBe(
      "999999999999.99",
    );
  });

  it("dispatches deposit.confirmed with the raw amount after the commit", async () => {
    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "500",
    });

    expect(webhooks.dispatch).toHaveBeenCalledWith({
      type: "deposit.confirmed",
      data: {
        walletId: result.walletId,
        userId: "u1",
        amount: "500",
        currency: "ARS",
        transactionId: result.id,
      },
    });
  });

  it("still succeeds when the webhook dispatch fails", async () => {
    webhooks.dispatch.mockRejectedValue(new Error("endpoint down"));

    const result = await service.execute({
      userId: "u1",
      currency: "ARS",
      amount: "500",
    });

    expect(result.type).toBe("DEPOSIT");
  });
});
