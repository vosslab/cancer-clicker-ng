import { hallmarkId, organSiteId, stageId } from "../src/brands.js";
import { recordEvent } from "../src/state/events.js";
import { createInitialGameState } from "../src/state/game_state.js";
import type { LoadResult } from "../src/state/save_load.js";
import type { SaveNotice } from "../src/types/save.js";
import type { HallmarkEffect } from "../src/types/effects.js";
import type { ExtendedHallmarkOperation } from "../src/hallmarks/extended_hallmark_types.js";
import type {
  AdvanceStageEvent,
  ApplyOfflineAccrualEvent,
  GameEvent,
  PerformMetastasisResetEvent,
  SetNumberFormatEvent,
} from "../src/types/events.js";
import type { GameState } from "../src/types/state.js";
import {
  allocateCellSlots,
  buildSilhouette,
  planRegions,
  populateClusters,
} from "../src/svg/colony_layout.js";
import { resolve_stage_morphology } from "../src/svg/morphology.js";
import { createCellRenderModel, createColonySceneRequest } from "../src/svg/render_types.js";

const COLONY_PROBE_REQUEST = {
  stageId: stageId("microcolony"),
  sceneSeed: 17,
  morphology: resolve_stage_morphology(17, "microcolony"),
  detail: "representative",
} as const;
const RAW_COLONY_SILHOUETTE = {
  stageId: stageId("microcolony"),
  centre: { x: 500, y: 350 },
  vertices: [],
  baseRadius: 1,
};
const RAW_REGIONAL_PLAN = { silhouette: RAW_COLONY_SILHOUETTE, regions: [], voids: [] };
const RAW_CLUSTER_PLAN = { regions: RAW_REGIONAL_PLAN, clusters: [] };
/** Compile-only opaque-phase proof; deliberately never invoked at runtime. */
export function colonyLayoutPhaseForgeryProof(): void {
  // @ts-expect-error Private silhouette phase cannot be forged across this import boundary.
  planRegions(RAW_COLONY_SILHOUETTE, COLONY_PROBE_REQUEST);
  // @ts-expect-error Private regional phase cannot be forged across this import boundary.
  populateClusters(RAW_REGIONAL_PLAN, COLONY_PROBE_REQUEST);
  // @ts-expect-error Private cluster phase cannot be forged across this import boundary.
  allocateCellSlots(RAW_CLUSTER_PLAN, COLONY_PROBE_REQUEST);
}

/** Compile-only colony renderer boundary proof; deliberately never invoked at runtime. */
export function colonyRenderContractForgeryProof(): void {
  const scene = createColonySceneRequest(
    Object.freeze({
      layout: allocateCellSlots(
        populateClusters(
          planRegions(buildSilhouette(COLONY_PROBE_REQUEST), COLONY_PROBE_REQUEST),
          COLONY_PROBE_REQUEST,
        ),
        COLONY_PROBE_REQUEST,
      ),
      morphology: COLONY_PROBE_REQUEST.morphology,
      stageId: COLONY_PROBE_REQUEST.stageId,
      sceneSeed: COLONY_PROBE_REQUEST.sceneSeed,
      detail: COLONY_PROBE_REQUEST.detail,
    }),
  );
  const slot = scene.layout.slots[0];
  if (slot === undefined) throw new Error("Render contract probe requires a cell slot.");
  const cell = createCellRenderModel(
    scene,
    Object.freeze({
      slotKey: slot.key,
      membranePath: "M 0 0 Z",
      nucleusPath: "M 0 0 Z",
      mitosis: undefined,
    }),
  );
  // @ts-expect-error Render cells cannot accept coordinate overrides outside M17 slots.
  cell.x = 0;
  createCellRenderModel(scene, {
    slotKey: "x",
    membranePath: "M",
    nucleusPath: "M",
    mitosis: undefined,
    // @ts-expect-error Render inputs reject arbitrary additional coordinate controls.
    x: 0,
  });
}

export const SAVE_NOTICE_CONTRACT_PROBE = {
  code: "save-rejected",
  field: "envelope",
  message: "Save data is invalid.",
} satisfies SaveNotice;
const _INVALID_SAVE_NOTICE_CONTRACT_PROBE = {
  // @ts-expect-error Save notices use the closed canonical code vocabulary.
  code: "unknown",
  field: "x",
  message: "x",
} satisfies SaveNotice;
void _INVALID_SAVE_NOTICE_CONTRACT_PROBE;

// @ts-expect-error A conversion command cannot be routed through the immune branch.
const _INVALID_EXTENDED_HALLMARK_OPERATION: ExtendedHallmarkOperation = {
  type: "convert-substrate",
  hallmark: "immune_destruction_avoidance",
  amount: { mantissa: 2, exponent: 3 },
};
void _INVALID_EXTENDED_HALLMARK_OPERATION;

