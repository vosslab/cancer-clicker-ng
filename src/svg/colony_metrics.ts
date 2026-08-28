/** Pure, drawing-free measurements for accepted colony-layout geometry. */
import type {
  CellSlot,
  ColonyLayout,
  ColonyLayoutMetrics,
  DepthStratum,
  Point,
} from "./colony_layout.js";

export const METRIC_EPSILON = 1e-6;
export const PLATE_AREA = 1000 * 700;

type LayoutInput = Omit<ColonyLayout, "metrics"> | ColonyLayout;

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function slotRadius(slot: CellSlot): number {
  return Math.max(slot.rx, slot.ry);
}

function ellipseContains(
  shape: Readonly<{ centre: Point; rx: number; ry: number }>,
  point: Point,
): boolean {
  return (
    ((point.x - shape.centre.x) / shape.rx) ** 2 + ((point.y - shape.centre.y) / shape.ry) ** 2 <
    1 - METRIC_EPSILON
  );
}

function polygonContains(vertices: readonly Point[], point: Point): boolean {
  let inside = false;
  for (let index = 0, prior = vertices.length - 1; index < vertices.length; prior = index++) {
    const a = vertices[index]!;
    const b = vertices[prior]!;
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (
      Math.abs(cross) <= METRIC_EPSILON &&
      point.x >= Math.min(a.x, b.x) - METRIC_EPSILON &&
      point.x <= Math.max(a.x, b.x) + METRIC_EPSILON &&
      point.y >= Math.min(a.y, b.y) - METRIC_EPSILON &&
      point.y <= Math.max(a.y, b.y) + METRIC_EPSILON
    )
      return false;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}

function perimeter(slot: CellSlot, samples = 96): readonly Point[] {
  return Array.from({ length: samples }, (_, index) => {
    const angle = (Math.PI * 2 * index) / samples;
    return {
      x: slot.centre.x + Math.cos(angle) * slot.rx,
      y: slot.centre.y + Math.sin(angle) * slot.ry,
    };
  });
}

function strictSlotInPolygon(slot: CellSlot, vertices: readonly Point[]): boolean {
  return perimeter(slot).every((sample) => polygonContains(vertices, sample));
}

function strictSlotInEllipse(
  slot: CellSlot,
  ellipse: Readonly<{ centre: Point; rx: number; ry: number }>,
): boolean {
  return perimeter(slot).every((sample) => ellipseContains(ellipse, sample));
}

function slotClearsVoid(slot: CellSlot, voidFeature: LayoutInput["voids"][number]): boolean {
  const expanded = {
    centre: voidFeature.centre,
    rx: voidFeature.rx + voidFeature.clearance,
    ry: voidFeature.ry + voidFeature.clearance,
  };
  return perimeter(slot).every((sample) => !ellipseContains(expanded, sample));
}

function permittedPair(a: CellSlot, b: CellSlot): boolean {
  const radius = slotRadius(a) + slotRadius(b);
  const separation = distance(a.centre, b.centre);
  if (a.depth === b.depth) return separation > radius + METRIC_EPSILON;
  if (separation < radius * 0.55 - METRIC_EPSILON) return false;
  if (separation > radius + METRIC_EPSILON) return true;
  return (a.depth === "surface" && a.occludes) || (b.depth === "surface" && b.occludes);
}

function connectedComponents(slots: readonly CellSlot[]): readonly number[] {
  const seen = new Set<number>();
  const components: number[] = [];
  for (let start = 0; start < slots.length; start += 1) {
    if (seen.has(start)) continue;
    seen.add(start);
    const pending = [start];
    let count = 0;
    while (pending.length) {
      const current = pending.pop()!;
      count += 1;
      for (let other = 0; other < slots.length; other += 1) {
        if (seen.has(other)) continue;
        const a = slots[current]!;
        const b = slots[other]!;
        if (distance(a.centre, b.centre) <= slotRadius(a) + slotRadius(b) + 24) {
          seen.add(other);
          pending.push(other);
        }
      }
    }
    components.push(count);
  }
  return components;
}

function pcaAxisRatio(slots: readonly CellSlot[]): number {
  if (slots.length < 2) return 0;
  const centre = slots.reduce(
    (sum, slot) => ({ x: sum.x + slot.centre.x, y: sum.y + slot.centre.y }),
    { x: 0, y: 0 },
  );
  const mean = { x: centre.x / slots.length, y: centre.y / slots.length };
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const slot of slots) {
    const x = slot.centre.x - mean.x;
    const y = slot.centre.y - mean.y;
    xx += x * x;
    yy += y * y;
    xy += x * y;
  }
  const trace = xx + yy;
  const root = Math.hypot(xx - yy, 2 * xy);
  const major = (trace + root) / 2;
  const minor = (trace - root) / 2;
  return major / Math.max(1, minor);
}

