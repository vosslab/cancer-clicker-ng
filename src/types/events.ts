import type {
  EventId,
  HallmarkId,
  LateProgramOptionId,
  MicrobiomeCompositionId,
  MicrobiomeOfferId,
  MutationId,
  OfferId,
  ProducerId,
  RegionId,
  RouteId,
  StageId,
} from "./ids.js";
import type {
  CheckpointId,
  NumberFormat,
  SignalingAllocation,
  TriageAction,
  Phenotype,
  PendingProgression,
  TrackedResourceSnapshot,
} from "./state.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type { CanonicalBigNumDto } from "../hallmarks/extended_hallmark_types.js";
import type { AtpSinkId } from "../hallmarks/extended_hallmark_types.js";

export type ClickDivideEvent = Readonly<{
  type: "click-divide";
  atMs: number;
}>;

export type PurchaseProducerEvent = Readonly<{
  type: "purchase-producer";
  producerId: ProducerId;
  quantity: PurchaseQuantity;
  atMs: number;
}>;

export type PurchaseHallmarkEvent = Readonly<{
  type: "purchase-hallmark";
  hallmarkId: HallmarkId;
  atMs: number;
}>;

export type AdvanceStageEvent = Readonly<{
  type: "advance-stage";
  fromStageId: StageId;
  toStageId: StageId;
  atMs: number;
}>;

export type PerformPrestigeResetEvent = Readonly<{ type: "perform-prestige-reset"; atMs: number }>;

export type ApplyOfflineAccrualEvent = Readonly<{
  type: "apply-offline-accrual";
  elapsedMs: number;
  atMs: number;
  resourceSnapshot: TrackedResourceSnapshot;
  newlyObservedProgression: readonly PendingProgression[];
}>;

export type SetNumberFormatEvent = Readonly<{
  type: "set-number-format";
  numberFormat: NumberFormat;
  atMs: number;
}>;

export type SetSignalingAllocationEvent = Readonly<{
  type: "set-signaling-allocation";
  allocation: SignalingAllocation;
  atMs: number;
}>;
export type SelectCheckpointEvent = Readonly<{
  type: "select-checkpoint";
  checkpoint: CheckpointId;
  atMs: number;
}>;
export type ResolveTriageEvent = Readonly<{
  type: "resolve-triage";
  eventId: EventId;
  action: TriageAction;
  atMs: number;
}>;
export type SpendTelomeraseEvent =
  | Readonly<{
      type: "spend-telomerase";
      target: "refill-region";
      regionId: RegionId;
      charges: number;
      atMs: number;
    }>
  | Readonly<{
      type: "spend-telomerase";
      target: "bank-reserve-floor";
      charges: number;
      atMs: number;
    }>;
export type SetVesselLinkEvent = Readonly<{
  type: "set-vessel-link";
  regionId: RegionId;
  linked: boolean;
  atMs: number;
}>;
export type CommitRouteEvent = Readonly<{
  type: "commit-route";
  routeId: RouteId;
  cells: number;
  atMs: number;
}>;
export type SetAtpBudgetEvent = Readonly<{
  type: "set-atp-budget";
  sink: AtpSinkId;
  amount: number;
  atMs: number;
}>;
export type ConvertSubstrateEvent = Readonly<{
  type: "convert-substrate";
  amount: CanonicalBigNumDto;
  atMs: number;
}>;
export type SetRegionMaskEvent = Readonly<{
  type: "set-region-mask";
  regionId: RegionId;
  masked: boolean;
  atMs: number;
}>;
export type ActivateInflammationEvent = Readonly<{
  type: "activate-inflammation";
  regionId: RegionId;
  atMs: number;
}>;
export type SelectMutationEvent = Readonly<{
  type: "select-mutation";
  offerId: OfferId;
  mutationId: MutationId;
  atMs: number;
}>;
export type AssignRegionPhenotypeEvent = Readonly<{
  type: "assign-region-phenotype";
  regionId: RegionId;
  phenotype: Phenotype;
  atMs: number;
}>;
export type ReconfigureHallmarkProgramEvent = Readonly<{
  type: "reconfigure-hallmark-program";
  hallmarkId: HallmarkId;
  optionId: LateProgramOptionId;
  atMs: number;
}>;
export type InstallMicrobiomeCompositionEvent = Readonly<{
  type: "install-microbiome-composition";
  offerId: MicrobiomeOfferId;
  compositionId: MicrobiomeCompositionId;
  atMs: number;
}>;
export type ResolveSenescenceDecisionEvent = Readonly<{
  type: "resolve-senescence-decision";
  decisionId: EventId;
  action: "keep" | "clear";
  atMs: number;
}>;

/** Every state mutation enters through this closed, discriminated union. */
export type GameEvent =
  | ClickDivideEvent
  | PurchaseProducerEvent
  | PurchaseHallmarkEvent
  | AdvanceStageEvent
  | PerformPrestigeResetEvent
  | ApplyOfflineAccrualEvent
  | SetNumberFormatEvent
  | SetSignalingAllocationEvent
  | SelectCheckpointEvent
  | ResolveTriageEvent
  | SpendTelomeraseEvent
  | SetVesselLinkEvent
  | CommitRouteEvent
  | SetAtpBudgetEvent
  | ConvertSubstrateEvent
  | SetRegionMaskEvent
  | ActivateInflammationEvent
  | SelectMutationEvent
  | AssignRegionPhenotypeEvent
  | ReconfigureHallmarkProgramEvent
  | InstallMicrobiomeCompositionEvent
  | ResolveSenescenceDecisionEvent;

/** A canonical runtime inventory: additions to GameEvent must update reducer conformance tests. */
export const EVENT_TYPES = [
  "click-divide",
  "purchase-producer",
  "purchase-hallmark",
  "advance-stage",
  "perform-prestige-reset",
  "apply-offline-accrual",
  "set-number-format",
  "set-signaling-allocation",
  "select-checkpoint",
  "resolve-triage",
  "spend-telomerase",
  "set-vessel-link",
  "commit-route",
  "set-atp-budget",
  "convert-substrate",
  "set-region-mask",
  "activate-inflammation",
  "select-mutation",
  "assign-region-phenotype",
  "reconfigure-hallmark-program",
  "install-microbiome-composition",
  "resolve-senescence-decision",
] as const satisfies readonly GameEvent["type"][];
type EventTypeRegistryIsExhaustive =
  Exclude<GameEvent["type"], (typeof EVENT_TYPES)[number]> extends never ? true : never;
export const EVENT_TYPE_REGISTRY_IS_EXHAUSTIVE: EventTypeRegistryIsExhaustive = true;
