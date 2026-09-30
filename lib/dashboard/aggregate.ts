import {
  calculateCollectionValue,
  calculateItemValue,
  calculateProfit,
  calculateROI,
  calculateTotalCost,
} from "@/lib/pricing/calculator/collectionValue";

export interface DashboardCollectionRow {
  id: string;
  cardId: string;
  cardName: string;
  gameSlug: string;
  gameName: string;
  quantity: number;
  purchasePrice: number | null;
  currentCardValue: number | null;
  itemValue: number;
  profit: number | null;
  roi: number | null;
  createdAt: Date;
  updatedAt: Date;
  hasPricing: boolean;
}

export interface DashboardMetrics {
  collectionValue: number;
  totalInvested: number;
  profit: number;
  roi: number | null;
  cardsOwned: number;
  uniqueCards: number;
  pokemonValue: number;
  onePieceValue: number;
  topGainers: DashboardCollectionRow[];
  topDecliners: DashboardCollectionRow[];
  recentlyAdded: DashboardCollectionRow[];
  recentlyUpdated: DashboardCollectionRow[];
  withoutPricing: DashboardCollectionRow[];
  items: DashboardCollectionRow[];
}

export function buildDashboardMetrics(rows: DashboardCollectionRow[]): DashboardMetrics {
  const valueInputs = rows.map((r) => ({
    quantity: r.quantity,
    currentCardValue: r.currentCardValue,
    purchasePrice: r.purchasePrice,
  }));

  const collectionValue = calculateCollectionValue(valueInputs);
  const totalInvested = calculateTotalCost(valueInputs);
  const profit = calculateProfit(collectionValue, totalInvested);
  const roi = calculateROI(collectionValue, totalInvested);

  const cardsOwned = rows.reduce((sum, r) => sum + r.quantity, 0);
  const uniqueCards = new Set(rows.map((r) => r.cardId)).size;

  const pokemonValue = rows
    .filter((r) => r.gameSlug === "pokemon")
    .reduce((sum, r) => sum + r.itemValue, 0);
  const onePieceValue = rows
    .filter((r) => r.gameSlug === "one-piece")
    .reduce((sum, r) => sum + r.itemValue, 0);

  const withProfit = rows
    .map((r) => {
      if (r.purchasePrice === null || r.currentCardValue === null) return { ...r, delta: 0 };
      const delta = (r.currentCardValue - r.purchasePrice) * r.quantity;
      return { ...r, delta };
    })
    .filter((r) => r.delta !== 0);

  const topGainers = [...withProfit].sort((a, b) => b.delta - a.delta).slice(0, 5);
  const topDecliners = [...withProfit].sort((a, b) => a.delta - b.delta).slice(0, 5);

  const recentlyAdded = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 5);
  const recentlyUpdated = [...rows]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 5);
  const withoutPricing = rows.filter((r) => !r.hasPricing);

  return {
    collectionValue,
    totalInvested,
    profit,
    roi,
    cardsOwned,
    uniqueCards,
    pokemonValue,
    onePieceValue,
    topGainers,
    topDecliners,
    recentlyAdded,
    recentlyUpdated,
    withoutPricing,
    items: rows,
  };
}

export function rowFromItem(
  item: {
    id: string;
    cardId: string;
    quantity: number;
    purchasePrice: { toString(): string } | null;
    createdAt: Date;
    updatedAt: Date;
    card: {
      name: string;
      set: { game: { slug: string; name: string } };
    };
  },
  currentCardValue: number | null,
): DashboardCollectionRow {
  const purchasePrice =
    item.purchasePrice === null ? null : Number(item.purchasePrice.toString());
  const itemValue = calculateItemValue({ quantity: item.quantity, currentCardValue });
  const profit =
    purchasePrice === null || currentCardValue === null
      ? null
      : (currentCardValue - purchasePrice) * item.quantity;
  const roi =
    purchasePrice === null || purchasePrice === 0 || currentCardValue === null
      ? null
      : ((currentCardValue - purchasePrice) / purchasePrice) * 100;

  return {
    id: item.id,
    cardId: item.cardId,
    cardName: item.card.name,
    gameSlug: item.card.set.game.slug,
    gameName: item.card.set.game.name,
    quantity: item.quantity,
    purchasePrice,
    currentCardValue,
    itemValue,
    profit,
    roi,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    hasPricing: currentCardValue !== null,
  };
}
