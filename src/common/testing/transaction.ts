import { mockPrisma } from "./mock-prisma";

export type MockPrismaClient = typeof mockPrisma;

export type TransactionCallback<T> = (tx: MockPrismaClient) => Promise<T>;

/**
 * Makes the mocked `$transaction` run its callback against the mocked client,
 * so a service under test executes its transactional body inline.
 *
 * Exists so specs do not have to type the callback as `any`.
 */
export function runTransactionsInline(): void {
  mockPrisma.$transaction.mockImplementation(
    (callback: TransactionCallback<unknown>) => callback(mockPrisma),
  );
}
