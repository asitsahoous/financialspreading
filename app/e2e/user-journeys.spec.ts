import { test, expect } from "@playwright/test";

async function resetDemo(page: import("@playwright/test").Page) {
  await page.goto("/");
  page.on("dialog", (dialog) => dialog.accept());
  const reset = page.getByRole("button", { name: "Reset demo" });
  if (await reset.isVisible()) {
    await reset.click();
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Financial analyst user journeys", () => {
  test.beforeEach(async ({ page }) => {
    await resetDemo(page);
  });

  test("Journey 1 — Command Center → Walmart Review (exceptions tab)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Since your last login")).toBeVisible();
    await page.getByRole("button", { name: "Review mapping" }).click();
    await expect(page.getByText("Walmart Inc. Spread", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Exceptions \(1\)/ })).toBeVisible();
    await expect(page.getByText("Review Agent exception")).toBeVisible();
  });

  test("Journey 2 — Walmart resolve exception → Gate 2 → Assessment", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: "Open Trust Inspector" }).click();
    await expect(page.getByRole("button", { name: "Accept mapping" })).toBeVisible();
    await page.getByRole("button", { name: "Accept mapping" }).click();
    await expect(page.getByText("Accepted mapping for Total Assets").first()).toBeVisible();
    await expect(page.getByText("All exceptions resolved")).toBeVisible();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await expect(page.getByText("Gate 2 signed — Risk Agent released for assessment")).toBeVisible();
    await expect(page.getByText("Gate 3 pending").first()).toBeVisible();
    await expect(page.getByText("Ratio formulas — Risk Agent preview")).toBeVisible();
  });

  test("Journey 3 — Gate 2 blocked until exception resolved", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await expect(page.getByText("Resolve mapping exceptions before signing Gate 2")).toBeVisible();
    await expect(page.getByText("Gate 2 pending").first()).toBeVisible();
  });

  test("Journey 4 — Northern Retail sad path intake override", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Resolve completeness" }).click();
    await expect(page.getByText("Northern Retail LLC", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Override with reason (logged)" }).click();
    await expect(page.getByText("Intake override logged")).toBeVisible();
    await expect(page.getByText("Gate 1 blocked").first()).toBeVisible();
  });

  test("Journey 5 — Cases list Walmart Negotiate opens intake", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await page.getByRole("button", { name: "Negotiate" }).first().click();
    await expect(page.getByText("Walmart Inc. Spread", { exact: true })).toBeVisible();
    await expect(page.getByTestId("intake-doc-count-header")).toHaveText("04/04 Documents Uploaded");
    await expect(page.getByText("Next Best Action")).toBeVisible();
  });

  test("Journey 6 — Lifecycle rail navigation", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: "Intake stage" }).click();
    await expect(page.getByText("Intake — stage trace")).toBeVisible();
    await page.getByRole("button", { name: "Extraction stage" }).click();
    await expect(page.getByText("Extraction — stage trace")).toBeVisible();
  });

  test("Journey 7 — Full Walmart case to Gate 5", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: "Open Trust Inspector" }).click();
    await page.getByRole("button", { name: "Accept mapping" }).click();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await page.getByRole("button", { name: "Sign Gate 3 — Approve risk assessment" }).click();
    await expect(page.getByText("Gate 4 pending").first()).toBeVisible();
    await page.getByRole("button", { name: "Credit Memo stage" }).click();
    await page.getByRole("button", { name: "Sign Gate 4 — Approve memo" }).click();
    await page.getByRole("button", { name: "Sign Gate 5 — Approve committee decision" }).click();
    await expect(page.getByText("Gate 5 signed")).toBeVisible();
    await expect(page.getByText("Case closed").first()).toBeVisible();
  });

  test("Journey 8 — Northern Retail happy path through Gate 5", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Resolve completeness" }).click();
    await expect(page.getByText("Northern Retail LLC", { exact: true }).first()).toBeVisible();

    const upload = page.getByTestId("intake-upload-button");
    for (let i = 0; i < 7; i++) {
      await upload.click();
    }
    await expect(page.getByTestId("intake-doc-count-header")).toHaveText("09/09 Documents Uploaded");

    await page.getByRole("button", { name: "Sign Gate 1 — Approve document set" }).click();
    await expect(page.getByText("Gate 1 signed — pipeline unlocked for extraction")).toBeVisible();

    await page.getByRole("button", { name: "Review stage", exact: true }).click();
    await page.getByRole("button", { name: /Exceptions \(1\)/ }).click();
    await page.getByRole("button", { name: "Open Trust Inspector" }).click();
    await page.getByRole("button", { name: "Accept mapping" }).click();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await page.getByRole("button", { name: "Sign Gate 3 — Approve risk assessment" }).click();
    await page.getByRole("button", { name: "Credit Memo stage" }).click();
    await page.getByRole("button", { name: "Sign Gate 4 — Approve memo" }).click();
    await page.getByRole("button", { name: "Sign Gate 5 — Approve committee decision" }).click();
    await expect(page.getByText("Case closed").first()).toBeVisible();
  });

  test("Journey 9 — SOP viewer opens from intake table", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Resolve completeness" }).click();
    await page.getByTestId("sop-link-4.2.3").click();
    await expect(page.getByTestId("sop-viewer-panel")).toBeVisible();
    await expect(page.getByText("§4.2.3 — Q3 cash flow statement")).toBeVisible();
  });

  test("Journey 10 — AutoWest Motors opens its own real workspace, not Walmart's", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Cases", exact: true }).click();
    await page
      .locator("tr")
      .filter({ hasText: "AutoWest Motors" })
      .getByRole("button", { name: "Resolve" })
      .click();
    await expect(page.getByText("AutoWest Motors", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Master financial database")).toBeVisible();
    await expect(page.getByText("Floor Plan")).toBeVisible();
    // must NOT fall back to the Walmart template — this borrower has its own data
    await expect(page.getByText("Walmart Inc. Spread", { exact: true })).toHaveCount(0);
  });

  test("Journey 11 — All CASE_ROWS routes open without error", async ({ page }) => {
    const rows: { entity: string; action: string }[] = [
      { entity: "Walmart Inc.", action: "Negotiate" },
      { entity: "AutoWest Motors", action: "Resolve" },
      { entity: "Tesla Rental Corp", action: "Resolve" },
      { entity: "Vantage Rental", action: "Review" },
      { entity: "Hertz Global", action: "Review" },
      { entity: "Mercedes Benz", action: "Review" },
      { entity: "Sixt SE (US Ops)", action: "Review" },
      { entity: "Coastal Hyundai", action: "Review" },
      { entity: "Northern Retail LLC", action: "Resolve" },
    ];

    await page.goto("/");
    await page.getByRole("button", { name: "Cases", exact: true }).click();

    // These two borrowers now have real data on the master database.
    const realSpreadRows = new Set(["AutoWest Motors", "Coastal Hyundai"]);
    // Remaining synthetic rows stay on the honest "Portfolio drill-down" illustrative pattern.
    const portfolioRows = new Set([
      "Tesla Rental Corp",
      "Vantage Rental",
      "Hertz Global",
      "Mercedes Benz",
      "Sixt SE (US Ops)",
    ]);

    for (const row of rows) {
      await page
        .locator("tr")
        .filter({ hasText: row.entity })
        .getByRole("button", { name: row.action })
        .click();
      if (row.entity === "Northern Retail LLC") {
        await expect(page.getByText("Northern Retail LLC", { exact: true }).first()).toBeVisible();
      } else if (realSpreadRows.has(row.entity)) {
        await expect(page.getByText(row.entity, { exact: true }).first()).toBeVisible();
        await expect(page.getByText("Master financial database")).toBeVisible();
        await page.getByRole("button", { name: "Cases", exact: true }).click();
        continue;
      } else if (portfolioRows.has(row.entity)) {
        await expect(page.getByText(`Portfolio drill-down: ${row.entity}`)).toBeVisible();
      } else {
        await expect(page.getByText("Walmart Inc. Spread", { exact: true })).toBeVisible();
      }
      await page.getByRole("button", { name: "Cases", exact: true }).click();
    }
  });

  test("Journey 12 — Insight and Agents tabs smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "InSight", exact: true }).click();
    await expect(page.getByText("Portfolio Summary", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByText("Last 24h agent actions")).toBeVisible();
    await expect(page.getByText("Intake & Completeness", { exact: false })).toBeVisible();
  });

  test("Journey 13 — Northern Retail Credit Memo sad path connectors", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Resolve completeness" }).click();
    await page.getByRole("button", { name: "Credit Memo stage" }).click();
    await expect(page.getByText("Connector Trust Panel", { exact: true })).toBeVisible();
    await expect(page.getByText("Memo blocked — intake incomplete")).toBeVisible();
    await expect(page.getByText("Awaiting complete financials — score pull deferred")).toBeVisible();
  });

  test("Journey 14 — Trust Layer panel from tab bar and banner", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("trust-layer-button").click();
    const panel = page.getByTestId("trust-layer-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Trust Fabric · lending surfaces")).toBeVisible();
    await expect(panel.getByText("Human gates", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "×" }).click();
    await expect(panel).not.toBeVisible();

    await page.getByRole("button", { name: "View trust model" }).click();
    await expect(page.getByTestId("trust-layer-panel")).toBeVisible();
  });

  test("Journey 15 — InSight tab drills to Walmart Review", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "InSight", exact: true }).click();
    await expect(page.getByText("Agent auto-pass rate")).toBeVisible();
    await page.getByRole("button", { name: "View case stage → Review" }).click();
    await expect(page.getByText("Walmart Inc. Spread", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Exceptions \(1\)/ })).toBeVisible();
  });

  test("Journey 16 — Reset demo restores fresh Gate 2 state", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: "Open Trust Inspector" }).click();
    await page.getByRole("button", { name: "Accept mapping" }).click();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await expect(page.getByText("Gate 2 signed — Risk Agent released for assessment")).toBeVisible();

    await page.getByRole("button", { name: "Reset demo" }).click();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await expect(page.getByText("Gate 2 pending").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Exceptions \(1\)/ })).toBeVisible();
  });

  test("Journey 17 — Financial Spread master database + live integrity", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Financial Spread" }).click();
    await expect(page.getByText("Master financial database").first()).toBeVisible();
    // Walmart is the default borrower — its own seeded defect (PP&E scale error)
    await expect(page.getByTestId("integrity-banner")).toContainText("Integrity check failed for FY2025");
    // period columns present in the standardised spread
    await expect(page.getByTestId("cell-IS.REVENUE-FY2023")).toBeVisible();
    await expect(page.getByTestId("cell-IS.REVENUE-FY2025")).toBeVisible();
  });

  test("Journey 18 — In-cell correction recomputes and re-balances (Meridian)", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Financial Spread" }).click();
    await page.getByTestId("company-meridian").click();
    await expect(page.getByTestId("integrity-banner")).toContainText("off by 23,670");
    await page.getByTestId("cell-BS.INVENTORY-FY2025").click();
    await page.getByTestId("edit-value").fill("26300");
    await page.getByTestId("edit-rationale").fill("Source page 2 shows 26,300 — OCR scale error corrected");
    await page.getByTestId("save-correction").click();
    await expect(page.getByTestId("integrity-banner")).toContainText("Integrity checks pass for FY2025");
    await expect(page.getByText("Change history (case lifecycle)")).toBeVisible();
  });

  test("Journey 19 — Ingest prior-year statement grows the master DB", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Financial Spread" }).click();
    await expect(page.getByTestId("cell-IS.REVENUE-FY2022")).toHaveCount(0);
    await page.getByTestId("ingest-fy2022").click();
    await expect(page.getByTestId("cell-IS.REVENUE-FY2022")).toBeVisible();
  });

  test("Journey 20 — Trends, Ratios, Health analytics tabs render", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Financial Spread" }).click();
    await page.getByTestId("subtab-trends").click();
    await expect(page.getByText("Trend — YoY growth")).toBeVisible();
    await page.getByTestId("subtab-ratios").click();
    await expect(page.getByText("Policy threshold")).toBeVisible();
    await page.getByTestId("subtab-health").click();
    await expect(page.getByText("Composite health", { exact: false })).toBeVisible();
  });

  test("Journey 21 — Portfolio switcher moves between all four real borrowers", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Financial Spread" }).click();
    await expect(page.getByText("Walmart Inc.", { exact: true }).first()).toBeVisible();
    await page.getByTestId("company-autowest").click();
    await expect(page.getByText("AutoWest Motors", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Floor Plan")).toBeVisible();
    await expect(page.getByTestId("integrity-banner")).toContainText("Integrity check failed");
    await page.getByTestId("company-coastal-hyundai").click();
    await expect(page.getByText("Coastal Hyundai", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Annual Review")).toBeVisible();
    await expect(page.getByTestId("integrity-banner")).toContainText("Integrity checks pass");
  });

  test("Journey 22 — Trust Inspector opens as a full overlay from the Exceptions tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: /Exceptions \(1\)/ }).click();
    // Scroll down first — this is exactly the state that used to make the inspector look broken.
    await page.mouse.wheel(0, 1200);
    await page.getByTestId("inspect-exception-total-assets").click();
    const overlay = page.getByTestId("trust-inspector-overlay");
    await expect(overlay).toBeVisible();
    const box = await overlay.boundingBox();
    expect(box?.y).toBeLessThanOrEqual(1);
    // SOP link inside the inspector must cite the field it's actually attached to.
    await page.getByTestId("trust-inspector-sop-link").click();
    await expect(page.getByTestId("sop-viewer-panel")).toContainText("§7.7");
    await expect(page.getByTestId("sop-viewer-panel")).toContainText("Total Assets");
  });

  test("Journey 23 — Confidence filter narrows the Extracted table", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByRole("button", { name: /Extracted \(140\)/ }).click();
    await expect(page.getByText(/Showing 1.*of 140 fields/)).toBeVisible();
    await page.getByTestId("confidence-filter-review").click();
    // Filtered to the 1 review-confidence row — under one page, so no pagination text.
    await expect(page.getByText(/Showing/)).toHaveCount(0);
    await expect(page.getByRole("row", { name: /Total Assets \$100K/ })).toBeVisible();
    await page.getByTestId("confidence-filter-review").click();
    await expect(page.getByText(/Showing 1.*of 140 fields/)).toBeVisible();
  });

  test("Journey 24 — Gate 5 committee can Decline, not just approve or override", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Review mapping" }).click();
    await page.getByTestId("inspect-exception-total-assets").click();
    await page.getByRole("button", { name: "Accept mapping" }).click();
    await page.getByRole("button", { name: "Sign Gate 2 — Approve spread" }).click();
    await page.getByRole("button", { name: "Sign Gate 3 — Approve risk assessment" }).click();
    await page.getByRole("button", { name: "Credit Memo stage" }).click();
    await page.getByRole("button", { name: "Sign Gate 4 — Approve memo" }).click();
    await page.getByTestId("gate5-decline").click();
    await expect(page.getByText("Gate 5 — Declined").first()).toBeVisible();
    await expect(page.getByText(/DECLINED.*No appeal gate beyond Gate 5/).first()).toBeVisible();
    // All three committee actions lock once a decision is recorded.
    await expect(page.getByRole("button", { name: "Sign Gate 5 — Approve committee decision" })).toBeDisabled();
    await expect(page.getByTestId("gate5-decline")).toBeDisabled();
    await expect(page.getByTestId("gate5-table")).toBeDisabled();
  });
});