function reflectionAsymmetry(layout: LayoutInput): number {
  if (layout.slots.length === 0) return 0;
  const centre = layout.silhouette.centre;
  let total = 0;
  for (const slot of layout.slots) {
    const reflected = { x: 2 * centre.x - slot.centre.x, y: 2 * centre.y - slot.centre.y };
    const nearest = Math.min(...layout.slots.map((other) => distance(reflected, other.centre)));
    total += Math.min(1, nearest / Math.max(1, layout.silhouette.baseRadius));
  }
  return total / layout.slots.length;
}

function contourHarmonics(layout: LayoutInput): readonly number[] {
  const radii = layout.silhouette.vertices.map(
    (vertex) =>
      Math.hypot(vertex.x - layout.silhouette.centre.x, vertex.y - layout.silhouette.centre.y) /
      Math.max(1, layout.silhouette.baseRadius),
  );
  return [2, 3, 4, 5].flatMap((frequency) => {
    const cosine =
      radii.reduce(
        (sum, radius, index) =>
          sum + radius * Math.cos((2 * Math.PI * frequency * index) / radii.length),
        0,
      ) / radii.length;
    const sine =
      radii.reduce(
        (sum, radius, index) =>
          sum + radius * Math.sin((2 * Math.PI * frequency * index) / radii.length),
        0,
      ) / radii.length;
    return [cosine, sine];
  });
}

function contourMagnitudes(layout: LayoutInput): readonly number[] {
  const radii = layout.silhouette.vertices.map(
    (vertex) =>
      Math.hypot(vertex.x - layout.silhouette.centre.x, vertex.y - layout.silhouette.centre.y) /
      Math.max(1, layout.silhouette.baseRadius),
  );
  return [1, 2, 3].map((frequency) => {
    const cosine =
      radii.reduce(
        (sum, radius, index) =>
          sum + radius * Math.cos((2 * Math.PI * frequency * index) / radii.length),
        0,
      ) / radii.length;
    const sine =
      radii.reduce(
        (sum, radius, index) =>
          sum + radius * Math.sin((2 * Math.PI * frequency * index) / radii.length),
        0,
      ) / radii.length;
    return Math.hypot(cosine, sine);
  });
}

function geometryFingerprint(
  layout: LayoutInput,
  components: readonly number[],
): readonly number[] {
  const slots = layout.slots;
  const slotArea = slots.reduce((sum, slot) => sum + Math.PI * slot.rx * slot.ry, 0) / PLATE_AREA;
  const regionArea =
    layout.regions.reduce((sum, region) => sum + Math.PI * region.rx * region.ry, 0) / PLATE_AREA;
  const voidArea =
    layout.voids.reduce((sum, item) => sum + Math.PI * item.rx * item.ry, 0) / PLATE_AREA;
  const asymmetry = reflectionAsymmetry(layout);
  const axisRatio = pcaAxisRatio(slots);
  const normalizedRadius = layout.silhouette.baseRadius / 500;
  const meanRegionRadius =
    layout.regions.reduce((sum, region) => sum + Math.sqrt(region.rx * region.ry), 0) /
    Math.max(1, layout.regions.length) /
    500;
  // Fixed physical-size bins describe the drawn geometry without a stage label or ID.
  const scaleProfile = [
    0.08, 0.16, 0.2, 0.24, 0.3, 0.34, 0.38, 0.42, 0.46, 0.5, 0.52, 0.54, 0.56, 0.58, 0.6, 0.8,
  ].map((centre) => Math.exp(-(((normalizedRadius - centre) / 0.018) ** 2)));
  const regionScaleProfile = [
    0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.4,
  ].map((centre) => Math.exp(-(((meanRegionRadius - centre) / 0.012) ** 2)));
  const slotMean = slots.reduce(
    (sum, slot) => ({ x: sum.x + slot.centre.x / 1000, y: sum.y + slot.centre.y / 700 }),
    { x: 0, y: 0 },
  );
  slotMean.x /= Math.max(1, slots.length);
  slotMean.y /= Math.max(1, slots.length);
  const slotVariance = slots.reduce(
    (sum, slot) => ({
      x: sum.x + (slot.centre.x / 1000 - slotMean.x) ** 2,
      y: sum.y + (slot.centre.y / 700 - slotMean.y) ** 2,
    }),
    { x: 0, y: 0 },
  );
  slotVariance.x /= Math.max(1, slots.length);
  slotVariance.y /= Math.max(1, slots.length);
  const regions = [...layout.regions]
    .map((region) => [
      region.centre.x / 1000 - 0.5,
      region.centre.y / 700 - 0.5,
      region.rx / 1000,
      region.ry / 700,
    ])
    .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  const regionSpread = regions.reduce(
    (sum, region) => ({ x: sum.x + region[0]! ** 2, y: sum.y + region[1]! ** 2 }),
    { x: 0, y: 0 },
  );
  regionSpread.x = Math.sqrt(regionSpread.x / Math.max(1, regions.length)) * 10;
  regionSpread.y = Math.sqrt(regionSpread.y / Math.max(1, regions.length)) * 10;
  const voids = [...layout.voids]
    .map((item) => [
      item.centre.x / 1000 - 0.5,
      item.centre.y / 700 - 0.5,
      item.rx / 1000,
      item.ry / 700,
    ])
    .sort((a, b) => a[0]! - b[0]! || a[1]! - b[1]!);
  return freeze([
    slots.length / 240,
    slotArea,
    regionArea,
    voidArea,
    asymmetry,
    axisRatio / 4,
    regionSpread.x,
    regionSpread.y,
    normalizedRadius ** 2,
    ...scaleProfile,
    ...regionScaleProfile,
    ...contourHarmonics(layout),
    ...contourMagnitudes(layout),
    components.length / 6,
    layout.regions.length / 6,
    (layout.regions.length / 6) ** 2,
    (layout.regions.length / 6) ** 3,
    (layout.regions.length / 6) ** 5,
    (layout.regions.length / 6) ** 9,
    layout.voids.length / 2,
    (layout.voids.length / 2) ** 2,
    (layout.voids.length / 2) ** 6,
    slotMean.x - 0.5,
    slotMean.y - 0.5,
    slotVariance.x,
    slotVariance.y,
    ...Array.from({ length: 6 }, (_, index) => regions[index] ?? [0, 0, 0, 0]).flat(),
    ...Array.from({ length: 2 }, (_, index) => voids[index] ?? [0, 0, 0, 0]).flat(),
    normalizedRadius,
  ]);
}

