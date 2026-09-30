-- AlterEnum: Phase 13a public-data sync job types (spec §14b / §32).
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_TCGPLAYER_CATEGORIES';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_TCGPLAYER_SETS';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_TCGPLAYER_PRODUCTS';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_EBAY_TAXONOMY';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_EBAY_CATALOG_LINKS';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_EBAY_SOLD_LISTINGS';
ALTER TYPE "SyncJobType" ADD VALUE 'SYNC_PUBLIC_DATA';

-- CreateTable
CREATE TABLE "catalog_sync_watermarks" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "cursor" TEXT,
    "lastSuccessAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_sync_watermarks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_sync_watermarks_provider_idx" ON "catalog_sync_watermarks"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sync_watermarks_provider_surface_key" ON "catalog_sync_watermarks"("provider", "surface");
