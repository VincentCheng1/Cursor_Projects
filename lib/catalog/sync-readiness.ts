import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcaIsConfigured } from "@/lib/tca/config";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

import { EBAY_SURFACES, TCGPLAYER_SURFACES } from "./surfaces";
import type { CatalogProviderId, CatalogSurfaceKey } from "./types";

/** Env var names required for a marketplace provider (never includes secret values). */
export const MARKETPLACE_ENV_VARS = {
  TCGPLAYER: ["TCGPLAYER_CLIENT_ID", "TCGPLAYER_CLIENT_SECRET"] as const,
  EBAY: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"] as const,
} as const;

/** Optional eBay sold-comps replacement via The Card API (names only). */
export const TCA_ENV_VARS = ["TCA_API_KEY", "TCA_API_BASE"] as const;

export type MarketplaceEnvVar =
  | (typeof MARKETPLACE_ENV_VARS.TCGPLAYER)[number]
  | (typeof MARKETPLACE_ENV_VARS.EBAY)[number]
  | (typeof TCA_ENV_VARS)[number]
  | "EBAY_ENVIRONMENT"
  | "TCGPLAYER_API_BASE"
  | "TCGPLAYER_SALES_HISTORY_URL_TEMPLATE"
  | "TCGPLAYER_CATEGORY_MAP";

export type ProviderReadiness = {
  id: CatalogProviderId;
  displayName: string;
  configured: boolean;
  /** Present when configured; never the secret values. */
  requiredEnvVars: readonly string[];
  missingEnvVars: string[];
  surfacesThatWouldRun: CatalogSurfaceKey[];
  pricingReady: boolean;
  catalogReady: boolean;
  statusMessage: string;
};

export type SyncReadiness = {
  /** True when at least one marketplace provider has credentials set. */
  canRunPublicDataSync: boolean;
  /** True when at least one pricing provider has credentials set. */
  canRefreshPrices: boolean;
  providers: ProviderReadiness[];
  /** Surfaces that would execute on a real SYNC_PUBLIC_DATA run. */
  surfacesEnabled: Array<{ provider: CatalogProviderId; surface: CatalogSurfaceKey }>;
  surfacesSkipped: Array<{
    provider: CatalogProviderId;
    surface: CatalogSurfaceKey;
    reason: string;
  }>;
  /** Operator-facing next steps (no secrets, no invented catalog). */
  nextSteps: string[];
  summary: string;
  /** Marks this object as a dry-run / readiness report — no catalog writes occurred. */
  dryRun: true;
  checkedAt: string;
};

function envPresent(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== "";
}

function missingRequired(vars: readonly string[]): string[] {
  return vars.filter((name) => !envPresent(name));
}

function providerReadiness(id: CatalogProviderId): ProviderReadiness {
  if (id === "TCGPLAYER") {
    const required = MARKETPLACE_ENV_VARS.TCGPLAYER;
    const configured = tcgplayerIsConfigured();
    const missingEnvVars = missingRequired(required);
    if (configured) {
      return {
        id,
        displayName: "TCGplayer",
        configured: true,
        requiredEnvVars: required,
        missingEnvVars: [],
        surfacesThatWouldRun: [...TCGPLAYER_SURFACES],
        pricingReady: true,
        catalogReady: true,
        statusMessage:
          "TCGplayer credentials are set. Catalog sync and sales refresh may run against authorized APIs only.",
      };
    }
    return {
      id,
      displayName: "TCGplayer",
      configured: false,
      requiredEnvVars: required,
      missingEnvVars,
      surfacesThatWouldRun: [],
      pricingReady: false,
      catalogReady: false,
      statusMessage: `TCGplayer integration not configured. Set ${missingEnvVars.join(" and ")} in the server environment, then restart the app. No catalog or sales will be fetched until then.`,
    };
  }

  // EBAY slot: OAuth covers catalog + Finding; TCA_API_KEY covers sold comps / pricing only.
  const oauth = ebayIsConfigured();
  const tca = tcaIsConfigured();
  const configured = oauth || tca;
  const required = MARKETPLACE_ENV_VARS.EBAY;
  const missingEnvVars = oauth || tca ? [] : missingRequired(required);

  if (oauth) {
    return {
      id,
      displayName: "eBay",
      configured: true,
      requiredEnvVars: required,
      missingEnvVars: [],
      surfacesThatWouldRun: [...EBAY_SURFACES],
      pricingReady: true,
      catalogReady: true,
      statusMessage: tca
        ? "eBay OAuth credentials are set (catalog). TCA_API_KEY is also set — sold comps prefer The Card API Market /sales."
        : "eBay credentials are set. Catalog sync and sales refresh may run against authorized APIs only.",
    };
  }

  if (tca) {
    return {
      id,
      displayName: "eBay",
      configured: true,
      requiredEnvVars: ["TCA_API_KEY"],
      missingEnvVars: [],
      surfacesThatWouldRun: ["sold_listings"],
      pricingReady: true,
      catalogReady: false,
      statusMessage:
        "TCA_API_KEY is set (The Card API). eBay sold comps / pricing may refresh; taxonomy and catalog-links still need EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.",
    };
  }

  return {
    id,
    displayName: "eBay",
    configured: false,
    requiredEnvVars: required,
    missingEnvVars,
    surfacesThatWouldRun: [],
    pricingReady: false,
    catalogReady: false,
    statusMessage:
      "eBay sold comps not configured. Set TCA_API_KEY (The Card API) for completed eBay sales, or EBAY_CLIENT_ID and EBAY_CLIENT_SECRET for Finding + catalog.",
  };
}

