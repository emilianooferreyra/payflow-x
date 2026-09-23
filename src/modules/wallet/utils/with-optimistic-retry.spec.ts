import {
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { withOptimisticRetry } from "./with-optimistic-retry";

type TransactionRunner = (tx: unknown) => Promise<unknown>;
type TransactionMock = jest.Mock<Promise<unknown>, [TransactionRunner]>;

const makePrisma = (transaction: TransactionMock) =>
  ({ $transaction: transaction }) as unknown as PrismaService;

const sqlError = (sqlState: string) =>
  Object.assign(new Error("db error"), { sqlState });

const commitError = (sqlState: string) =>
  Object.assign(new Error("Transaction commit failed"), {
    code: "RUNTIME.TRANSACTION_COMMIT_FAILED",
    cause: sqlError(sqlState),
  });

const prismaError = (code: string) =>
  Object.assign(new Error("prisma error"), { code });

describe("withOptimisticRetry", () => {
  it("returns the result without retrying when the transaction succeeds", async () => {
    const transaction = jest.fn().mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("retries on ConflictException and succeeds on the second attempt", async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(new ConflictException("Optimistic lock conflict"))
      .mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("retries on a serialization failure (sqlState 40001)", async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(sqlError("40001"))
      .mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("retries on a deadlock (sqlState 40P01)", async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(sqlError("40P01"))
      .mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("retries when the retryable code only appears on error.cause", async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(commitError("40001"))
      .mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("retries on a unique constraint violation (P2002)", async () => {
    const transaction = jest
      .fn()
      .mockRejectedValueOnce(prismaError("P2002"))
      .mockResolvedValue("ok");

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).resolves.toBe("ok");
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry business errors — retrying insufficient balance would be a money bug", async () => {
    const businessError = new UnprocessableEntityException(
      "Insufficient balance",
    );
    const transaction = jest.fn().mockRejectedValue(businessError);

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).rejects.toThrow(businessError);
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("does not retry unknown database errors", async () => {
    const transaction = jest.fn().mockRejectedValue(sqlError("23505"));

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).rejects.toThrow("db error");
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("gives up after the maximum number of attempts and rethrows the original error", async () => {
    const conflict = new ConflictException("Optimistic lock conflict");
    const transaction = jest.fn().mockRejectedValue(conflict);

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).rejects.toThrow(conflict);
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("does not loop forever when the error cause is self-referential", async () => {
    const selfReferential: Record<string, unknown> = { message: "weird" };
    selfReferential.cause = selfReferential;
    const transaction = jest.fn().mockRejectedValue(selfReferential);

    await expect(
      withOptimisticRetry(makePrisma(transaction), async () => "ok"),
    ).rejects.toBe(selfReferential);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
