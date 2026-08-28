import assert from "node:assert/strict";
import test from "node:test";

import {
  PLATE_HEIGHT,
  PLATE_WIDTH,
  allocateCellSlots,
  buildSilhouette,
  createColonyLayout,
  planRegions,
  populateClusters,
} from "../src/svg/colony_layout.ts";
import { stageId } from "../src/brands.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";
import { stageGateFixture } from "./stage_fixture.mjs";

const SPARSE_AVASCULAR_REGRESSION_SEEDS = [39, 134, 191];

function request(stageId, seed = 17, detail = "representative", burdenTier = "dense") {
  return {
    stageId,
    sceneSeed: seed,
    morphology: resolve_stage_morphology(seed, stageId),
    detail,
    burdenTier,
  };
}

function independentlyCollides(a, b) {
  const samples = 64;
  const pointInside = (point, ellipse) =>
    ((point.x - ellipse.centre.x) / ellipse.rx) ** 2 +
      ((point.y - ellipse.centre.y) / ellipse.ry) ** 2 <=
    1;
  for (let index = 0; index < samples; index += 1) {
    const angle = (Math.PI * 2 * index) / samples;
    const point = {
      x: a.centre.x + Math.cos(angle) * a.rx,
      y: a.centre.y + Math.sin(angle) * a.ry,
    };
    if (pointInside(point, b)) return true;
  }
  return pointInside(a.centre, b) || pointInside(b.centre, a);
}

