/**
 * One purchase gate shared by the reducer and every player-facing hallmark surface.
 * A missing saved level is the canonical initial level: no synthetic zero-level row is needed.
 */
import { findCoreSixHallmark, hasReachedCoreSixUnlock } from "./core_six_catalog.js";
import {
  findExtendedHallmark,
  hasReachedExtendedHallmarkUnlock,
} from "./extended_hallmark_catalog.js";
import { findLateHallmark, hasReachedLateHallmarkActivation } from "./late_hallmark_catalog.js";
import { cultureLateProgramInterfacesAvailable } from "../prestige/culture_effects.js";
import type { HallmarkId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { CoreSixHallmarkDefinition } from "./core_six_types.js";
import type { ExtendedHallmarkDefinition } from "./extended_hallmark_types.js";
import type { LateHallmarkDefinition } from "./late_hallmark_types.js";

export type HallmarkPurchaseDefinition =
  CoreSixHallmarkDefinition | ExtendedHallmarkDefinition | LateHallmarkDefinition;

export type HallmarkPurchaseBlockReason =
  "unknown" | "invalid-level" | "stage" | "culture-interface" | "already-owned";

export type HallmarkPurchaseEligibility =
  | Readonly<{
      available: true;
      definition: HallmarkPurchaseDefinition;
      currentLevel: number;
    }>
  | Readonly<{
      available: false;
      reason: HallmarkPurchaseBlockReason;
      definition?: HallmarkPurchaseDefinition;
    }>;

function definitionFor(id: HallmarkId): HallmarkPurchaseDefinition | undefined {
  return findCoreSixHallmark(id) ?? findExtendedHallmark(id) ?? findLateHallmark(id);
}

function hasValidLevel(level: number): boolean {
  return Number.isSafeInteger(level) && level >= 0;
}

/** Reports the exact reason a catalog hallmark cannot be bought in this saved state. */
export function hallmarkPurchaseEligibility(
  state: GameState,
  id: HallmarkId,
): HallmarkPurchaseEligibility {
  const definition = definitionFor(id);
  if (definition === undefined) return { available: false, reason: "unknown" };
  const savedLevel = state.hallmarkLevels.find((candidate) => candidate.id === id);
  if (savedLevel !== undefined && !hasValidLevel(savedLevel.level)) {
    return { available: false, reason: "invalid-level", definition };
  }
  const currentLevel = savedLevel?.level ?? 0;
  const core = findCoreSixHallmark(id);
  const extended = findExtendedHallmark(id);
  const late = findLateHallmark(id);
  const stageAvailable =
    (core !== undefined && hasReachedCoreSixUnlock(state.currentStage, core.key)) ||
    (extended !== undefined &&
      hasReachedExtendedHallmarkUnlock(state.currentStage, extended.key)) ||
    (late !== undefined && hasReachedLateHallmarkActivation(state.currentStage, late.key));
  if (!stageAvailable) return { available: false, reason: "stage", definition };
  if (late !== undefined && !cultureLateProgramInterfacesAvailable(state)) {
    return { available: false, reason: "culture-interface", definition };
  }
  if (currentLevel >= definition.purchase.maximumLevel) {
    return { available: false, reason: "already-owned", definition };
  }
  return { available: true, definition, currentLevel };
}
