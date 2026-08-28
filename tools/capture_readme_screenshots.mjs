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
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIRECTORY = path.join(ROOT, "dist");
const README_PATH = path.join(ROOT, "README.md");
const SCREENSHOT_DIRECTORY = path.join(ROOT, "docs", "screenshots");
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const VIEWPORT = Object.freeze({ width: 1280, height: 800 });
const README_BLOCK = Object.freeze({
  begin: "<!-- screenshots:begin (managed by screenshot-docs) -->",
  end: "<!-- screenshots:end -->",
  lines: Object.freeze([
    "![Cancer Clicker NG board with a direct cancer-cell action, live cell count and production rate, tumor progression, and the Division apparatus store](docs/screenshots/cancer_clicker_ng_board.png)",
    "![Cancer Clicker NG prestige orientation showing the Prestige layers heading, active lung niche, lineage portfolio, and colony anchor](docs/screenshots/cancer_clicker_ng_prestige.png)",
    "![Focused Cancer Clicker NG prestige detail showing the legal active host, retained active niche, and host-trait liability tradeoffs rather than the full board](docs/screenshots/cancer_clicker_ng_host_trait.png)",
    "![Cancer Clicker NG angiogenic primary with a perfused multicellular tumor, visible blood-supply branches, meaningful growth, and producer upgrades](docs/screenshots/cancer_clicker_ng_perfused_tumor.png)",
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

function legalPrestigeState() {
  const initial = createInitialGameState();
  const seededRegion = {
    id: regionId("readme-prestige-seed"),
    capacity: 6,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
  };
  return {
    ...initial,
    activeTimeMs: 100,
    currentStage: stageId("host_collapse"),
    cells: bigNum(1, 4),
    regions: [seededRegion],
    seededSites: [seededRegion.id],
    prestigeAvailability: [
      { id: "L1", status: "earned" },
      { id: "L2", status: "earned" },
    ],
    lineageLedger: {
      ...initial.lineageLedger,
      completedL1ResetCount: 3,
      organTagsSeen: ["hepatic", "pulmonary"],
    },
    metastasis: {
      ...initial.metastasis,
      metastaticPotential: bigNum(2, 0),
      allocations: [{ siteId: "lung", rank: 1 }],
      programs: [{ siteId: "lung", programId: "exploit_niche" }],
      activeNicheContext: { siteId: "lung", allocationRank: 1, programId: "exploit_niche" },
    },
    hostTransfer: { ...initial.hostTransfer, hostImprints: 3 },
  };
}

async function seedLegalPrestigeState(page) {
  const serialized = serializeGameState(legalPrestigeState(), Date.now());
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("readme-prestige-fixture-seeded") !== "1") {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("readme-prestige-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: serialized },
  );
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
  const serialized = serializeGameState(legalPerfusedTumorState(), Date.now());
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
  }));
  if (measurements.horizontalOverflow)
    throw new Error("The documentation board has horizontal overflow.");
  if (measurements.cellTargets === 0) throw new Error("The direct colony cell target is absent.");
  return measurements;
}

async function resetPageScroll(page) {
  await page
    .locator("body")
    .evaluate((body) => body.ownerDocument.defaultView?.scrollTo({ top: 0, left: 0 }));
}

async function screenshotBoard(page, url, outputPath) {
  await page.goto(url, { waitUntil: "networkidle" });
  await resetPageScroll(page);
  const measurements = await assertBoard(page);
  await page.screenshot({ path: outputPath });
  return measurements;
}

async function screenshotPrestige(page, url, outputPath, hostTraitPath) {
  console.log("Preparing legal prestige state.");
  await seedLegalPrestigeState(page);
  await page.goto(url, { waitUntil: "networkidle" });
  const prestige = page.getByRole("region", { name: "Prestige layers" });
  console.log("Confirming host transfer.");
  await prestige.getByRole("button", { name: "Perform host transfer", exact: true }).click();
  const transferDialog = page.getByRole("dialog", { name: "Perform host transfer" });
  await transferDialog.getByRole("button", { name: "Confirm Perform host transfer" }).click();
  console.log("Choosing the revealed host.");
  await prestige.getByRole("button", { name: "Choose this host" }).first().click();
  const hostDialog = page.getByRole("dialog", { name: "Choose this host" });
  await hostDialog.getByRole("button", { name: "Confirm Choose this host" }).click();
  console.log("Waiting for active niche and host presentation.");
  await prestige.locator("#active-host-summary").waitFor({ state: "visible" });
  const nicheText = await prestige.locator("#metastasis-summary").textContent();
  if (nicheText?.includes("Active niche:") !== true)
    throw new Error("The legal prestige walkthrough did not retain an active niche.");
  await resetPageScroll(page);
  await page.locator(".progression-rail").evaluate((rail) => {
    const panel = rail.querySelector(".prestige-panel");
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
  });
  const measurements = await assertBoard(page);
  await page.screenshot({ path: outputPath });
  const activeHost = prestige.locator("#active-host-summary");
  await activeHost.scrollIntoViewIfNeeded();
  await activeHost
    .getByRole("button", { name: "Reduce liability" })
    .first()
    .waitFor({ state: "visible" });
  await page.screenshot({ path: hostTraitPath });
  return measurements;
}

async function screenshotPerfusedTumor(page, url, outputPath) {
  await seedLegalPerfusedTumorState(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Angiogenic primary" }).waitFor({ state: "visible" });
  await page.locator(".colony-figure__vessel").waitFor({ state: "visible" });
  await resetPageScroll(page);
  const measurements = await assertBoard(page);
  await page.screenshot({ path: outputPath });
  return measurements;
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
    const prestigePath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_prestige.png");
    const hostTraitPath = path.join(SCREENSHOT_DIRECTORY, "cancer_clicker_ng_host_trait.png");
    const perfusedTumorPath = path.join(
      SCREENSHOT_DIRECTORY,
      "cancer_clicker_ng_perfused_tumor.png",
    );
    const board = await screenshotBoard(page, url, boardPath);
    await page.close();
    const prestigePage = await browserContext.newPage();
    const prestigeDiagnostics = collectDiagnostics(prestigePage);
    const prestige = await screenshotPrestige(prestigePage, url, prestigePath, hostTraitPath);
    diagnostics.push(...prestigeDiagnostics);
    await prestigePage.close();
    const perfusedTumorPage = await browserContext.newPage();
    const perfusedTumorDiagnostics = collectDiagnostics(perfusedTumorPage);
    const perfusedTumor = await screenshotPerfusedTumor(perfusedTumorPage, url, perfusedTumorPath);
    diagnostics.push(...perfusedTumorDiagnostics);
    await rewriteReadmeBlock();
    const files = await Promise.all([
      screenshotInfo(boardPath),
      screenshotInfo(prestigePath),
      screenshotInfo(hostTraitPath),
      screenshotInfo(perfusedTumorPath),
    ]);
    if (diagnostics.length > 0) throw new Error(`Browser diagnostics:\n${diagnostics.join("\n")}`);
    console.log(
      JSON.stringify(
        { viewport: VIEWPORT, board, prestige, perfusedTumor, files, diagnostics },
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
