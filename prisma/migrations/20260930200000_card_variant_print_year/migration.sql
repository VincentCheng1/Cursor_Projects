-- Optional print-year override on variants when printings differ within a set (spec §30b).
-- Existing rows stay NULL and continue to use Set.releaseDate year for filters/labels.
ALTER TABLE "card_variants" ADD COLUMN "printYear" INTEGER;