export const LOAD_RESULT_CONTRACT_PROBE = {
  status: "loaded",
  state: createInitialGameState(),
  notices: [],
  version: 2,
  savedAtMs: 0,
  stateSchemaVersion: 8,
} satisfies LoadResult;
const _LEGACY_LOADED_RESULT_PROBE = {
  ...LOAD_RESULT_CONTRACT_PROBE,
  // @ts-expect-error A loaded current save uses the settled state schema.
  stateSchemaVersion: 3,
} satisfies LoadResult;
void _LEGACY_LOADED_RESULT_PROBE;
const _REJECTED_WITH_STATE_PROBE = {
  status: "rejected",
  // @ts-expect-error A rejected result cannot masquerade as a loaded state.
  state: createInitialGameState(),
  notices: [],
} satisfies LoadResult;
void _REJECTED_WITH_STATE_PROBE;

const HALLMARK_EFFECT_PROBE: HallmarkEffect = {
  hallmarkId: hallmarkId("proliferative_signaling"),
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
    case "resolve-transit":
      return `resolve transit ${event.transitEventId} at ${event.destinationSiteId}`;
    case "perform-metastasis-reset":
      return "perform metastasis reset";
    case "allocate-organ-site":
      return `allocate organ site ${event.siteId}`;
    case "select-colonization-program":
      return `select ${event.programId} at ${event.siteId}`;
    case "purchase-lineage-boon":
      return `purchase lineage boon ${event.boonId}`;
    case "perform-host-transfer":
      return "perform host transfer";
    case "select-host-card":
      return `select host card ${event.cardId}`;
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
    case "spend-telomerase":
      return event.target === "refill-region"
        ? `spend ${event.charges} telomerase charges on ${event.regionId}`
        : `bank ${event.charges} telomerase charges into reserve floor`;
    case "set-vessel-link":
      return `set vessel link ${event.regionId} ${event.linked}`;
    case "commit-route":
      return `commit route ${event.routeId} with ${event.cells} cells`;
    case "set-atp-budget":
      return `set ATP budget ${event.sink} to ${event.amount}`;
    case "convert-substrate":
      return `convert substrate ${event.amount.mantissa}e${event.amount.exponent}`;
    case "set-region-mask":
      return `set region mask ${event.regionId} ${event.masked}`;
    case "activate-inflammation":
      return `activate inflammation ${event.regionId}`;
    case "select-mutation":
      return `select mutation ${event.mutationId} from ${event.offerId}`;
    case "assign-region-phenotype":
      return `assign ${event.regionId} to ${event.phenotype}`;
    case "reconfigure-hallmark-program":
      return `reconfigure ${event.hallmarkId} with ${event.optionId}`;
    case "install-microbiome-composition":
      return `install ${event.compositionId} from ${event.offerId}`;
    case "resolve-senescence-decision":
      return `resolve senescence ${event.decisionId} with ${event.action}`;
    case "perform-immortalization":
      return `immortalize through ${event.cryobankProgramId}`;
    case "purchase-passage-upgrade":
      return `purchase passage upgrade ${event.upgradeId}`;
    case "select-cryobank-program":
      return `select cryobank program ${event.cryobankProgramId}`;
    case "establish-dissemination-node":
      return `establish dissemination node ${event.nodeId}`;
    case "commit-dissemination-edge":
      return `commit dissemination edge ${event.edgeId}`;
    case "choose-dissemination-mandate":
      return `choose dissemination mandate ${event.mandateId}`;
    case "stabilize-network-node":
      return `stabilize network node ${event.nodeId}`;
    case "collect-transmission-pressure":
      return `collect transmission pressure from ${event.nodeId}`;
    case "queue-assay-producer-action":
      return `queue assay producer ${event.producerId}`;
    case "select-containment-node":
      return `contain node ${event.nodeId}`;
    case "reach-soft-ending":
      return "reach soft ending";
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}

function runHallmarkEffectSlice(): GameState {
  return HALLMARK_EFFECT_PROBE.apply({
    state: createInitialGameState(),
    operation: {
      type: "set-signaling-allocation",
      hallmark: "proliferative_signaling",
      allocation: "burst",
    },
    appliedAtMs: 1,
  });
}

function runStageTransitionSlice(): GameState {
  let state = createInitialGameState();
  for (let index = 0; index < 10; index += 1)
    state = recordEvent(state, { type: "click-divide", atMs: index });
  const event: AdvanceStageEvent = {
    type: "advance-stage",
    fromStageId: state.currentStage,
    toStageId: stageId("microcolony"),
    atMs: 2,
  };
  return recordEvent(state, event);
}

function runPrestigeAvailabilityBoundarySlice(): string {
  const event: PerformMetastasisResetEvent = {
    type: "perform-metastasis-reset",
    siteId: organSiteId("liver"),
    sourceEventSequence: 0,
    atMs: 3,
  };
  try {
    recordEvent(createInitialGameState(), event);
  } catch (error) {
    if (error instanceof Error && error.message === "Metastasis reset is unavailable.")
      return "unavailable-before-L1";
    throw error;
  }
  throw new Error("Metastasis reset unexpectedly succeeded before L1.");
}

function runOfflineAccrualSlice(): GameState {
  const event: ApplyOfflineAccrualEvent = {
    type: "apply-offline-accrual",
    elapsedMs: 60_000,
    atMs: 0,
    resourceSnapshot: {
      cells: createInitialGameState().cells,
      substrate: createInitialGameState().substrate,
      atp: createInitialGameState().atp,
    },
    newlyObservedProgression: [],
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
