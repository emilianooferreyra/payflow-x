import { ConflictException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import type { Prisma } from "../../../generated/prisma/client.js";

const MAX_RETRIES = 3;
const UNREACHABLE = new Error("Unreachable");

export async function withOptimisticRetry<T>(
  prisma: PrismaService,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn);
    } catch (error) {
      if (error instanceof ConflictException && attempt < MAX_RETRIES - 1) {
        continue;
      }
      throw error;
    }
  }

  throw UNREACHABLE;
}