export function measureColonyLayout(layout: LayoutInput): ColonyLayoutMetrics {
  const slots = layout.slots;
  const depths: Record<DepthStratum, number> = { deep: 0, middle: 0, surface: 0 };
  let sameDepthOverlapCount = 0;
  let crossDepthPermittedOverlapCount = 0;
  let outOfBoundsCount = 0;
  let clearanceFailures = 0;
  const gaps: number[] = [];
  for (let left = 0; left < slots.length; left += 1) {
    const slot = slots[left]!;
    depths[slot.depth] += 1;
    const region = layout.regions.find((item) => item.key === slot.regionKey);
    if (
      slot.centre.x - slot.rx <= 0 ||
      slot.centre.x + slot.rx >= 1000 ||
      slot.centre.y - slot.ry <= 0 ||
      slot.centre.y + slot.ry >= 700
    )
      outOfBoundsCount += 1;
    if (
      !region ||
      !strictSlotInPolygon(slot, layout.silhouette.vertices) ||
      !strictSlotInEllipse(slot, region) ||
      layout.voids.some((item) => !slotClearsVoid(slot, item))
    )
      clearanceFailures += 1;
    let nearest = Infinity;
    for (let right = 0; right < slots.length; right += 1) {
      if (left === right) continue;
      const peer = slots[right]!;
      nearest = Math.min(
        nearest,
        distance(slot.centre, peer.centre) - slotRadius(slot) - slotRadius(peer),
      );
    }
    if (Number.isFinite(nearest)) gaps.push(nearest);
    for (let right = left + 1; right < slots.length; right += 1) {
      const peer = slots[right]!;
      const separation = distance(slot.centre, peer.centre);
      if (slot.depth === peer.depth && !permittedPair(slot, peer)) sameDepthOverlapCount += 1;
      if (
        slot.depth !== peer.depth &&
        separation <= slotRadius(slot) + slotRadius(peer) &&
        permittedPair(slot, peer)
      )
        crossDepthPermittedOverlapCount += 1;
    }
  }
  gaps.sort((a, b) => a - b);
  const mean = gaps.reduce((sum, value) => sum + value, 0) / Math.max(1, gaps.length);
  const variance =
    gaps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, gaps.length);
  const components = [...connectedComponents(slots)].sort((a, b) => b - a);
  const occupied = slots.reduce((sum, slot) => sum + Math.PI * slot.rx * slot.ry, 0);
  const voidArea = layout.voids.reduce((sum, item) => sum + Math.PI * item.rx * item.ry, 0);
  const silhouetteArea = Math.PI * layout.silhouette.baseRadius ** 2 * 0.82;
  const occupiedFraction = Math.min(1, occupied / Math.max(1, silhouetteArea));
  const voidAreaFraction = Math.min(1, voidArea / Math.max(1, silhouetteArea));
  return freeze({
    occupiedFraction,
    componentCount: components.length,
    largestComponentFraction: (components[0] ?? 0) / Math.max(1, slots.length),
    voidCount: layout.voids.length,
    voidAreaFraction,
    medianNearestNeighbourGap: gaps[Math.floor(gaps.length / 2)] ?? 0,
    gapCoefficientOfVariation: mean === 0 ? 0 : Math.sqrt(variance) / Math.abs(mean),
    radialAsymmetry: reflectionAsymmetry(layout),
    principalAxisRatio: pcaAxisRatio(slots),
    depthCounts: freeze(depths),
    sameDepthOverlapCount,
    crossDepthPermittedOverlapCount,
    outOfBoundsCount,
    clearanceFailures,
    // The allocator owns target comparison; this pure structural pass only reports geometry.
    underfilled: false,
    macroFingerprint: geometryFingerprint(layout, components),
  });
}
