#!/usr/bin/env node
/** Capture the production board states embedded in README's managed screenshot block. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import {
  bigNum,
  cryobankProgramId,
  eventId,
  passageUpgradeId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT } from "../src/ending/trigger.ts";
import {
  AUTHORED_NETWORK_NODE_CATALOG,
  generateNetworkFrontierV1,
} from "../src/prestige/network.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIRECTORY = path.join(ROOT, "dist");
const README_PATH = path.join(ROOT, "README.md");
const SCREENSHOT_DIRECTORY = path.join(ROOT, "docs", "screenshots");
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const VIEWPORT = Object.freeze({ width: 1280, height: 800 });
const FIXED_CAPTURE_CLOCK_MS = 1_750_000_000_000;
const README_BLOCK = Object.freeze({
  begin: "<!-- screenshots:begin (managed by screenshot-docs) -->",
  end: "<!-- screenshots:end -->",
  lines: Object.freeze([
    "![Cancer Clicker NG game board after a visible tumor-cell click, with the living tumor, compact scoreboard, icon tabs, and upgrade rack](docs/screenshots/cancer_clicker_ng_board.png)",
    "![Cancer Clicker NG upgrade decision with explicit Owned, Output, Buy, Cost, and Adds labels plus a viewport-contained tooltip](docs/screenshots/cancer_clicker_ng_upgrade_decision.png)",
    "",
    "<details>",
    "<summary>Central tumor progression: hypoxic core, perfusion, and invasive route</summary>",
    "",
    "![Cancer Clicker NG dense hypoxic lesion with an oxygen-starved rim and necrotic core](docs/screenshots/cancer_clicker_ng_hypoxic_necrotic.png)",
    "![Cancer Clicker NG perfused angiogenic tumor, with visible vessel branches and the Stage evolution tab](docs/screenshots/cancer_clicker_ng_perfused_tumor.png)",
    "![Cancer Clicker NG invasive route state with a seeded site and visible invasive front](docs/screenshots/cancer_clicker_ng_invasive_route.png)",
    "</details>",
    "",
    "![Cancer Clicker NG Culture tab, showing the illustrated dish, cryobank program, and compact laboratory controls](docs/screenshots/cancer_clicker_ng_culture_lab.png)",
    "![Cancer Clicker NG Network tab, showing the illustrated two-by-two site map and renewable campaign frontier](docs/screenshots/cancer_clicker_ng_network_map.png)",
    "![Cancer Clicker NG earned Chicago scale report over the continuing living tumor board](docs/screenshots/cancer_clicker_ng_chicago_scale.png)",
  ]),
});

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (address === null || typeof address === "string")
    throw new Error("Unable to select a loopback port.");
  return address.port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The loopback server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local production server did not respond at ${url}.`);
}

function legalPerfusedTumorState() {
  const initial = createInitialGameState();
  const perfusedRegion = {
    id: regionId("readme-perfused-region"),
    capacity: 12,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [eventId("vessel:readme-perfused-region")],
    routeIds: [],
  };
  return {
    ...initial,
    activeTimeMs: 100,
    currentStage: stageId("angiogenic_primary"),
    cells: bigNum(2, 5),
    substrate: bigNum(6, 3),
    atp: bigNum(4, 2),
    producerLevels: initial.producerLevels.map((entry, index) => ({
      ...entry,
      level: [12, 8, 5, 3, 2, 1, 0, 0][index],
    })),
    regions: [perfusedRegion],
    telomereReserveByRegion: { [perfusedRegion.id]: 12 },
    vesselMaintenanceAtp: 1,
    oxygenPressure: 2,
  };
}

function captureRegion(id, changes = {}) {
  return {
    id: regionId(id),
    capacity: 16,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
    ...changes,
  };
}

/** A dense, parser-validated lesion that makes both oxygen and necrosis overlays visible. */
function hypoxicNecroticState() {
  const initial = createInitialGameState();
  const hypoxic = captureRegion("readme-hypoxic-rim", {
    viability: 0.42,
    phenotype: "stress-tolerant",
  });
  const necrotic = captureRegion("readme-necrotic-core", { viability: 0 });
  return {
    ...initial,
    activeTimeMs: 100,
    cells: bigNum(8, 7),
    currentStage: stageId("hypoxic_lesion"),
    regions: [hypoxic, necrotic],
    telomereReserveByRegion: { [hypoxic.id]: 6, [necrotic.id]: 0 },
    oxygenPressure: 8,
    damagePressure: 3,
  };
}