function independentPolygonContains(vertices, point) {
  let inside = false;
  for (
    let index = 0, prior = vertices.length - 1;
    index < vertices.length;
    prior = index, index += 1
  ) {
    const a = vertices[index];
    const b = vertices[prior];
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function independentEllipsePerimeter(slot, samples = 128) {
  return Array.from({ length: samples }, (_, index) => {
    const angle = (Math.PI * 2 * index) / samples;
    return {
      x: slot.centre.x + Math.cos(angle) * slot.rx,
      y: slot.centre.y + Math.sin(angle) * slot.ry,
    };
  });
}

function assertIndependentGeometry(layout, label) {
  for (const slot of layout.slots) {
    const region = layout.regions.find((item) => item.key === slot.regionKey);
    assert.ok(region, `${label}: owns a region`);
    for (const point of independentEllipsePerimeter(slot)) {
      assert.ok(
        point.x > 0 && point.x < PLATE_WIDTH && point.y > 0 && point.y < PLATE_HEIGHT,
        `${label}: plate`,
      );
      assert.ok(
        independentPolygonContains(layout.silhouette.vertices, point),
        `${label}: silhouette`,
      );
      const regional =
        ((point.x - region.centre.x) / region.rx) ** 2 +
        ((point.y - region.centre.y) / region.ry) ** 2;
      assert.ok(regional < 1, `${label}: own region`);
      for (const voidFeature of layout.voids) {
        const cleared =
          ((point.x - voidFeature.centre.x) / (voidFeature.rx + voidFeature.clearance)) ** 2 +
          ((point.y - voidFeature.centre.y) / (voidFeature.ry + voidFeature.clearance)) ** 2;
        assert.ok(cleared > 1, `${label}: void`);
      }
    }
  }
  for (let left = 0; left < layout.slots.length; left += 1)
    for (let right = left + 1; right < layout.slots.length; right += 1) {
      const a = layout.slots[left];
      const b = layout.slots[right];
      const overlap = independentlyCollides(a, b);
      const radii = Math.max(a.rx, a.ry) + Math.max(b.rx, b.ry);
      const separation = Math.hypot(a.centre.x - b.centre.x, a.centre.y - b.centre.y);
      if (a.depth === b.depth) assert.equal(overlap, false, `${label}: same-depth collision`);
      if (a.depth !== b.depth && separation <= radii && overlap)
        assert.ok(
          (a.depth === "surface" && a.occludes) || (b.depth === "surface" && b.occludes),
          `${label}: only surface may occlude`,
        );
    }
}

test("representative colony layouts stay finite, contained, and clear of each other", () => {
  for (const [stageId, seed, detail] of [
    ["microcolony", 17, "representative"],
    ["hypoxic_lesion", 91, "inspection"],
  ]) {
    const layout = createColonyLayout(request(stageId, seed, detail));
    assert.ok(layout.slots.length > 0, `${stageId}: visible colony`);
    assert.ok(
      Object.values(layout.metrics)
        .flat(Infinity)
        .every((value) => typeof value !== "number" || Number.isFinite(value)),
      `${stageId}: finite metrics`,
    );
    assertIndependentGeometry(layout, stageId);
  }
});

test("sparse early lesions retain accepted cells for direct division", () => {
  for (const seed of SPARSE_AVASCULAR_REGRESSION_SEEDS) {
    const layout = createColonyLayout(
      request("avascular_lesion", seed, "representative", "sparse"),
    );
    assert.ok(layout.slots.length > 0, `avascular_lesion ${seed}: sparse visible colony`);
    assert.deepEqual(
      layout.voids.map((voidFeature) => voidFeature.kind),
      ["cleft"],
    );
  }
  const hypoxic = createColonyLayout(request("hypoxic_lesion", 17, "representative", "sparse"));
  assert.ok(hypoxic.slots.length > 0, "hypoxic_lesion: sparse visible colony");
  assert.deepEqual(
    hypoxic.voids.map((voidFeature) => voidFeature.kind),
    ["core_void"],
  );
  for (const stageName of ["avascular_lesion", "hypoxic_lesion"]) {
    const game = { ...stageGateFixture(stageName), currentStage: stageId(stageName) };
    const canonicalLayout = createGameColonyScene(game).layout;
    assert.equal(canonicalLayout.burdenTier, "sparse");
    assert.ok(canonicalLayout.slots.length > 0, `${stageName}: canonical sparse visible colony`);
  }
});

test("opaque phases reject forged values and only the chained builder reaches slots", () => {
  const stageId = "microcolony";
  const validRequest = request(stageId);
  assert.throws(() =>
    planRegions({ stageId, centre: { x: 500, y: 350 }, vertices: [], baseRadius: 1 }, validRequest),
  );
  const silhouette = buildSilhouette(validRequest);
  assert.throws(() => populateClusters({ silhouette, regions: [], voids: [] }, validRequest));
  const regions = planRegions(silhouette, validRequest);
  assert.throws(() => allocateCellSlots({ regions, clusters: [] }, validRequest));
  assert.ok(
    allocateCellSlots(populateClusters(regions, validRequest), validRequest).slots.length > 0,
  );
});

test("completed clusters count their accepted slots without mutating the planned phase", () => {
  const source = request("microcolony", 17);
  const planned = populateClusters(planRegions(buildSilhouette(source), source), source);
  assert.ok(planned.clusters.every((cluster) => !("accepted" in cluster)));
  const layout = allocateCellSlots(planned, source);
  assert.equal(
    layout.clusters.reduce((sum, cluster) => sum + cluster.accepted, 0),
    layout.slots.length,
  );
});

test("hypoxic necrosis reserves a larger physical void", () => {
  const base = request("hypoxic_lesion", 17);
  const low = structuredClone(base);
  const high = structuredClone(base);
  low.morphology.params.necrosis = 0;
  high.morphology.params.necrosis = 1;
  const lowLayout = createColonyLayout(low);
  const highLayout = createColonyLayout(high);
  const area = (layout) => layout.voids.reduce((sum, item) => sum + Math.PI * item.rx * item.ry, 0);
  assert.ok(area(highLayout) > area(lowLayout));
});

test("layout rejects invalid requests", () => {
  const good = request("transformed_cell");
  assert.throws(() => createColonyLayout({ ...good, sceneSeed: Number.NaN }));
  assert.throws(() => createColonyLayout({ ...good, stageId: "unknown-stage" }));
  assert.throws(() => createColonyLayout({ ...good, burdenTier: undefined }));
  assert.throws(() => createColonyLayout({ ...good, burdenTier: "unbounded" }));
});
