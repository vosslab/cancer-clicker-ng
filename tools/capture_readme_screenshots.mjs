#!/usr/bin/env node
/** Capture the production board states embedded in README's managed screenshot block. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { bigNum, eventId, regionId, stageId } from "../src/brands.ts";
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
    "![Cancer Clicker NG board with a direct cancer-cell action, live cell count and production rate, tumor progression, and the Division apparatus store](docs/screenshots/cancer_clicker_ng_board.png)",
    "![Cancer Clicker NG angiogenic primary with a perfused multicellular tumor, visible blood-supply branches, meaningful growth, and producer upgrades](docs/screenshots/cancer_clicker_ng_perfused_tumor.png)",
    "![Cancer Clicker NG advanced systems view with icon-led culture choices, a renewable dissemination network frontier, and the persistent living tumor board](docs/screenshots/cancer_clicker_ng_culture_network.png)",
    "![Cancer Clicker NG earned Chicago scale report over the living colony, retaining the direct cell action and continued-play context](docs/screenshots/cancer_clicker_ng_chicago_scale.png)",
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
    page.getByLabel("Cell count"),
    page.getByLabel("Cell production rate"),
    page.getByRole("region", { name: "Tumor progression" }),
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
  const count = page.getByLabel("Cell count");
  const before = await count.textContent();
  const visibleCell = page.locator("[data-colony-cell]").first();
  await visibleCell.click();
  await visibleCell.evaluate((cell, previous) => {
    if (cell.ownerDocument.querySelector('[aria-label="Cell count"]')?.textContent === previous)
      throw new Error("The direct cancer-cell click did not update the visible cell count.");
  }, before);
  await page.screenshot({ path: outputPath });
  return { ...measurements, directCellClick: true };
}

async function scrollRailToPanel(page, selector) {
  await resetPageScroll(page);
  await page.locator(".progression-rail").evaluate((rail, panelSelector) => {
    const panel = rail.querySelector(panelSelector);
    const top =
      panel === null
        ? 0
        : Math.max(
            0,
            panel.getBoundingClientRect().top -
              rail.getBoundingClientRect().top +
              rail.scrollTop -
              12,
          );
    rail.scrollTo({ top });
  }, selector);
}

async function screenshotCultureNetwork(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedState(page, advancedSystemsState(), "readme-culture-network-fixture-seeded");
  await page.goto(url, { waitUntil: "networkidle" });
  const network = page.getByRole("region", { name: "Contamination network", exact: true });
  await network.getByText("Renewable campaign frontier").waitFor({ state: "visible" });
  await scrollRailToPanel(page, ".network-panel");
  const measurements = await assertBoard(page);
  await page.screenshot({ path: outputPath });
  return measurements;
}

async function screenshotPerfusedTumor(page, url, outputPath) {
  await installFixedCaptureClock(page);
  await seedLegalPerfusedTumorState(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Angiogenic primary" }).waitFor({ state: "visible" });
  await page.locator(".colony-figure__vessel").waitFor({ state: "visible" });
  await resetPageScroll(page);
  const measurements = await assertBoard(page);
  await page.screenshot({ path: outputPath });
  return measurements;
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
  await page.screenshot({ path: outputPath });
  return measurements;
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
    await seedState(page, chicagoScaleState(), "readme-narrow-chicago-fixture-seeded");
    await page.goto(url, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Open the Chicago scale report" }).click();
    await page.getByRole("heading", { name: "Chicago scale report open" }).waitFor({ state: "visible" });
    const evidence = await page.locator(".ending-view").evaluate((report) => ({
      animationName: report.ownerDocument.defaultView?.getComputedStyle(report).animationName,
      horizontalOverflow:
        report.ownerDocument.documentElement.scrollWidth > report.ownerDocument.documentElement.clientWidth,
      reducedMotion: report.ownerDocument.defaultView?.matchMedia("(prefers-reduced-motion: reduce)")
        .matches,
    }));
    if (evidence.horizontalOverflow) throw new Error("The narrow scale report has horizontal overflow.");
    if (evidence.reducedMotion !== true)
      throw new Error("The narrow scale report did not honor reduced-motion mode.");
    if (evidence.animationName !== "none")
      throw new Error("The narrow scale report retains animation in reduced-motion mode.");
    if (diagnostics.length > 0) throw new Error(`Narrow browser diagnostics:\n${diagnostics.join("\n")}`);
    return { viewport: { width: 360, height: 800 }, ...evidence };
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
    const perfusedTumorPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_perfused_tumor.png",
    );
    const cultureNetworkPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_culture_network.png",
    );
    const chicagoScalePath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_chicago_scale.png");
    const board = await screenshotBoard(page, url, boardPath);
    await page.close();
    const perfusedTumorPage = await browserContext.newPage();
    const perfusedTumorDiagnostics = collectDiagnostics(perfusedTumorPage);
    const perfusedTumor = await screenshotPerfusedTumor(perfusedTumorPage, url, perfusedTumorPath);
    diagnostics.push(...perfusedTumorDiagnostics);
    await perfusedTumorPage.close();
    const cultureNetworkPage = await browserContext.newPage();
    const cultureNetworkDiagnostics = collectDiagnostics(cultureNetworkPage);
    const cultureNetwork = await screenshotCultureNetwork(
      cultureNetworkPage,
      url,
      cultureNetworkPath,
    );
    diagnostics.push(...cultureNetworkDiagnostics);
    await cultureNetworkPage.close();
    const chicagoScalePage = await browserContext.newPage();
    const chicagoScaleDiagnostics = collectDiagnostics(chicagoScalePage);
    const chicagoScale = await screenshotChicagoScale(chicagoScalePage, url, chicagoScalePath);
    diagnostics.push(...chicagoScaleDiagnostics);
    await chicagoScalePage.close();
    const narrowChicago = await verifyNarrowChicago(context, url);
    await rewriteReadmeBlock();
    const files = await Promise.all([
      screenshotInfo(boardPath),
      screenshotInfo(perfusedTumorPath),
      screenshotInfo(cultureNetworkPath),
      screenshotInfo(chicagoScalePath),
    ]);
    if (diagnostics.length > 0) throw new Error(`Browser diagnostics:\n${diagnostics.join("\n")}`);
    console.log(
      JSON.stringify(
        {
          viewport: VIEWPORT,
          board,
          perfusedTumor,
          cultureNetwork,
          chicagoScale,
          narrowChicago,
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
