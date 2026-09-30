import { ebayIsConfigured } from "@/lib/ebay/config";
import { tcgcsvServesTcgplayerSlot } from "@/lib/tcgcsv/config";
import { tcgplayerIsConfigured } from "@/lib/tcgplayer/config";

import { EBAY_SURFACES, TCGPLAYER_SURFACES } from "./surfaces";
import type { CatalogProviderId, CatalogSurfaceKey } from "./types";

/** Env var names required for a marketplace provider (never includes secret values). */
export const MARKETPLACE_ENV_VARS = {
  TCGPLAYER: ["TCGPLAYER_CLIENT_ID", "TCGPLAYER_CLIENT_SECRET"] as const,
  EBAY: ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET"] as const,
  /** Public TCGCSV — no secrets; listed for operator clarity. */
  TCGCSV: ["CARDVAULT_PRICE_SOURCE", "TCGCSV_ENABLED"] as const,
} as const;

export type MarketplaceEnvVar =
  | (typeof MARKETPLACE_ENV_VARS.TCGPLAYER)[number]
  | (typeof MARKETPLACE_ENV_VARS.EBAY)[number]
  | (typeof MARKETPLACE_ENV_VARS.TCGCSV)[number]
  | "EBAY_ENVIRONMENT"
  | "TCGPLAYER_API_BASE"
  | "TCGPLAYER_SALES_HISTORY_URL_TEMPLATE"
  | "TCGPLAYER_CATEGORY_MAP"
  | "TCGCSV_BASE_URL"
  | "TCGCSV_USER_AGENT"
  | "TCGCSV_MIN_INTERVAL_MS";

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
  /** When TCGCSV serves the TCGPLAYER slot. */
  dataSource?: "tcgplayer_api" | "tcgcsv";
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
  if (id === "EBAY") {
    const required = MARKETPLACE_ENV_VARS.EBAY;
    const configured = ebayIsConfigured();
    const missingEnvVars = missingRequired(required);
    if (configured) {
      return {
        id,
        displayName: "eBay",
        configured: true,
        requiredEnvVars: required,
        missingEnvVars: [],
        surfacesThatWouldRun: [...EBAY_SURFACES],
        pricingReady: true,
        catalogReady: true,
        statusMessage:
          "eBay credentials are set. Catalog sync and sales refresh may run against authorized APIs only.",
        dataSource: undefined,
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
      statusMessage: `eBay integration not configured. Set ${missingEnvVars.join(" and ")} in the server environment, then restart the app. No catalog or sales will be fetched until then.`,
    };
  }

  const tcgApi = tcgplayerIsConfigured();
  const tcgCsv = tcgcsvServesTcgplayerSlot();
  const configured = tcgApi || tcgCsv;

  if (tcgCsv) {
    return {
      id: "TCGPLAYER",
      displayName: "TCGCSV (TCGplayer public cache)",
      configured: true,
      requiredEnvVars: MARKETPLACE_ENV_VARS.TCGCSV,
      missingEnvVars: [],
      surfacesThatWouldRun: [...TCGPLAYER_SURFACES],
      // Market/mid reference only — not completed sales for the 20-sale engine.
      pricingReady: false,
      catalogReady: true,
      dataSource: "tcgcsv",
      statusMessage:
        "TCGCSV public feeds enabled (no marketplace secrets). Catalog + market/mid reference prices sync; completed-sales / §22 combined value still need official TCGplayer or eBay sales APIs.",
    };
  }

  if (tcgApi) {
    return {
      id: "TCGPLAYER",
      displayName: "TCGplayer",
      configured: true,
      requiredEnvVars: MARKETPLACE_ENV_VARS.TCGPLAYER,
      missingEnvVars: [],
      surfacesThatWouldRun: [...TCGPLAYER_SURFACES],
      pricingReady: true,
      catalogReady: true,
      dataSource: "tcgplayer_api",
      statusMessage:
        "TCGplayer credentials are set. Catalog sync and sales refresh may run against authorized APIs only.",
    };
  }

  const missingEnvVars = missingRequired(MARKETPLACE_ENV_VARS.TCGPLAYER);
  return {
    id: "TCGPLAYER",
    displayName: "TCGplayer",
    configured: false,
    requiredEnvVars: MARKETPLACE_ENV_VARS.TCGPLAYER,
    missingEnvVars,
    surfacesThatWouldRun: [],
    pricingReady: false,
    catalogReady: false,
    statusMessage: `TCGplayer integration not configured. Set ${missingEnvVars.join(" and ")}, or enable public TCGCSV with CARDVAULT_PRICE_SOURCE=tcgcsv (no secrets). No catalog or sales will be fetched until then.`,
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
    const surfaces = p.id === "TCGPLAYER" ? TCGPLAYER_SURFACES : EBAY_SURFACES;
    for (const surface of surfaces) {
      if (p.configured) {
        surfacesEnabled.push({ provider: p.id, surface });
      } else {
        surfacesSkipped.push({
          provider: p.id,
          surface,
          reason: p.statusMessage,
        });
      }
    }
  }

  const canRunPublicDataSync = providers.some((p) => p.configured);
  const canRefreshPrices = providers.some((p) => p.pricingReady);
  const nextSteps: string[] = [];

  for (const p of providers) {
    if (!p.configured) {
      if (p.id === "TCGPLAYER") {
        nextSteps.push(
          "Enable TCGplayer catalog via CARDVAULT_PRICE_SOURCE=tcgcsv (public CSVs, no secrets) or set TCGPLAYER_CLIENT_ID and TCGPLAYER_CLIENT_SECRET, then restart.",
        );
      } else {
        nextSteps.push(
          `Set ${p.missingEnvVars.join(" and ")} (from .env.example) for ${p.displayName}, then restart the Node process.`,
        );
      }
    }
  }

  if (canRunPublicDataSync) {
    nextSteps.push(
      "As an admin, open /admin/diagnostics and confirm provider status (READY = sales pricing live; TCGCSV shows UNAVAILABLE for sales).",
    );
    nextSteps.push(
      'Click "Check sync readiness" (dry-run) to confirm which surfaces will run — no catalog writes.',
    );
    nextSteps.push(
      'Click "Run public data sync" to ingest authorized catalog/sold data (rate-limited).',
    );
    if (providers.some((p) => p.dataSource === "tcgcsv")) {
      nextSteps.push(
        "TCGCSV fills catalog + market/mid reference prices only. For §22 combined value from completed sales, still configure official TCGplayer and/or eBay sales APIs.",
      );
    }
    nextSteps.push(
      "After catalog rows exist, refresh card prices via collection refresh or POST /api/sync with SNAPSHOT_PRICE / SYNC_CARD_SALES for specific cards (requires a sales-capable provider).",
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
