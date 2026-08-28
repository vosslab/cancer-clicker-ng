/**
 * Deterministic, drawing-free macro composition for colony illustrations.
 * Coordinates use the M16 plate frame: x 0..1000, y 0..700.  This module owns
 * the closed-boundary containment and collision policy used before M18 renders.
 */
import { STAGE_IDS } from "../state/catalog.js";
import type { StageId } from "../types/ids.js";
import type { MorphologyResolution, MorphologySource } from "./morphology.js";
import { measureColonyLayout as measure } from "./colony_metrics.js";
import { hash_seed, mulberry32 } from "./noise.js";

export const PLATE_WIDTH = 1000;
export const PLATE_HEIGHT = 700;
export const MAX_CANDIDATES_PER_SLOT = 24;
export const REPRESENTATIVE_SLOT_CAP = 180;
export const INSPECTION_SLOT_CAP = 240;
const EPSILON = 1e-6;
const PERIMETER_SAMPLES = 128;
const silhouettePhase: unique symbol = Symbol("silhouette phase");
const regionPhase: unique symbol = Symbol("region phase");
const clusterPhase: unique symbol = Symbol("cluster phase");

type StageName = (typeof STAGE_IDS)[number];
export type Point = Readonly<{ x: number; y: number }>;
export type DepthStratum = "surface" | "middle" | "deep";
export type RegionKind =
  "core" | "rim" | "perfusion" | "front" | "departure" | "island" | "culture_well" | "network_node";
export type VoidKind = "core_void" | "channel" | "cleft" | "moat" | "island_gap";

export type ColonyLayoutRequest = Readonly<{
  stageId: StageId;
  sceneSeed: number;
  morphology: MorphologyResolution;
  detail: "representative" | "inspection";
}>;
export type PublicSilhouette = Readonly<{
  centre: Point;
  vertices: readonly Point[];
  baseRadius: number;
}>;
export type ColonySilhouette = Readonly<{
  stageId: StageId;
  centre: Point;
  vertices: readonly Point[];
  baseRadius: number;
  readonly [silhouettePhase]: true;
}>;
export type ColonyRegion = Readonly<{
  key: string;
  kind: RegionKind;
  centre: Point;
  rx: number;
  ry: number;
  density: number;
  depths: readonly DepthStratum[];
  precedence: number;
}>;
export type PublicRegion = Readonly<Omit<ColonyRegion, "precedence">>;
export type VoidFeature = Readonly<{
  key: string;
  kind: VoidKind;
  centre: Point;
  rx: number;
  ry: number;
  clearance: number;
}>;
export type RegionalPlan = Readonly<{
  silhouette: ColonySilhouette;
  regions: readonly ColonyRegion[];
  voids: readonly VoidFeature[];
  readonly [regionPhase]: true;
}>;
export type PlannedCluster = Readonly<{
  key: string;
  regionKey: string;
  centre: Point;
  rx: number;
  ry: number;
  target: number;
  depths: readonly DepthStratum[];
}>;
export type CompletedCluster = Readonly<PlannedCluster & { accepted: number }>;
export type ClusterPlan = Readonly<{
  regions: RegionalPlan;
  clusters: readonly PlannedCluster[];
  readonly [clusterPhase]: true;
}>;
export type CellSlot = Readonly<{
  key: string;
  seed: number;
  centre: Point;
  orientation: number;
  scale: number;
  rx: number;
  ry: number;
  depth: DepthStratum;
  clusterId: string;
  regionKey: string;
  morphologySeed: number;
  layoutOrigin: Readonly<{
    morphologySeed: number;
    sources: readonly MorphologySource[];
  }>;
  occludes: boolean;
}>;
export type ColonyLayoutMetrics = Readonly<{
  occupiedFraction: number;
  componentCount: number;
  largestComponentFraction: number;
  voidCount: number;
  voidAreaFraction: number;
  medianNearestNeighbourGap: number;
  gapCoefficientOfVariation: number;
  radialAsymmetry: number;
  principalAxisRatio: number;
  depthCounts: Readonly<Record<DepthStratum, number>>;
  sameDepthOverlapCount: number;
  crossDepthPermittedOverlapCount: number;
  outOfBoundsCount: number;
  clearanceFailures: number;
  underfilled: boolean;
  macroFingerprint: readonly number[];
}>;
export type ColonyLayout = Readonly<{
  stageId: StageId;
  sceneKey: string;
  silhouette: PublicSilhouette;
  regions: readonly PublicRegion[];
  voids: readonly VoidFeature[];
  clusters: readonly CompletedCluster[];
  slots: readonly CellSlot[];
  metrics: ColonyLayoutMetrics;
}>;

