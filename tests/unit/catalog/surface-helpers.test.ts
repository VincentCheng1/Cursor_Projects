import { describe, expect, it } from "vitest";

import { collectTcgLeafCategories } from "@/lib/ebay/taxonomy";
import { GAME_CATEGORY_NAME_HINTS } from "@/lib/tcgplayer/category-map";

describe("public data surface helpers", () => {
  it("maps game name hints for TCGplayer category discovery", () => {
    const pokemonHints = GAME_CATEGORY_NAME_HINTS.pokemon ?? [];
    const onePieceHints = GAME_CATEGORY_NAME_HINTS["one-piece"] ?? [];
    expect(pokemonHints.some((h) => "Pokémon TCG".toLowerCase().includes(h))).toBe(true);
    expect(onePieceHints.some((h) => "One Piece Card Game".toLowerCase().includes(h))).toBe(true);
  });

  it("collects eBay TCG leaf categories from taxonomy nodes", () => {
    const leaves = collectTcgLeafCategories({
      categoryId: "1",
      categoryName: "Root",
      childCategoryTreeNodes: [
        {
          categoryId: "2",
          categoryName: "Collectibles",
          childCategoryTreeNodes: [
            {
              categoryId: "183454",
              categoryName: "Pokémon Individual Cards",
              leafCategoryTreeNode: true,
            },
            {
              categoryId: "999",
              categoryName: "Stamps",
              leafCategoryTreeNode: true,
            },
            {
              categoryId: "261044",
              categoryName: "One Piece TCG",
              leafCategoryTreeNode: true,
            },
          ],
        },
      ],
    });

    const ids = leaves.map((l) => l.categoryId);
    expect(ids).toContain("183454");
    expect(ids).toContain("261044");
    expect(ids).not.toContain("999");
  });
});
