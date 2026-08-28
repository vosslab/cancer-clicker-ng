import { hallmarkId, microbiomePoolId, offerId, programOptionId } from "../../brands.js";
import type { SaveNotice } from "../../types/save.js";
import type { GameState } from "../../types/state.js";
import { isHallmarkId } from "../catalog.js";
import { exact, identifier, ids, natural, object } from "./guards.js";

export function parsePrograms(value: unknown): GameState["programs"] | undefined {
  if (
    !exact(value, [
      "allowedByHallmark",
      "selectedByHallmark",
      "eligibleHallmarks",
      "cooldownDeadlineMs",
    ]) ||
    !object(value.allowedByHallmark) ||
    !object(value.selectedByHallmark) ||
    !(value.cooldownDeadlineMs === null || natural(value.cooldownDeadlineMs))
  )
    return undefined;
  const allowed: Record<string, readonly ReturnType<typeof programOptionId>[]> = {};
  for (const [key, options] of Object.entries(value.allowedByHallmark)) {
    const parsed = ids(options, programOptionId);
    if (!isHallmarkId(key) || !parsed || parsed.length === 0) return undefined;
    allowed[key] = parsed;
  }
  const eligible = ids(value.eligibleHallmarks, hallmarkId);
  if (!eligible || !eligible.every(isHallmarkId)) return undefined;
  const selected: Record<string, ReturnType<typeof programOptionId>> = {};
  for (const [key, option] of Object.entries(value.selectedByHallmark)) {
    if (
      !isHallmarkId(key) ||
      !eligible.includes(hallmarkId(key)) ||
      !identifier(option) ||
      !allowed[key]?.includes(programOptionId(option))
    )
      return undefined;
    selected[key] = programOptionId(option);
  }
  return {
    allowedByHallmark: allowed,
    selectedByHallmark: selected,
    eligibleHallmarks: eligible,
    cooldownDeadlineMs: value.cooldownDeadlineMs,
  };
}

export function parseMicrobiome(
  value: unknown,
  notices: SaveNotice[],
): GameState["microbiome"] | undefined {
  if (
    !exact(value, [
      "poolId",
      "offerIds",
      "seed",
      "sequence",
      "rotationCounter",
      "rotationDeadlineMs",
      "pendingCompatibility",
      "selectedNiches",
      "compatibilitySnapshot",
    ]) ||
    !natural(value.seed) ||
    !natural(value.sequence) ||
    !natural(value.rotationCounter) ||
    !(value.rotationDeadlineMs === null || natural(value.rotationDeadlineMs)) ||
    !(value.poolId === undefined || identifier(value.poolId))
  )
    return undefined;
  const pendingCompatibility =
    value.pendingCompatibility === null ||
    value.pendingCompatibility === "compatible" ||
    value.pendingCompatibility === "incompatible"
      ? value.pendingCompatibility
      : null;
  if (pendingCompatibility === null && value.pendingCompatibility !== null)
    notices.push({
      code: "field-defaulted",
      field: "microbiome.pendingCompatibility",
      message: "Recovered microbiome.pendingCompatibility with its safe default.",
    });
  const offerIds = ids(value.offerIds, offerId);
  const selectedNiches = ids(value.selectedNiches, offerId);
  const compatibilitySnapshot = ids(value.compatibilitySnapshot, offerId);
  if (
    !offerIds ||
    !selectedNiches ||
    !compatibilitySnapshot ||
    selectedNiches.length > 2 ||
    !selectedNiches.every((id) => !offerIds.includes(id)) ||
    compatibilitySnapshot.length !== selectedNiches.length ||
    !compatibilitySnapshot.every((id, index) => id === selectedNiches[index])
  )
    return undefined;
  return {
    ...(value.poolId === undefined ? {} : { poolId: microbiomePoolId(value.poolId) }),
    offerIds,
    seed: value.seed,
    sequence: value.sequence,
    rotationCounter: value.rotationCounter,
    rotationDeadlineMs: value.rotationDeadlineMs,
    pendingCompatibility,
    selectedNiches,
    compatibilitySnapshot,
  };
}
