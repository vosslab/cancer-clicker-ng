/**
 * Pure adapter from authoritative game state to an immutable living-tumor
 * scene model. This module declares meaning; morphology grammar resolves form and
 * the colony-layout subsystem supplies the accepted geometry.
 */
import {
  MORPHOLOGY_AXES,
  MORPHOLOGY_REFERENCE_ROW_IDS,
  MORPHOLOGY_RULES,
  STAGE_MORPHOLOGY_FIXTURES,
} from "./morphology.js";
import { hash_seed } from "./noise.js";
import { createColonyLayout } from "./colony_layout.js";
import { resolve_morphology } from "./morphology.js";
import { createColonySceneRequest } from "./render_types.js";
import {
  COLONY_VISUAL_CATALOG,
  COLONY_VISUAL_EFFECT_IDS,
  networkNodeMorphology,
  type ColonyVisualEffectId,
} from "./colony_visual_catalog.js";
import { isRetainedSenescentRegion } from "../hallmarks/late_hallmark_effects.js";
import type { ColonyBurdenTier, ColonyLayout } from "./colony_layout.js";
import type { ColonySceneRequest } from "./render_types.js";
import type {
  MorphologyContribution,
  MorphologyDeclarations,
  MorphologyLayer,
  MorphologyReferenceRowId,
  StageVisualId,
} from "./morphology.js";
import type { RegionId } from "../types/ids.js";
import type { GameState, Phenotype, RegionState } from "../types/state.js";

export type ColonyRegionCondition =
  "viable" | "hypoxic" | "necrotic" | "perfused" | "masked" | "inflamed" | "senescent";

export type ColonyVisualEffect = Readonly<{
  id: ColonyVisualEffectId;
  sourceId: string;
  sourceLabel: string;
  biology: string;
  referenceRowIds: readonly MorphologyReferenceRowId[];
  morphology: readonly MorphologyContribution[];
  regionIds: readonly RegionId[];
}>;

/** A source-to-layout correspondence is stylized, never a measured tissue position. */
export type ColonyRegionOverlay = Readonly<{
  sourceRegionId: RegionId;
  layoutRegionKey: string;
  condition: ColonyRegionCondition;
  vesselLinked: boolean;
  routeCommitted: boolean;
  seeded: boolean;
  phenotype: Phenotype;
}>;

/** Durable whole-run invasion facts stay separate from mapped regional correspondence. */
export type ColonySystemicInvasion = Readonly<{
  routeCommitted: boolean;
  seeded: boolean;
}>;

/**
 * A presentation-only map from the earned Chicago-scale record to SVG geometry.
 * The city is a fictional scale analogy: its routes remain anchored in the
 * accepted colony layout and its markers derive from real saved L4 network facts.
 */
export type EndingVisualState = Readonly<{
  mode: "colony" | "chicago-scale";
  networkTier: number;
  connectedSiteCount: number;
  routeDensity: number;
  routeAnchors: readonly Readonly<{ x: number; y: number }>[];
}>;

export type ColonyVisualState = Readonly<{
  declarations: MorphologyDeclarations;
  ending: EndingVisualState;
  effects: readonly ColonyVisualEffect[];
  growthState: "quiet" | "cycling" | "energized";
  invasion: ColonySystemicInvasion;
  overlays: readonly ColonyRegionOverlay[];
}>;

