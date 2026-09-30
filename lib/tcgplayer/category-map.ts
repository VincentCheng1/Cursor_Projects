/**
 * Maps CardVault game slugs to TCGplayer category ids when known.
 * Override via TCGPLAYER_CATEGORY_MAP=pokemon:3,one-piece:68
 * Discovery via listCategories still runs so unmapped games can resolve by name.
 */
export function tcgplayerCategoryMapFromEnv(): Map<string, string> {
  const map = new Map<string, string>();
  const raw = process.env.TCGPLAYER_CATEGORY_MAP;
  if (raw !== undefined && raw !== "") {
    for (const part of raw.split(",")) {
      const [slug, id] = part.split(":").map((s) => s.trim());
      if (slug && id) map.set(slug, id);
    }
  }
  return map;
}

/** Name fragments used only to match public category rows to seeded games — not card inventing. */
export const GAME_CATEGORY_NAME_HINTS: Record<string, string[]> = {
  pokemon: ["pokemon", "pokémon"],
  "one-piece": ["one piece"],
};
