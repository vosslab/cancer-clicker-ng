import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_IDS } from "../src/state/catalog.ts";
import { createColonyLayout } from "../src/svg/colony_layout.ts";
import { createCellBlobPaths, MAX_CONTOUR_SAMPLES, MIN_CONTOUR_SAMPLES } from "../src/svg/blob.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";

function fixture(stageId, seed = 17) {
  const morphology = resolve_stage_morphology(seed, stageId);
  const layout = createColonyLayout({
    stageId,
    sceneSeed: seed,
    morphology,
    detail: "representative",
    burdenTier: "dense",
  });
  const slot = layout.slots[0];
  assert.ok(slot, `${stageId} has an accepted colony-layout slot`);
  return { morphology, slot };
}

function pathHash(path) {
  let hash = 2166136261;
  for (const character of path) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function pathPoints(path) {
  assert.match(path, /^M -?[\d.]+ -?[\d.]+(?: L -?[\d.]+ -?[\d.]+)+ Z$/);
  return [...path.matchAll(/(?:M|L) (-?[\d.]+) (-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

test("blob paths are deterministic, local, closed, and bounded at the declared contour density", () => {
  for (const stageId of STAGE_IDS) {
    const { morphology, slot } = fixture(stageId);
    const beforeSlot = structuredClone(slot);
    const beforeMorphology = structuredClone(morphology);
    const first = createCellBlobPaths(slot, morphology);
    const second = createCellBlobPaths(slot, morphology);
    assert.deepEqual(first, second, stageId);
    assert.equal(Object.isFrozen(first), true);
    assert.deepEqual(slot, beforeSlot, `${stageId}: slot unchanged`);
    assert.deepEqual(morphology, beforeMorphology, `${stageId}: morphology unchanged`);
    for (const path of [first.membranePath, first.nucleusPath]) {
      const points = pathPoints(path);
      assert.ok(points.length >= MIN_CONTOUR_SAMPLES && points.length <= MAX_CONTOUR_SAMPLES);
      assert.ok(points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
      assert.ok(points.every((point) => Math.abs(point.x) < 10000 && Math.abs(point.y) < 10000));
    }
    const membrane = pathPoints(first.membranePath);
    const nucleus = pathPoints(first.nucleusPath);
    const membraneX = Math.max(...membrane.map((point) => Math.abs(point.x)));
    const membraneY = Math.max(...membrane.map((point) => Math.abs(point.y)));
    assert.ok(nucleus.every((point) => Math.abs(point.x) < membraneX * 0.75));
    assert.ok(nucleus.every((point) => Math.abs(point.y) < membraneY * 0.75));
  }
});

test("one thousand accepted generated cells have distinct membrane hashes and bounded family paths", () => {
  const hashes = new Set();
  const normalFamily = [];
  for (let seed = 0; seed < 1000; seed += 1) {
    const stageId = STAGE_IDS[seed % STAGE_IDS.length];
    assert.ok(stageId);
    const { morphology, slot } = fixture(stageId, seed);
    const paths = createCellBlobPaths(slot, morphology);
    hashes.add(pathHash(paths.membranePath));
    if (stageId === "microcolony") normalFamily.push(paths.membranePath);
  }
  assert.equal(hashes.size, 1000);
  assert.ok(normalFamily.length > 20);
  const counts = normalFamily.map((path) => pathPoints(path).length);
  assert.ok(counts.every((count) => count >= MIN_CONTOUR_SAMPLES && count <= MAX_CONTOUR_SAMPLES));
});

test("seed variation changes paths while preserving a stage family contour budget", () => {
  const paths = [17, 18, 19, 20].map((seed) => {
    const { morphology, slot } = fixture("microcolony", seed);
    return createCellBlobPaths(slot, morphology).membranePath;
  });
  assert.equal(new Set(paths).size, paths.length);
  const extents = paths.map((path) => {
    const points = pathPoints(path);
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  });
  const widthRatio =
    Math.max(...extents.map((extent) => extent.width)) /
    Math.min(...extents.map((extent) => extent.width));
  const heightRatio =
    Math.max(...extents.map((extent) => extent.height)) /
    Math.min(...extents.map((extent) => extent.height));
  assert.ok(widthRatio < 1.9);
  assert.ok(heightRatio < 1.9);
});

test("blob paths reject hostile nonfinite, mismatched, and forged frozen input", () => {
  const { morphology, slot } = fixture("microcolony");
  assert.throws(() => createCellBlobPaths(Object.freeze({ ...slot, rx: Infinity }), morphology));
  assert.throws(() =>
    createCellBlobPaths(Object.freeze({ ...slot, morphologySeed: 99 }), morphology),
  );
  assert.throws(() => createCellBlobPaths(slot, Object.freeze({ ...morphology, seed: 99 })));
  assert.throws(() =>
    createCellBlobPaths(
      slot,
      Object.freeze({
        ...morphology,
        traits: Object.freeze({
          ...morphology.traits,
          mitosis: Object.freeze({ motif: "paired_nuclei", placement: "none" }),
        }),
      }),
    ),
  );
  assert.throws(() => createCellBlobPaths({ ...slot }, morphology));
  assert.throws(() => createCellBlobPaths(slot, { ...morphology }));
});

test("blob module uses no browser globals or ambient random source", async () => {
  const source = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/svg/blob.ts", "utf8"),
  );
  assert.equal(source.includes("Math.random"), false);
  assert.equal(/\b(?:document|window)\b/.test(source), false);
});
