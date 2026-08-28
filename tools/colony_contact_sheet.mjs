import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import { chromium } from "playwright";

import { bigNum, regionId, routeId, stageId } from "../src/brands.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { serializeGameState } from "../src/state/save_load.ts";

const ARTIFACT_ROOT = "/private/tmp/cancer-clicker-ng.pTNth9/colony-contact-sheet";
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const SEEDS = Object.freeze([17, 91, 2026]);
const VIEWPORTS = Object.freeze([
  Object.freeze({ label: "compact-360", width: 360, height: 900 }),
  Object.freeze({ label: "standard-560", width: 626, height: 1200 }),
  Object.freeze({ label: "inspection-1000", width: 1120, height: 1500 }),
]);
const THEMES = Object.freeze(["dark", "neutral-light"]);
const STAGE_TITLES = Object.freeze({
  transformed_cell: "Transformed cell",
  microcolony: "Microcolony",
  avascular_lesion: "Avascular lesion",
  hypoxic_lesion: "Hypoxic lesion",
  angiogenic_primary: "Angiogenic primary",
  invasive_carcinoma: "Invasive carcinoma",
  intravasation: "Intravasation",
  micrometastatic_seeding: "Disseminated micrometastases",
  metastatic_burden: "Metastatic burden",
  host_collapse: "Host collapse",
  immortalized_culture: "Immortalized culture",
  global_lab_contamination: "Global lab contamination",
});

function phase(message) {
  console.log(`\n========== colony renderer CONTACT SHEET: ${message} ==========`);
}

function run(command, argumentsList) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server has not bound its port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("Unable to reserve a local contact-sheet port.");
  }
  const port = address.port;
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

function contactSheetRegion(name, routeNames = []) {
  return {
    id: regionId(name),
    capacity: 10,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: ["vessel:contact-sheet"],
    routeIds: routeNames.map(routeId),
  };
}

function contactSheetStageGate(targetStageId) {
  const targetIndex = STAGE_IDS.indexOf(targetStageId);
  if (targetIndex < 0) throw new Error(`Unknown stage: ${targetStageId}`);
  if (targetIndex === 0) return createInitialGameState();
  const state = {
    ...createInitialGameState(),
    currentStage: stageId(STAGE_IDS[targetIndex - 1]),
    activeTimeMs: 100,
  };
  const region = contactSheetRegion("contact-sheet-region");
  const secondRegion = contactSheetRegion("contact-sheet-region-two");
  switch (targetStageId) {
    case "microcolony":
      return { ...state, cells: bigNum(10, 0), manualDivisionCharge: 1 };
    case "avascular_lesion":
      return {
        ...state,
        cells: bigNum(100, 0),
        producerLevels: state.producerLevels.map((level, index) =>
          index === 0 ? { ...level, level: 1 } : level,
        ),
      };
    case "hypoxic_lesion":
      return { ...state, regions: [region], oxygenPressure: 5 };
    case "angiogenic_primary":
      return { ...state, regions: [region] };
    case "invasive_carcinoma":
      return { ...state, regions: [region], routeDiscoveryProgress: 10 };
    case "intravasation":
      return {
        ...state,
        regions: [{ ...region, routeIds: [routeId("contact-sheet-route")] }],
        committedCellCommitments: { "contact-sheet-route": 1 },
        routeRiskById: { "contact-sheet-route": 0 },
      };
    case "micrometastatic_seeding":
      return { ...state, regions: [region], seededSites: [region.id] };
    case "metastatic_burden":
      return {
        ...state,
        cells: bigNum(1_000, 0),
        regions: [region, secondRegion],
        seededSites: [region.id, secondRegion.id],
      };
    case "host_collapse":
      return { ...state, cells: bigNum(1_000, 0), oxygenPressure: 1 };
    case "immortalized_culture":
      return { ...state, prestigeAvailability: [{ id: "L3", status: "earned" }] };
    case "global_lab_contamination":
      return { ...state, routeDiscoveryProgress: 100 };
    default:
      throw new Error(`No valid contact-sheet setup for ${targetStageId}`);
  }
}

function savedStageGate(stageId, seed) {
  const state = contactSheetStageGate(stageId);
  const seededState = { ...state, deterministicSeed: seed };
  return serializeGameState(seededState, Date.now());
}