const VISUAL_STATE_KEYS = [
  "declarations",
  "ending",
  "effects",
  "growthState",
  "invasion",
  "overlays",
] as const;
const EFFECT_KEYS = [
  "id",
  "sourceId",
  "sourceLabel",
  "biology",
  "referenceRowIds",
  "morphology",
  "regionIds",
] as const;
const OVERLAY_KEYS = [
  "sourceRegionId",
  "layoutRegionKey",
  "condition",
  "vesselLinked",
  "routeCommitted",
  "seeded",
  "phenotype",
] as const;
const SYSTEMIC_INVASION_KEYS = ["routeCommitted", "seeded"] as const;
const ENDING_VISUAL_KEYS = [
  "mode",
  "networkTier",
  "connectedSiteCount",
  "routeDensity",
  "routeAnchors",
] as const;
const ENDING_ROUTE_ANCHOR_KEYS = ["x", "y"] as const;
const DECLARATION_KEYS = ["stage", "hallmark", "prestige", "regional"] as const;
const REGIONAL_DECLARATION_KEYS = ["siteProgram", "host", "node"] as const;
const SOURCE_KEYS = ["layer", "contributorId", "label", "referenceRowId"] as const;
const AXIS_KEYS = ["axis", "mode", "value", "source"] as const;
const CATEGORY_KEYS = ["field", "value", "priority", "source"] as const;
const REGION_CONDITIONS: readonly ColonyRegionCondition[] = [
  "viable",
  "hypoxic",
  "necrotic",
  "perfused",
  "masked",
  "inflamed",
  "senescent",
];
const VISUAL_SEED_NAMESPACE = "ccng-living-tumor-v1";

function freeze<T>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function hasExactFrozenDataKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    !Object.isFrozen(value) ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    return false;
  }
  const names = Object.getOwnPropertyNames(value).sort(compareText);
  const expected = [...keys].sort(compareText);
  if (names.length !== expected.length || names.some((name, index) => name !== expected[index])) {
    return false;
  }
  return keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && "value" in descriptor && descriptor.enumerable;
  });
}

