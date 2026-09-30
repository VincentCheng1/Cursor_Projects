-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('MAIN', 'PROMO', 'OTHER');

-- AlterTable
ALTER TABLE "sets" ADD COLUMN "setType" "SetType" NOT NULL DEFAULT 'MAIN';

-- CreateTable
CREATE TABLE "tracker_series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "colorIndex" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracker_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracker_series_userId_idx" ON "tracker_series"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "tracker_series_userId_cardId_variantId_key" ON "tracker_series"("userId", "cardId", "variantId");

-- AddForeignKey
ALTER TABLE "tracker_series" ADD CONSTRAINT "tracker_series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracker_series" ADD CONSTRAINT "tracker_series_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracker_series" ADD CONSTRAINT "tracker_series_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "card_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
