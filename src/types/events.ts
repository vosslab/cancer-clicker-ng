import type {
  EventId,
  HallmarkId,
  ColonizationProgramId,
  HostCardId,
  HostDraftId,
  HostTraitId,
  LateProgramOptionId,
  MicrobiomeCompositionId,
  MicrobiomeOfferId,
  MutationId,
  OrganSiteId,
  OfferId,
  ProducerId,
  RegionId,
  RouteId,
  StageId,
  CryobankProgramId,
  PassageUpgradeId,
  DisseminationMandateId,
  NetworkEdgeId,
  NetworkFrontierId,
  NetworkNodeId,
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

export type PurchaseProducerEvent =
  | Readonly<{
      type: "purchase-producer";
      producerId: ProducerId;
      quantity: PurchaseQuantity;
      execution: "manual";
      atMs: number;
    }>
  | Readonly<{
      type: "purchase-producer";
      producerId: ProducerId;
      quantity: 1;
      execution: "assay";
      queuedAtEventSequence: number;
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

export type ResolveTransitEvent = Readonly<{
  type: "resolve-transit";
  transitEventId: EventId;
  destinationSiteId: OrganSiteId;
  atMs: number;
}>;
export type PerformMetastasisResetEvent = Readonly<{
  type: "perform-metastasis-reset";
  siteId: OrganSiteId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type AllocateOrganSiteEvent = Readonly<{
  type: "allocate-organ-site";
  siteId: OrganSiteId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type SelectColonizationProgramEvent = Readonly<{
  type: "select-colonization-program";
  siteId: OrganSiteId;
  programId: ColonizationProgramId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type PurchaseLineageBoonEvent =
  | Readonly<{
      type: "purchase-lineage-boon";
      boonId: "extra_card_reveal" | "protected_route_affinity";
      sourceEventSequence: number;
      atMs: number;
    }>
  | Readonly<{
      type: "purchase-lineage-boon";
      boonId: "reduced_trait_liability";
      targetTraitId: HostTraitId;
      sourceEventSequence: number;
      atMs: number;
    }>;
export type PerformHostTransferEvent = Readonly<{
  type: "perform-host-transfer";
  sourceEventSequence: number;
  atMs: number;
}>;
export type SelectHostCardEvent = Readonly<{
  type: "select-host-card";
  draftId: HostDraftId;
  cardId: HostCardId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type PerformImmortalizationEvent = Readonly<{
  type: "perform-immortalization";
  cryobankProgramId: CryobankProgramId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type PurchasePassageUpgradeEvent = Readonly<{
  type: "purchase-passage-upgrade";
  upgradeId: PassageUpgradeId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type SelectCryobankProgramEvent = Readonly<{
  type: "select-cryobank-program";
  cryobankProgramId: CryobankProgramId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type EstablishDisseminationNodeEvent = Readonly<{
  type: "establish-dissemination-node";
  nodeId: NetworkNodeId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type CommitDisseminationEdgeEvent = Readonly<{
  type: "commit-dissemination-edge";
  edgeId: NetworkEdgeId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type ChooseDisseminationMandateEvent = Readonly<{
  type: "choose-dissemination-mandate";
  frontierId: NetworkFrontierId;
  mandateId: DisseminationMandateId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type StabilizeNetworkNodeEvent = Readonly<{
  type: "stabilize-network-node";
  nodeId: NetworkNodeId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type CollectTransmissionPressureEvent = Readonly<{
  type: "collect-transmission-pressure";
  nodeId: NetworkNodeId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type QueueAssayProducerActionEvent = Readonly<{
  type: "queue-assay-producer-action";
  producerId: ProducerId;
  sourceEventSequence: number;
  atMs: number;
}>;
export type SelectContainmentNodeEvent = Readonly<{
  type: "select-containment-node";
  nodeId: NetworkNodeId;
  sourceEventSequence: number;
  atMs: number;
}>;

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
export type ReachSoftEndingEvent = Readonly<{
  type: "reach-soft-ending";
  sourceEventSequence: number;
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
  | ResolveTransitEvent
  | PerformMetastasisResetEvent
  | AllocateOrganSiteEvent
  | SelectColonizationProgramEvent
  | PurchaseLineageBoonEvent
  | PerformHostTransferEvent
  | SelectHostCardEvent
  | PerformImmortalizationEvent
  | PurchasePassageUpgradeEvent
  | SelectCryobankProgramEvent
  | EstablishDisseminationNodeEvent
  | CommitDisseminationEdgeEvent
  | ChooseDisseminationMandateEvent
  | StabilizeNetworkNodeEvent
  | CollectTransmissionPressureEvent
  | QueueAssayProducerActionEvent
  | SelectContainmentNodeEvent
  | ApplyOfflineAccrualEvent
  | ReachSoftEndingEvent
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
  "queue-assay-producer-action",
  "select-containment-node",
  "purchase-hallmark",
  "advance-stage",
  "resolve-transit",
  "perform-metastasis-reset",
  "allocate-organ-site",
  "select-colonization-program",
  "purchase-lineage-boon",
  "perform-host-transfer",
  "select-host-card",
  "perform-immortalization",
  "purchase-passage-upgrade",
  "select-cryobank-program",
  "establish-dissemination-node",
  "commit-dissemination-edge",
  "choose-dissemination-mandate",
  "stabilize-network-node",
  "collect-transmission-pressure",
  "apply-offline-accrual",
  "reach-soft-ending",
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
