-- CreateEnum
CREATE TYPE "BeneficiaryTypeEnum" AS ENUM ('CBU', 'CVU', 'ALIAS', 'SWIFT', 'ACCOUNT_NUMBER');

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "beneficiaryType" "BeneficiaryTypeEnum" NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT,
    "currency" "CurrencyEnum" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'AR',
    "documentType" TEXT,
    "documentNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beneficiary_userId_idx" ON "Beneficiary"("userId");

-- CreateIndex
CREATE INDEX "Beneficiary_userId_currency_idx" ON "Beneficiary"("userId", "currency");

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