/** A dense route-and-seed snapshot; the route commitment drives the invasive visual contract. */
function invasiveRouteState() {
  const initial = createInitialGameState();
  const route = routeId("readme-invasive-route");
  const seeded = captureRegion("readme-seeded-site", {
    phenotype: "migratory",
    routeIds: [route],
  });
  return {
    ...initial,
    activeTimeMs: 100,
    cells: bigNum(5, 7),
    currentStage: stageId("invasive_carcinoma"),
    regions: [seeded],
    seededSites: [seeded.id],
    telomereReserveByRegion: { [seeded.id]: 8 },
    committedCellCommitments: { [route]: 24 },
    routeRiskById: { [route]: 0.18 },
    routeDiscoveryProgress: 6,
  };
}

async function seedLegalPerfusedTumorState(page) {
  const serialized = serializeGameState(legalPerfusedTumorState(), FIXED_CAPTURE_CLOCK_MS);
  const parsed = parseSave(serialized);
  if (parsed.status !== "loaded")
    throw new Error("Perfused tumor capture state failed parser validation.");
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("readme-perfused-fixture-seeded") !== "1") {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("readme-perfused-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: serialized },
  );
}

function networkEvent(state, type, fields) {
  return recordEvent(state, {
    type,
    ...fields,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

function advancedSystemsState() {
  const initial = createInitialGameState();
  const frontierSeed = 17;
  return {
    ...initial,
    activeTimeMs: 100,
    eventSequence: 1,
    cells: bigNum(6, 4),
    currentStage: stageId("global_lab_contamination"),
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: frontierSeed },
    network: {
      ...initial.network,
      pendingFrontier: generateNetworkFrontierV1({
        networkSeed: frontierSeed,
        globalTier: 0,
        frontierSequence: 0,
        sourceEventSequence: 1,
      }),
    },
  };
}

/** A parser-validated L3 snapshot with a visible selected cryobank program. */
function cultureLabState() {
  const state = advancedSystemsState();
  return {
    ...state,
    culture: {
      passages: 5,
      purchasedPassageUpgrades: [
        { upgradeId: passageUpgradeId("cryobank"), rank: 1 },
        { upgradeId: passageUpgradeId("assay_discipline"), rank: 1 },
        { upgradeId: passageUpgradeId("high_throughput"), rank: 1 },
      ],
      cryobankProgram: cryobankProgramId("cryobank_occult"),
      queuedProducerAction: null,
    },
  };
}

async function seedState(page, state, marker) {
  const raw = serializeGameState(state, FIXED_CAPTURE_CLOCK_MS);
  const parsed = parseSave(raw);
  if (parsed.status !== "loaded")
    throw new Error(`${marker} capture state failed parser validation.`);
  await page.addInitScript(
    ({ key, value, storageMarker }) => {
      if (sessionStorage.getItem(storageMarker) !== "1") {
        localStorage.setItem(key, value);
        sessionStorage.setItem(storageMarker, "1");
      }
    },
    { key: SAVE_KEY, value: raw, storageMarker: marker },
  );
}

function chicagoScaleState() {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    activeTimeMs: 900,
    currentStage: stageId("global_lab_contamination"),
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
  if (!frontier) throw new Error("Expected a dissemination frontier for the scale capture.");
  state = networkEvent(state, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[0].id,
  });
  const nodeId = frontier.mandates[0].generatedNodeIds[0];
  if (!nodeId) throw new Error("Expected a generated campaign node for the scale capture.");
  state = networkEvent(state, "stabilize-network-node", { nodeId });
  return { ...state, cells: CHICAGO_SKYSCRAPER_CELL_EQUIVALENT };
}

function collectDiagnostics(page) {
  const diagnostics = [];
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) =>
    diagnostics.push(
      `requestfailed: ${request.url()} (${request.failure()?.errorText ?? "unknown"})`,
    ),
  );
  return diagnostics;
}

