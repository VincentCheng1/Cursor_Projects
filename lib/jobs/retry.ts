export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: Number(process.env.SYNC_JOB_MAX_ATTEMPTS ?? 4),
  baseDelayMs: Number(process.env.SYNC_JOB_BASE_DELAY_MS ?? 1000),
  maxDelayMs: Number(process.env.SYNC_JOB_MAX_DELAY_MS ?? 60_000),
};

export function backoffDelayMs(attempt: number, options: RetryOptions = DEFAULT_RETRY): number {
  const exp = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** attempt);
  return exp;
}

export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < options.maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, backoffDelayMs(attempt, options)));
      }
    }
  }
  throw lastError;
}
