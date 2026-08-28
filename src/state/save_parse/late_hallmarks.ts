import {
  eventId,
  hallmarkId,
  lateProgramOptionId,
  microbiomeCompositionId,
  microbiomeOfferId,
  microbiomePoolId,
  regionId,
  stageId,
} from "../../brands.js";
import { findMicrobiomeComposition, isMicrobiomePool } from "../../hallmarks/microbiome_catalog.js";
import { findLateProgramOption } from "../../hallmarks/program_catalog.js";
import type {
  ActiveMicrobiomeComposition,
  LateHallmarksState,
  MicrobiomeCompositionSnapshot,
  MicrobiomeEffects,
  MicrobiomeOfferSnapshot,
  ProgramAssignment,
  RetainedSenescence,
  SenescenceDecision,
} from "../../hallmarks/late_hallmark_types.js";
import { isStageId } from "../catalog.js";
import type { GameState } from "../../types/state.js";
import { array, exact, finite, identifier, natural, object, unique } from "./guards.js";

const LATE_HALLMARK_KEYS = ["plasticity", "epigenetic", "microbiome", "senescence"] as const;
const MAX_LATE_RECORDS = 256;

function exactShape(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length && exact(value, keys);
}

function effects(value: unknown): value is MicrobiomeEffects {
  return (
    exactShape(value, [
      "substrateConversionMultiplier",
      "inflammationDurationMultiplier",
      "immuneVisibilityDelta",
    ]) &&
    finite(value.substrateConversionMultiplier) &&
    finite(value.inflammationDurationMultiplier) &&
    finite(value.immuneVisibilityDelta)
  );
}

/** Rebuild a catalog-owned snapshot only after every displayed field matches it exactly. */
function composition(value: unknown): MicrobiomeCompositionSnapshot | undefined {
  if (!exactShape(value, ["id", "niches", "compatibility"]) || !identifier(value.id)) return undefined;
  const catalog = findMicrobiomeComposition(microbiomeCompositionId(value.id));
  if (catalog === undefined) return undefined;
  const niches = array(value.niches);
  const savedCompatibility = value.compatibility;
  if (
    !niches ||
    niches.length !== 2 ||
    !exactShape(savedCompatibility, ["kind", "label", "effects"]) ||
    !effects(savedCompatibility.effects) ||
    savedCompatibility.kind !== catalog.compatibility.kind ||
    savedCompatibility.label !== catalog.compatibility.label ||
    savedCompatibility.effects.substrateConversionMultiplier !==
      catalog.compatibility.effects.substrateConversionMultiplier ||
    savedCompatibility.effects.inflammationDurationMultiplier !==
      catalog.compatibility.effects.inflammationDurationMultiplier ||
    savedCompatibility.effects.immuneVisibilityDelta !== catalog.compatibility.effects.immuneVisibilityDelta
  )
    return undefined;
  for (let index = 0; index < 2; index += 1) {
    const saved = niches[index];
    const expected = catalog.niches[index];
    if (
      expected === undefined ||
      !exactShape(saved, ["nicheId", "communityId", "label", "effects"]) ||
      !effects(saved.effects) ||
      saved.nicheId !== expected.nicheId ||
      saved.communityId !== expected.communityId ||
      saved.label !== expected.label ||
      saved.effects.substrateConversionMultiplier !== expected.effects.substrateConversionMultiplier ||
      saved.effects.inflammationDurationMultiplier !== expected.effects.inflammationDurationMultiplier ||
      saved.effects.immuneVisibilityDelta !== expected.effects.immuneVisibilityDelta
    )
      return undefined;
  }
  return catalog;
}