async function assertBoard(page) {
  const required = [
    page.getByRole("button", { name: "Divide cell" }),
    page.getByLabel("Cell count", { exact: true }),
    page.getByLabel("Cell production rate", { exact: true }),
    page.getByRole("region", { name: "Living tumor arena" }),
    page.getByRole("navigation", { name: "Evolution systems" }),
    page.getByRole("complementary", { name: "Division apparatus store" }),
  ];
  for (const locator of required) await locator.waitFor({ state: "visible" });
  const measurements = await page.locator("html").evaluate((root) => ({
    horizontalOverflow: root.scrollWidth > root.clientWidth,
    cellTargets: root.querySelectorAll("[data-colony-cell]").length,
    reducedMotion: root.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
  }));
  if (measurements.horizontalOverflow)
    throw new Error("The documentation board has horizontal overflow.");
  if (measurements.cellTargets === 0) throw new Error("The direct colony cell target is absent.");
  if (measurements.reducedMotion !== true)
    throw new Error("The documentation browser did not honor reduced-motion mode.");
  return measurements;
}

/** Confirms every captured burden and biological overlay came from the saved game state. */
async function assertSceneEvidence(page, expected) {
  const evidence = await page.locator("body").evaluate((body, wanted) => {
    const view = body.ownerDocument.defaultView;
    if (view === null) throw new Error("The capture document has no window.");
    const figure = body.querySelector(".colony-figure");
    if (!(figure instanceof view.SVGSVGElement)) throw new Error("The living tumor SVG is absent.");
    const selectorCounts = Object.fromEntries(
      wanted.overlaySelectors.map((selector) => [selector, body.querySelectorAll(selector).length]),
    );
    return {
      stage: figure.dataset.stage,
      burdenTier: figure.dataset.burdenTier,
      selectorCounts,
      transitionCount: body.querySelectorAll(`[data-stage-transition="${wanted.stageId}"]`).length,
    };
  }, expected);
  if (evidence.stage !== expected.stageId)
    throw new Error(`Expected stage ${expected.stageId}, received ${evidence.stage ?? "none"}.`);
  if (evidence.burdenTier !== expected.burdenTier)
    throw new Error(
      `Expected burden ${expected.burdenTier}, received ${evidence.burdenTier ?? "none"}.`,
    );
  if (evidence.transitionCount === 0)
    throw new Error(`Missing stage-arrival emphasis for ${expected.stageId}.`);
  for (const [selector, count] of Object.entries(evidence.selectorCounts)) {
    if (count === 0) throw new Error(`Missing required visual overlay: ${selector}.`);
  }
  return evidence;
}

/** One-time capture evidence that cell geometry, rather than observer equipment, invites play. */
async function assertCancerCellViewpoint(page) {
  const evidence = await page.locator("body").evaluate((body) => {
    const view = body.ownerDocument.defaultView;
    if (view === null) throw new Error("The capture document has no window.");
    const cell = body.querySelector("[data-colony-cell]");
    if (!(cell instanceof view.SVGGElement)) throw new Error("The tumor cell target is absent.");
    return {
      targetingOverlayCount: body.querySelectorAll(".tumor-feedback__reticle").length,
      cellCursor: view.getComputedStyle(cell).cursor,
    };
  });
  if (evidence.targetingOverlayCount !== 0)
    throw new Error("The cancer-cell viewpoint contains a targeting overlay.");
  if (evidence.cellCursor !== "pointer")
    throw new Error("The rendered cancer cell does not expose its direct-action cursor.");
  return evidence;
}

