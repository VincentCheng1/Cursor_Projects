import type { SaleSource } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

import { saleFingerprint } from "../calculator/deduplicateSales";
import type { Sale } from "../types/sale";

/**
 * Persists normalized provider sales without duplicating existing rows (§17).
 *
 * Only sales already attributed to `cardId` are written. Keyword hits that failed
 * conservative listing attribution (no `cardId`, or a different one) are skipped
 * so persistence cannot forge CardVault identity (spec §5, §16).
 *
 * `variantId` is taken from the sale only — never from the caller's requested
 * identity — so eBay keyword hits that confirmed the card but not the printing
 * do not get a forged variant FK.
 */
export async function upsertSalesForCard(sales: Sale[], cardId: string, _variantId?: string) {
  let processed = 0;
  let failed = 0;
  const prisma = getPrisma();

  for (const sale of sales) {
    if (sale.cardId !== cardId) {
      continue;
    }

    try {
      const source = sale.source as SaleSource;
      const externalSaleId = sale.externalSaleId?.trim() || null;
      const fingerprint = saleFingerprint(sale);

      const existing =
        externalSaleId !== null
          ? await prisma.sale.findUnique({
              where: { source_externalSaleId: { source, externalSaleId } },
            })
          : await prisma.sale.findUnique({
              where: { source_fingerprint: { source, fingerprint } },
            });

      const data = {
        cardId: sale.cardId,
        variantId: sale.variantId ?? null,
        game: sale.game ?? null,
        cardName: sale.cardName ?? null,
        setName: sale.setName ?? null,
        cardNumber: sale.cardNumber ?? null,
        condition: sale.condition ?? null,
        language: sale.language ?? null,
        gradingCompany: sale.gradingCompany ?? null,
        grade: sale.grade ?? null,
        salePrice: sale.salePrice.toString(),
        shippingPrice: sale.shippingPrice?.toString() ?? null,
        totalPrice: sale.totalPrice?.toString() ?? null,
        currency: sale.currency,
        saleDate: sale.saleDate,
        listingTitle: sale.listingTitle ?? null,
        listingUrl: sale.listingUrl ?? null,
        sellerName: sale.sellerName ?? null,
        imageUrl: sale.imageUrl ?? null,
        copiesCovered: sale.copiesCovered ?? null,
        isLot: sale.isLot ?? false,
        rawData: sale.rawData as object | undefined,
      };

      if (existing === null) {
        await prisma.sale.create({
          data: {
            source,
            externalSaleId,
            fingerprint: externalSaleId === null ? fingerprint : null,
            ...data,
          },
        });
      } else {
        await prisma.sale.update({
          where: { id: existing.id },
          data,
        });
      }
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return { processed, failed };
}
