import { expect, test } from "@playwright/test";

import { extendedHallmarkBrowserFixtureSave } from "../extended_hallmark_browser_fixture.mjs";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const EXTENDED_HALLMARK_HEADINGS = [
  "Deregulating cellular metabolism",
  "Avoiding immune destruction",
  "Tumor-promoting inflammation",
  "Genome instability and mutation",
];

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

async function seedFixture(page) {
  const envelope = JSON.parse(extendedHallmarkBrowserFixtureSave());
  envelope.savedAtMs = Date.now();
  const raw = JSON.stringify(envelope);
  await page.addInitScript(
    ({ key, value }) => {
      if (window.sessionStorage.getItem("extended-hallmark-fixture-seeded") !== "1") {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem("extended-hallmark-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, value: raw },
  );
}

async function savedState(page) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw).state;
}

function branchRow(page, heading) {
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: heading }) });
}

async function acquireAllExtendedHallmarks(page) {
  for (const heading of EXTENDED_HALLMARK_HEADINGS) {
    const row = branchRow(page, heading);
    await expect(row.locator(".hallmark-status")).toHaveText("Available");
    await row.getByRole("button", { name: "Acquire capability" }).click();
    await expect(row.locator(".hallmark-status")).toHaveText("Acquired");
  }
}

test("extended-hallmark real Solid controls expose ATP conversion and all four durable branches", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await seedFixture(page);
  await page.goto("/?debug=1");
  await acquireAllExtendedHallmarks(page);

  const metabolic = branchRow(page, EXTENDED_HALLMARK_HEADINGS[0]);
  await expect(metabolic.getByLabel("ATP meter")).toHaveText(/9\.00 ATP units/);
  await expect(metabolic).toContainText("never creates cells");
  const cellsBefore = (await savedState(page)).cells;
  await metabolic.getByLabel("Mantissa (1-9)").fill("2");
  await metabolic.getByRole("button", { name: "Convert substrate to ATP" }).click();
  const converted = await savedState(page);
  expect(converted.substrate).toEqual({ mantissa: 7, exponent: 0 });
  expect(converted.atp).toEqual({ mantissa: 1.1, exponent: 1 });
  expect(converted.cells).toEqual(cellsBefore);
  await expect(metabolic.getByLabel("ATP meter")).toHaveText(/11\.00 ATP units/);

  const acceleration = page.getByLabel("Producer acceleration ATP allocation");
  await acceleration.fill("100");
  await acceleration.press("Tab");
  await expect(metabolic).toContainText(
    "Producer acceleration: inactive: vessel maintenance must be reserved first",
  );
  await expect(metabolic).toContainText(
    "Vessel maintenance: insufficient reserve for all active links",
  );
  await expect(metabolic).toContainText(/Reserve 25 units per link; maintenance debits 1 ATP/);
  await expect(metabolic).toContainText(/Required 50, allocated 0/);
  const vesselMaintenance = page.getByLabel("Vessel maintenance ATP allocation");
  await vesselMaintenance.fill("50");
  await vesselMaintenance.press("Tab");
  await expect(metabolic).toContainText("Vessel maintenance: reserved for every active link");
  await expect(metabolic).toContainText(/Producer acceleration: active:/);
  await expect(metabolic).toContainText(/Required 50, allocated 50/);
  expect((await savedState(page)).atpBudget["vessel-maintenance"]).toBe(50);
  const mycBefore = await page.locator('[data-producer-id="myc"] .cost-note').textContent();
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  const mycAfter = await page.locator('[data-producer-id="myc"] .cost-note').textContent();
  expect(mycAfter).not.toBe(mycBefore);
  expect((await savedState(page)).atp.mantissa).toBeLessThan(11);
  await acceleration.fill("0");
  await acceleration.press("Tab");

  const immune = branchRow(page, EXTENDED_HALLMARK_HEADINGS[1]);
  await immune.getByRole("button", { name: "Spend token to conceal" }).first().click();
  await expect(immune).toContainText(/Concealment tokens: 1/);
  await expect(immune).toContainText(/concealed; local producer contribution 0\.7x/);
  await immune.getByRole("button", { name: "Restore immune visibility" }).first().click();
  await expect(immune).toContainText(/Concealment tokens: 2/);

  const inflammation = branchRow(page, EXTENDED_HALLMARK_HEADINGS[2]);
  await inflammation.getByRole("button", { name: "Activate inflammation" }).first().click();
  await expect(inflammation).toContainText(/\+1 route discovery per second/);
  await expect(inflammation).toContainText("active through");
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  await expect(inflammation).toContainText("no active episode");

  const mutation = branchRow(page, EXTENDED_HALLMARK_HEADINGS[3]);
  const drafting = page.getByLabel("Mutation drafting ATP allocation");
  await drafting.fill("25");
  await drafting.press("Tab");
  await expect(metabolic).toContainText(/Mutation drafting: ready:/);
  await expect(metabolic).toContainText(/Reserve 25 units; choosing a saved card costs 1 ATP/);
  await metabolic.getByLabel("Mantissa (1-9)").fill("5");
  await metabolic.getByRole("button", { name: "Convert substrate to ATP" }).click();
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  const cards = mutation.locator(".mutation-offer-card");
  await expect(cards).toHaveCount(3);
  const names = await cards.getByRole("heading").allTextContents();
  expect(new Set(names).size).toBe(3);
  const selected = names[0];
  expect(selected).toBeTruthy();
  const selectedId = selected.toLowerCase().replaceAll(" ", "_");
  expect((await savedState(page)).atp).toEqual({ mantissa: 8, exponent: 0 });
  await mutation.getByRole("button", { name: `Select ${selected}` }).focus();
  await expect(mutation.getByRole("button", { name: `Select ${selected}` })).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(mutation.getByText("No funded mutation offer is pending.")).toBeVisible();
  await expect(page.locator("#mutation-offer-title")).toBeFocused();
  const selectedState = await savedState(page);
  expect(selectedState.atp).toEqual({ mantissa: 7, exponent: 0 });
  expect(selectedState.chosenMutations).toEqual([selectedId]);
  expect(selectedState.mutationLiabilities).toEqual([selectedId]);
  await page.reload();
  const reloaded = await savedState(page);
  expect(reloaded.chosenMutations).toEqual([selectedId]);
  expect(reloaded.mutationLiabilities).toEqual([selectedId]);
  expect(diagnostics).toEqual([]);
});

