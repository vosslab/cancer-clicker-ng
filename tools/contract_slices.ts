import { hallmarkId, stageId } from "../src/brands.js";
import { recordEvent } from "../src/state/events.js";
import { createInitialGameState } from "../src/state/game_state.js";
import type { HallmarkEffect } from "../src/types/effects.js";
import type {
  AdvanceStageEvent,
  ApplyOfflineAccrualEvent,
  GameEvent,
  PerformPrestigeResetEvent,
  SetNumberFormatEvent,
} from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";

const HALLMARK_EFFECT_PROBE: HallmarkEffect = {
  hallmarkId: hallmarkId("sustaining-proliferative-signaling"),
  apply(context) {
    return context.state;
  },
};

export function describeGameEvent(event: GameEvent): string {
  switch (event.type) {
    case "click-divide":
      return "click divide";
    case "purchase-producer":
      return `purchase producer ${event.producerId}`;
    case "purchase-hallmark":
      return `purchase hallmark ${event.hallmarkId}`;
    case "advance-stage":
      return `advance stage ${event.fromStageId} to ${event.toStageId}`;
    case "perform-prestige-reset":
      return "prestige availability boundary";
    case "apply-offline-accrual":
      return `offline accrual ${event.elapsedMs}`;
    case "set-number-format":
      return `set number format ${event.numberFormat}`;
    case "set-signaling-allocation":
      return `set signaling allocation ${event.allocation}`;
    case "select-checkpoint":
      return `select checkpoint ${event.checkpoint}`;
    case "resolve-triage":
      return `resolve triage ${event.eventId} with ${event.action}`;
    case "set-vessel-link":
      return `set vessel link ${event.regionId} ${event.linked}`;
    case "commit-route":
      return `commit route ${event.routeId} with ${event.cells} cells`;
    case "set-atp-budget":
      return `set ATP budget ${event.sink} to ${event.amount}`;
    case "select-mutation":
      return `select mutation ${event.mutationId} from ${event.offerId}`;
    case "switch-phenotype":
      return `switch ${event.regionId} to ${event.phenotype}`;
    case "edit-program":
      return `edit program ${event.hallmarkId} to ${event.optionId}`;
    case "select-microbiome":
      return `select microbiome ${event.offerId}`;
    case "resolve-senescence":
      return `resolve senescence ${event.eventId} with ${event.action}`;
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}

function runHallmarkEffectSlice(): GameState {
  return HALLMARK_EFFECT_PROBE.apply({
    state: createInitialGameState(),
    level: 1,
    appliedAtMs: 1,
  });
}

function runStageTransitionSlice(): GameState {
  const state = createInitialGameState();
  const event: AdvanceStageEvent = {
    type: "advance-stage",
    fromStageId: state.currentStage,
    toStageId: stageId("microcolony"),
    atMs: 2,
  };
  return recordEvent(state, event);
}

function runPrestigeAvailabilityBoundarySlice(): string {
  const event: PerformPrestigeResetEvent = {
    type: "perform-prestige-reset",
    atMs: 3,
  };
  try {
    recordEvent(createInitialGameState(), event);
  } catch (error) {
    if (error instanceof Error && error.message === "Prestige reset is unavailable before M13.")
      return "unavailable-before-M13";
    throw error;
  }
  throw new Error("Prestige reset unexpectedly succeeded before M13.");
}

function runOfflineAccrualSlice(): GameState {
  const event: ApplyOfflineAccrualEvent = {
    type: "apply-offline-accrual",
    elapsedMs: 60_000,
    atMs: 4,
  };
  return recordEvent(createInitialGameState(), event);
}

function runUiEventRoundTripSlice(): string {
  const dispatchedEvent: SetNumberFormatEvent = {
    type: "set-number-format",
    numberFormat: "full",
    atMs: 5,
  };
  const receivedEvent: GameEvent = dispatchedEvent;
  const label = describeGameEvent(receivedEvent);
  return label;
}

export const CONTRACT_SLICE_LABELS = [
  runHallmarkEffectSlice().currentStage,
  runStageTransitionSlice().currentStage,
  runPrestigeAvailabilityBoundarySlice(),
  runOfflineAccrualSlice().totalOfflineMs.toString(),
  runUiEventRoundTripSlice(),
];
