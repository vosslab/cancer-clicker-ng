import { eventId, offerId, regionId, routeId, stageId, mutationId } from "../../brands.js";
import {
  findMutationDraftCard,
  MUTATION_DRAFT_OFFER_CARD_COUNT,
  MUTATION_DRAFT_POOL_ID,
} from "../../hallmarks/extended_hallmark_catalog.js";
import type { SaveNotice } from "../../types/save.js";
import type { GameState } from "../../types/state.js";
import { isRecordedStageTransition, isStageId } from "../catalog.js";
import { array, exact, fraction, identifier, ids, natural, unique } from "./guards.js";

export function parseRegions(
  value: unknown,
  _notices: SaveNotice[],
): GameState["regions"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["regions"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, ["id", "capacity", "viability", "phenotype", "vesselLinkIds", "routeIds"]) ||
      !identifier(item.id) ||
      !natural(item.capacity) ||
      !fraction(item.viability) ||
      !["proliferative", "migratory", "stress-tolerant"].includes(String(item.phenotype))
    )
      return undefined;
    const vesselLinkIds = ids(item.vesselLinkIds, eventId);
    const routeIds = ids(item.routeIds, routeId);
    if (!vesselLinkIds || !routeIds) return undefined;
    result.push({
      id: regionId(item.id),
      capacity: item.capacity,
      viability: item.viability,
      phenotype: item.phenotype as GameState["regions"][number]["phenotype"],
      vesselLinkIds,
      routeIds,
    });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}
export function parseOffers(value: unknown): GameState["mutationOffers"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["mutationOffers"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, [
        "id",
        "poolId",
        "cards",
        "sourceSeed",
        "sourceSequence",
        "sourceStage",
        "threshold",
      ]) ||
      !identifier(item.id) ||
      item.poolId !== MUTATION_DRAFT_POOL_ID ||
      !natural(item.sourceSeed) ||
      !natural(item.sourceSequence) ||
      !identifier(item.sourceStage) ||
      !isStageId(item.sourceStage) ||
      !natural(item.threshold) ||
      item.threshold < 1
    )
      return undefined;
    const cardsValue = array(item.cards);
    if (!cardsValue || cardsValue.length !== MUTATION_DRAFT_OFFER_CARD_COUNT) return undefined;
    const cards = cardsValue.map(parseMutationCard);
    const [first, second, third] = cards;
    if (
      !first ||
      !second ||
      !third ||
      new Set(cards.map((card) => card?.id)).size !== MUTATION_DRAFT_OFFER_CARD_COUNT
    )
      return undefined;
    result.push({
      id: offerId(item.id),
      poolId: MUTATION_DRAFT_POOL_ID,
      cards: [first, second, third],
      sourceSeed: item.sourceSeed,
      sourceSequence: item.sourceSequence,
      sourceStage: stageId(item.sourceStage),
      threshold: item.threshold,
    });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}

function parseMutationCard(value: unknown): ReturnType<typeof findMutationDraftCard> | undefined {
  if (
    !exact(value, ["id", "displayName", "benefit", "liability", "genomeBurden", "effects"]) ||
    !identifier(value.id) ||
    !natural(value.genomeBurden) ||
    !exact(value.benefit, ["label", "effect"]) ||
    !exact(value.liability, ["label", "effect"]) ||
    !exact(value.effects, [
      "producerMultiplier",
      "producerCostMultiplier",
      "conversionYieldMultiplier",
      "maskTokenCost",
      "routeDiscoveryBonus",
      "damagePressure",
      "immunePressure",
    ]) ||
    !identifier(value.benefit.label) ||
    !identifier(value.benefit.effect) ||
    !identifier(value.liability.label) ||
    !identifier(value.liability.effect)
  )
    return undefined;
  const expected = findMutationDraftCard(mutationId(value.id));
  if (
    expected === undefined ||
    expected.displayName !== value.displayName ||
    expected.benefit.label !== value.benefit.label ||
    expected.benefit.effect !== value.benefit.effect ||
    expected.liability.label !== value.liability.label ||
    expected.liability.effect !== value.liability.effect ||
    expected.genomeBurden !== value.genomeBurden ||
    JSON.stringify(expected.effects) !== JSON.stringify(value.effects)
  )
    return undefined;
  return expected;
}
export function parseTransition(value: unknown): GameState["lastStageTransition"] | undefined {
  if (
    !exact(value, ["from", "to", "atMs"]) ||
    !identifier(value.from) ||
    !identifier(value.to) ||
    !isStageId(value.from) ||
    !isStageId(value.to) ||
    !isRecordedStageTransition(stageId(value.from), stageId(value.to)) ||
    !natural(value.atMs)
  )
    return undefined;
  return { from: stageId(value.from), to: stageId(value.to), atMs: value.atMs };
}
export function parseEpisodes(value: unknown): GameState["inflammationEpisodes"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["inflammationEpisodes"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, ["id", "regionId", "deadlineMs"]) ||
      !identifier(item.id) ||
      !identifier(item.regionId) ||
      !natural(item.deadlineMs)
    )
      return undefined;
    result.push({
      id: eventId(item.id),
      regionId: regionId(item.regionId),
      deadlineMs: item.deadlineMs,
    });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}
export function parseDamage(value: unknown): GameState["pendingDamageEvents"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["pendingDamageEvents"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, ["id", "regionId", "outcome"]) ||
      !identifier(item.id) ||
      !identifier(item.regionId) ||
      !["repairable", "fatal", "substrate-recovery"].includes(String(item.outcome))
    )
      return undefined;
    result.push({
      id: eventId(item.id),
      regionId: regionId(item.regionId),
      outcome: item.outcome as GameState["pendingDamageEvents"][number]["outcome"],
    });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}
export function parseTransit(value: unknown): GameState["pendingTransitEvents"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["pendingTransitEvents"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, ["id", "routeId", "outcome"]) ||
      !identifier(item.id) ||
      !identifier(item.routeId) ||
      (item.outcome !== "arrived" && item.outcome !== "lost")
    )
      return undefined;
    result.push({ id: eventId(item.id), routeId: routeId(item.routeId), outcome: item.outcome });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}