async function enterStage(page, stageId, seed, port) {
  const raw = savedStageGate(stageId, seed);
  await page.addInitScript(
    ({ key, serialized }) => {
      if (globalThis.sessionStorage.getItem("colony-contact-sheet-seeded") !== "1") {
        globalThis.localStorage.setItem(key, serialized);
        globalThis.sessionStorage.setItem("colony-contact-sheet-seeded", "1");
      }
    },
    { key: SAVE_KEY, serialized: raw },
  );
  await page.goto(`http://127.0.0.1:${port}/?debug=1`, { waitUntil: "networkidle" });
  const title = STAGE_TITLES[stageId];
  if (title === undefined) throw new Error(`No stage title for ${stageId}`);
  if (stageId !== "transformed_cell") {
    await page.getByRole("button", { name: `Advance to ${title}` }).click();
  }
  await page.getByRole("heading", { name: title }).waitFor({ state: "visible" });
  await page.getByRole("heading", { name: "Colony morphology" }).waitFor({ state: "visible" });
  const figure = page.locator("svg.colony-figure");
  await figure.waitFor({ state: "visible" });
  const role = await figure.getAttribute("role");
  if (role !== "img") throw new Error(`${stageId}: colony figure lost its image role.`);
  await page.locator(".colony-panel figcaption").waitFor({ state: "visible" });
}

async function collectFrame(page, theme) {
  if (theme === "neutral-light") {
    await page.locator(".colony-panel").evaluate((panel) => {
      panel.classList.add("is-neutral-light");
    });
  }
  const result = await page.locator("svg.colony-figure").evaluate((element) => {
    const allNodes = [element, ...element.querySelectorAll("*")];
    const ids = [...element.querySelectorAll("[id]")].map((node) => node.id);
    const pathValues = [...element.querySelectorAll("path")].map((node) => node.getAttribute("d"));
    const box = element.getBoundingClientRect();
    const computed = globalThis.getComputedStyle(element);
    return {
      nodeCount: allNodes.length,
      serializedBytes: new TextEncoder().encode(element.outerHTML).length,
      idCount: ids.length,
      uniqueIdCount: new Set(ids).size,
      pathCount: pathValues.length,
      uniquePathCount: new Set(pathValues).size,
      allFiniteBoxes: allNodes.every((node) => {
        const nodeBox = node.getBoundingClientRect();
        return [nodeBox.x, nodeBox.y, nodeBox.width, nodeBox.height].every(Number.isFinite);
      }),
      documentOverflow:
        globalThis.document.documentElement.scrollWidth >
        globalThis.document.documentElement.clientWidth,
      figureWidth: box.width,
      figureHeight: box.height,
      animationName: computed.animationName,
      transitionDuration: computed.transitionDuration,
    };
  });
  if (!result.allFiniteBoxes) throw new Error("SVG contains a non-finite layout box.");
  return result;
}

async function ensurePanelVisible(page) {
  const panel = page.locator(".colony-panel");
  const figure = page.locator("svg.colony-figure");
  const caption = panel.locator("figcaption");
  await panel.scrollIntoViewIfNeeded();
  const result = await panel.evaluate((element) => {
    const figureElement = element.querySelector("svg.colony-figure");
    const captionElement = element.querySelector("figcaption");
    if (figureElement === null || captionElement === null) {
      throw new Error("Colony panel does not contain both figure and caption.");
    }
    function visibleBox(node) {
      const box = node.getBoundingClientRect();
      const nonzero = box.width > 0 && box.height > 0;
      const fullyVisible =
        nonzero &&
        box.left >= 0 &&
        box.top >= 0 &&
        box.right <= globalThis.innerWidth &&
        box.bottom <= globalThis.innerHeight;
      return { x: box.x, y: box.y, width: box.width, height: box.height, nonzero, fullyVisible };
    }
    return {
      panel: visibleBox(element),
      figure: visibleBox(figureElement),
      caption: visibleBox(captionElement),
    };
  });
  if (!result.figure.nonzero || !result.caption.nonzero) {
    throw new Error("The colony figure or caption has zero rendered area.");
  }
  if (!result.figure.fullyVisible || !result.caption.fullyVisible) {
    throw new Error("The colony figure and caption must both be fully visible before capture.");
  }
  return { panel, figure, caption, boxes: result };
}

function screenshotPath(stageId, seed, viewport, theme) {
  const name = `${stageId}-seed-${seed}-${viewport.label}-${theme}.png`;
  return path.join(ARTIFACT_ROOT, name);
}

function frameRecord(stageId, seed, viewport, theme, screenshot, inspection, boxes) {
  return {
    stageId,
    seed,
    viewport,
    theme,
    screenshot: path.basename(screenshot),
    boxes,
    ...inspection,
  };
}

