import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

import { STAGE_IDS } from "../src/state/catalog.ts";
import { createCellBlobPaths } from "../src/svg/blob.ts";
import { createColonyLayout, PLATE_HEIGHT, PLATE_WIDTH } from "../src/svg/colony_layout.ts";
import { describeColonySvg } from "../src/svg/colony.tsx";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import { createColonySceneRequest } from "../src/svg/render_types.ts";

const REPOSITORY_ROOT = process.cwd();
const SSR_MODULE_PATH = `${REPOSITORY_ROOT}/.m18_visual_metrics_ssr.mjs`;
const SEEDS = Object.freeze([17, 91, 2026]);
const MAX_REPRESENTATIVE_NODES = 1050;
const MIN_UNIQUE_PATH_HASHES = 1000;

function scene(stageId, seed, detail = "representative") {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({ stageId, sceneSeed: seed, morphology, detail });
  return createColonySceneRequest(
    Object.freeze({ layout, morphology, stageId, sceneSeed: seed, detail }),
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function numericTokens(value) {
  return value.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi) ?? [];
}

function assertFiniteSvgText(value, label) {
  assert.equal(/(?:NaN|Infinity)/i.test(value), false, `${label}: finite SVG text`);
  for (const token of numericTokens(value))
    assert.equal(Number.isFinite(Number(token)), true, label);
}

function assertPlateBounds(value, label) {
  for (const slot of value.layout.slots) {
    assert.ok(slot.centre.x - slot.rx > 0, `${label}:${slot.key}: left plate edge`);
    assert.ok(slot.centre.x + slot.rx < PLATE_WIDTH, `${label}:${slot.key}: right plate edge`);
    assert.ok(slot.centre.y - slot.ry > 0, `${label}:${slot.key}: top plate edge`);
    assert.ok(slot.centre.y + slot.ry < PLATE_HEIGHT, `${label}:${slot.key}: bottom plate edge`);
  }
}

function cellPathHashes(value) {
  return value.layout.slots.map((slot) => {
    const paths = createCellBlobPaths(slot, value.morphology);
    return sha256(`${paths.membranePath}|${paths.nucleusPath}`);
  });
}

function cosine(a, b) {
  assert.equal(a.length, b.length, "macro vectors share a fixed representation");
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  return dot / Math.hypot(...a) / Math.hypot(...b);
}

async function renderServerScene(value) {
  await build({
    entryPoints: ["src/svg/colony.tsx"],
    bundle: true,
    format: "esm",
    platform: "node",
    target: "es2020",
    packages: "external",
    outfile: SSR_MODULE_PATH,
    plugins: [solidPlugin({ solid: { generate: "ssr" } })],
  });
  try {
    const rendered = await import(
      `${pathToFileURL(SSR_MODULE_PATH).href}?scene=${value.sceneSeed}`
    );
    const solid = await import("solid-js");
    const web = await import("solid-js/web");
    return web.renderToString(() => solid.createComponent(rendered.Colony, { scene: value }));
  } finally {
    await rm(SSR_MODULE_PATH, { force: true });
  }
}

test("M18 preserves finite, unclipped deterministic real-model geometry over its stage seed corpus", () => {
  const uniqueHashes = new Set();
  for (const stageId of STAGE_IDS) {
    const stageHashes = new Set();
    const fingerprints = [];
    for (const seed of SEEDS) {
      const value = scene(stageId, seed);
      const repeated = scene(stageId, seed);
      const model = describeColonySvg(value);
      assert.deepEqual(value, repeated, `${stageId}:${seed}: fixed scene bytes`);
      assert.equal(
        model.cells.length,
        value.layout.slots.length,
        `${stageId}:${seed}: one cell/slot`,
      );
      assert.ok(model.nodeEstimate <= MAX_REPRESENTATIVE_NODES, `${stageId}:${seed}: DOM estimate`);
      assertPlateBounds(value, `${stageId}:${seed}`);
      assertFiniteSvgText(
        value.layout.silhouette.vertices.map((point) => `${point.x},${point.y}`).join(" "),
        `${stageId}:${seed}: silhouette`,
      );
      for (const cell of model.cells) {
        assertFiniteSvgText(cell.transform, `${stageId}:${seed}:${cell.key}: transform`);
        assertFiniteSvgText(cell.membranePath, `${stageId}:${seed}:${cell.key}: membrane`);
        assertFiniteSvgText(cell.nucleusPath, `${stageId}:${seed}:${cell.key}: nucleus`);
      }
      const hashes = cellPathHashes(value);
      hashes.forEach((hash) => {
        uniqueHashes.add(hash);
        stageHashes.add(hash);
      });
      fingerprints.push(value.layout.metrics.macroFingerprint);
      const inspection = scene(stageId, seed, "inspection");
      assertPlateBounds(inspection, `${stageId}:${seed}: inspection`);
      for (const cell of describeColonySvg(inspection).cells) {
        assertFiniteSvgText(cell.transform, `${stageId}:${seed}:${cell.key}: inspection transform`);
        assertFiniteSvgText(
          cell.membranePath,
          `${stageId}:${seed}:${cell.key}: inspection membrane`,
        );
        assertFiniteSvgText(cell.nucleusPath, `${stageId}:${seed}:${cell.key}: inspection nucleus`);
      }
    }
    assert.ok(stageHashes.size >= 1, `${stageId}: path identity exists`);
    assert.notDeepEqual(
      cellPathHashes(scene(stageId, SEEDS[0])),
      cellPathHashes(scene(stageId, SEEDS[1])),
      `${stageId}: changed seeds vary cell paths`,
    );
    for (const fingerprint of fingerprints)
      assert.ok(cosine(fingerprint, fingerprints[0]) >= 0.78, `${stageId}: stable macro family`);
  }
  assert.ok(
    uniqueHashes.size >= MIN_UNIQUE_PATH_HASHES,
    `unique cell-path hashes: ${uniqueHashes.size}`,
  );
});

test("M18 serialized SVG keeps one shared definition inventory and bounded actual DOM", async () => {
  const representative = scene("angiogenic_primary", 91);
  const inspection = scene("angiogenic_primary", 91, "inspection");
  const markup = await renderServerScene(representative);
  const repeatedMarkup = await renderServerScene(representative);
  assert.equal(markup, repeatedMarkup, "fixed scene serializes byte-identically");
  assertFiniteSvgText(markup, "serialized representative SVG");
  assert.equal((markup.match(/<defs\b/g) ?? []).length, 1, "one shared defs group");
  assert.equal((markup.match(/<(?:linearGradient|pattern|mask)\b/g) ?? []).length, 4);
  assert.equal(
    (markup.match(/<g\b[^>]*class="colony-cell\b/g) ?? []).length,
    representative.layout.slots.length,
  );
  const actualNodes = (markup.match(/<\/?[a-z][^>]*>/gi) ?? []).filter(
    (tag) => !tag.startsWith("</"),
  ).length;
  assert.ok(actualNodes <= MAX_REPRESENTATIVE_NODES, `actual representative nodes: ${actualNodes}`);
  assert.ok(
    describeColonySvg(representative).cells.length <= describeColonySvg(inspection).cells.length,
    `representative ${representative.layout.slots.length}, inspection ${inspection.layout.slots.length}`,
  );
});

test("M18 renderer and visual-metric test stay tied to the real M16/M17/M18 seam", async () => {
  const renderer = await readFile("src/svg/colony.tsx", "utf8");
  const visualTest = await readFile("tests/test_colony_visual_metrics.mjs", "utf8");
  assert.match(renderer, /describeColonySvg/);
  assert.match(visualTest, /resolve_stage_morphology/);
  assert.match(visualTest, /createColonyLayout/);
  assert.match(visualTest, /createCellBlobPaths/);
  assert.match(visualTest, /renderToString/);
});
