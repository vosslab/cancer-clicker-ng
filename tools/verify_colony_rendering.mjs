/**
 * On-demand colony rendering calibration.  This intentionally reports a broad
 * stage/seed corpus instead of making artistic variety and DOM budgets a fast
 * regression gate.
 */
import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

import { stageId } from "../src/brands.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { describeColonySvg } from "../src/svg/colony.tsx";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

const ARTIFACT_ROOT = "/private/tmp/cancer-clicker-ng.pTNth9/colony-rendering-verification";
const SSR_MODULE_PATH = `${ARTIFACT_ROOT}/colony-ssr.mjs`;
const SEEDS = Object.freeze([17, 91, 2026]);

function scene(stage, seed) {
  return createGameColonyScene({
    ...createInitialGameState(),
    currentStage: stageId(stage),
    deterministicSeed: seed,
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function numericTokens(value) {
  return value.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? [];
}

function requireFiniteSvgText(value, label) {
  if (/(?:NaN|Infinity)/i.test(value)) throw new Error(`${label} contains a non-finite token.`);
  for (const token of numericTokens(value)) {
    if (!Number.isFinite(Number(token))) throw new Error(`${label} has a non-finite number.`);
  }
}

async function renderServerScene(value) {
  await build({
    entryPoints: ["src/svg/colony.tsx"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2020",
    outfile: SSR_MODULE_PATH,
    plugins: [solidPlugin({ solid: { generate: "ssr" } })],
  });
  const rendered = await import(`${pathToFileURL(SSR_MODULE_PATH).href}?scene=${value.sceneSeed}`);
  const solid = await import("solid-js");
  const web = await import("solid-js/web");
  return web.renderToString(() => solid.createComponent(rendered.Colony, { scene: value }));
}

async function main() {
  await rm(ARTIFACT_ROOT, { recursive: true, force: true });
  await mkdir(ARTIFACT_ROOT, { recursive: true });
  const samples = [];
  const uniquePathHashes = new Set();
  try {
    for (const stageId of STAGE_IDS) {
      for (const seed of SEEDS) {
        const representative = scene(stageId, seed);
        const model = describeColonySvg(representative);
        for (const cell of model.cells) {
          requireFiniteSvgText(cell.transform, `${stageId}:${seed}: transform`);
          requireFiniteSvgText(cell.membranePath, `${stageId}:${seed}: membrane`);
          requireFiniteSvgText(cell.nucleusPath, `${stageId}:${seed}: nucleus`);
        }
        for (const cell of model.cells)
          uniquePathHashes.add(sha256(`${cell.membranePath}|${cell.nucleusPath}`));
        samples.push({
          stageId,
          seed,
          representativeSlots: representative.layout.slots.length,
          representativeNodeEstimate: model.nodeEstimate,
          macroFingerprint: representative.layout.metrics.macroFingerprint,
        });
      }
    }
    const representative = scene("angiogenic_primary", 91);
    const markup = await renderServerScene(representative);
    requireFiniteSvgText(markup, "SSR markup");
    const report = {
      purpose:
        "One-time colony rendering calibration; values are observations, not permanent gates.",
      sampledStages: STAGE_IDS,
      seeds: SEEDS,
      uniqueRepresentativePathHashes: uniquePathHashes.size,
      representativeSsr: {
        stageId: representative.stageId,
        seed: representative.sceneSeed,
        bytes: new TextEncoder().encode(markup).length,
        elementCount: (markup.match(/<\/?[a-z][^>]*>/gi) ?? []).filter(
          (tag) => !tag.startsWith("</"),
        ).length,
      },
      samples,
    };
    const reportPath = `${ARTIFACT_ROOT}/report.json`;
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    console.log(`Wrote colony rendering calibration to ${reportPath}`);
  } finally {
    await rm(SSR_MODULE_PATH, { force: true });
  }
}

await main();