/** Keeps the narrow Evolution advance action inside the goal card that owns it. */
async function assertEvolutionAdvanceInsideGoal(page) {
  const geometry = await page.locator("body").evaluate((body) => {
    const view = body.ownerDocument.defaultView;
    if (view === null) throw new Error("The capture document has no window.");
    const action = body.querySelector(".evolution-stage__advance");
    const goal = action?.closest(".evolution-stage__goal");
    if (!(action instanceof view.HTMLElement) || !(goal instanceof view.HTMLElement))
      throw new Error("The Evolution advance action or its goal card is absent.");
    const actionRect = action.getBoundingClientRect();
    const goalRect = goal.getBoundingClientRect();
    const contained =
      actionRect.left >= goalRect.left &&
      actionRect.right <= goalRect.right &&
      actionRect.top >= goalRect.top &&
      actionRect.bottom <= goalRect.bottom;
    return {
      contained,
      action: {
        width: actionRect.width,
        height: actionRect.height,
      },
      goal: {
        width: goalRect.width,
        height: goalRect.height,
      },
    };
  });
  if (!geometry.contained) throw new Error("The Evolution advance action escapes its goal card.");
  return geometry;
}

async function selectEvolutionTab(page, label) {
  const tab = page.getByRole("button", { name: `${label} evolution system` });
  await tab.click();
  await tab.evaluate((button) => {
    if (button.getAttribute("aria-pressed") !== "true")
      throw new Error(
        `The ${button.getAttribute("aria-label") ?? "requested"} tab did not activate.`,
      );
  });
}

async function resetPageScroll(page) {
  await page
    .locator("body")
    .evaluate((body) => body.ownerDocument.defaultView?.scrollTo({ top: 0, left: 0 }));
}

async function installFixedCaptureClock(page) {
  await page.clock.install({ time: FIXED_CAPTURE_CLOCK_MS });
}

async function screenshotBoard(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await resetPageScroll(page);
  const measurements = await assertBoard(page);
  const count = page.getByLabel("Cell count", { exact: true });
  const before = await count.textContent();
  const visibleCell = page.locator("[data-colony-cell]").first();
  await visibleCell.click();
  await visibleCell.evaluate((cell, previous) => {
    if (cell.ownerDocument.querySelector('[aria-label="Cell count"]')?.textContent === previous)
      throw new Error("The direct cancer-cell click did not update the visible cell count.");
  }, before);
  const scene = await assertSceneEvidence(page, {
    stageId: "transformed_cell",
    burdenTier: "sparse",
    overlaySelectors: [".tumor-feedback__division"],
  });
  const viewpoint = await assertCancerCellViewpoint(page);
  await page.screenshot({ path: outputPath });
  return { ...measurements, directCellClick: true, viewpoint, scene };
}

async function screenshotUpgradeDecision(page, url, outputPath) {
  await page.addInitScript(() => localStorage.clear());
  await installFixedCaptureClock(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator("[data-colony-cell]").first().click();
  const buy = page.locator('[data-producer-id="producer"] .producer-row__buy');
  await buy.waitFor({ state: "visible" });
  await buy.focus();
  await page.clock.runFor(20);
  const tooltipId = await buy.getAttribute("aria-describedby");
  if (tooltipId === null) throw new Error("README upgrade decision lacks tooltip help.");
  const tooltip = page.locator(`#${tooltipId}`);
  await tooltip.waitFor({ state: "visible" });
  const geometry = await tooltip.evaluate((element) => {
    const tooltipRect = element.getBoundingClientRect();
    const rackRect = element.ownerDocument
      .querySelector(".game-board__rack")
      ?.getBoundingClientRect();
    const view = element.ownerDocument.defaultView;
    if (rackRect === undefined || view === null)
      throw new Error("Upgrade rack geometry is absent.");
    return {
      insideViewport:
        tooltipRect.left >= 8 &&
        tooltipRect.top >= 8 &&
        tooltipRect.right <= view.innerWidth - 8 &&
        tooltipRect.bottom <= view.innerHeight - 8,
      textFits:
        element.scrollWidth <= element.clientWidth + 1 &&
        element.scrollHeight <= element.clientHeight + 1,
      outsideRack: tooltipRect.right <= rackRect.left + 16,
    };
  });
  if (!geometry.insideViewport || !geometry.textFits || !geometry.outsideRack)
    throw new Error(`README upgrade tooltip failed geometry: ${JSON.stringify(geometry)}`);
  await page.screenshot({ path: outputPath });
  return { tooltip: (await tooltip.textContent())?.trim(), geometry };
}

async function screenshotHypoxicNecrotic(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, hypoxicNecroticState(), "readme-hypoxic-necrotic-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Hypoxic lesion" }).waitFor({ state: "visible" });
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "hypoxic_lesion",
    burdenTier: "dense",
    overlaySelectors: [".colony-figure__hypoxic-region", ".colony-figure__necrotic-region"],
  });
  await page.screenshot({ path: outputPath });
  return { ...measurements, scene };
}

