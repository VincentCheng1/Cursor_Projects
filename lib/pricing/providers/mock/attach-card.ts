import type { CardIdentifier } from "../../types/card";
import type { Sale } from "../../types/sale";

/** Binds mock fixture sales to the catalogue card under test (e2e / unit). */
export function attachCardToSales(sales: Sale[], card: CardIdentifier): Sale[] {
  return sales.map((sale) => ({
    ...sale,
    cardId: card.cardId,
    variantId: card.variantId,
    game: card.game,
    cardName: card.cardName,
    setName: card.setName,
    setCode: card.setCode,
    cardNumber: card.cardNumber,
    variantName: card.variantName,
    printing: card.printing,
    language: card.language,
  }));
}