test("extended-hallmark recovery protection disables live hallmarks and preserves unreadable raw storage", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  const corruptRaw = "{extended-hallmark-corrupt-save";
  await page.addInitScript(({ key, raw }) => window.localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: corruptRaw,
  });
  await page.goto("/");
  const mutations = page.locator("button:not(#replace-unreadable-save)");
  expect(
    await mutations.evaluateAll((buttons) =>
      buttons.every((button) => button instanceof HTMLButtonElement && button.disabled),
    ),
  ).toBe(true);
  expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY)).toBe(corruptRaw);
  expect(diagnostics).toEqual([]);
});

test("extended-hallmark controls remain keyboard reachable and touch-sized at 360px in reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const diagnostics = installDiagnostics(page);
    await seedFixture(page);
    await page.goto("/?debug=1");
    await acquireAllExtendedHallmarks(page);
    const tree = page.getByRole("region", { name: "The core six capabilities" });
    const dimensions = await tree.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { label: button.textContent?.trim(), width: box.width, height: box.height };
      }),
    );
    for (const control of dimensions) {
      expect(control.width, control.label).toBeGreaterThanOrEqual(44);
      expect(control.height, control.label).toBeGreaterThanOrEqual(44);
    }
    const pageState = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      transition: getComputedStyle(document.querySelector("button")).transitionDuration,
    }));
    expect(pageState.overflow).toBe(false);
    expect(pageState.reduced).toBe(true);
    expect(Number.parseFloat(pageState.transition)).toBeLessThanOrEqual(0.01);
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
