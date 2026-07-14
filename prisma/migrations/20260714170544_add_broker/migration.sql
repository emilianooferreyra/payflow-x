-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "feeBuyPct" DECIMAL(6,3) NOT NULL,
    "feeSellPct" DECIMAL(6,3) NOT NULL,
    "feeMaxPct" DECIMAL(6,3),
    "feeMinArs" DECIMAL(12,2),
    "ivaOnFees" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionMonthlyArs" DECIMAL(12,2),
    "subscriptionNotes" TEXT,
    "custodyPctAnnual" DECIMAL(6,3),
    "custodyMinMonthlyArs" DECIMAL(12,2),
    "custodyNotes" TEXT,
    "feeNotes" TEXT,
    "sources" JSONB NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Broker_slug_key" ON "Broker"("slug");

-- CreateIndex
CREATE INDEX "Broker_isActive_idx" ON "Broker"("isActive");
