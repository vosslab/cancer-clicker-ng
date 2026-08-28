import assert from "node:assert/strict";
import { build } from "esbuild";
import { rm, readFile } from "node:fs/promises";
import test from "node:test";
import { pathToFileURL } from "node:url";

import { solidPlugin } from "esbuild-plugin-solid";

import { STAGE_IDS } from "../src/state/catalog.ts";
import { createColonyLayout } from "../src/svg/colony_layout.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import { describeColonySvg } from "../src/svg/colony.tsx";
import { createColonySceneRequest } from "../src/svg/render_types.ts";

const REPOSITORY_ROOT = process.cwd();
const SSR_MODULE_PATH = `${REPOSITORY_ROOT}/.m18_colony_ssr_test.mjs`;
const MAX_REPRESENTATIVE_NODES = 1050;

function scene(stageId, seed = 17, detail = "representative") {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({ stageId, sceneSeed: seed, morphology, detail });
  return createColonySceneRequest(
    Object.freeze({ layout, morphology, stageId, sceneSeed: seed, detail }),
  );
}

function allMatches(text, expression) {
  return [...text.matchAll(expression)];
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
    const rendered = await import(`${pathToFileURL(SSR_MODULE_PATH).href}?seed=${value.sceneSeed}`);
    const solid = await import("solid-js");
    const web = await import("solid-js/web");
    return web.renderToString(() => solid.createComponent(rendered.Colony, { scene: value }));
  } finally {
    await rm(SSR_MODULE_PATH, { force: true });
  }
}

test("every canonical stage has a deterministic one-to-one immutable colony render model", () => {
  for (const stageId of STAGE_IDS) {
    const value = scene(stageId);
    const before = structuredClone(value);
    const first = describeColonySvg(value);
    const second = describeColonySvg(value);
    assert.deepEqual(first, second, stageId);
    assert.deepEqual(value, before, `${stageId}: scene input remains unchanged`);
    assert.equal(first.cells.length, value.layout.slots.length, `${stageId}: cell count`);
    assert.deepEqual(
      first.cells.map((cell) => cell.key),
      value.layout.slots.map((slot) => slot.key),
      `${stageId}: accepted slot order`,
    );
    assert.ok(first.nodeEstimate <= MAX_REPRESENTATIVE_NODES, `${stageId}: node budget`);
    assert.ok(first.cells.every((cell) => /^translate\(/.test(cell.transform)));
    assert.ok(first.cells.every((cell) => /^M -?[\d.]+ -?[\d.]+/.test(cell.membranePath)));
    assert.ok(first.cells.every((cell) => /^M -?[\d.]+ -?[\d.]+/.test(cell.nucleusPath)));
  }
});

test("the compiled Solid component SSRs one named inline image with ordered local structure", async () => {
  const value = scene("angiogenic_primary", 91);
  const markup = await renderServerScene(value);
  assert.equal(allMatches(markup, /<svg\b/g).length, 1);
  assert.equal(allMatches(markup, /<title\b/g).length, 1);
  assert.equal(allMatches(markup, /<desc\b/g).length, 1);
  assert.equal(allMatches(markup, /<defs\b/g).length, 1);
  assert.match(
    markup,
    /<svg[^>]*class="colony-figure"[^>]*role="img"[^>]*viewBox="0 0 1000 700"[^>]*preserveAspectRatio="xMidYMid meet"/,
  );
  const title = markup.match(/<title id="([^"]+)">/);
  const description = markup.match(/<desc id="([^"]+)">/);
  assert.ok(title);
  assert.ok(description);
  assert.match(title[1], /^ccng-[a-z0-9]+-title$/);
  assert.match(description[1], /^ccng-[a-z0-9]+-description$/);
  assert.match(markup, new RegExp(`aria-labelledby="${title[1]} ${description[1]}"`));
  const ids = allMatches(markup, /\sid="([^"]+)"/g).map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  const localTargets = allMatches(markup, /url\(#([^)]+)\)/g).map((match) => match[1]);
  for (const target of localTargets) assert.equal(ids.filter((id) => id === target).length, 1);
  assert.equal(/(?:https?:|data:|<script|on[a-z]+?=|href=)/i.test(markup), false);
  const groupOrder = [
    "colony-figure__backdrop",
    "colony-figure__regions",
    "colony-figure__cells",
    "colony-figure__foreground",
  ].map((name) => markup.indexOf(name));
  assert.ok(groupOrder.every((position) => position >= 0));
  assert.deepEqual(
    [...groupOrder].sort((left, right) => left - right),
    groupOrder,
  );
  assert.equal(allMatches(markup, /aria-hidden="true"/g).length, 4);
  assert.equal(/(?:tabindex|focusable|on(?:click|keydown|pointer|input))/i.test(markup), false);
});

test("the colony renderer preserves finite accepted geometry and does not own layout generation", async () => {
  const source = await readFile("src/svg/colony.tsx", "utf8");
  assert.equal(/from "\.\/colony_layout\.js"/.test(source), false);
  assert.equal(
    /\b(?:createColonyLayout|buildSilhouette|planRegions|populateClusters|allocateCellSlots)\b/.test(
      source,
    ),
    false,
  );
  assert.equal(
    /Math\.random|\b(?:document|window|localStorage|setInterval|setTimeout)\b/.test(source),
    false,
  );
  assert.equal(/innerHTML|dangerouslySetInnerHTML|<foreignObject\b/.test(source), false);
  assert.match(source, /<For each=\{model\.cells\}>/);
  const value = scene("global_lab_contamination", 2026);
  const model = describeColonySvg(value);
  for (const cell of model.cells) {
    assert.equal(Number.isFinite(Number(cell.transform.match(/translate\(([^ ]+)/)?.[1])), true);
    assert.equal(
      Number.isFinite(Number(cell.transform.match(/translate\([^ ]+ ([^)]+)/)?.[1])),
      true,
    );
    assert.equal(Number.isFinite(Number(cell.transform.match(/rotate\(([^)]+)/)?.[1])), true);
  }
  for (const point of value.layout.silhouette.vertices) {
    assert.equal(Number.isFinite(point.x), true);
    assert.equal(Number.isFinite(point.y), true);
  }
  for (const feature of [...value.layout.regions, ...value.layout.voids]) {
    assert.equal(Number.isFinite(feature.centre.x), true);
    assert.equal(Number.isFinite(feature.centre.y), true);
    assert.equal(Number.isFinite(feature.rx), true);
    assert.equal(Number.isFinite(feature.ry), true);
  }
});