function offer(value: unknown, clock: number): MicrobiomeOfferSnapshot | undefined {
  if (
    !exactShape(value, [
      "id",
      "poolId",
      "compositions",
      "sourceSeed",
      "sourceSequence",
      "sourceStage",
      "expiresAtMs",
    ]) ||
    !identifier(value.id) ||
    !identifier(value.poolId) ||
    !natural(value.sourceSeed) ||
    !natural(value.sourceSequence) ||
    !identifier(value.sourceStage) ||
    !isStageId(value.sourceStage) ||
    !natural(value.expiresAtMs) ||
    value.expiresAtMs <= clock
  )
    return undefined;
  const source = array(value.compositions);
  if (!source || source.length !== 3) return undefined;
  const compositions = source.map(composition);
  if (compositions.some((entry): entry is undefined => entry === undefined)) return undefined;
  const parsedCompositions = compositions as readonly MicrobiomeCompositionSnapshot[];
  if (!unique(parsedCompositions.map((entry) => String(entry.id))))
    return undefined;
  const poolId = microbiomePoolId(value.poolId);
  if (!isMicrobiomePool(poolId)) return undefined;
  return {
    id: microbiomeOfferId(value.id),
    poolId,
    compositions: [parsedCompositions[0]!, parsedCompositions[1]!, parsedCompositions[2]!],
    sourceSeed: value.sourceSeed,
    sourceSequence: value.sourceSequence,
    sourceStage: stageId(value.sourceStage),
    expiresAtMs: value.expiresAtMs,
  };
}

function assignments(
  value: unknown,
  state: Pick<GameState, "hallmarkLevels">,
): readonly ProgramAssignment[] | undefined {
  const source = array(value);
  if (!source) return undefined;
  const result: ProgramAssignment[] = [];
  for (const entry of source) {
    if (
      !exactShape(entry, ["hallmarkId", "optionId"]) ||
      !identifier(entry.hallmarkId) ||
      !identifier(entry.optionId)
    )
      return undefined;
    const target = hallmarkId(entry.hallmarkId);
    const option = findLateProgramOption(lateProgramOptionId(entry.optionId));
    if (
      option === undefined ||
      option.target !== target ||
      !state.hallmarkLevels.some((level) => level.id === target && level.level > 0)
    )
      return undefined;
    result.push({ hallmarkId: target, optionId: option.id });
  }
  return unique(result.map((entry) => String(entry.hallmarkId))) ? result : undefined;
}

function activeComposition(value: unknown): ActiveMicrobiomeComposition | null | undefined {
  if (value === null) return null;
  if (
    !exactShape(value, ["offerId", "composition", "installedAtMs"]) ||
    !identifier(value.offerId) ||
    !natural(value.installedAtMs)
  )
    return undefined;
  const savedComposition = composition(value.composition);
  return savedComposition === undefined
    ? undefined
    : {
        offerId: microbiomeOfferId(value.offerId),
        composition: savedComposition,
        installedAtMs: value.installedAtMs,
      };
}

function pendingDecisions(
  value: unknown,
  regionIds: ReadonlySet<string>,
  clock: number,
): readonly SenescenceDecision[] | undefined {
  const source = array(value);
  if (!source) return undefined;
  const result: SenescenceDecision[] = [];
  for (const entry of source) {
    if (
      !exactShape(entry, ["id", "regionId", "cause", "createdAtMs"]) ||
      !identifier(entry.id) ||
      !identifier(entry.regionId) ||
      (entry.cause !== "replicative-limit" && entry.cause !== "damage-failure") ||
      !natural(entry.createdAtMs) ||
      entry.createdAtMs > clock ||
      !regionIds.has(entry.regionId)
    )
      return undefined;
    result.push({
      id: eventId(entry.id),
      regionId: regionId(entry.regionId),
      cause: entry.cause,
      createdAtMs: entry.createdAtMs,
    });
  }
  return result;
}

function retainedRecords(
  value: unknown,
  regionIds: ReadonlySet<string>,
  clock: number,
): readonly RetainedSenescence[] | undefined {
  const source = array(value);
  if (!source) return undefined;
  const result: RetainedSenescence[] = [];
  for (const entry of source) {
    if (
      !exactShape(entry, ["decisionId", "regionId", "cause", "createdAtMs", "retainedAtMs"]) ||
      !identifier(entry.decisionId) ||
      !identifier(entry.regionId) ||
      (entry.cause !== "replicative-limit" && entry.cause !== "damage-failure") ||
      !natural(entry.createdAtMs) ||
      !natural(entry.retainedAtMs) ||
      entry.createdAtMs > entry.retainedAtMs ||
      entry.retainedAtMs > clock ||
      !regionIds.has(entry.regionId)
    )
      return undefined;
    result.push({
      decisionId: eventId(entry.decisionId),
      regionId: regionId(entry.regionId),
      cause: entry.cause,
      createdAtMs: entry.createdAtMs,
      retainedAtMs: entry.retainedAtMs,
    });
  }
  return result;
}