/**
 * Safe sync readiness / dry-run report (spec §5 / §12 / §14b).
 * Never calls marketplace APIs, never invents cards or sales, never returns secret values.
 */
export function getSyncReadiness(): SyncReadiness {
  const providers = [providerReadiness("TCGPLAYER"), providerReadiness("EBAY")];
  const surfacesEnabled: SyncReadiness["surfacesEnabled"] = [];
  const surfacesSkipped: SyncReadiness["surfacesSkipped"] = [];

  for (const p of providers) {
    const allSurfaces = p.id === "TCGPLAYER" ? TCGPLAYER_SURFACES : EBAY_SURFACES;
    const enabled = new Set(p.surfacesThatWouldRun);
    for (const surface of allSurfaces) {
      if (enabled.has(surface)) {
        surfacesEnabled.push({ provider: p.id, surface });
      } else {
        surfacesSkipped.push({
          provider: p.id,
          surface,
          reason: p.configured
            ? `${p.displayName} is configured for pricing/sold comps only; ${surface} needs full marketplace credentials.`
            : p.statusMessage,
        });
      }
    }
  }

  const canRunPublicDataSync = providers.some((p) => p.configured);
  const canRefreshPrices = canRunPublicDataSync;
  const nextSteps: string[] = [];

  for (const p of providers) {
    if (!p.configured) {
      nextSteps.push(
        `Set ${p.missingEnvVars.join(" and ")} (from .env.example) for ${p.displayName}, then restart the Node process.`,
      );
    }
  }

  if (canRunPublicDataSync) {
    nextSteps.push(
      "As an admin, open /admin/diagnostics and confirm pricing providers show Ready.",
    );
    nextSteps.push(
      'Click "Check sync readiness" (dry-run) to confirm which surfaces will run — no catalog writes.',
    );
    nextSteps.push(
      'Click "Run public data sync" to ingest authorized catalog/sold data (rate-limited).',
    );
    nextSteps.push(
      "After catalog rows exist, refresh card prices via collection refresh or POST /api/sync with SNAPSHOT_PRICE / SYNC_CARD_SALES for specific cards.",
    );
  } else {
    nextSteps.push(
      "Until at least one marketplace provider is configured, public data sync and live sales refresh stay disabled. Seeded games remain searchable; no fake catalog is generated.",
    );
  }

  const configuredNames = providers.filter((p) => p.configured).map((p) => p.displayName);
  const summary =
    configuredNames.length === 0
      ? "No marketplace credentials configured. Sync readiness dry-run only — fail closed; no catalog backfill and no invented sales."
      : `Ready for authorized sync with: ${configuredNames.join(", ")}. Dry-run reports surfaces only; run public data sync to ingest real API data.`;

  return {
    canRunPublicDataSync,
    canRefreshPrices,
    providers,
    surfacesEnabled,
    surfacesSkipped,
    nextSteps,
    summary,
    dryRun: true,
    checkedAt: new Date().toISOString(),
  };
}
