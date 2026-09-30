-- AlterTable
ALTER TABLE "card_variants" ADD COLUMN "referenceMarketPrice" DECIMAL(12,2);
ALTER TABLE "card_variants" ADD COLUMN "referenceMidPrice" DECIMAL(12,2);
ALTER TABLE "card_variants" ADD COLUMN "referencePriceAt" TIMESTAMP(3);
