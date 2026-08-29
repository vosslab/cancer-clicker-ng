import { expect, test } from "@playwright/test";

import {
  extendedHallmarkBrowserFixture,
  extendedHallmarkBrowserFixtureSave,
} from "../extended_hallmark_browser_fixture.mjs";
import { stageId } from "../../src/brands.ts";
import { projectLateHallmarkDurableTickEffects } from "../../src/hallmarks/late_hallmark_tick.ts";
import { perfusionMaintenanceAtpDebit } from "../../src/hallmarks/handlers/perfusion_layout.ts";
import { serializeGameState } from "../../src/state/save_load.ts";

// Selector contract: hallmark controls expose accessible tab, program, and native action names
// (src/render/evolution_dock.tsx:19; src/render/hallmark_tree.tsx:887).
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

async function installFixedClock(page) {
  await page.clock.install({ time: FIXED_CLOCK_MS });
}
const EXTENDED_HALLMARK_HEADINGS = [
  "Deregulating cellular metabolism",
  "Avoiding immune destruction",
  "Tumor-promoting inflammation",
  "Genome instability and mutation",
];
const LATE_HALLMARK_HEADINGS = [
  "Unlocking phenotypic plasticity",
  "Nonmutational epigenetic reprogramming",
  "Polymorphic microbiomes",
  "Senescent cells",
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
  envelope.savedAtMs = FIXED_CLOCK_MS;
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

function lateMicrobiomeFixtureSave() {
  const fixture = extendedHallmarkBrowserFixture();
  const activated = {
    ...fixture,
    currentStage: stageId("global_lab_contamination"),
    hallmarkLevels: fixture.hallmarkLevels.map((level) =>
      level.id === "polymorphic_microbiomes" ? { ...level, level: 1 } : level,
    ),
  };
  const durableTick = projectLateHallmarkDurableTickEffects(activated, 1);
  const state = {
    ...activated,
    lateHallmarks: {
      ...activated.lateHallmarks,
      microbiome: durableTick.microbiome,
    },
  };
  return serializeGameState(state, 1_000);
}

async function seedLateMicrobiomeFixture(page) {
  const envelope = JSON.parse(lateMicrobiomeFixtureSave());
  envelope.savedAtMs = FIXED_CLOCK_MS;
  const raw = JSON.stringify(envelope);
  await page.addInitScript(
    ({ key, value }) => {
      if (window.sessionStorage.getItem("late-microbiome-fixture-seeded") !== "1") {
        window.localStorage.setItem(key, value);
        window.sessionStorage.setItem("late-microbiome-fixture-seeded", "1");
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

function hallmarksTab(page) {
  return page.getByRole("button", { name: "Hallmarks evolution system" });
}

function hallmarkPanel(page) {
  return page.getByRole("region", { name: "Tumor progression" }).locator(".hallmark-tree");
}

async function openHallmarks(page) {
  await hallmarksTab(page).click();
  await expect(hallmarkPanel(page)).toBeVisible();
}

async function selectBranch(page, heading, status) {
  const panel = hallmarkPanel(page);
  await panel.getByRole("button", { name: `${heading}, ${status}` }).click();
  const active = panel.locator(".evolution-hallmarks__active");
  await expect(active.getByRole("heading", { name: heading })).toBeVisible();
  return active;
}

async function acquireAllExtendedHallmarks(page) {
  for (const heading of EXTENDED_HALLMARK_HEADINGS) {
    const row = await selectBranch(page, heading, "available");
    await row.getByRole("button", { name: "Acquire" }).click();
  }
}

test("extended-hallmark real Solid controls expose ATP conversion and all four durable branches", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedFixture(page);
  await page.goto("/?debug=1");
  await openHallmarks(page);
  const tree = hallmarkPanel(page);
  await expect(tree.getByRole("list", { name: "Hallmark mutation programs" })).toBeVisible();
  for (const heading of LATE_HALLMARK_HEADINGS) {
    await expect(tree.getByRole("button", { name: `${heading}, locked` })).toHaveCount(0);
  }
  await acquireAllExtendedHallmarks(page);

  const metabolic = await selectBranch(page, EXTENDED_HALLMARK_HEADINGS[0], "acquired");
  await expect(metabolic.getByLabel("ATP meter")).toHaveText(/9\.0 ATP units/);
  await metabolic.getByRole("button", { name: "Convert 1 substrate" }).click();
  const converted = await savedState(page);
  expect(converted.substrate).toEqual({ mantissa: 8, exponent: 0 });
  expect(converted.atp).toEqual({ mantissa: 1, exponent: 1 });
  await expect(metabolic.getByLabel("ATP meter")).toHaveText(/10\.0 ATP units/);

  const acceleration = page.getByLabel("Producer acceleration ATP allocation");
  await acceleration.fill("100");
  await acceleration.press("Tab");
  const vesselFixture = extendedHallmarkBrowserFixture();
  const activeLinkCount = vesselFixture.regions.reduce(
    (count, region) => count + region.vesselLinkIds.length,
    0,
  );
  const vesselDebit = perfusionMaintenanceAtpDebit(vesselFixture, activeLinkCount);
  const vesselRequired = vesselDebit * 25;
  const vesselMaintenance = page.getByLabel("Vessel maintenance ATP allocation");
  await vesselMaintenance.fill("50");
  await vesselMaintenance.press("Tab");
  expect((await savedState(page)).atpBudget["vessel-maintenance"]).toBe(vesselRequired);
  const mycBefore = await page.locator('[data-producer-id="myc"] .cost-note').textContent();
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  const mycAfter = await page.locator('[data-producer-id="myc"] .cost-note').textContent();
  expect(mycAfter).not.toBe(mycBefore);
  expect((await savedState(page)).atp.mantissa).toBeLessThan(11);
  await acceleration.fill("0");
  await acceleration.press("Tab");

  const immune = await selectBranch(page, EXTENDED_HALLMARK_HEADINGS[1], "acquired");
  await immune.getByRole("button", { name: "Spend token to conceal" }).first().click();
  expect((await savedState(page)).maskedRegions).toHaveLength(1);
  await immune.getByRole("button", { name: "Restore immune visibility" }).first().click();
  expect((await savedState(page)).maskedRegions).toEqual([]);

  const inflammation = await selectBranch(page, EXTENDED_HALLMARK_HEADINGS[2], "acquired");
  await inflammation.getByRole("button", { name: "Activate inflammation" }).first().click();
  expect((await savedState(page)).inflammationEpisodes).toHaveLength(1);
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  expect((await savedState(page)).inflammationEpisodes).toEqual([]);

  const metabolicForDraft = await selectBranch(page, EXTENDED_HALLMARK_HEADINGS[0], "acquired");
  const drafting = page.getByLabel("Mutation drafting ATP allocation");
  await drafting.fill("25");
  await drafting.press("Tab");
  await metabolicForDraft.getByRole("button", { name: "Convert 5 substrate" }).click();
  await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  const mutation = await selectBranch(page, EXTENDED_HALLMARK_HEADINGS[3], "acquired");
  const cards = mutation.locator(".mutation-offer-card");
  await expect(cards).toHaveCount(3);
  const names = await cards.getByRole("heading").allTextContents();
  expect(new Set(names).size).toBe(3);
  const selected = names[0];
  expect(selected).toBeTruthy();
  const selectedId = selected.toLowerCase().replaceAll(" ", "_");
  expect((await savedState(page)).atp).toEqual({ mantissa: 7, exponent: 0 });
  await mutation.getByRole("button", { name: `Select ${selected}` }).focus();
  await expect(mutation.getByRole("button", { name: `Select ${selected}` })).toBeEnabled();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mutation-offer-title")).toBeFocused();
  const selectedState = await savedState(page);
  expect(selectedState.atp).toEqual({ mantissa: 6, exponent: 0 });
  expect(selectedState.chosenMutations).toEqual([selectedId]);
  expect(selectedState.mutationLiabilities).toEqual([selectedId]);
  await page.reload();
  const reloaded = await savedState(page);
  expect(reloaded.chosenMutations).toEqual([selectedId]);
  expect(reloaded.mutationLiabilities).toEqual([selectedId]);
  expect(diagnostics).toEqual([]);
});

test("late microbiome keyboard choice persists its active composition and consumes its saved offer", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedLateMicrobiomeFixture(page);
  await page.goto("/");

  await openHallmarks(page);
  const microbiome = await selectBranch(page, "Polymorphic microbiomes", "acquired");
  const install = microbiome.getByRole("button", { name: /^Install .+ composition$/ }).first();
  await expect(install).toBeEnabled();
  await install.focus();
  await page.keyboard.press("Enter");
  await expect(microbiome.getByRole("button", { name: /^Install .+ composition$/ })).toHaveCount(0);

  const installed = (await savedState(page)).lateHallmarks.microbiome.activeComposition;
  expect(installed).not.toBeNull();
  await page.reload();
  await openHallmarks(page);
  const reloadedMicrobiome = await selectBranch(page, "Polymorphic microbiomes", "acquired");
  await expect(
    reloadedMicrobiome.getByRole("button", { name: /^Install .+ composition$/ }),
  ).toHaveCount(0);
  expect((await savedState(page)).lateHallmarks.microbiome.activeComposition).toEqual(installed);
  expect(diagnostics).toEqual([]);
});

test("extended-hallmark recovery protection disables live hallmarks and preserves unreadable raw storage", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  const corruptRaw = "{extended-hallmark-corrupt-save";
  await page.addInitScript(({ key, raw }) => window.localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: corruptRaw,
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeDisabled();
  await openHallmarks(page);
  const active = await selectBranch(page, "Sustaining proliferative signaling", "available");
  await expect(active.getByRole("button", { name: "Acquire" })).toBeDisabled();
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
    await installFixedClock(page);
    const diagnostics = installDiagnostics(page);
    await seedFixture(page);
    await page.goto("/?debug=1");
    await openHallmarks(page);
    await acquireAllExtendedHallmarks(page);
    const tree = hallmarkPanel(page);
    const dimensions = await tree
      .locator(".evolution-hallmarks__sigil-button")
      .evaluateAll((buttons) =>
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
    }));
    expect(pageState.overflow).toBe(false);
    expect(pageState.reduced).toBe(true);
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