async function screenshotInvasiveRoute(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, invasiveRouteState(), "readme-invasive-route-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Invasive carcinoma" }).waitFor({ state: "visible" });
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "invasive_carcinoma",
    burdenTier: "dense",
    overlaySelectors: [".colony-figure__invasive-front", ".colony-figure__seed-anchor"],
  });
  const viewpoint = await assertCancerCellViewpoint(page);
  await page.screenshot({ path: outputPath });
  return { ...measurements, viewpoint, scene };
}

async function screenshotCultureLab(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, cultureLabState(), "readme-culture-lab-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  await selectEvolutionTab(page, "Culture");
  await page.getByRole("heading", { name: "Culture" }).waitFor({ state: "visible" });
  await page.getByLabel("Cryobank program selection").waitFor({ state: "visible" });
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "global_lab_contamination",
    burdenTier: "established",
    overlaySelectors: [".colony-figure__activity"],
  });
  await page.screenshot({ path: outputPath });
  return { ...measurements, scene };
}

async function screenshotNetworkMap(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, advancedSystemsState(), "readme-network-map-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  await selectEvolutionTab(page, "Network");
  await page.getByRole("heading", { name: "Network" }).waitFor({ state: "visible" });
  await page.getByLabel("Contamination node map").waitFor({ state: "visible" });
  await page.getByLabel("Renewable campaign frontier").waitFor({ state: "visible" });
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "global_lab_contamination",
    burdenTier: "established",
    overlaySelectors: [".colony-figure__activity"],
  });
  await page.screenshot({ path: outputPath });
  return { ...measurements, scene };
}

async function screenshotPerfusedTumor(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedLegalPerfusedTumorState(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Angiogenic primary" }).waitFor({ state: "visible" });
  await page.locator(".colony-figure__vessel").waitFor({ state: "visible" });
  await selectEvolutionTab(page, "Stage");
  await resetPageScroll(page);
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "angiogenic_primary",
    burdenTier: "established",
    overlaySelectors: [".colony-figure__vessel"],
  });
  await page.screenshot({ path: outputPath });
  return { ...measurements, scene };
}

async function screenshotChicagoScale(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, chicagoScaleState(), "readme-chicago-scale-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Open the Chicago scale report" }).click();
  await page
    .getByRole("heading", { name: "Chicago scale report open" })
    .waitFor({ state: "visible" });
  await page.locator(".colony-ending-overlay").waitFor({ state: "visible" });
  const measurements = await assertBoard(page);
  const scene = await assertSceneEvidence(page, {
    stageId: "global_lab_contamination",
    burdenTier: "overgrown",
    overlaySelectors: [".colony-ending-overlay"],
  });
  await page.screenshot({ path: outputPath });
  return { ...measurements, scene };
}

/** One-time normal-motion evidence; no artifact or permanent timing test is retained. */
async function verifyNormalMotion(browser, url) {
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: "no-preference" });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await installFixedCaptureClock(page);
    await seedState(page, legalPerfusedTumorState(), "readme-normal-motion-fixture-seeded");
    await page.goto(url, { waitUntil: "networkidle" });
    const visibleCell = page.locator("[data-colony-cell]").first();
    await visibleCell.click();
    await page.locator(".tumor-feedback__division").waitFor({ state: "visible" });
    const evidence = await page.locator("body").evaluate((body) => ({
      reducedMotion: body.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
      divisionAnimation: body.ownerDocument.defaultView?.getComputedStyle(
        body.querySelector(".tumor-feedback__ripple"),
      ).animationName,
      stageArrivalAnimation: body.ownerDocument.defaultView?.getComputedStyle(
        body.querySelector(".stage-transition-emphasis__arrival"),
      ).animationName,
    }));
    if (evidence.reducedMotion !== false)
      throw new Error("The normal-motion walkthrough unexpectedly enabled reduced motion.");
    if (evidence.divisionAnimation === "none" || evidence.stageArrivalAnimation === "none")
      throw new Error(
        "The normal-motion walkthrough did not expose division and stage-arrival motion.",
      );
    if (diagnostics.length > 0)
      throw new Error(`Normal-motion browser diagnostics:\n${diagnostics.join("\n")}`);
    return evidence;
  } finally {
    await context.close();
  }
}

