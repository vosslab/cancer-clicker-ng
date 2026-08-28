import { expect, test } from "@playwright/test";

import { stageId } from "../../src/brands.ts";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT } from "../../src/ending/trigger.ts";
import { AUTHORED_NETWORK_NODE_CATALOG } from "../../src/prestige/network.ts";
import { createInitialGameState } from "../../src/state/game_state.ts";
import { recordEvent } from "../../src/state/events.ts";
import { serializeGameState } from "../../src/state/save_load.ts";

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
  await expect(page.locator(".ending-view")).toContainText("Complete one dissemination campaign tier.");
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
  const open = page.getByRole("button", { name: "Open the Chicago scale report" });
  await expect(report).toBeVisible();
  await expect(report).toContainText("All report conditions are met.");
  await open.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Chicago scale report open" })).toBeFocused();
  await expect(report).toContainText("Chicago high-rise volumes");
  await expect(report).toContainText("Cells, producers, offline accrual");
  const scaleGraphic = report.locator(".chicago-scale-graphic");
  await expect(scaleGraphic).toBeVisible();
  await expect(scaleGraphic).toHaveAttribute("viewBox", "0 0 260 132");
  await expect(scaleGraphic).toHaveAttribute("aria-hidden", "true");
  await expect(scaleGraphic).toHaveAttribute("tabindex", "-1");
  await expect(scaleGraphic.locator(".chicago-scale-graphic__lake")).toHaveCount(1);
  await expect(scaleGraphic.locator(".chicago-scale-graphic__skyline")).toHaveCount(1);
  await expect(page.getByRole("img")).toHaveCount(0);

  await page.getByRole("button", { name: /Use full names/ }).click();
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

test("earned Chicago scale renders a structural city overlay behind the living colony", async ({
  page,
}) => {
  await installFixedClock(page);
  const failures = diagnostics(page);
  await seedAvailableEnding(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Open the Chicago scale report" }).click();

  const figure = page.locator("svg.colony-figure");
  const overlay = figure.locator(".colony-ending-overlay");
  await expect(overlay).toHaveCount(1);
  await expect(overlay).toHaveAttribute("aria-hidden", "true");
  await expect(overlay).toHaveAttribute("pointer-events", "none");
  await expect(overlay).toHaveAttribute("data-ending-scene", "chicago-scale");
  await expect(overlay.locator(".colony-ending-overlay__lake")).toHaveCount(1);
  await expect(overlay.locator(".colony-ending-overlay__river")).toHaveCount(1);
  await expect(overlay.locator(".colony-ending-overlay__grid")).toHaveCount(1);
  await expect(overlay.locator(".colony-ending-overlay__route")).not.toHaveCount(0);
  await expect(overlay.locator(".colony-ending-overlay__tower")).not.toHaveCount(0);

  const structure = await figure.evaluate((element) => {
    const children = [...element.children];
    const index = (selector) => children.findIndex((child) => child.matches(selector));
    const overlayElement = element.querySelector(".colony-ending-overlay");
    if (!(overlayElement instanceof SVGGElement)) throw new Error("Expected Chicago SVG overlay.");
    const ids = [...overlayElement.querySelectorAll("[id]")].map((node) => node.id);
    const connectedTowers = overlayElement.querySelectorAll(
      '.colony-ending-overlay__tower[data-connected-site="true"]',
    ).length;
    const diamondMarkers = overlayElement.querySelectorAll(
      ".colony-ending-overlay__site-marker",
    ).length;
    return {
      ids,
      connectedTowers,
      diamondMarkers,
      layerOrder: [
        index(".colony-figure__tissue"),
        index(".colony-ending-overlay"),
        index(".colony-figure__silhouette-regions"),
        index(".colony-figure__cells"),
      ],
    };
  });
  expect(structure.ids.length).toBeGreaterThanOrEqual(4);
  expect(new Set(structure.ids).size).toBe(structure.ids.length);
  expect(structure.ids.every((id) => id.startsWith("ccng-"))).toBe(true);
  expect(structure.connectedTowers).toBeGreaterThan(0);
  expect(structure.diamondMarkers).toBe(structure.connectedTowers);
  expect(structure.layerOrder.every((index) => index >= 0)).toBe(true);
  expect(structure.layerOrder).toEqual(
    [...structure.layerOrder].sort((left, right) => left - right),
  );

  // The city analogy stays behind the living organism: its pointer-inert SVG layer
  // leaves a painted cancer cell available to the native division action.
  const sequenceBeforeDivision = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)).state.eventSequence,
    SAVE_KEY,
  );
  const livingCell = page
    .getByRole("button", { name: "Divide cell" })
    .locator(".colony-cell__membrane")
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
    await expect(page.locator(".ending-view")).toHaveCSS("animation-name", "none");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
    expect(failures).toEqual([]);
  } finally {
    await context.close();
  }
});