/**
 * ASVS 1.5.2, 2.1.1-2.1.3, 2.2.1-2.2.3, and 15.3.3/15.3.5-15.3.6:
 * rebuild the exact bounded p5 aggregate from own, allowlisted plain records;
 * catalog identities and cross-record region/decision relations are validated here.
 */
export function parseLateHallmarks(
  value: unknown,
  state: Pick<GameState, "regions" | "hallmarkLevels" | "activeTimeMs" | "totalOfflineMs">,
): LateHallmarksState | undefined {
  const clock = state.activeTimeMs + state.totalOfflineMs;
  if (!natural(clock) || !exactShape(value, LATE_HALLMARK_KEYS)) return undefined;
  const { plasticity, epigenetic, microbiome, senescence } = value;
  if (
    !exactShape(plasticity, ["switchCooldownByRegion"]) ||
    !exactShape(epigenetic, ["assignments", "cooldownDeadlineMs"]) ||
    !exactShape(microbiome, [
      "activeComposition",
      "pendingOffer",
      "nextRotationDeadlineMs",
      "rotationSequence",
    ]) ||
    !exactShape(senescence, ["pendingDecisions", "retainedRegions"])
  )
    return undefined;
  const regionIds = new Set(state.regions.map((region) => String(region.id)));
  if (
    !object(plasticity.switchCooldownByRegion) ||
    Object.keys(plasticity.switchCooldownByRegion).length > MAX_LATE_RECORDS
  )
    return undefined;
  const cooldowns: Record<string, number> = {};
  for (const [id, deadline] of Object.entries(plasticity.switchCooldownByRegion)) {
    if (!identifier(id) || !regionIds.has(id) || !natural(deadline)) return undefined;
    cooldowns[id] = deadline;
  }
  const parsedAssignments = assignments(epigenetic.assignments, state);
  if (
    parsedAssignments === undefined ||
    !(epigenetic.cooldownDeadlineMs === null || natural(epigenetic.cooldownDeadlineMs))
  )
    return undefined;
  const pendingOffer = microbiome.pendingOffer === null ? null : offer(microbiome.pendingOffer, clock);
  const active = activeComposition(microbiome.activeComposition);
  if (
    pendingOffer === undefined ||
    active === undefined ||
    !natural(microbiome.rotationSequence) ||
    !(microbiome.nextRotationDeadlineMs === null || natural(microbiome.nextRotationDeadlineMs)) ||
    (pendingOffer === null) !== (microbiome.nextRotationDeadlineMs === null) ||
    (pendingOffer !== null && microbiome.nextRotationDeadlineMs !== pendingOffer.expiresAtMs)
  )
    return undefined;
  const pending = pendingDecisions(senescence.pendingDecisions, regionIds, clock);
  const retained = retainedRecords(senescence.retainedRegions, regionIds, clock);
  if (
    pending === undefined ||
    retained === undefined ||
    !unique([
      ...pending.map((entry) => String(entry.id)),
      ...retained.map((entry) => String(entry.decisionId)),
    ]) ||
    !unique([
      ...pending.map((entry) => String(entry.regionId)),
      ...retained.map((entry) => String(entry.regionId)),
    ])
  )
    return undefined;
  return {
    plasticity: { switchCooldownByRegion: cooldowns },
    epigenetic: {
      assignments: parsedAssignments,
      cooldownDeadlineMs: epigenetic.cooldownDeadlineMs,
    },
    microbiome: {
      activeComposition: active,
      pendingOffer,
      nextRotationDeadlineMs: microbiome.nextRotationDeadlineMs,
      rotationSequence: microbiome.rotationSequence,
    },
    senescence: { pendingDecisions: pending, retainedRegions: retained },
  };
}
