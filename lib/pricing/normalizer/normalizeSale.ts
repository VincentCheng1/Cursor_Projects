import type { CardIdentifier } from "../types/card";
import type { Condition } from "../types/condition";
import type { GradingCompany } from "../types/grading";
import { isGradingCompany, normalizeGrade } from "../types/grading";
import type { MoneyValue, Sale, SaleSource } from "../types/sale";
import { isValidMoney, roundMoney, toDecimal } from "../money";
import { detectMultiCardLot } from "./detectLot";
import { normalizeCondition } from "./normalizeCondition";
import { normalizeCurrency } from "./normalizeCurrency";
import { normalizeLanguage } from "./text";

/**
 * Context supplied by the provider that fetched the sale: the card CardVault
 * asked about. Providers query per card, so this is known, not inferred.
 */
export interface SaleNormalizationContext extends CardIdentifier {
  /** Fallback currency when the payload omits one. Providers set this from their API contract. */
  defaultCurrency?: string;
}

export interface RawSaleInput {
  source: SaleSource;
  externalSaleId?: string | null;
  price?: MoneyValue | null;
  shipping?: MoneyValue | null;
  total?: MoneyValue | null;
  currency?: string | null;
  saleDate?: string | number | Date | null;
  condition?: string | null;
  language?: string | null;
  gradingCompany?: string | null;
  grade?: string | null;
  variantName?: string | null;
  printing?: string | null;
  listingTitle?: string | null;
  listingUrl?: string | null;
  sellerName?: string | null;
  imageUrl?: string | null;
  /** Copies of the card the price covers, when the source states it (spec §16). */
  copiesCovered?: number | null;
  rawData?: unknown;
}

function parseDate(value: RawSaleInput["saleDate"]): Date | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseGradingCompany(value: string | null | undefined): GradingCompany | undefined {
  if (value === null || value === undefined) return undefined;
  const upper = value.trim().toUpperCase();
  if (upper === "") return undefined;
  if (isGradingCompany(upper)) return upper;
  if (upper === "UNGRADED" || upper === "NONE") return "RAW";
  return "OTHER";
}

