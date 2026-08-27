import type {
  EventId,
  HallmarkId,
  MutationId,
  OfferId,
  ProducerId,
  ProgramOptionId,
  RegionId,
  RouteId,
  StageId,
} from "./ids.js";
import type {
  CheckpointId,
  NumberFormat,
  Phenotype,
  SenescenceAction,
  SignalingAllocation,
  TriageAction,
} from "./state.js";

export type ClickDivideEvent = Readonly<{
  type: "click-divide";
  atMs: number;
}>;

export type PurchaseProducerEvent = Readonly<{
  type: "purchase-producer";
  producerId: ProducerId;
  quantity: number;
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
  sink: string;
  amount: number;
  atMs: number;
}>;
export type SelectMutationEvent = Readonly<{
  type: "select-mutation";
  offerId: OfferId;
  mutationId: MutationId;
  atMs: number;
}>;
export type SwitchPhenotypeEvent = Readonly<{
  type: "switch-phenotype";
  regionId: RegionId;
  phenotype: Phenotype;
  cooldownDeadlineMs: number;
  atMs: number;
}>;
export type EditProgramEvent = Readonly<{
  type: "edit-program";
  hallmarkId: HallmarkId;
  optionId: ProgramOptionId;
  cooldownDeadlineMs: number;
  atMs: number;
}>;
export type SelectMicrobiomeEvent = Readonly<{
  type: "select-microbiome";
  offerId: OfferId;
  atMs: number;
}>;
export type ResolveSenescenceEvent = Readonly<{
  type: "resolve-senescence";
  eventId: EventId;
  action: SenescenceAction;
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
  | SetVesselLinkEvent
  | CommitRouteEvent
  | SetAtpBudgetEvent
  | SelectMutationEvent
  | SwitchPhenotypeEvent
  | EditProgramEvent
  | SelectMicrobiomeEvent
  | ResolveSenescenceEvent;

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
  "set-vessel-link",
  "commit-route",
  "set-atp-budget",
  "select-mutation",
  "switch-phenotype",
  "edit-program",
  "select-microbiome",
  "resolve-senescence",
] as const satisfies readonly GameEvent["type"][];
type EventTypeRegistryIsExhaustive =
  Exclude<GameEvent["type"], (typeof EVENT_TYPES)[number]> extends never ? true : never;
export const EVENT_TYPE_REGISTRY_IS_EXHAUSTIVE: EventTypeRegistryIsExhaustive = true;
