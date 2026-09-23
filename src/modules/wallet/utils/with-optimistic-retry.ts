import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Prisma } from "../../../generated/prisma/client.js";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 5;
const MAX_CAUSE_DEPTH = 3;

/**
 * Postgres serialization failure and deadlock. Prisma does not retry write
 * conflicts, so they surface here and must be retried explicitly.
 */
const RETRYABLE_SQL_STATES = new Set(["40001", "40P01"]);

/**
 * Unique constraint violation. Prisma's upsert is a read followed by a write,
 * so concurrent first-time inserts race and all but one fail with P2002.
 */
const RETRYABLE_PRISMA_CODES = new Set(["P2002"]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Backoff with jitter: without it, contending transactions retry in lockstep
 * and collide again on the same tick.
 */
const backoffMs = (attempt: number) =>
  BASE_DELAY_MS * 2 ** attempt + Math.random() * BASE_DELAY_MS;

function hasRetryableCode(error: unknown, depth = 0): boolean {
  if (depth > MAX_CAUSE_DEPTH || typeof error !== "object" || error === null) {
    return false;
  }

  const { sqlState, code, cause } = error as {
    sqlState?: unknown;
    code?: unknown;
    cause?: unknown;
  };

  if (typeof sqlState === "string" && RETRYABLE_SQL_STATES.has(sqlState))
    return true;
  if (typeof code === "string" && RETRYABLE_PRISMA_CODES.has(code)) return true;

  // A conflict raised at commit time arrives as RUNTIME.TRANSACTION_COMMIT_FAILED
  // with the database error nested in `cause`.
  return (
    cause !== undefined && cause !== error && hasRetryableCode(cause, depth + 1)
  );
}

function isRetryable(error: unknown): boolean {
  return error instanceof ConflictException || hasRetryableCode(error);
}

export async function withOptimisticRetry<T>(
  prisma: PrismaService,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }

      await sleep(backoffMs(attempt));
    }
  }

  throw lastError;
}
