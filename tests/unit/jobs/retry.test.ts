import { describe, expect, it, vi } from "vitest";

import { backoffDelayMs, withRetries } from "@/lib/jobs/retry";

describe("job retry backoff", () => {
  it("doubles delay per attempt", () => {
    expect(backoffDelayMs(0, { maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 8000 })).toBe(
      1000,
    );
    expect(backoffDelayMs(2, { maxAttempts: 4, baseDelayMs: 1000, maxDelayMs: 8000 })).toBe(
      4000,
    );
  });

  it("withRetries succeeds after transient failure", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("rate limit"))
      .mockResolvedValue({ processed: 1, failed: 0, errors: [] });

    const result = await withRetries(
      async () => fn(),
      { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 10 },
    );
    expect(result.processed).toBe(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