async function verifyNarrowChicago(browser, url) {
  const narrowContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await narrowContext.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await installFixedCaptureClock(page);
    await page.goto(url, { waitUntil: "networkidle" });
    const evolutionAction = await assertEvolutionAdvanceInsideGoal(page);
    await seedState(page, chicagoScaleState(), "readme-narrow-chicago-fixture-seeded");
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open the Chicago scale report" }).click();
    await page
      .getByRole("heading", { name: "Chicago scale report open" })
      .waitFor({ state: "visible" });
    const evidence = await page.locator(".ending-view").evaluate((report) => ({
      animationName: report.ownerDocument.defaultView?.getComputedStyle(report).animationName,
      horizontalOverflow:
        report.ownerDocument.documentElement.scrollWidth >
        report.ownerDocument.documentElement.clientWidth,
      reducedMotion: report.ownerDocument.defaultView?.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
    }));
    if (evidence.horizontalOverflow)
      throw new Error("The narrow scale report has horizontal overflow.");
    if (evidence.reducedMotion !== true)
      throw new Error("The narrow scale report did not honor reduced-motion mode.");
    if (evidence.animationName !== "none")
      throw new Error("The narrow scale report retains animation in reduced-motion mode.");
    if (diagnostics.length > 0)
      throw new Error(`Narrow browser diagnostics:\n${diagnostics.join("\n")}`);
    return { viewport: { width: 360, height: 800 }, evolutionAction, ...evidence };
  } finally {
    await narrowContext.close();
  }
}

async function rewriteReadmeBlock() {
  const source = await readFile(README_PATH, "utf8");
  const start = source.indexOf(README_BLOCK.begin);
  const end = source.indexOf(README_BLOCK.end, start);
  if (start < 0 || end < 0) throw new Error("README managed screenshot block is missing.");
  const replacement = `${README_BLOCK.begin}\n\n${README_BLOCK.lines.join("\n")}\n${README_BLOCK.end}`;
  const updated = `${source.slice(0, start)}${replacement}${source.slice(end + README_BLOCK.end.length)}`;
  if (updated !== source) await writeFile(README_PATH, updated, "utf8");
}

async function screenshotInfo(filePath) {
  const file = await stat(filePath);
  return {
    path: path.relative(ROOT, filePath),
    bytes: file.size,
    sha256: hash(await readFile(filePath)),
  };
}