type Signature = Readonly<{
  radius: number;
  target: number;
  components: number;
  lobe: number;
  regionKinds: readonly RegionKind[];
  voidKinds: readonly VoidKind[];
  clearance: number;
}>;

/** Exhaustive, data-only macro contracts.  Values are deliberately broad visual families. */
export const STAGE_LAYOUT_SIGNATURES = {
  transformed_cell: {
    radius: 34,
    target: 1,
    components: 1,
    lobe: 0.65,
    regionKinds: ["core"],
    voidKinds: [],
    clearance: 14,
  },
  microcolony: {
    radius: 152,
    target: 24,
    components: 1,
    lobe: 0.22,
    regionKinds: ["core", "rim"],
    voidKinds: [],
    clearance: 11,
  },
  avascular_lesion: {
    radius: 166,
    target: 60,
    components: 1,
    lobe: 0.04,
    regionKinds: ["core", "rim"],
    voidKinds: ["cleft"],
    clearance: 10,
  },
  hypoxic_lesion: {
    radius: 182,
    target: 76,
    components: 1,
    lobe: 0.08,
    regionKinds: ["core", "rim"],
    voidKinds: ["core_void"],
    clearance: 10,
  },
  angiogenic_primary: {
    radius: 205,
    target: 92,
    components: 1,
    lobe: 0.2,
    regionKinds: ["core", "rim", "perfusion"],
    voidKinds: ["channel"],
    clearance: 9,
  },
  invasive_carcinoma: {
    radius: 270,
    target: 108,
    components: 1,
    lobe: 0.52,
    regionKinds: ["core", "rim", "front"],
    voidKinds: ["cleft"],
    clearance: 7,
  },
  intravasation: {
    radius: 192,
    target: 88,
    components: 3,
    lobe: 0.24,
    regionKinds: ["core", "departure", "island"],
    voidKinds: ["channel"],
    clearance: 8,
  },
  micrometastatic_seeding: {
    radius: 92,
    target: 72,
    components: 4,
    lobe: 0.08,
    regionKinds: ["island"],
    voidKinds: ["island_gap"],
    clearance: 9,
  },
  metastatic_burden: {
    radius: 120,
    target: 112,
    components: 6,
    lobe: 0.18,
    regionKinds: ["island"],
    voidKinds: ["island_gap"],
    clearance: 7,
  },
  host_collapse: {
    radius: 250,
    target: 94,
    components: 3,
    lobe: 0.38,
    regionKinds: ["core", "island", "front"],
    voidKinds: ["core_void", "cleft", "channel"],
    clearance: 8,
  },
  immortalized_culture: {
    radius: 300,
    target: 104,
    components: 1,
    lobe: 0,
    regionKinds: ["culture_well", "core", "rim"],
    voidKinds: ["moat"],
    clearance: 8,
  },
  global_lab_contamination: {
    radius: 80,
    target: 118,
    components: 6,
    lobe: 0.16,
    regionKinds: ["network_node"],
    voidKinds: ["island_gap", "channel"],
    clearance: 7,
  },
} as const satisfies Readonly<Record<StageName, Signature>>;

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}
function point(x: number, y: number): Point {
  return freeze({ x, y });
}
function stageName(value: StageId): StageName {
  if (!(STAGE_IDS as readonly string[]).includes(value))
    throw new Error("Unsupported colony-layout stage.");
  return value as StageName;
}
function validateRequest(request: ColonyLayoutRequest): StageName {
  if (
    !request ||
    !Number.isSafeInteger(request.sceneSeed) ||
    request.sceneSeed < 0 ||
    request.sceneSeed > 0xffffffff
  )
    throw new Error("Scene seed must be an unsigned 32-bit integer.");
  if (request.detail !== "representative" && request.detail !== "inspection")
    throw new Error("Unknown layout detail level.");
  if (!request.morphology || !Number.isSafeInteger(request.morphology.seed))
    throw new Error("A resolved morphology fixture is required.");
  for (const value of Object.values(request.morphology.params))
    if (typeof value === "number" && !Number.isFinite(value))
      throw new Error("Morphology values must be finite.");
  return stageName(request.stageId);
}
function seeded(request: ColonyLayoutRequest, ...parts: (string | number)[]): () => number {
  return mulberry32(
    hash_seed(["ccng-layout-v1", request.sceneSeed, stageName(request.stageId), ...parts]),
  );
}
function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function ellipseContains(
  shape: { centre: Point; rx: number; ry: number },
  p: Point,
  margin = 0,
): boolean {
  const rx = shape.rx - margin;
  const ry = shape.ry - margin;
  return (
    rx > EPSILON &&
    ry > EPSILON &&
    ((p.x - shape.centre.x) / rx) ** 2 + ((p.y - shape.centre.y) / ry) ** 2 < 1 - EPSILON
  );
}
function polygonContains(vertices: readonly Point[], p: Point): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i]!;
    const b = vertices[j]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const on =
      Math.abs(cross) <= EPSILON &&
      p.x >= Math.min(a.x, b.x) - EPSILON &&
      p.x <= Math.max(a.x, b.x) + EPSILON &&
      p.y >= Math.min(a.y, b.y) - EPSILON &&
      p.y <= Math.max(a.y, b.y) + EPSILON;
    if (on) return false;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
