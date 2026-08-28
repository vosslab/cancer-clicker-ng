import assert from "node:assert/strict";
import test from "node:test";

import { STAGE_IDS } from "../src/state/catalog.ts";
import {
  MAX_CANDIDATES_PER_SLOT,
  PLATE_HEIGHT,
  PLATE_WIDTH,
  REPRESENTATIVE_SLOT_CAP,
  STAGE_LAYOUT_SIGNATURES,
  allocateCellSlots,
  buildSilhouette,
  createColonyLayout,
  planRegions,
  populateClusters,
  suppressedDetailGeometry,
} from "../src/svg/colony_layout.ts";
import { resolve_stage_morphology } from "../src/svg/morphology.ts";

function request(stageId, seed = 17, detail = "representative") {
  return { stageId, sceneSeed: seed, morphology: resolve_stage_morphology(seed, stageId), detail };
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

function cosine(a, b) {
  assert.equal(a.length, b.length, "geometry fingerprints share a fixed representation");
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  return dot / Math.hypot(...a) / Math.hypot(...b);
}

function centroid(vectors) {
  return vectors[0].map(
    (_, index) => vectors.reduce((sum, vector) => sum + vector[index], 0) / vectors.length,
  );
}

test("all stage layouts are deterministic, finite, bounded, and signature-addressable", () => {
  for (const stageId of STAGE_IDS) {
    for (const detail of ["representative", "inspection"]) {
      const first = createColonyLayout(request(stageId, 17, detail));
      const second = createColonyLayout(request(stageId, 17, detail));
      assert.deepEqual(first, second, `${stageId}:${detail}`);
      assert.ok(
        first.slots.length <= (detail === "representative" ? REPRESENTATIVE_SLOT_CAP : 240),
      );
      assert.ok(
        first.slots.length >=
          Math.max(1, Math.floor(STAGE_LAYOUT_SIGNATURES[stageId].target * 0.8)),
        `${stageId}:${detail}: accepted minimum`,
      );
      assert.equal(first.metrics.outOfBoundsCount, 0);
      assert.equal(first.metrics.clearanceFailures, 0);
      assert.ok(
        Object.values(first.metrics)
          .flat(Infinity)
          .every((value) => typeof value !== "number" || Number.isFinite(value)),
      );
      assert.equal(new Set(first.slots.map((slot) => slot.key)).size, first.slots.length);
      assertIndependentGeometry(first, `${stageId}:${detail}`);
    }
  }
});

test("fixed seed corpus preserves packing and exact finite construction", () => {
  const seeds = [0, 1, 0xffffffff, ...Array.from({ length: 32 }, (_, index) => index * 65537 + 29)];
  for (const stageId of STAGE_IDS)
    for (const seed of seeds) {
      const layout = createColonyLayout(request(stageId, seed));
      assert.ok(layout.slots.length <= REPRESENTATIVE_SLOT_CAP);
      assert.equal(layout.metrics.sameDepthOverlapCount, 0, `${stageId}:${seed}`);
      assert.equal(layout.metrics.outOfBoundsCount, 0, `${stageId}:${seed}`);
      assert.equal(layout.metrics.clearanceFailures, 0, `${stageId}:${seed}`);
      for (const slot of layout.slots) {
        for (const voidFeature of layout.voids) {
          for (let index = 0; index < 64; index += 1) {
            const angle = (Math.PI * 2 * index) / 64;
            const point = {
              x: slot.centre.x + Math.cos(angle) * slot.rx,
              y: slot.centre.y + Math.sin(angle) * slot.ry,
            };
            const normalized =
              ((point.x - voidFeature.centre.x) / (voidFeature.rx + voidFeature.clearance)) ** 2 +
              ((point.y - voidFeature.centre.y) / (voidFeature.ry + voidFeature.clearance)) ** 2;
            assert.ok(normalized > 1, `${stageId}:${seed}:void perimeter`);
          }
        }
      }
      for (let left = 0; left < layout.slots.length; left += 1) {
        for (let right = left + 1; right < layout.slots.length; right += 1) {
          const a = layout.slots[left];
          const b = layout.slots[right];
          if (a.depth === b.depth)
            assert.equal(independentlyCollides(a, b), false, `${stageId}:${seed}`);
        }
      }
    }
});

test("opaque phases reject forged values and only the chained builder reaches slots", () => {
  const stageId = STAGE_IDS[1];
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

test("completed clusters truthfully join every accepted slot without mutating the planned phase", () => {
  for (const stageId of STAGE_IDS)
    for (const seed of [0, 17, 0xffffffff]) {
      const planned = populateClusters(
        planRegions(buildSilhouette(request(stageId, seed)), request(stageId, seed)),
        request(stageId, seed),
      );
      assert.ok(
        planned.clusters.every((cluster) => !("accepted" in cluster)),
        `${stageId}:${seed}: planned`,
      );
      const layout = allocateCellSlots(planned, request(stageId, seed));
      const counts = new Map();
      for (const slot of layout.slots)
        counts.set(slot.clusterId, (counts.get(slot.clusterId) ?? 0) + 1);
      assert.equal(
        layout.clusters.reduce((sum, cluster) => sum + cluster.accepted, 0),
        layout.slots.length,
        `${stageId}:${seed}: total`,
      );
      for (const cluster of layout.clusters) {
        assert.equal(
          cluster.accepted,
          counts.get(cluster.key) ?? 0,
          `${stageId}:${seed}:${cluster.key}`,
        );
        assert.ok(cluster.accepted >= 0 && cluster.accepted <= cluster.target);
        assert.ok(Object.isFrozen(cluster));
      }
      assert.ok(
        layout.metrics.underfilled === false ||
          layout.clusters.some((cluster) => cluster.accepted < cluster.target),
        `${stageId}:${seed}: underfilled layouts retain exact partial counts`,
      );
    }
});

test("negative space and depth identities remain explicit before any cell detail exists", () => {
  const layout = (stageId) => createColonyLayout(request(stageId));
  assert.equal(layout("microcolony").voids.length, 0);
  assert.ok(layout("hypoxic_lesion").voids.some((feature) => feature.kind === "core_void"));
  assert.ok(layout("host_collapse").voids.some((feature) => feature.kind === "core_void"));
  assert.ok(layout("invasive_carcinoma").voids.some((feature) => feature.kind === "cleft"));
  assert.ok(layout("immortalized_culture").voids.some((feature) => feature.kind === "moat"));
  assert.ok(layout("micrometastatic_seeding").metrics.componentCount >= 3);
  assert.ok(layout("global_lab_contamination").metrics.componentCount >= 5);
  for (const stageId of STAGE_IDS.slice(1)) {
    const depths = layout(stageId).metrics.depthCounts;
    assert.ok(depths.deep > 0 && depths.middle > 0 && depths.surface > 0, stageId);
  }
});

test("hypoxic necrosis reserves a larger physical void and carries M16 layout provenance", () => {
  const base = request("hypoxic_lesion", 17);
  const low = structuredClone(base);
  const high = structuredClone(base);
  low.morphology.params.necrosis = 0;
  high.morphology.params.necrosis = 1;
  const lowLayout = createColonyLayout(low);
  const highLayout = createColonyLayout(high);
  const area = (layout) => layout.voids.reduce((sum, item) => sum + Math.PI * item.rx * item.ry, 0);
  assert.ok(area(highLayout) > area(lowLayout));
  assert.ok(highLayout.slots.every((slot) => Object.isFrozen(slot.layoutOrigin)));
  assert.ok(
    highLayout.slots.every((slot) => slot.layoutOrigin.morphologySeed === high.morphology.seed),
  );
});

test("32-seed measured geometry preserves families and separates every stage without labels", () => {
  const samples = new Map();
  for (const stageId of STAGE_IDS) {
    const vectors = Array.from(
      { length: 32 },
      (_, seed) => createColonyLayout(request(stageId, seed * 65537 + 29)).metrics.macroFingerprint,
    );
    const centre = centroid(vectors);
    const similarities = vectors.map((vector) => cosine(vector, centre));
    assert.ok(
      similarities.reduce((sum, value) => sum + value, 0) / similarities.length >= 0.88,
      `${stageId}: family mean ${similarities.join(",")}`,
    );
    assert.ok(
      Math.min(...similarities) >= 0.78,
      `${stageId}: family minimum ${Math.min(...similarities)}`,
    );
    samples.set(stageId, centre);
  }
  const featureMeans = samples
    .get(STAGE_IDS[0])
    .map(
      (_, index) =>
        [...samples.values()].reduce((sum, vector) => sum + vector[index], 0) / STAGE_IDS.length,
    );
  const scales = featureMeans.map((mean, index) =>
    Math.max(1e-6, ...[...samples.values()].map((vector) => Math.abs(vector[index] - mean))),
  );
  for (const stageId of STAGE_IDS)
    samples.set(
      stageId,
      samples.get(stageId).map((value, index) => (value - featureMeans[index]) / scales[index]),
    );
  for (let left = 0; left < STAGE_IDS.length; left += 1)
    for (let right = left + 1; right < STAGE_IDS.length; right += 1) {
      const a = STAGE_IDS[left];
      const b = STAGE_IDS[right];
      const distance = 1 - cosine(samples.get(a), samples.get(b));
      const adjacent = right === left + 1;
      if (a === "avascular_lesion" && b === "hypoxic_lesion") {
        const delta = Math.abs(
          createColonyLayout(request(a)).metrics.voidAreaFraction -
            createColonyLayout(request(b)).metrics.voidAreaFraction,
        );
        assert.ok(delta >= 0.08, `avascular/hypoxic void fraction discriminator: ${delta}`);
      } else assert.ok(distance >= (adjacent ? 0.18 : 0.28), `${a}/${b}: ${distance}`);
    }
});

test("the layout has a strict candidate budget and rejects invalid requests", () => {
  assert.equal(MAX_CANDIDATES_PER_SLOT, 24);
  const good = request(STAGE_IDS[0]);
  assert.throws(() => createColonyLayout({ ...good, sceneSeed: Number.NaN }));
  assert.throws(() => createColonyLayout({ ...good, stageId: "unknown-stage" }));
});

test("suppressed-detail handoff contains geometry only and remains deterministic for 32 seeds", () => {
  for (const stageId of STAGE_IDS)
    for (let seed = 0; seed < 32; seed += 1) {
      const layout = createColonyLayout(request(stageId, seed));
      const geometry = suppressedDetailGeometry(layout);
      assert.deepEqual(
        geometry,
        suppressedDetailGeometry(createColonyLayout(request(stageId, seed))),
      );
      assert.ok(geometry.every(Number.isFinite));
      assert.ok(geometry.length > layout.silhouette.vertices.length * 2);
    }
});