async function main() {
  if (process.argv.slice(2).includes("--sync-readme")) {
    await rewriteReadmeBlock();
    console.log("Synchronized README managed screenshot block without recapturing images.");
    return;
  }
  await access(path.join(DIST_DIRECTORY, "index.html"));
  await access(path.join(DIST_DIRECTORY, "main.js"));
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}/`;
  const server = spawn(
    "bash",
    [
      "-lc",
      `source source_me.sh && exec python3 -m http.server ${port} --bind 127.0.0.1 --directory dist`,
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
  const context = await chromium.launch({ headless: true });
  const browserContext = await context.newContext({ viewport: VIEWPORT, reducedMotion: "reduce" });
  const page = await browserContext.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await waitForServer(url);
    console.log("Capturing primary tumor board.");
    const boardPath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_board.png");
    const upgradeDecisionPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_upgrade_decision.png",
    );
    const perfusedTumorPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_perfused_tumor.png",
    );
    const hypoxicNecroticPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_hypoxic_necrotic.png",
    );
    const invasiveRoutePath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_invasive_route.png",
    );
    const cultureLabPath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_culture_lab.png");
    const networkMapPath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_network_map.png");
    const chicagoScalePath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_chicago_scale.png");
    const board = await screenshotBoard(page, url, boardPath);
    await page.close();
    const upgradeDecisionPage = await browserContext.newPage();
    const upgradeDecisionDiagnostics = collectDiagnostics(upgradeDecisionPage);
    const upgradeDecision = await screenshotUpgradeDecision(
      upgradeDecisionPage,
      url,
      upgradeDecisionPath,
    );
    diagnostics.push(...upgradeDecisionDiagnostics);
    await upgradeDecisionPage.close();
    const hypoxicNecroticPage = await browserContext.newPage();
    const hypoxicNecroticDiagnostics = collectDiagnostics(hypoxicNecroticPage);
    const hypoxicNecrotic = await screenshotHypoxicNecrotic(
      hypoxicNecroticPage,
      url,
      hypoxicNecroticPath,
    );
    diagnostics.push(...hypoxicNecroticDiagnostics);
    await hypoxicNecroticPage.close();
    const perfusedTumorPage = await browserContext.newPage();
    const perfusedTumorDiagnostics = collectDiagnostics(perfusedTumorPage);
    const perfusedTumor = await screenshotPerfusedTumor(perfusedTumorPage, url, perfusedTumorPath);
    diagnostics.push(...perfusedTumorDiagnostics);
    await perfusedTumorPage.close();
    const invasiveRoutePage = await browserContext.newPage();
    const invasiveRouteDiagnostics = collectDiagnostics(invasiveRoutePage);
    const invasiveRoute = await screenshotInvasiveRoute(invasiveRoutePage, url, invasiveRoutePath);
    diagnostics.push(...invasiveRouteDiagnostics);
    await invasiveRoutePage.close();
    const cultureLabPage = await browserContext.newPage();
    const cultureLabDiagnostics = collectDiagnostics(cultureLabPage);
    const cultureLab = await screenshotCultureLab(cultureLabPage, url, cultureLabPath);
    diagnostics.push(...cultureLabDiagnostics);
    await cultureLabPage.close();
    const networkMapPage = await browserContext.newPage();
    const networkMapDiagnostics = collectDiagnostics(networkMapPage);
    const networkMap = await screenshotNetworkMap(networkMapPage, url, networkMapPath);
    diagnostics.push(...networkMapDiagnostics);
    await networkMapPage.close();
    const chicagoScalePage = await browserContext.newPage();
    const chicagoScaleDiagnostics = collectDiagnostics(chicagoScalePage);
    const chicagoScale = await screenshotChicagoScale(chicagoScalePage, url, chicagoScalePath);
    diagnostics.push(...chicagoScaleDiagnostics);
    await chicagoScalePage.close();
    const narrowChicago = await verifyNarrowChicago(context, url);
    const normalMotion = await verifyNormalMotion(context, url);
    await rewriteReadmeBlock();
    const files = await Promise.all([
      screenshotInfo(boardPath),
      screenshotInfo(upgradeDecisionPath),
      screenshotInfo(hypoxicNecroticPath),
      screenshotInfo(perfusedTumorPath),
      screenshotInfo(invasiveRoutePath),
      screenshotInfo(cultureLabPath),
      screenshotInfo(networkMapPath),
      screenshotInfo(chicagoScalePath),
    ]);
    if (diagnostics.length > 0) throw new Error(`Browser diagnostics:\n${diagnostics.join("\n")}`);
    console.log(
      JSON.stringify(
        {
          viewport: VIEWPORT,
          board,
          upgradeDecision,
          hypoxicNecrotic,
          perfusedTumor,
          invasiveRoute,
          cultureLab,
          networkMap,
          chicagoScale,
          narrowChicago,
          normalMotion,
          files,
          diagnostics,
        },
        null,
        2,
      ),
    );
  } finally {
    await browserContext.close();
    await context.close();
    server.kill("SIGTERM");
  }
}

await main();
