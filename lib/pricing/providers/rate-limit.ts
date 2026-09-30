const lastCall = new Map<string, number>();

/** Minimum spacing between outbound marketplace calls per provider (spec §47, §32). */
export function waitForProviderSlot(
  providerId: string,
  minIntervalMs = Number(process.env.PROVIDER_MIN_INTERVAL_MS ?? 250),
): Promise<void> {
  const now = Date.now();
  const key = providerId;
  const last = lastCall.get(key) ?? 0;
  const wait = Math.max(0, minIntervalMs - (now - last));
  lastCall.set(key, now + wait);
  if (wait === 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, wait));
}
