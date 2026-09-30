import { expect, test } from "@playwright/test";

import { signInPage } from "./auth";

type TrackerCard = {
  cardId: string;
  variantId: string;
  cardNumber: string;
  cardName: string;
  setName: string;
  setCode: string;
  printYear: number | null;
};

type SeedPayload = {
  email: string;
  password: string;
  trackerCards: TrackerCard[];
  maxTrackerSeries: number;
};

test.describe("Multi-card price tracker (Phase 12b)", () => {
  test.setTimeout(120_000);

  test("add/remove series, range chips, chart, and max-8 cap", async ({ page, request, baseURL }) => {
    const seedRes = await request.post("/api/e2e/seed");
    expect(seedRes.ok()).toBeTruthy();
    const seed = (await seedRes.json()) as SeedPayload;
    expect(seed.trackerCards.length).toBeGreaterThanOrEqual(seed.maxTrackerSeries);

    await signInPage(page, baseURL!, seed.email, seed.password);

    await page.goto("/tracker");
    await expect(page.getByRole("heading", { name: "Price tracker" })).toBeVisible();
    await expect(page.getByTestId("tracker-empty")).toBeVisible();

    const first = seed.trackerCards[0]!;
    await page.getByTestId("tracker-add-open").click();
    await expect(page.getByTestId("tracker-add-panel")).toBeVisible();
    await page.getByTestId("tracker-card-number").fill(first.cardNumber);
    await page.getByTestId("tracker-set").fill(first.setName);
    await page.getByTestId("tracker-set-type").selectOption("MAIN");
    await page.getByTestId("tracker-foil").selectOption("false");
    await page.getByTestId("tracker-year").fill("1999");
    await page.getByTestId("tracker-resolve").click();

    await expect(page.getByTestId(`tracker-match-${first.cardId}`)).toBeVisible();
    await page.getByTestId(`tracker-add-${first.cardId}`).click();

    await expect(page.getByTestId("tracker-legend")).toBeVisible();
    await expect(page.getByTestId("tracker-series-label")).toContainText(first.cardName);
    await expect(page.getByTestId("tracker-series-label")).toContainText("1999");
    await expect(page.getByTestId("tracker-chart-ready")).toBeVisible({ timeout: 15_000 });

    // Range chips reload COMBINED history for the selected window.
    for (const range of ["7D", "30D", "90D", "1Y", "ALL"] as const) {
      await page.getByTestId(`tracker-range-${range}`).click();
      await expect(page.getByTestId(`tracker-range-${range}`)).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.getByTestId("tracker-chart-ready")).toBeVisible({ timeout: 15_000 });
    }

    const seriesRow = page.locator('[data-testid^="tracker-series-row-"]').first();
    const seriesTestId = await seriesRow.getAttribute("data-testid");
    expect(seriesTestId).toBeTruthy();
    const seriesId = seriesTestId!.replace("tracker-series-row-", "");
    await page.getByTestId(`tracker-remove-${seriesId}`).click();
    await expect(page.getByTestId("tracker-empty")).toBeVisible();

    // Fill to max via API (practical for max-8), then assert UI blocks the 9th add.
    for (const card of seed.trackerCards.slice(0, seed.maxTrackerSeries)) {
      const res = await page.request.post("/api/tracker", {
        data: { cardId: card.cardId, variantId: card.variantId },
      });
      expect(res.ok() || res.status() === 201).toBeTruthy();
    }

    await page.goto("/tracker");
    await expect(page.locator('[data-testid^="tracker-series-row-"]')).toHaveCount(
      seed.maxTrackerSeries,
    );

    // Attempt a 9th distinct series — UI should block at max 8.
    const overflow = seed.trackerCards[seed.maxTrackerSeries]!;
    expect(overflow).toBeTruthy();
    await page.getByTestId("tracker-add-open").click();
    await page.getByTestId("tracker-card-number").fill(overflow.cardNumber);
    await page.getByTestId("tracker-set").fill(overflow.setName);
    await page.getByTestId("tracker-year").fill("1999");
    await page.getByTestId("tracker-resolve").click();
    await expect(page.getByTestId(`tracker-match-${overflow.cardId}`)).toBeVisible();
    await page.getByTestId(`tracker-add-${overflow.cardId}`).click();
    await expect(page.getByTestId("tracker-add-message")).toContainText(/Maximum 8 series/i);

    const apiOverflow = await page.request.post("/api/tracker", {
      data: { cardId: overflow.cardId, variantId: overflow.variantId },
    });
    expect(apiOverflow.status()).toBe(400);
    const apiBody = (await apiOverflow.json()) as { error?: string };
    expect(apiBody.error ?? "").toMatch(/maximum 8/i);
  });
});
