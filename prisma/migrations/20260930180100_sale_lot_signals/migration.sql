-- AlterTable
ALTER TABLE "sales" ADD COLUMN "copiesCovered" INTEGER;
ALTER TABLE "sales" ADD COLUMN "isLot" BOOLEAN NOT NULL DEFAULT false;