function optional(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Builds the internal `Sale` from a provider's already-extracted fields.
 *
 * Returns `null` when the record lacks a usable price or sale date. A record
 * that cannot be trusted is dropped, never patched up with a guess (spec §5).
 */
export function buildSale(
  input: RawSaleInput,
  context: SaleNormalizationContext = {},
): Sale | null {
  const saleDate = parseDate(input.saleDate);
  if (saleDate === null) return null;

  if (!isValidMoney(input.price)) return null;
  const salePrice = toDecimal(input.price as MoneyValue);
  if (salePrice.isNegative()) return null;

  const currency = normalizeCurrency(input.currency ?? context.defaultCurrency ?? null);
  if (currency === undefined) return null;

  const shipping = isValidMoney(input.shipping) ? toDecimal(input.shipping) : undefined;
  const providedTotal = isValidMoney(input.total) ? toDecimal(input.total) : undefined;

  // Trust an explicit total only when it is at least the sale price; otherwise
  // derive it, so shipping can never be counted twice or subtracted (spec §19).
  const total =
    providedTotal !== undefined && providedTotal.greaterThanOrEqualTo(salePrice)
      ? providedTotal
      : shipping !== undefined
        ? salePrice.plus(shipping)
        : undefined;

  const gradingCompany = parseGradingCompany(input.gradingCompany);
  const grade = gradingCompany === undefined || gradingCompany === "RAW"
    ? undefined
    : normalizeGrade(input.grade);

  const condition: Condition | undefined = normalizeCondition(input.condition);

  const listingTitle = optional(input.listingTitle);
  const copiesCovered =
    typeof input.copiesCovered === "number" && Number.isFinite(input.copiesCovered)
      ? input.copiesCovered
      : undefined;

  return {
    source: input.source,
    externalSaleId: optional(input.externalSaleId),

    cardId: context.cardId,
    variantId: context.variantId,
    game: context.game,
    cardName: context.cardName,
    setName: context.setName,
    setCode: context.setCode,
    cardNumber: context.cardNumber,
    variantName: optional(input.variantName) ?? context.variantName,
    printing: optional(input.printing) ?? context.printing,

    condition,
    language: normalizeLanguage(input.language ?? context.language ?? null),

    gradingCompany,
    grade,

    salePrice: roundMoney(salePrice).toFixed(2),
    shippingPrice: shipping === undefined ? undefined : roundMoney(shipping).toFixed(2),
    totalPrice: total === undefined ? undefined : roundMoney(total).toFixed(2),

    currency,
    saleDate,

    copiesCovered,
    isLot: detectMultiCardLot(listingTitle),

    listingTitle,
    listingUrl: optional(input.listingUrl),
    sellerName: optional(input.sellerName),
    imageUrl: optional(input.imageUrl),

    rawData: input.rawData,
  };
}

// ---------------------------------------------------------------------------
// Source-specific adapters (spec §15)
// ---------------------------------------------------------------------------

/**
 * One row of TCGplayer sales history — the data behind a card's
 * "View More Data" panel — as CardVault needs it.
 *
 * Field names follow TCGplayer's sales-history vocabulary. The concrete wire
 * mapping is finished in the TCGplayer provider once authorized access exists;
 * until then nothing calls this with production data.
 */
export interface TCGPlayerSalesHistoryRecord {
  /** TCGplayer's own identifier for the transaction, when the feed supplies one. */
  transactionId?: string | null;
  condition?: string | null;
  variant?: string | null;
  language?: string | null;
  /** Unit sale price, excluding shipping. */
  purchasePrice?: MoneyValue | null;
  shippingPrice?: MoneyValue | null;
  /** ISO timestamp of the completed order. */
  orderDate?: string | null;
  /** Number of copies in the transaction. `purchasePrice` above is per copy. */
  quantity?: number | null;
  title?: string | null;
  listingUrl?: string | null;
}

/**
 * TCGplayer sales history prices each row per copy, so a three-copy order is
 * three copies at a single-card price — not a lot listing (spec §16). The row
 * therefore covers exactly one card regardless of `quantity`.
 */
const TCGPLAYER_COPIES_PER_ROW = 1;

export function normalizeTCGPlayerSale(
  record: TCGPlayerSalesHistoryRecord,
  context: SaleNormalizationContext,
): Sale | null {
  return buildSale(
    {
      source: "TCGPLAYER",
      externalSaleId: record.transactionId,
      price: record.purchasePrice,
      shipping: record.shippingPrice,
      currency: "USD",
      saleDate: record.orderDate,
      condition: record.condition,
      language: record.language,
      // TCGplayer sales history covers ungraded singles; graded slabs are a
      // separate catalogue entry, so a row here is confidently raw.
      gradingCompany: "RAW",
      variantName: record.variant,
      printing: record.variant,
      listingTitle: record.title,
      listingUrl: record.listingUrl,
      copiesCovered: TCGPLAYER_COPIES_PER_ROW,
      rawData: record,
    },
    { ...context, defaultCurrency: "USD" },
  );
}

/**
 * A completed/sold eBay item as CardVault needs it. Active listings must never
 * reach this function (spec §14).
 */
export interface EbaySoldItemRecord {
  itemId?: string | null;
  title?: string | null;
  itemWebUrl?: string | null;
  image?: { imageUrl?: string | null } | null;
  seller?: { username?: string | null } | null;
  condition?: string | null;
  price?: { value?: MoneyValue | null; currency?: string | null } | null;
  shippingCost?: { value?: MoneyValue | null; currency?: string | null } | null;
  /** Timestamp at which the sale completed. */
  lastSoldDate?: string | null;
  /** Grading parsed from the listing's item specifics, when present and unambiguous. */
  gradingCompany?: string | null;
  grade?: string | null;
  language?: string | null;
}

export function normalizeEbaySale(
  record: EbaySoldItemRecord,
  context: SaleNormalizationContext,
): Sale | null {
  return buildSale(
    {
      source: "EBAY",
      externalSaleId: record.itemId,
      price: record.price?.value,
      shipping: record.shippingCost?.value,
      currency: record.price?.currency,
      saleDate: record.lastSoldDate,
      condition: record.condition,
      language: record.language,
      gradingCompany: record.gradingCompany,
      grade: record.grade,
      listingTitle: record.title,
      listingUrl: record.itemWebUrl,
      sellerName: record.seller?.username,
      imageUrl: record.image?.imageUrl,
      rawData: record,
    },
    context,
  );
}
