import { getPrisma } from "@/lib/db/client";

import { MAX_TRACKER_SERIES, TRACKER_LINE_COLORS } from "./constants";

export async function listTrackerSeries(userId: string) {
  return getPrisma().trackerSeries.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      card: { include: { set: true } },
      variant: true,
    },
  });
}

export async function countTrackerSeries(userId: string): Promise<number> {
  return getPrisma().trackerSeries.count({ where: { userId } });
}

export async function createTrackerSeries(
  userId: string,
  data: { cardId: string; variantId?: string | null },
) {
  const prisma = getPrisma();
  const existing = await prisma.trackerSeries.count({ where: { userId } });
  if (existing >= MAX_TRACKER_SERIES) {
    throw new Error(`Tracker limit: maximum ${MAX_TRACKER_SERIES} series per chart.`);
  }

  const duplicate = await prisma.trackerSeries.findFirst({
    where: {
      userId,
      cardId: data.cardId,
      variantId: data.variantId ?? null,
    },
  });
  if (duplicate) {
    return prisma.trackerSeries.findFirstOrThrow({
      where: { id: duplicate.id },
      include: { card: { include: { set: true } }, variant: true },
    });
  }

  const colorIndex = existing % TRACKER_LINE_COLORS.length;
  return prisma.trackerSeries.create({
    data: {
      userId,
      cardId: data.cardId,
      variantId: data.variantId ?? null,
      sortOrder: existing,
      colorIndex,
    },
    include: {
      card: { include: { set: true } },
      variant: true,
    },
  });
}

export async function updateTrackerSeries(
  userId: string,
  id: string,
  data: { isVisible?: boolean; sortOrder?: number },
) {
  const updated = await getPrisma().trackerSeries.updateMany({
    where: { id, userId },
    data,
  });
  if (updated.count === 0) return null;
  return getPrisma().trackerSeries.findFirst({
    where: { id, userId },
    include: { card: { include: { set: true } }, variant: true },
  });
}

export async function deleteTrackerSeries(userId: string, id: string): Promise<boolean> {
  const result = await getPrisma().trackerSeries.deleteMany({ where: { id, userId } });
  return result.count > 0;
}

export async function getTrackerSeriesForUser(userId: string, id: string) {
  return getPrisma().trackerSeries.findFirst({
    where: { id, userId },
    include: { card: { include: { set: true } }, variant: true },
  });
}