function isFrozenArray(value: unknown): value is readonly unknown[] {
  if (
    !Array.isArray(value) ||
    !Object.isFrozen(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) {
    return false;
  }
  return value.every((_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    return descriptor !== undefined && "value" in descriptor && descriptor.enumerable;
  });
}

function cloneSource(source: MorphologyContribution["source"]): MorphologyContribution["source"] {
  return freeze({
    layer: source.layer,
    contributorId: source.contributorId,
    label: source.label,
    referenceRowId: source.referenceRowId,
  });
}

function cloneContribution(contribution: MorphologyContribution): MorphologyContribution {
  if ("axis" in contribution) {
    return freeze({
      axis: contribution.axis,
      mode: contribution.mode,
      value: contribution.value,
      source: cloneSource(contribution.source),
    });
  }
  if (contribution.field === "mitoticState") {
    return freeze({
      field: contribution.field,
      value: contribution.value,
      priority: contribution.priority,
      source: cloneSource(contribution.source),
    });
  }
  return freeze({
    field: contribution.field,
    value: contribution.value,
    priority: contribution.priority,
    source: cloneSource(contribution.source),
  });
}

/** Narrows the authoritative stage grammar to the closed visual-fixture vocabulary. */
function morphologyStageId(stageId: GameState["currentStage"]): StageVisualId {
  for (const fixture of Object.values(STAGE_MORPHOLOGY_FIXTURES)) {
    if (fixture.stageId === stageId) return fixture.stageId;
  }
  throw new Error("Current stage has no morphology grammar fixture.");
}

function cloneContributions(
  contributions: readonly MorphologyContribution[],
): readonly MorphologyContribution[] {
  return freeze(contributions.map(cloneContribution));
}

function canonicalRegionIds(game: GameState, sourceIds: readonly string[]): readonly RegionId[] {
  const sourceSet = new Set(sourceIds);
  const ids = game.regions
    .map((region) => region.id)
    .filter((id) => sourceSet.has(id))
    .sort(compareText);
  return freeze(ids);
}

function currentGrowthState(game: GameState): ColonyVisualState["growthState"] {
  if (game.manualDivisionCharge > 0) return "energized";
  if (game.signalingAllocation === "cycle" || game.cycleFillRate > 0) return "cycling";
  return "quiet";
}

/**
 * Buckets only durable biomass magnitude. The tier is intentionally bounded so
 * representative SVG composition remains readable and within its slot cap.
 */
export function colonyBurdenTierFor(game: GameState): ColonyBurdenTier {
  if (game.cells.mantissa <= 0) return "sparse";
  const logMagnitude = game.cells.exponent + Math.log10(game.cells.mantissa);
  if (logMagnitude < 3) return "sparse";
  if (logMagnitude < 6) return "established";
  if (logMagnitude < 9) return "dense";
  return "overgrown";
}

function routeCommitted(game: GameState, region: RegionState): boolean {
  const committed = region.routeIds.some(
    (routeId) => (game.committedCellCommitments[routeId] ?? 0) > 0,
  );
  return committed;
}

function isSeeded(game: GameState, region: RegionState): boolean {
  return game.seededSites.includes(region.id);
}

function systemicInvasionFor(game: GameState): ColonySystemicInvasion {
  const routeCommitted = Object.values(game.committedCellCommitments).some((cells) => cells > 0);
  const seeded = game.seededSites.length > 0;
  return freeze({ routeCommitted, seeded });
}

function endingVisualFor(game: GameState, layout: ColonyLayout): EndingVisualState {
  if (game.ending.phase !== "reached") {
    return freeze({
      mode: "colony",
      networkTier: 0,
      connectedSiteCount: 0,
      routeDensity: 0,
      routeAnchors: freeze([]),
    });
  }
  const connectedSiteCount = game.network.nodes.filter((node) => node.status === "stable").length;
  const routeDensity = Math.min(6, Math.max(1, game.network.globalTier));
  const anchorCount = Math.min(routeDensity, layout.slots.length);
  const routeAnchors = Array.from({ length: anchorCount }, (_, index) => {
    const slotIndex = Math.floor((index * layout.slots.length) / anchorCount);
    const slot = layout.slots[slotIndex];
    if (!slot) throw new Error("Chicago overlay requires accepted colony layout anchors.");
    return freeze({ x: slot.centre.x, y: slot.centre.y });
  });
  return freeze({
    mode: "chicago-scale",
    networkTier: game.network.globalTier,
    connectedSiteCount,
    routeDensity,
    routeAnchors: freeze(routeAnchors),
  });
}

function viabilityCondition(region: RegionState): ColonyRegionCondition {
  if (region.viability <= 0) return "necrotic";
  if (region.viability < 1) return "hypoxic";
  return "viable";
}

function conditionsForRegion(
  game: GameState,
  region: RegionState,
): readonly ColonyRegionCondition[] {
  const conditions: ColonyRegionCondition[] = [viabilityCondition(region)];
  if (region.vesselLinkIds.length > 0) conditions.push("perfused");
  if (game.maskedRegions.includes(region.id)) conditions.push("masked");
  if (
    game.inflammationEpisodes.some((episode) => episode.regionId === region.id) ||
    (game.regionalInflammation[region.id] ?? 0) > 0
  ) {
    conditions.push("inflamed");
  }
  if (isRetainedSenescentRegion(game, region.id)) conditions.push("senescent");
  return conditions;
}

function regionalRouteMorphology(game: GameState): readonly MorphologyContribution[] {
  const hasCommitment = Object.values(game.committedCellCommitments).some((cells) => cells > 0);
  const hasSeededSite = game.seededSites.length > 0;
  const contributions: MorphologyContribution[] = [];
  if (hasCommitment) {
    contributions.push({
      axis: "invasion",
      mode: "add",
      value: 0.12,
      source: {
        layer: "regional",
        contributorId: "regional:committed-route",
        label: "committed route correspondence",
        referenceRowId: "morphology:invasion_front",
      },
    });
  }
  if (hasSeededSite) {
    contributions.push({
      axis: "dissemination",
      mode: "add",
      value: 0.1,
      source: {
        layer: "regional",
        contributorId: "regional:seeded-site",
        label: "seeded site correspondence",
        referenceRowId: "morphology:metastatic_dissemination",
      },
    });
  }
  return cloneContributions(contributions);
}

function declarationsFor(
  game: GameState,
  effects: readonly ColonyVisualEffect[],
): MorphologyDeclarations {
  const stage = cloneContributions(
    STAGE_MORPHOLOGY_FIXTURES[morphologyStageId(game.currentStage)].contributions,
  );
  const hallmark = cloneContributions(effects.flatMap((effect) => effect.morphology));
  const regional = freeze({
    siteProgram: regionalRouteMorphology(game),
    host: freeze([]),
    node: cloneContributions(networkNodeMorphology(game)),
  });
  return freeze({ stage, hallmark, prestige: freeze([]), regional });
}

function effectsFor(game: GameState): readonly ColonyVisualEffect[] {
  const effects: ColonyVisualEffect[] = [];
  for (const row of COLONY_VISUAL_CATALOG) {
    if (!row.isActive(game)) continue;
    const effect: ColonyVisualEffect = freeze({
      id: row.effectId,
      sourceId: row.key,
      sourceLabel: row.sourceLabel,
      biology: row.biology,
      referenceRowIds: freeze([...row.referenceRowIds]),
      morphology: cloneContributions(row.morphology(game)),
      regionIds: canonicalRegionIds(game, row.regionIds(game)),
    });
    effects.push(effect);
  }
  return freeze(effects);
}

function overlaysFor(game: GameState, layout: ColonyLayout): readonly ColonyRegionOverlay[] {
  if (layout.regions.length === 0) return freeze([]);
  const sortedRegions = [...game.regions].sort((left, right) => compareText(left.id, right.id));
  const overlays: ColonyRegionOverlay[] = [];
  for (const [index, region] of sortedRegions.entries()) {
    const layoutRegion = layout.regions[index % layout.regions.length];
    if (layoutRegion === undefined) throw new Error("Accepted layout regions are unavailable.");
    const committed = routeCommitted(game, region);
    const seeded = isSeeded(game, region);
    for (const condition of conditionsForRegion(game, region)) {
      overlays.push(
        freeze({
          sourceRegionId: region.id,
          layoutRegionKey: layoutRegion.key,
          condition,
          vesselLinked: region.vesselLinkIds.length > 0,
          routeCommitted: committed,
          seeded,
          phenotype: region.phenotype,
        }),
      );
    }
  }
  return freeze(overlays);
}

/** Resolves the semantic model after the colony layout establishes geometry correspondence. */
export function resolveColonyVisualState(game: GameState, layout: ColonyLayout): ColonyVisualState {
  const effects = effectsFor(game);
  const declarations = declarationsFor(game, effects);
  const visual = {
    declarations,
    ending: endingVisualFor(game, layout),
    effects,
    growthState: currentGrowthState(game),
    invasion: systemicInvasionFor(game),
    overlays: overlaysFor(game, layout),
  };
  return freeze(visual);
}

/** Stable scene identity derives only from the run seed and current stage grammar. */
export function gameColonySceneSeed(game: GameState): number {
  return hash_seed([VISUAL_SEED_NAMESPACE, game.deterministicSeed, game.currentStage]);
}

/** Builds the sole GameState-to-SVG handoff in resolver order without mutating game state. */
export function createGameColonyScene(game: GameState): ColonySceneRequest {
  const sceneSeed = gameColonySceneSeed(game);
  const effects = effectsFor(game);
  const declarations = declarationsFor(game, effects);
  const morphology = resolve_morphology(sceneSeed, declarations);
  const layout = createColonyLayout({
    stageId: game.currentStage,
    sceneSeed,
    morphology,
    detail: "representative",
    burdenTier: colonyBurdenTierFor(game),
  });
  const visual = resolveColonyVisualState(game, layout);
  const request = freeze({
    layout,
    morphology,
    visual,
    stageId: game.currentStage,
    sceneSeed,
    detail: "representative" as const,
  });
  return createColonySceneRequest(request);
}

function hasKnownLayer(value: unknown): value is MorphologyLayer {
  return (
    value === "baseline" ||
    value === "stage" ||
    value === "hallmark" ||
    value === "prestige" ||
    value === "regional" ||
    value === "individual"
  );
}

function hasKnownReferenceRow(value: unknown): value is MorphologyReferenceRowId {
  return (
    typeof value === "string" &&
    MORPHOLOGY_REFERENCE_ROW_IDS.some((referenceRowId) => referenceRowId === value)
  );
}

function hasKnownAxis(value: unknown): value is (typeof MORPHOLOGY_AXES)[number] {
  return typeof value === "string" && MORPHOLOGY_AXES.some((axis) => axis === value);
}

function hasKnownEffectId(value: unknown): value is ColonyVisualEffectId {
  return (
    typeof value === "string" && COLONY_VISUAL_EFFECT_IDS.some((effectId) => effectId === value)
  );
}

function hasKnownCondition(value: unknown): value is ColonyRegionCondition {
  return typeof value === "string" && REGION_CONDITIONS.some((condition) => condition === value);
}

function isMorphologySource(value: unknown, expectedLayer: MorphologyLayer): boolean {
  if (!hasExactFrozenDataKeys(value, SOURCE_KEYS)) return false;
  return (
    value.layer === expectedLayer &&
    hasKnownLayer(value.layer) &&
    typeof value.contributorId === "string" &&
    value.contributorId.length > 0 &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    hasKnownReferenceRow(value.referenceRowId)
  );
}

function isMorphologyContribution(value: unknown, expectedLayer: MorphologyLayer): boolean {
  if (hasExactFrozenDataKeys(value, AXIS_KEYS)) {
    return (
      hasKnownAxis(value.axis) &&
      value.mode === MORPHOLOGY_RULES[value.axis].mode &&
      typeof value.value === "number" &&
      Number.isFinite(value.value) &&
      isMorphologySource(value.source, expectedLayer)
    );
  }
  if (hasExactFrozenDataKeys(value, CATEGORY_KEYS)) {
    const validMitosis =
      value.field === "mitoticState" &&
      (value.value === "quiescent" || value.value === "dividing" || value.value === "abnormal");
    const validDepth =
      value.field === "depthStratum" &&
      (value.value === "surface" || value.value === "middle" || value.value === "deep");
    return (
      (validMitosis || validDepth) &&
      typeof value.priority === "number" &&
      Number.isSafeInteger(value.priority) &&
      isMorphologySource(value.source, expectedLayer)
    );
  }
  return false;
}

function isContributionArray(value: unknown, expectedLayer: MorphologyLayer): boolean {
  return (
    isFrozenArray(value) &&
    value.every((contribution) => isMorphologyContribution(contribution, expectedLayer))
  );
}

function isDeclarations(value: unknown): value is MorphologyDeclarations {
  if (!hasExactFrozenDataKeys(value, DECLARATION_KEYS)) return false;
  if (!hasExactFrozenDataKeys(value.regional, REGIONAL_DECLARATION_KEYS)) return false;
  return (
    isContributionArray(value.stage, "stage") &&
    isContributionArray(value.hallmark, "hallmark") &&
    isContributionArray(value.prestige, "prestige") &&
    isContributionArray(value.regional.siteProgram, "regional") &&
    isContributionArray(value.regional.host, "regional") &&
    isContributionArray(value.regional.node, "regional")
  );
}

function isVisualEffect(value: unknown): value is ColonyVisualEffect {
  if (!hasExactFrozenDataKeys(value, EFFECT_KEYS)) return false;
  return (
    hasKnownEffectId(value.id) &&
    typeof value.sourceId === "string" &&
    value.sourceId.length > 0 &&
    typeof value.sourceLabel === "string" &&
    value.sourceLabel.length > 0 &&
    typeof value.biology === "string" &&
    value.biology.length > 0 &&
    isFrozenArray(value.referenceRowIds) &&
    value.referenceRowIds.every(hasKnownReferenceRow) &&
    isContributionArray(value.morphology, "hallmark") &&
    isFrozenArray(value.regionIds) &&
    value.regionIds.every((id) => typeof id === "string" && id.length > 0)
  );
}

function isVisualOverlay(value: unknown, layout: ColonyLayout): value is ColonyRegionOverlay {
  if (!hasExactFrozenDataKeys(value, OVERLAY_KEYS)) return false;
  return (
    typeof value.sourceRegionId === "string" &&
    value.sourceRegionId.length > 0 &&
    typeof value.layoutRegionKey === "string" &&
    layout.regions.some((region) => region.key === value.layoutRegionKey) &&
    hasKnownCondition(value.condition) &&
    typeof value.vesselLinked === "boolean" &&
    typeof value.routeCommitted === "boolean" &&
    typeof value.seeded === "boolean" &&
    (value.phenotype === "proliferative" ||
      value.phenotype === "migratory" ||
      value.phenotype === "stress-tolerant")
  );
}

function isSystemicInvasion(value: unknown): value is ColonySystemicInvasion {
  return (
    hasExactFrozenDataKeys(value, SYSTEMIC_INVASION_KEYS) &&
    typeof value.routeCommitted === "boolean" &&
    typeof value.seeded === "boolean"
  );
}

function isEndingVisualState(value: unknown): value is EndingVisualState {
  if (!hasExactFrozenDataKeys(value, ENDING_VISUAL_KEYS)) return false;
  const networkTier = value.networkTier;
  const connectedSiteCount = value.connectedSiteCount;
  const routeDensity = value.routeDensity;
  const routeAnchors = value.routeAnchors;
  if (
    (value.mode !== "colony" && value.mode !== "chicago-scale") ||
    typeof networkTier !== "number" ||
    !Number.isSafeInteger(networkTier) ||
    networkTier < 0 ||
    typeof connectedSiteCount !== "number" ||
    !Number.isSafeInteger(connectedSiteCount) ||
    connectedSiteCount < 0 ||
    typeof routeDensity !== "number" ||
    !Number.isSafeInteger(routeDensity) ||
    routeDensity < 0 ||
    routeDensity > 6 ||
    !isFrozenArray(routeAnchors) ||
    routeAnchors.length > 6
  ) {
    return false;
  }
  if (value.mode === "colony") {
    return (
      networkTier === 0 &&
      connectedSiteCount === 0 &&
      routeDensity === 0 &&
      routeAnchors.length === 0
    );
  }
  return (
    networkTier >= 1 &&
    routeDensity >= 1 &&
    routeAnchors.length === routeDensity &&
    routeAnchors.every(
      (anchor) =>
        hasExactFrozenDataKeys(anchor, ENDING_ROUTE_ANCHOR_KEYS) &&
        typeof anchor.x === "number" &&
        Number.isFinite(anchor.x) &&
        anchor.x > 0 &&
        anchor.x < 1000 &&
        typeof anchor.y === "number" &&
        Number.isFinite(anchor.y) &&
        anchor.y > 0 &&
        anchor.y < 700,
    )
  );
}

/** Rejects hostile or mutable semantic payloads before SVG components can project them. */
export function assertColonyVisualState(
  value: unknown,
  layout: ColonyLayout,
): asserts value is ColonyVisualState {
  if (!hasExactFrozenDataKeys(value, VISUAL_STATE_KEYS)) {
    throw new Error("Colony visual state must be a frozen exact record.");
  }
  if (!isDeclarations(value.declarations)) {
    throw new Error("Colony visual declarations must retain the morphology layer contract.");
  }
  if (!isSystemicInvasion(value.invasion)) {
    throw new Error("Colony systemic invasion state must be frozen and exact.");
  }
  if (!isEndingVisualState(value.ending)) {
    throw new Error("Colony ending state must be frozen accepted scene data.");
  }
  if (
    !isFrozenArray(value.effects) ||
    !value.effects.every(isVisualEffect) ||
    !isFrozenArray(value.overlays) ||
    !value.overlays.every((overlay) => isVisualOverlay(overlay, layout))
  ) {
    throw new Error("Colony visual effects and overlays must be frozen accepted scene data.");
  }
  if (
    value.growthState !== "quiet" &&
    value.growthState !== "cycling" &&
    value.growthState !== "energized"
  ) {
    throw new Error("Colony growth state is outside the accepted renderer vocabulary.");
  }
}
