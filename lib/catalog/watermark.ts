import type { Prisma } from "@/lib/db/generated/client";
import { getPrisma } from "@/lib/db/client";

import type { CatalogProviderId, CatalogSurfaceKey } from "./types";

export async function getWatermark(provider: CatalogProviderId, surface: CatalogSurfaceKey) {
  return getPrisma().catalogSyncWatermark.findUnique({
    where: { provider_surface: { provider, surface } },
  });
}

export async function listWatermarks(provider?: CatalogProviderId) {
  return getPrisma().catalogSyncWatermark.findMany({
    where: provider !== undefined ? { provider } : undefined,
    orderBy: [{ provider: "asc" }, { surface: "asc" }],
  });
}

export async function markWatermarkSuccess(input: {
  provider: CatalogProviderId;
  surface: CatalogSurfaceKey;
  rowCount: number;
  cursor?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  const { provider, surface, rowCount, cursor, metadata } = input;
  return getPrisma().catalogSyncWatermark.upsert({
    where: { provider_surface: { provider, surface } },
    create: {
      provider,
      surface,
      rowCount,
      cursor: cursor ?? null,
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
      metadata: metadata ?? undefined,
    },
    update: {
      rowCount,
      cursor: cursor ?? null,
      lastSuccessAt: new Date(),
      lastErrorAt: null,
      lastErrorMessage: null,
      metadata: metadata ?? undefined,
    },
  });
}

export async function markWatermarkError(input: {
  provider: CatalogProviderId;
  surface: CatalogSurfaceKey;
  message: string;
  metadata?: Prisma.InputJsonValue;
}) {
  const { provider, surface, message, metadata } = input;
  return getPrisma().catalogSyncWatermark.upsert({
    where: { provider_surface: { provider, surface } },
    create: {
      provider,
      surface,
      rowCount: 0,
      lastErrorAt: new Date(),
      lastErrorMessage: message,
      metadata: metadata ?? undefined,
    },
    update: {
      lastErrorAt: new Date(),
      lastErrorMessage: message,
      metadata: metadata ?? undefined,
    },
  });
}
