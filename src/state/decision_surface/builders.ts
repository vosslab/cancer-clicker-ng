import type { CanonicalBigNumDto } from "../../hallmarks/extended_hallmark_types.js";
import type { GameEvent } from "../../types/events.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction, VisibleActionKind } from "./contracts.js";

export function dto(value: { mantissa: number; exponent: number }): CanonicalBigNumDto {
  return Object.freeze({ mantissa: value.mantissa, exponent: value.exponent });
}

export function envelope(
  state: GameState,
): Readonly<{ atMs: number; sourceEventSequence: number }> {
  return Object.freeze({ atMs: state.activeTimeMs, sourceEventSequence: state.eventSequence });
}

export function visibleAction(
  kind: VisibleActionKind,
  event: GameEvent,
  summary: string,
  tags: readonly string[] = [],
  displayedCost: VisibleAction["displayedCost"] = undefined,
  displayedBenefit: VisibleAction["displayedBenefit"] = undefined,
): VisibleAction {
  const id = `${event.type}:${Object.entries(event)
    .filter(([key]) => key !== "atMs" && key !== "sourceEventSequence")
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(":")}`;
  return Object.freeze({
    id,
    kind,
    event: Object.freeze(event),
    displayedCost: displayedCost === undefined ? undefined : Object.freeze(displayedCost),
    displayedBenefit: displayedBenefit === undefined ? undefined : Object.freeze(displayedBenefit),
    summary,
    effectTags: Object.freeze([...tags]),
  });
}

export function ownsHallmark(state: GameState, id: string): boolean {
  return state.hallmarkLevels.some((level) => level.id === id && level.level > 0);
}

export function networkActionsAvailable(state: GameState): boolean {
  return (
    state.currentStage === "global_lab_contamination" &&
    state.lineageLedger.networkSeed !== null &&
    state.prestigeAvailability.some((entry) => entry.id === "L3" && entry.status === "earned") &&
    state.prestigeAvailability.some((entry) => entry.id === "L4" && entry.status === "earned")
  );
}
