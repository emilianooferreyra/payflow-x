/*
  Warnings:

  - You are about to drop the column `cvv` on the `Card` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "TransactionTypeEnum" ADD VALUE 'YIELD';

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "cvv",
ADD COLUMN     "cardToken" TEXT,
ADD COLUMN     "issuer" TEXT,
ADD COLUMN     "network" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "toWalletId" TEXT;

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Transaction_toWalletId_idx" ON "Transaction"("toWalletId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_toWalletId_fkey" FOREIGN KEY ("toWalletId") REFERENCES "Wallet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