function segmentCrosses(a: Point, b: Point, c: Point, d: Point): boolean {
  const orient = (p: Point, q: Point, r: Point): number =>
    Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  const ab1 = orient(a, b, c);
  const ab2 = orient(a, b, d);
  const cd1 = orient(c, d, a);
  const cd2 = orient(c, d, b);
  return ab1 !== 0 && ab2 !== 0 && cd1 !== 0 && cd2 !== 0 && ab1 !== ab2 && cd1 !== cd2;
}
function isSimple(vertices: readonly Point[]): boolean {
  for (let i = 0; i < vertices.length; i += 1)
    for (let j = i + 1; j < vertices.length; j += 1) {
      if (j === i + 1 || (i === 0 && j === vertices.length - 1)) continue;
      if (
        segmentCrosses(
          vertices[i]!,
          vertices[(i + 1) % vertices.length]!,
          vertices[j]!,
          vertices[(j + 1) % vertices.length]!,
        )
      )
        return false;
    }
  return true;
}

export function buildSilhouette(request: ColonyLayoutRequest): ColonySilhouette {
  const name = validateRequest(request);
  const signature = STAGE_LAYOUT_SIGNATURES[name];
  const random = seeded(request, "silhouette");
  const centre = point(500 + (random() - 0.5) * 18, 350 + (random() - 0.5) * 14);
  const baseRadius = signature.components === 1 ? signature.radius : 430;
  const count = 32;
  const vertices: Point[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const invasionBulge =
      name === "invasive_carcinoma"
        ? Math.max(0, Math.cos(angle)) * (0.18 + request.morphology.params.invasion * 0.12)
        : 0;
    const wave =
      Math.sin(angle * (name === "invasive_carcinoma" ? 3 : 2) + random() * 0.3) *
        (signature.lobe + request.morphology.params.invasion * 0.12) +
      invasionBulge;
    const radius =
      baseRadius *
      (1 +
        wave +
        (random() - 0.5) * (0.02 + request.morphology.params.tissueDisorganization * 0.03));
    vertices.push(
      point(centre.x + Math.cos(angle) * radius, centre.y + Math.sin(angle) * radius * 0.82),
    );
  }
  if (!isSimple(vertices))
    throw new Error("Deterministic silhouette violated simple-polygon invariant.");
  return freeze({
    stageId: request.stageId,
    centre,
    vertices: freeze(vertices),
    baseRadius,
    [silhouettePhase]: true,
  });
}

