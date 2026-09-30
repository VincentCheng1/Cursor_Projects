import { getPrisma } from "@/lib/db/client";
import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcgcsvServesTcgplayerSlot } from "@/lib/tcgcsv/config";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

import {
  EBAY_SURFACES,
  NOT_CONFIGURED_MESSAGES,
  SURFACE_DISPLAY_NAMES,
  TCGPLAYER_SURFACES,
} from "./surfaces";
import type {
  CatalogProviderId,
  CatalogSurfaceKey,
  PublicDataSurfaceStatus,
} from "./types";
import { listWatermarks } from "./watermark";

function configured(provider: CatalogProviderId): boolean {
  if (provider === "EBAY") return ebayIsConfigured();
  return tcgplayerIsConfigured() || tcgcsvServesTcgplayerSlot();
}

export async function listPublicDataSurfaceStatus(): Promise<PublicDataSurfaceStatus[]> {
  const watermarks = await listWatermarks();
  const byKey = new Map(watermarks.map((w) => [`${w.provider}:${w.surface}`, w]));

  const entries: Array<{ provider: CatalogProviderId; surface: CatalogSurfaceKey }> = [
    ...TCGPLAYER_SURFACES.map((surface) => ({ provider: "TCGPLAYER" as const, surface })),
    ...EBAY_SURFACES.map((surface) => ({ provider: "EBAY" as const, surface })),
  ];

  return entries.map(({ provider, surface }) => {
    const displayName = SURFACE_DISPLAY_NAMES[provider][surface] ?? `${provider} ${surface}`;
    const wm = byKey.get(`${provider}:${surface}`);
    if (!configured(provider)) {
      return {
        provider,
        surface,
        displayName,
        health: { status: "NOT_CONFIGURED", message: NOT_CONFIGURED_MESSAGES[provider] },
        lastSuccessAt: wm?.lastSuccessAt?.toISOString() ?? null,
        lastErrorAt: wm?.lastErrorAt?.toISOString() ?? null,
        lastErrorMessage: wm?.lastErrorMessage ?? null,
        rowCount: wm?.rowCount ?? 0,
        cursor: wm?.cursor ?? null,
      };
    }
    if (wm?.lastErrorMessage && !wm.lastSuccessAt) {
      return {
        provider,
        surface,
        displayName,
        health: { status: "ERROR", message: wm.lastErrorMessage },
        lastSuccessAt: null,
        lastErrorAt: wm.lastErrorAt?.toISOString() ?? null,
        lastErrorMessage: wm.lastErrorMessage,
        rowCount: wm.rowCount,
        cursor: wm.cursor,
      };
    }
    if (wm?.lastSuccessAt == null) {
      return {
        provider,
        surface,
        displayName,
        health: {
          status: "NEVER_SYNCED",
          message: "Public data surface has not been synced yet.",
        },
        lastSuccessAt: null,
        lastErrorAt: wm?.lastErrorAt?.toISOString() ?? null,
        lastErrorMessage: wm?.lastErrorMessage ?? null,
        rowCount: wm?.rowCount ?? 0,
        cursor: wm?.cursor ?? null,
      };
    }
    return {
      provider,
      surface,
      displayName,
      health: { status: "READY" },
      lastSuccessAt: wm.lastSuccessAt.toISOString(),
      lastErrorAt: wm.lastErrorAt?.toISOString() ?? null,
      lastErrorMessage: wm.lastErrorMessage,
      rowCount: wm.rowCount,
      cursor: wm.cursor,
    };
  });
}

export type CatalogSearchEmptyReason =
  | "provider_unconfigured"
  | "catalog_not_synced"
  | "no_match";

/**
 * Distinguishes empty search causes (§14b / admin UX):
 * unconfigured / never synced vs genuine no match.
 */
export async function resolveCatalogSearchEmptyState(): Promise<{
  reason: CatalogSearchEmptyReason;
  message: string;
  cardCount: number;
  anySurfaceSynced: boolean;
}> {
  const cardCount = await getPrisma().card.count();
  const tcgReady = tcgplayerIsConfigured() || tcgcsvServesTcgplayerSlot();
  const ebayReady = ebayIsConfigured();

  if (!tcgReady && !ebayReady) {
    return {
      reason: "provider_unconfigured",
      message:
        "Marketplace public data providers are not configured. Catalog search only covers seeded games until credentials (or CARDVAULT_PRICE_SOURCE=tcgcsv) are set and sync runs.",
      cardCount,
      anySurfaceSynced: false,
    };
  }

  const watermarks = await listWatermarks();
  const anySurfaceSynced = watermarks.some((w) => w.lastSuccessAt !== null);

  if (!anySurfaceSynced) {
    return {
      reason: "catalog_not_synced",
      message:
        "Public catalog has not been synced yet. Run admin public data sync (authorized APIs / TCGCSV public feeds only) to ingest marketplace cards.",
      cardCount,
      anySurfaceSynced: false,
    };
  }

  return {
    reason: "no_match",
    message: "No cards matched your search.",
    cardCount,
    anySurfaceSynced: true,
  };
}
