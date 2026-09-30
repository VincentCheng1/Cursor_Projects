import type { Condition } from "./condition";
import type { GradingCompany } from "./grading";

export const SALE_SOURCES = ["TCGPLAYER", "EBAY"] as const;
export type SaleSource = (typeof SALE_SOURCES)[number];

/**
 * Monetary input accepted by the engine.
 *
 * Strings are allowed so values can travel straight from PostgreSQL `numeric`
 * columns (Prisma `Decimal`) into the calculator without a lossy float hop (spec §58).
 */
export type MoneyValue = number | string;

/**
 * A completed marketplace transaction, normalized to a single internal shape
 * regardless of source (spec §13, §15).
 *
 * An active listing is never a Sale (spec §14).
 */
export interface Sale {
  source: SaleSource;
  externalSaleId?: string;

  /** Resolved CardVault card this sale belongs to. Empty when unmatched. */
  cardId?: string;
  variantId?: string;

  // Descriptive identity carried from the marketplace, used for conservative matching (spec §16).
  game?: string;
  cardName?: string;
  setName?: string;
  setCode?: string;
  cardNumber?: string;
  variantName?: string;
  printing?: string;

  condition?: Condition;
  language?: string;

  gradingCompany?: GradingCompany;
  grade?: string;

  /**
   * How many copies of the card `salePrice` covers.
   *
   * A sale only qualifies when it represents exactly one copy (spec §16). Sources
   * that report a per-copy unit price set this to 1; anything greater means the
   * price covers a lot and the sale is excluded rather than divided down.
   */
  copiesCovered?: number;

  /** Set when the listing was identified as a lot, bundle, playset or complete set. */
  isLot?: boolean;

  salePrice: MoneyValue;
  shippingPrice?: MoneyValue;
  totalPrice?: MoneyValue;

  currency: string;
  saleDate: Date;

  listingTitle?: string;
  listingUrl?: string;
  sellerName?: string;
  imageUrl?: string;

  /** Untouched provider payload, retained so any calculation can be audited. */
  rawData?: unknown;
}
