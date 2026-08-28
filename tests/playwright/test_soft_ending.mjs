import { expect, test } from "@playwright/test";

import { stageId } from "../../src/brands.ts";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT } from "../../src/ending/trigger.ts";
import { AUTHORED_NETWORK_NODE_CATALOG } from "../../src/prestige/network.ts";
import { createInitialGameState } from "../../src/state/game_state.ts";
import { recordEvent } from "../../src/state/events.ts";
import { serializeGameState } from "../../src/state/save_load.ts";

// Selector contract: Chicago report controls, saved ending state, and the direct cell action
// (src/render/ending_view.tsx:86; src/render/tumor_arena.tsx:133; src/state/save_load.ts:152).
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

async function installFixedClock(page) {
  await page.clock.install({ time: FIXED_CLOCK_MS });
}

function networkEvent(state, type, fields) {
  return recordEvent(state, {
    type,
    ...fields,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

function availableEndingFixture() {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    currentStage: stageId("global_lab_contamination"),
    activeTimeMs: 900,
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 41 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "stabilize-network-node", { nodeId: node.id });
  const frontier = state.network.pendingFrontier;
  if (!frontier) throw new Error("Expected L4 frontier.");
  state = networkEvent(state, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[0].id,
  });
  const nodeId = frontier.mandates[0].generatedNodeIds[0];
  if (!nodeId) throw new Error("Expected generated node.");
  state = networkEvent(state, "stabilize-network-node", { nodeId });
  const raw = serializeGameState(
    { ...state, cells: CHICAGO_SKYSCRAPER_CELL_EQUIVALENT },
    FIXED_CLOCK_MS,
  );
  return raw;
}

async function seedAvailableEnding(page) {
  const raw = availableEndingFixture();
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem("ending-browser-fixture-seeded") !== "1") {
        localStorage.setItem(key, value);
        sessionStorage.setItem("ending-browser-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, value: raw },
  );
}

async function seedGlobalLaboratory(page) {
  const initial = createInitialGameState();
  const raw = serializeGameState(
    { ...initial, currentStage: stageId("global_lab_contamination") },
    FIXED_CLOCK_MS,
  );
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: raw },
  );
}

function diagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

test("early transformed-cell board keeps the Chicago report out of the primary loop", async ({
  page,
}) => {
  await installFixedClock(page);
  const failures = diagnostics(page);
  await page.goto("/");

  await expect(page.locator(".ending-view")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Chicago scale report/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Chicago scale report/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Division apparatus store" })).toBeVisible();
  expect(failures).toEqual([]);
});

test("global laboratory introduces the scale report before its final action is available", async ({
  page,
}) => {
  await installFixedClock(page);
  const failures = diagnostics(page);
  await seedGlobalLaboratory(page);
  await page.goto("/");

  await expect(page.locator(".ending-view")).toBeVisible();
  await expect(page.locator(".ending-view")).toContainText(
    "Complete one dissemination campaign tier.",
  );
  await expect(page.getByRole("button", { name: /Open the Chicago scale report/i })).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("Chicago report is keyboard-openable, persisted, scale-aware, and leaves the game playable", async ({
  page,
}) => {
  await installFixedClock(page);
  const failures = diagnostics(page);
  await seedAvailableEnding(page);
  await page.goto("/?debug=1");

  const report = page.locator(".ending-view");
  await expect(page.locator(".tumor-arena__magnitude")).toHaveText("septillion");
  const open = page.getByRole("button", { name: "Open the Chicago scale report" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("All report conditions are met.");
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toBeFocused();
  await expect(report).toContainText("Chicago high-rise volumes");
  await expect(report).toContainText("Cells, producers, offline accrual");
  const desktopFrame = await page.evaluate(() => {
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement || element instanceof SVGElement))
        throw new Error(`Expected ${selector}.`);
      return element.getBoundingClientRect();
    };
    const reportRect = rectFor(".ending-view--reached");
    const hudRect = rectFor(".game-hud");
    const divideRect = rectFor(".tumor-arena__action");
    const completeSelectors = [
      "#ending-title",
      ".ending-view__metrics",
      ".chicago-scale-graphic",
      "#dismiss-chicago-report",
    ];
    const complete = completeSelectors.every((selector) => {
      const rect = rectFor(selector);
      return rect.top >= 0 && rect.bottom <= window.innerHeight;
    });
    return {
      complete,
      reportBelowHud: reportRect.top >= hudRect.bottom,
      reportInViewport: reportRect.bottom <= window.innerHeight,
      reportLeavesTumorClear:
        reportRect.left >= divideRect.right || reportRect.right <= divideRect.left,
      tumorRemainsVisible: divideRect.top >= 0 && divideRect.bottom <= window.innerHeight,
    };
  });
  expect(desktopFrame).toEqual({
    complete: true,
    reportBelowHud: true,
    reportInViewport: true,
    reportLeavesTumorClear: true,
    tumorRemainsVisible: true,
  });
  await page.getByRole("button", { name: "Use full number names" }).click();
  await expect(page.getByLabel("Cell count", { exact: true })).toContainText("septillion cells");
  await expect(report).toContainText("septillion cells");
  await expect(page.getByLabel("Modeled cell volume")).toContainText(
    "septillion m3 of cell volume",
  );
  const saved = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(saved).not.toBeNull();
  expect(JSON.parse(saved).state.ending.phase).toBe("reached");

  await page.getByRole("button", { name: "Hide scale report" }).click();
  await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toHaveCount(0);
  const reopen = page.getByRole("button", { name: "Show Chicago scale report" });
  await expect(reopen).toBeFocused();
  await reopen.click();
  await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toBeVisible();
  expect(
    JSON.parse(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).state.ending
      .phase,
  ).toBe("reached");

  const activeTimeBefore = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)).state.activeTimeMs,
    SAVE_KEY,
  );
  const divide = page.getByRole("button", { name: "Divide cell" });
  await divide.focus();
  const activeTimeAfter = await page.evaluate((key) => {
    document.getElementById("debug-fast-forward")?.click();
    return JSON.parse(localStorage.getItem(key)).state.activeTimeMs;
  }, SAVE_KEY);
  expect(activeTimeAfter).toBeGreaterThan(activeTimeBefore);
  await expect(divide).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toBeVisible();
  expect(failures).toEqual([]);
});

test("earned Chicago scale preserves direct cell division while its report is open", async ({
  page,
}) => {
  await installFixedClock(page);
  const failures = diagnostics(page);
  await seedAvailableEnding(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open the Chicago scale report" }).click();

  const sequenceBeforeDivision = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)).state.eventSequence,
    SAVE_KEY,
  );
  const livingCell = page
    .getByRole("button", { name: "Divide cell" })
    .locator("[data-colony-cell]")
    .first();
  await expect(livingCell).toBeVisible();
  await livingCell.click();
  await expect
    .poll(() =>
      page.evaluate((key) => JSON.parse(localStorage.getItem(key)).state.eventSequence, SAVE_KEY),
    )
    .toBe(sequenceBeforeDivision + 1);
  expect(failures).toEqual([]);
});

test("Chicago report remains readable and motion-free at the narrow reduced-motion viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await installFixedClock(page);
    const failures = diagnostics(page);
    await seedAvailableEnding(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Open the Chicago scale report" }).click();
    await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    expect(failures).toEqual([]);
  } finally {
    await context.close();
  }
});
