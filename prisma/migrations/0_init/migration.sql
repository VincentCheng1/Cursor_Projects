-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('DAMAGED', 'HEAVILY_PLAYED', 'MODERATELY_PLAYED', 'LIGHTLY_PLAYED', 'NEAR_MINT');

-- CreateEnum
CREATE TYPE "GradingCompany" AS ENUM ('RAW', 'PSA', 'CGC', 'BGS', 'SGC', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleSource" AS ENUM ('TCGPLAYER', 'EBAY');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('TCGPLAYER', 'EBAY', 'COMBINED');

-- CreateEnum
CREATE TYPE "SyncJobType" AS ENUM ('SYNC_CARD_SALES', 'CALCULATE_CARD_PRICE', 'SNAPSHOT_PRICE', 'REFRESH_COLLECTION');

-- CreateEnum
CREATE TYPE "SyncJobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "releaseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cardNumber" TEXT NOT NULL,
    "rarity" TEXT,
    "imageUrl" TEXT,
    "externalIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_variants" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "printing" TEXT,
    "language" TEXT NOT NULL DEFAULT 'EN',
    "isFoil" BOOLEAN NOT NULL DEFAULT false,
    "isParallel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "card_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantId" TEXT,
    "condition" "Condition" NOT NULL,
    "gradingCompany" "GradingCompany" NOT NULL DEFAULT 'RAW',
    "grade" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DECIMAL(12,2),
    "purchaseDate" TIMESTAMP(3),
    "purchaseSource" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantId" TEXT,
    "targetPrice" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "source" "SaleSource" NOT NULL,
    "externalSaleId" TEXT,
    "cardId" TEXT,
    "variantId" TEXT,
    "game" TEXT,
    "cardName" TEXT,
    "setName" TEXT,
    "cardNumber" TEXT,
    "condition" "Condition",
    "language" TEXT,
    "gradingCompany" "GradingCompany",
    "grade" TEXT,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "shippingPrice" DECIMAL(12,2),
    "totalPrice" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "saleDate" TIMESTAMP(3) NOT NULL,
    "listingTitle" TEXT,
    "listingUrl" TEXT,
    "sellerName" TEXT,
    "imageUrl" TEXT,
    "rawData" JSONB,
    "fingerprint" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_snapshots" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "variantId" TEXT,
    "source" "PriceSource" NOT NULL,
    "condition" "Condition",
    "gradingCompany" "GradingCompany",
    "grade" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "averagePrice" DECIMAL(12,2),
    "medianPrice" DECIMAL(12,2),
    "minimumPrice" DECIMAL(12,2),
    "maximumPrice" DECIMAL(12,2),
    "salesUsed" INTEGER NOT NULL,
    "salesAvailable" INTEGER NOT NULL,
    "oldestSaleDate" TIMESTAMP(3),
    "newestSaleDate" TIMESTAMP(3),
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" "SyncJobType" NOT NULL,
    "status" "SyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "games_slug_key" ON "games"("slug");

-- CreateIndex
CREATE INDEX "sets_gameId_idx" ON "sets"("gameId");

-- CreateIndex
CREATE INDEX "sets_name_idx" ON "sets"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sets_gameId_code_key" ON "sets"("gameId", "code");

-- CreateIndex
CREATE INDEX "cards_name_idx" ON "cards"("name");

-- CreateIndex
CREATE INDEX "cards_cardNumber_idx" ON "cards"("cardNumber");

-- CreateIndex
CREATE INDEX "cards_setId_idx" ON "cards"("setId");

-- CreateIndex
CREATE INDEX "cards_gameId_idx" ON "cards"("gameId");

-- CreateIndex
CREATE INDEX "cards_rarity_idx" ON "cards"("rarity");

-- CreateIndex
CREATE UNIQUE INDEX "cards_setId_cardNumber_name_key" ON "cards"("setId", "cardNumber", "name");

-- CreateIndex
CREATE INDEX "card_variants_cardId_idx" ON "card_variants"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "card_variants_cardId_variantName_printing_language_key" ON "card_variants"("cardId", "variantName", "printing", "language");

-- CreateIndex
CREATE INDEX "collection_items_userId_idx" ON "collection_items"("userId");

-- CreateIndex
CREATE INDEX "collection_items_userId_cardId_idx" ON "collection_items"("userId", "cardId");

-- CreateIndex
CREATE INDEX "collection_items_cardId_idx" ON "collection_items"("cardId");

-- CreateIndex
CREATE INDEX "watchlist_items_userId_idx" ON "watchlist_items"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_userId_cardId_variantId_key" ON "watchlist_items"("userId", "cardId", "variantId");

-- CreateIndex
CREATE INDEX "sales_cardId_idx" ON "sales"("cardId");

-- CreateIndex
CREATE INDEX "sales_saleDate_idx" ON "sales"("saleDate");

-- CreateIndex
CREATE INDEX "sales_source_idx" ON "sales"("source");

-- CreateIndex
CREATE INDEX "sales_cardId_variantId_condition_gradingCompany_grade_saleD_idx" ON "sales"("cardId", "variantId", "condition", "gradingCompany", "grade", "saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "sales_source_externalSaleId_key" ON "sales"("source", "externalSaleId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_source_fingerprint_key" ON "sales"("source", "fingerprint");

-- CreateIndex
CREATE INDEX "price_snapshots_cardId_idx" ON "price_snapshots"("cardId");

-- CreateIndex
CREATE INDEX "price_snapshots_calculatedAt_idx" ON "price_snapshots"("calculatedAt");

-- CreateIndex
CREATE INDEX "price_snapshots_cardId_variantId_source_calculatedAt_idx" ON "price_snapshots"("cardId", "variantId", "source", "calculatedAt");

-- CreateIndex
CREATE INDEX "sync_jobs_provider_type_createdAt_idx" ON "sync_jobs"("provider", "type", "createdAt");

-- CreateIndex
CREATE INDEX "sync_jobs_status_idx" ON "sync_jobs"("status");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets" ADD CONSTRAINT "sets_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_variants" ADD CONSTRAINT "card_variants_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "card_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "card_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "card_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "card_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
