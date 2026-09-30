import { expect, test } from "@playwright/test";

import { signInPage } from "./auth";

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

type SeedPayload = {
  email: string;
  password: string;
  cardId: string;
  cardName: string;
  variantId: string | null;
};

type PricingExpectations = {
  average: number;
  salesUsed: number;
  usedSales: Array<{ source: string; effectivePrice: number }>;
};

test.describe("CardVault journey (spec §40)", () => {
  test.setTimeout(120_000);

  test("search, collect, refresh mocks, verify value and sales used", async ({ page, request, baseURL }) => {
    const seedRes = await request.post("/api/e2e/seed");
    expect(seedRes.ok()).toBeTruthy();
    const seed = (await seedRes.json()) as SeedPayload;

    const expRes = await request.post("/api/e2e/pricing-expectations", {
      data: { cardId: seed.cardId, variantId: seed.variantId ?? undefined },
    });
    expect(expRes.ok()).toBeTruthy();
    const expectations = (await expRes.json()) as PricingExpectations;
    expect(expectations.average).not.toBeNull();

    const quantity = 2;
    const purchasePricePerCopy = 50;
    const expectedCollectionValue = expectations.average * quantity;
    const expectedProfit =
      expectations.average * quantity - purchasePricePerCopy * quantity;

    page.on("dialog", (dialog) => dialog.accept());

    await signInPage(page, baseURL!, seed.email, seed.password);
    await expect(page.getByTestId("dashboard-collection-value")).toBeVisible();

    await page.goto("/search");
    await page.getByTestId("card-search-input").fill(seed.cardName);
    await page.getByTestId("card-search-submit").click();
    await page.getByRole("link", { name: seed.cardName }).click();
    await expect(page.getByRole("heading", { name: seed.cardName })).toBeVisible();

    await page.goto("/search");
    await page.getByTestId("card-search-input").fill(seed.cardName);
    await page.getByTestId("card-search-submit").click();
    await page.getByTestId(`add-to-collection-${seed.cardId}`).click();

    await page.goto("/collection");
    await expect(page.getByText(seed.cardName)).toBeVisible();
    const qtyLocator = page.locator('[data-testid^="collection-quantity-"]').first();
    await qtyLocator.locator("..").getByRole("button", { name: "+" }).click();
    await expect(qtyLocator).toHaveText("2");

    const purchaseInput = page.locator('[data-testid^="purchase-price-"]').first();
    await purchaseInput.fill(String(purchasePricePerCopy));
    await purchaseInput.blur();

    await page.goto(`/cards/${seed.cardId}`);
    await page.getByTestId("refresh-price").click();
    await expect(page.getByText("Price updated.")).toBeVisible({ timeout: 15_000 });

    await expect(page.getByTestId("current-value")).toHaveText(formatUsd(expectations.average));
    await expect(page.getByTestId("sales-used-count")).toContainText(
      `Based on ${expectations.salesUsed} recent sales`,
    );

    await page.goto("/dashboard");
    await expect(page.getByTestId("dashboard-collection-value")).toHaveText(
      formatUsd(expectedCollectionValue),
    );
    await expect(page.getByTestId("dashboard-profit")).toHaveText(formatUsd(expectedProfit));

    await page.goto(`/cards/${seed.cardId}`);
    await page.getByTestId("view-sales-used").click();
    const rows = page.getByTestId("sales-used-row");
    await expect(rows).toHaveCount(expectations.salesUsed);

    const rowTexts = await rows.allTextContents();
    const expectedBySource = new Map(
      expectations.usedSales.map((s) => [
        `${s.source}-${s.effectivePrice.toFixed(2)}`,
        s,
      ]),
    );
    for (const text of rowTexts) {
      const match = expectations.usedSales.find(
        (s) => text.includes(s.source) && text.includes(formatUsd(s.effectivePrice)),
      );
      expect(match, `Unexpected sales row: ${text}`).toBeTruthy();
      expectedBySource.delete(`${match!.source}-${match!.effectivePrice.toFixed(2)}`);
    }
    expect(expectedBySource.size).toBe(0);
  });
});
