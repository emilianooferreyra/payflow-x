/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Session` table. All the data in the column will be lost.
  - Added the required column `lastUsedAt` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Session_expiresAt_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "updatedAt",
ADD COLUMN     "lastUsedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Session_userAgent_idx" ON "Session"("userAgent");