function radialCentres(signature: Signature, request: ColonyLayoutRequest, centre: Point): Point[] {
  if (signature.components === 1) return [centre];
  const random = seeded(request, "components");
  const values: Point[] = [];
  const name = stageName(request.stageId);
  const baseOrbit =
    name === "global_lab_contamination"
      ? 250
      : name === "metastatic_burden"
        ? 135
        : signature.components >= 5
          ? 180
          : 150;
  const orbit = baseOrbit + request.morphology.params.dissemination * 20;
  for (let i = 0; i < signature.components; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / signature.components + (random() - 0.5) * 0.18;
    const r = orbit + (random() - 0.5) * 34;
    values.push(point(500 + Math.cos(angle) * r, 350 + Math.sin(angle) * r * 0.72));
  }
  return values;
}
function voidFor(
  kind: VoidKind,
  request: ColonyLayoutRequest,
  silhouette: ColonySilhouette,
  ordinal: number,
): VoidFeature {
  const signature = STAGE_LAYOUT_SIGNATURES[stageName(request.stageId)];
  const key = `layout-v1:${request.stageId}:${kind}:${ordinal}`;
  if (kind === "moat")
    return freeze({
      key,
      kind,
      centre: silhouette.centre,
      rx: signature.radius * 0.24,
      ry: signature.radius * 0.2,
      clearance: 14,
    });
  if (kind === "channel")
    return freeze({ key, kind, centre: point(590, 350), rx: 150, ry: 22, clearance: 10 });
  if (kind === "cleft")
    return freeze({
      key,
      kind,
      centre: point(500, 350),
      rx: stageName(request.stageId) === "avascular_lesion" ? 108 : 34,
      ry: signature.radius * (stageName(request.stageId) === "avascular_lesion" ? 0.42 : 0.46),
      clearance: 8,
    });
  if (kind === "island_gap")
    return freeze({ key, kind, centre: silhouette.centre, rx: 105, ry: 72, clearance: 12 });
  return freeze({
    key,
    kind,
    centre: silhouette.centre,
    rx:
      signature.radius *
      (stageName(request.stageId) === "hypoxic_lesion"
        ? 0.42 + request.morphology.params.necrosis * 0.18
        : 0.23 + request.morphology.params.necrosis * 0.14),
    ry:
      signature.radius *
      (stageName(request.stageId) === "hypoxic_lesion"
        ? 0.32 + request.morphology.params.necrosis * 0.12
        : 0.19),
    clearance: 12,
  });
}
export function planRegions(
  silhouette: ColonySilhouette,
  request: ColonyLayoutRequest,
): RegionalPlan {
  const name = validateRequest(request);
  if (silhouette.stageId !== request.stageId || silhouette[silhouettePhase] !== true)
    throw new Error("Regions require a matching silhouette phase.");
  const signature = STAGE_LAYOUT_SIGNATURES[name];
  const centres = radialCentres(signature, request, silhouette.centre);
  const regions: ColonyRegion[] = [];
  const regionCount = Math.max(centres.length, signature.regionKinds.length);
  for (let i = 0; i < regionCount; i += 1) {
    const kind = signature.regionKinds[Math.min(i, signature.regionKinds.length - 1)]!;
    const factor = signature.components === 1 ? 1 : i === 0 ? 1.15 : 0.65 + (i % 3) * 0.08;
    const regionalCentre =
      signature.components === 1 && i > 0
        ? point(
            silhouette.centre.x +
              (kind === "front"
                ? signature.radius * 0.48
                : name === "microcolony"
                  ? signature.radius * 0.38
                  : name === "immortalized_culture"
                    ? (i - 1) * signature.radius * 0.28
                    : 0),
            silhouette.centre.y +
              (kind === "perfusion"
                ? -signature.radius * 0.2
                : name === "microcolony"
                  ? signature.radius * 0.16
                  : name === "immortalized_culture"
                    ? (i - 1) * signature.radius * 0.12
                    : 0),
          )
        : centres[Math.min(i, centres.length - 1)]!;
    regions.push(
      freeze({
        key: `layout-v1:${request.stageId}:${kind}:${i}`,
        kind,
        centre: regionalCentre,
        rx: signature.radius * factor,
        ry: signature.radius * factor * 0.78,
        density: 1 - i * 0.05,
        depths: freeze(["deep", "middle", "surface"]),
        precedence: i,
      }),
    );
  }
  const voids = signature.voidKinds.map((kind, index) => voidFor(kind, request, silhouette, index));
  return freeze({
    silhouette,
    regions: freeze(regions),
    voids: freeze(voids),
    [regionPhase]: true,
  });
}
export function populateClusters(plan: RegionalPlan, request: ColonyLayoutRequest): ClusterPlan {
  const name = validateRequest(request);
  if (plan.silhouette.stageId !== request.stageId || plan[regionPhase] !== true)
    throw new Error("Clusters require a regional-plan phase.");
  const signature = STAGE_LAYOUT_SIGNATURES[name];
  const cap = request.detail === "representative" ? REPRESENTATIVE_SLOT_CAP : INSPECTION_SLOT_CAP;
  const target = Math.min(
    cap,
    Math.round(signature.target * (request.detail === "inspection" ? 1.18 : 1)),
  );
  const clusters = plan.regions.map((region, index) => {
    const share =
      plan.regions.length === 1 ? 1 : index === 0 ? 0.45 : 0.55 / (plan.regions.length - 1);
    return freeze({
      key: `layout-v1:${request.stageId}:cluster:${index}`,
      regionKey: region.key,
      centre: region.centre,
      rx: region.rx * 0.88,
      ry: region.ry * 0.88,
      target: Math.max(1, Math.round(target * share)),
      depths: region.depths,
    });
  });
  return freeze({ regions: plan, clusters: freeze(clusters), [clusterPhase]: true });
}
function circlePerimeter(centre: Point, radius: number): readonly Point[] {
  return freeze(
    Array.from({ length: PERIMETER_SAMPLES }, (_, index) => {
      const angle = (Math.PI * 2 * index) / PERIMETER_SAMPLES;
      return point(centre.x + Math.cos(angle) * radius, centre.y + Math.sin(angle) * radius);
    }),
  );
}
function slotRadius(slot: CellSlot): number {
  return Math.max(slot.rx, slot.ry);
}
/** Strict policy: touching a silhouette, region, or cleared void is rejected. */
function fullSlotInsidePolygon(slot: CellSlot, vertices: readonly Point[]): boolean {
  return circlePerimeter(slot.centre, slotRadius(slot)).every((sample) =>
    polygonContains(vertices, sample),
  );
}
function fullSlotInsideRegion(
  slot: CellSlot,
  region: Readonly<{ centre: Point; rx: number; ry: number }>,
): boolean {
  return ellipseContains(region, slot.centre, slotRadius(slot));
}
function slotClearsVoid(slot: CellSlot, voidFeature: VoidFeature): boolean {
  const expanded = {
    centre: voidFeature.centre,
    rx: voidFeature.rx + voidFeature.clearance,
    ry: voidFeature.ry + voidFeature.clearance,
  };
  return circlePerimeter(slot.centre, slotRadius(slot)).every(
    (sample) => !ellipseContains(expanded, sample),
  );
}
function candidateInLayout(slot: CellSlot, plan: ClusterPlan): boolean {
  if (
    slot.centre.x - slot.rx <= EPSILON ||
    slot.centre.x + slot.rx >= PLATE_WIDTH - EPSILON ||
    slot.centre.y - slot.ry <= EPSILON ||
    slot.centre.y + slot.ry >= PLATE_HEIGHT - EPSILON
  )
    return false;
  const region = plan.regions.regions.find((item) => item.key === slot.regionKey);
  if (!region || !fullSlotInsideRegion(slot, region)) return false;
  if (!fullSlotInsidePolygon(slot, plan.regions.silhouette.vertices)) return false;
  return plan.regions.voids.every((voidFeature) => slotClearsVoid(slot, voidFeature));
}
function pairAllowed(a: CellSlot, b: CellSlot): boolean {
  const minimum = slotRadius(a) + slotRadius(b);
  const separation = distance(a.centre, b.centre);
  if (a.depth === b.depth) return separation > minimum + EPSILON;
  if (separation < minimum * 0.55 - EPSILON) return false;
  if (separation > minimum + EPSILON) return true;
  const foreground = a.depth === "surface" ? a : b.depth === "surface" ? b : undefined;
  return foreground?.occludes === true;
}
type SpatialHash = Map<string, CellSlot[]>;
const HASH_CELL = 32;
function hashKey(x: number, y: number): string {
  return `${x},${y}`;
}
function nearbySlots(hash: SpatialHash, slot: CellSlot): readonly CellSlot[] {
  const baseX = Math.floor(slot.centre.x / HASH_CELL);
  const baseY = Math.floor(slot.centre.y / HASH_CELL);
  const values: CellSlot[] = [];
  for (let y = baseY - 1; y <= baseY + 1; y += 1)
    for (let x = baseX - 1; x <= baseX + 1; x += 1) values.push(...(hash.get(hashKey(x, y)) ?? []));
  return values;
}
function addToHash(hash: SpatialHash, slot: CellSlot): void {
  const key = hashKey(Math.floor(slot.centre.x / HASH_CELL), Math.floor(slot.centre.y / HASH_CELL));
  const bucket = hash.get(key) ?? [];
  bucket.push(slot);
  hash.set(key, bucket);
}
function slotFor(
  cluster: PlannedCluster,
  index: number,
  request: ColonyLayoutRequest,
  depth: DepthStratum,
): CellSlot | undefined {
  const random = seeded(request, "slot", cluster.key, index);
  const angle = random() * Math.PI * 2;
  const ring = Math.min(
    1,
    Math.sqrt(random()) *
      (1 + (random() - 0.5) * request.morphology.params.tissueDisorganization * 0.5),
  );
  const centre =
    stageName(request.stageId) === "transformed_cell"
      ? cluster.centre
      : point(
          cluster.centre.x + Math.cos(angle) * cluster.rx * ring,
          cluster.centre.y + Math.sin(angle) * cluster.ry * ring,
        );
  const scale = 0.78 + random() * 0.32;
  const disorganization = request.morphology.params.tissueDisorganization;
  const rx = (6.5 + random() * 3) * scale * (1 + (random() - 0.5) * disorganization * 0.24);
  const ry = (5.5 + random() * 2.5) * scale * (1 + (random() - 0.5) * disorganization * 0.2);
  const clusterOrdinal = cluster.key.split(":")[cluster.key.split(":").length - 1]!;
  return freeze({
    key: `layout-v1:${request.stageId}:cell:${clusterOrdinal}:${index}`,
    seed: hash_seed([request.sceneSeed, cluster.key, index]),
    centre,
    orientation:
      random() * Math.PI * 2 +
      (random() - 0.5) * request.morphology.params.tissueDisorganization * Math.PI * 0.5,
    scale,
    rx,
    ry,
    depth,
    clusterId: cluster.key,
    regionKey: cluster.regionKey,
    morphologySeed: request.morphology.seed,
    layoutOrigin: freeze({
      morphologySeed: request.morphology.seed,
      sources: freeze([
        ...request.morphology.provenance.tissueDisorganization,
        ...request.morphology.provenance.invasion,
        ...request.morphology.provenance.necrosis,
        ...request.morphology.provenance.dissemination,
      ]),
    }),
    occludes: depth === "surface",
  });
}
export function allocateCellSlots(plan: ClusterPlan, request: ColonyLayoutRequest): ColonyLayout {
  validateRequest(request);
  if (plan.regions.silhouette.stageId !== request.stageId || plan[clusterPhase] !== true)
    throw new Error("Slots require a cluster-plan phase.");
  const slots: CellSlot[] = [];
  const spatialHash: SpatialHash = new Map();
  for (const depth of ["deep", "middle", "surface"] as const)
    for (const cluster of plan.clusters)
      for (let index = 0; index < cluster.target; index += 1) {
        if (
          stageName(request.stageId) === "transformed_cell"
            ? depth !== "surface"
            : index % 3 !== ["deep", "middle", "surface"].indexOf(depth)
        )
          continue;
        let accepted: CellSlot | undefined;
        for (let attempt = 0; attempt < MAX_CANDIDATES_PER_SLOT; attempt += 1) {
          const candidate = slotFor(
            cluster,
            index * MAX_CANDIDATES_PER_SLOT + attempt,
            request,
            depth,
          );
          if (
            candidate &&
            candidateInLayout(candidate, plan) &&
            nearbySlots(spatialHash, candidate).every((prior) => pairAllowed(prior, candidate))
          ) {
            accepted = candidate;
            break;
          }
        }
        if (accepted) {
          slots.push(accepted);
          addToHash(spatialHash, accepted);
        }
      }
  const publicSilhouette = freeze({
    centre: plan.regions.silhouette.centre,
    vertices: plan.regions.silhouette.vertices,
    baseRadius: plan.regions.silhouette.baseRadius,
  });
  const regions = freeze(
    plan.regions.regions.map(({ precedence: _precedence, ...region }) => freeze(region)),
  );
  const acceptedByCluster = new Map<string, number>();
  for (const slot of slots)
    acceptedByCluster.set(slot.clusterId, (acceptedByCluster.get(slot.clusterId) ?? 0) + 1);
  const clusters = freeze(
    plan.clusters.map((cluster) =>
      freeze({ ...cluster, accepted: acceptedByCluster.get(cluster.key) ?? 0 }),
    ),
  );
  const provisional = {
    stageId: request.stageId,
    sceneKey: `layout-v1:${request.stageId}:${request.sceneSeed}:${request.detail}`,
    silhouette: publicSilhouette,
    regions,
    voids: plan.regions.voids,
    clusters,
    slots: freeze(slots),
  };
  const measured = measure(provisional);
  return freeze({
    ...provisional,
    metrics: freeze({
      ...measured,
      underfilled: clusters.some((cluster) => cluster.accepted < cluster.target),
    }),
  });
}
export { measureColonyLayout } from "./colony_metrics.js";
export function createColonyLayout(request: ColonyLayoutRequest): ColonyLayout {
  return allocateCellSlots(
    populateClusters(planRegions(buildSilhouette(request), request), request),
    request,
  );
}

/** Geometry-only M18 handoff: deliberately omits stage, seeds, traits, and cell internals. */
export function suppressedDetailGeometry(layout: ColonyLayout): readonly number[] {
  return freeze([
    ...layout.silhouette.vertices.flatMap((vertex) => [
      vertex.x / PLATE_WIDTH,
      vertex.y / PLATE_HEIGHT,
    ]),
    ...layout.regions.flatMap((region) => [
      region.centre.x / PLATE_WIDTH,
      region.centre.y / PLATE_HEIGHT,
      region.rx / PLATE_WIDTH,
      region.ry / PLATE_HEIGHT,
    ]),
    ...layout.voids.flatMap((item) => [
      item.centre.x / PLATE_WIDTH,
      item.centre.y / PLATE_HEIGHT,
      item.rx / PLATE_WIDTH,
      item.ry / PLATE_HEIGHT,
    ]),
    ...layout.slots.flatMap((slot) => [
      slot.centre.x / PLATE_WIDTH,
      slot.centre.y / PLATE_HEIGHT,
      slot.rx / PLATE_WIDTH,
      slot.ry / PLATE_HEIGHT,
    ]),
  ]);
}
