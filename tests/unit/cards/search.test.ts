import { describe, expect, it } from "vitest";

import { buildCardSearchWhere } from "@/lib/cards/search";

describe("buildCardSearchWhere", () => {
  it("includes query and game filter", () => {
    const where = buildCardSearchWhere({
      q: "Charizard",
      game: "pokemon",
      limit: 10,
      offset: 0,
    });
    expect(where.OR).toBeDefined();
    expect(where.game).toEqual({ slug: "pokemon" });
  });
});