function createIndex(records) {
  const cards = records
    .map((record) => {
      const label = `${record.stageId} | ${record.seed} | ${record.viewport.label} | ${record.theme}`;
      return `<figure><img src="${record.screenshot}" alt="${label}"><figcaption>${label}</figcaption></figure>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>colony renderer real renderer contact sheet</title>
<style>body{background:#20242a;color:#f5f5f5;font:14px system-ui;margin:16px}main{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}figure{background:#303841;margin:0;padding:8px}img{display:block;width:100%;height:auto}figcaption{padding:8px 0 0}</style>
</head><body><h1>colony renderer actual production renderer contact sheet</h1><main>${cards}</main></body></html>`;
}

async function verifyArtifacts(records) {
  const expectedFrames = STAGE_IDS.length * SEEDS.length * VIEWPORTS.length * THEMES.length;
  if (records.length !== expectedFrames) {
    throw new Error(`Expected ${expectedFrames} captured frames, found ${records.length}.`);
  }
  const manifestPath = path.join(ARTIFACT_ROOT, "manifest.json");
  const indexPath = path.join(ARTIFACT_ROOT, "index.html");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const index = await readFile(indexPath, "utf8");
  if (!Array.isArray(manifest.records) || manifest.records.length !== expectedFrames) {
    throw new Error("Contact-sheet manifest does not contain the full frame corpus.");
  }
  const figureCount = (index.match(/<figure>/g) ?? []).length;
  if (figureCount !== expectedFrames) {
    throw new Error(
      `Contact-sheet index contains ${figureCount}, expected ${expectedFrames} frames.`,
    );
  }
  for (const record of records) {
    const screenshot = path.join(ARTIFACT_ROOT, record.screenshot);
    const information = await stat(screenshot);
    if (information.size === 0) throw new Error(`Empty contact-sheet PNG: ${record.screenshot}`);
    if (
      !record.boxes.figure.fullyVisible ||
      !record.boxes.caption.fullyVisible ||
      !record.boxes.figure.nonzero ||
      !record.boxes.caption.nonzero
    ) {
      throw new Error(`Incomplete panel capture geometry: ${record.screenshot}`);
    }
  }
  return { expectedFrames, figureCount };
}

async function main() {
  phase("BUILD PRODUCTION DIST");
  await run("./build_github_pages.sh", []);
  const bundle = await readFile("dist/main.js");
  const bundleHash = sha256(bundle);
  const port = await availablePort();
  phase("PREPARE ARTIFACT DIRECTORY");
  await rm(ARTIFACT_ROOT, { recursive: true, force: true });
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  phase("START REAL DIST SERVER");
  const server = spawn(
    "bash",
    ["-lc", `source source_me.sh && exec python3 -m http.server ${port} --directory dist`],
    { stdio: "inherit" },
  );
  try {
    const baseUrl = `http://127.0.0.1:${port}/`;
    await waitForServer(baseUrl);
    const servedBundle = await (await fetch(`${baseUrl}main.js`)).arrayBuffer();
    if (sha256(Buffer.from(servedBundle)) !== bundleHash) {
      throw new Error("The contact-sheet server is not serving the current dist/main.js bundle.");
    }
    console.log(`Verified current dist/main.js SHA-256: ${bundleHash}`);
    const browser = await chromium.launch({ headless: true });
    const records = [];
    try {
      phase("CAPTURE ALL REAL STAGES, SEEDS, VIEWPORTS, AND THEMES");
      for (const seed of SEEDS) {
        for (const stageId of STAGE_IDS) {
          for (const viewport of VIEWPORTS) {
            for (const theme of THEMES) {
              const context = await browser.newContext({
                viewport,
                colorScheme: theme === "dark" ? "dark" : "light",
                reducedMotion: "reduce",
              });
              try {
                const page = await context.newPage();
                await enterStage(page, stageId, seed, port);
                const inspection = await collectFrame(page, theme);
                const panel = await ensurePanelVisible(page);
                const screenshot = screenshotPath(stageId, seed, viewport, theme);
                await panel.panel.screenshot({ path: screenshot });
                records.push(
                  frameRecord(stageId, seed, viewport, theme, screenshot, inspection, panel.boxes),
                );
              } finally {
                await context.close();
              }
            }
          }
        }
      }
    } finally {
      await browser.close();
    }
    phase("WRITE MANIFEST AND BROWSERABLE CONTACT SHEET");
    await writeFile(
      path.join(ARTIFACT_ROOT, "manifest.json"),
      `${JSON.stringify({ records }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(path.join(ARTIFACT_ROOT, "index.html"), createIndex(records), "utf8");
    const artifactStatus = await verifyArtifacts(records);
    console.log(
      `Captured ${artifactStatus.expectedFrames} actual production-page frames in ${ARTIFACT_ROOT}`,
    );
  } finally {
    server.kill("SIGTERM");
  }
}

await main();
