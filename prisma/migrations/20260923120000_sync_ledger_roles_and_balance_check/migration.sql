-- CreateEnum
CREATE TYPE "RoleEnum" AS ENUM ('CUSTOMER', 'SUPPORT', 'ADMIN');

-- CreateEnum
CREATE TYPE "WalletTypeEnum" AS ENUM ('USER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LedgerDirectionEnum" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "IdempotencyStatusEnum" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReconciliationStatusEnum" AS ENUM ('OK', 'DISCREPANCY');

-- AlterEnum
ALTER TYPE "TransactionStatusEnum" ADD VALUE 'REVERSED';

-- AlterEnum
ALTER TYPE "TransactionTypeEnum" ADD VALUE 'REVERSAL';

-- AlterTable
ALTER TABLE "IdempotencyRecord" ADD COLUMN     "status" "IdempotencyStatusEnum" NOT NULL DEFAULT 'IN_PROGRESS',
ALTER COLUMN "response" DROP NOT NULL,
ALTER COLUMN "statusCode" DROP NOT NULL;

-- `updatedAt` is @updatedAt in the schema, so it carries no database default.
-- Adding it NOT NULL in a single statement fails on a table that already has
-- rows, so it is added nullable, backfilled, and only then constrained.
ALTER TABLE "IdempotencyRecord" ADD COLUMN "updatedAt" TIMESTAMP(3);
UPDATE "IdempotencyRecord" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
ALTER TABLE "IdempotencyRecord" ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "reversesTransactionId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "RoleEnum" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN     "type" "WalletTypeEnum" NOT NULL DEFAULT 'USER',
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "direction" "LedgerDirectionEnum" NOT NULL,
    "amount" DECIMAL(20,8) NOT NULL,
    "currency" "CurrencyEnum" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconciliationReport" (
    "id" TEXT NOT NULL,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ReconciliationStatusEnum" NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "ReconciliationReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_transactionId_idx" ON "LedgerEntry"("transactionId");

-- CreateIndex
CREATE INDEX "ReconciliationReport_runAt_idx" ON "ReconciliationReport"("runAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reversesTransactionId_key" ON "Transaction"("reversesTransactionId");

-- CreateIndex
CREATE INDEX "Wallet_type_currency_idx" ON "Wallet"("type", "currency");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_reversesTransactionId_fkey" FOREIGN KEY ("reversesTransactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Last line of defence for the money invariant. The aggregate enforces it in
-- application code, but a balance below zero must be impossible at the database
-- level regardless of which code path writes it.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_balance_non_negative" CHECK ("balance" >= 0);
