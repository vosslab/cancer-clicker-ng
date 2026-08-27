import { eventId, offerId, regionId, routeId, stageId, mutationId } from "../../brands.js";
import type { GameState } from "../../types/state.js";
import { isStageId } from "../catalog.js";
import { array, exact, fraction, identifier, ids, natural, nonnegative, unique } from "./guards.js";

export type ParseNotice = {
  code: "field-defaulted" | "storage-error" | "save-rejected";
  field: string;
  message: string;
};

export function parseRegions(
  value: unknown,
  notices: ParseNotice[],
): GameState["regions"] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const result: GameState["regions"][number][] = [];
  for (const item of values) {
    if (
      !exact(item, [
        "id",
        "capacity",
        "viability",
        "phenotype",
        "vesselLinkIds",
        "routeIds",
        "senescenceEventId",
      ]) ||
      !identifier(item.id) ||
      !nonnegative(item.capacity) ||
      !fraction(item.viability) ||
      !["proliferative", "migratory", "stress-tolerant"].includes(String(item.phenotype))
    )
      return undefined;
    const vesselLinkIds = ids(item.vesselLinkIds, eventId);
    const routeIds = ids(item.routeIds, routeId);
    if (!vesselLinkIds || !routeIds) return undefined;
    const senescenceEventId =
      item.senescenceEventId === undefined
        ? undefined
        : identifier(item.senescenceEventId)
          ? eventId(item.senescenceEventId)
          : undefined;
    if (item.senescenceEventId !== undefined && senescenceEventId === undefined)
      notices.push({
        code: "field-defaulted",
        field: `regions[${result.length}].senescenceEventId`,
        message: `Recovered regions[${result.length}].senescenceEventId with its safe default.`,
      });
    result.push({
      id: regionId(item.id),
      capacity: item.capacity,
      viability: item.viability,
      phenotype: item.phenotype as GameState["regions"][number]["phenotype"],
      vesselLinkIds,
      routeIds,
      ...(senescenceEventId === undefined ? {} : { senescenceEventId }),
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
      !exact(item, ["id", "poolId", "mutationIds", "sourceSeed", "sourceSequence"]) ||
      !identifier(item.id) ||
      !identifier(item.poolId) ||
      !natural(item.sourceSeed) ||
      !natural(item.sourceSequence)
    )
      return undefined;
    const mutationIds = ids(item.mutationIds, mutationId);
    if (!mutationIds || mutationIds.length === 0) return undefined;
    result.push({
      id: offerId(item.id),
      poolId: item.poolId,
      mutationIds,
      sourceSeed: item.sourceSeed,
      sourceSequence: item.sourceSequence,
    });
  }
  return unique(result.map((item) => item.id)) ? result : undefined;
}
export function parseTransition(value: unknown): GameState["lastStageTransition"] | undefined {
  if (
    !exact(value, ["from", "to", "atMs"]) ||
    !identifier(value.from) ||
    !identifier(value.to) ||
    !isStageId(value.from) ||
    !isStageId(value.to) ||
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
