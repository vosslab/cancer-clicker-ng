import type { EventId, HallmarkId, RegionId, RouteId, StageId } from "../types/ids.js";
import type { CheckpointId, GameState, SignalingAllocation, TriageAction } from "../types/state.js";
import type { StageActionId } from "../stages/stage_types.js";

/** The six 2000 branches are a closed M10 subset of the canonical 14-branch registry. */
export type CoreSixHallmarkKey =
  | "proliferative_signaling"
  | "growth_suppressor_evasion"
  | "cell_death_resistance"
  | "replicative_immortality"
  | "angiogenesis"
  | "invasion_metastasis";

/** Each mechanic changes a different player operation; no core-six class is a rate multiplier. */
export type CoreSixMechanicClass =
  | "division-allocation"
  | "checkpoint-routing"
  | "damage-triage"
  | "replicative-budget"
  | "perfusion-layout"
  | "route-commitment";

export type CoreSixHandlerId =
  | "apply-division-allocation"
  | "apply-checkpoint-routing"
  | "apply-damage-triage"
  | "apply-replicative-budget"
  | "apply-perfusion-layout"
  | "apply-route-commitment";

export type SetSignalingAllocationOperation = Readonly<{
  type: "set-signaling-allocation";
  hallmark: "proliferative_signaling";
  allocation: SignalingAllocation;
}>;

export type SelectCheckpointOperation = Readonly<{
  type: "select-checkpoint";
  hallmark: "growth_suppressor_evasion";
  checkpoint: CheckpointId;
}>;

export type ResolveTriageOperation = Readonly<{
  type: "resolve-triage";
  hallmark: "cell_death_resistance";
  eventId: EventId;
  action: TriageAction;
}>;

/** D3 maps the announced spend-telomerase event into this parsed domain operation. */
export type SpendTelomeraseOperation =
  | Readonly<{
      type: "spend-telomerase";
      hallmark: "replicative_immortality";
      target: "refill-region";
      regionId: RegionId;
      charges: number;
    }>
  | Readonly<{
      type: "spend-telomerase";
      hallmark: "replicative_immortality";
      target: "bank-reserve-floor";
      charges: number;
    }>;

export type SetVesselLinkOperation = Readonly<{
  type: "set-vessel-link";
  hallmark: "angiogenesis";
  regionId: RegionId;
  linked: boolean;
}>;

export type CommitRouteOperation = Readonly<{
  type: "commit-route";
  hallmark: "invasion_metastasis";
  routeId: RouteId;
  cells: number;
}>;

/** Parsed operations are domain commands, not raw UI records or a second event reducer. */
export type CoreSixOperation =
  | SetSignalingAllocationOperation
  | SelectCheckpointOperation
  | ResolveTriageOperation
  | SpendTelomeraseOperation
  | SetVesselLinkOperation
  | CommitRouteOperation;

export type CoreSixOperationType = CoreSixOperation["type"];

/** This closed mapping makes a branch, mechanic class, handler, and operation inseparable. */
export type CoreSixBranchContract =
  | Readonly<{
      key: "proliferative_signaling";
      mechanicClass: "division-allocation";
      handlerId: "apply-division-allocation";
      operationType: "set-signaling-allocation";
    }>
  | Readonly<{
      key: "growth_suppressor_evasion";
      mechanicClass: "checkpoint-routing";
      handlerId: "apply-checkpoint-routing";
      operationType: "select-checkpoint";
    }>
  | Readonly<{
      key: "cell_death_resistance";
      mechanicClass: "damage-triage";
      handlerId: "apply-damage-triage";
      operationType: "resolve-triage";
    }>
  | Readonly<{
      key: "replicative_immortality";
      mechanicClass: "replicative-budget";
      handlerId: "apply-replicative-budget";
      operationType: "spend-telomerase";
    }>
  | Readonly<{
      key: "angiogenesis";
      mechanicClass: "perfusion-layout";
      handlerId: "apply-perfusion-layout";
      operationType: "set-vessel-link";
    }>
  | Readonly<{
      key: "invasion_metastasis";
      mechanicClass: "route-commitment";
      handlerId: "apply-route-commitment";
      operationType: "commit-route";
    }>;

export type CoreSixBranchContractFor<Key extends CoreSixHallmarkKey> = Extract<
  CoreSixBranchContract,
  Readonly<{ key: Key }>
>;

export type CoreSixUnlock = Readonly<{
  stageId: StageId;
  capability: StageActionId;
}>;

export type CoreSixPurchasePolicy = Readonly<{
  eventType: "purchase-hallmark";
  initialLevel: 1;
  maximumLevel: 1;
}>;

/** A branch becomes operational only after its catalog-backed first purchase. */
export type CoreSixOwnershipPolicy = Readonly<{
  requiredLevel: 1;
}>;

export type CoreSixHallmarkDefinition = Readonly<{
  key: CoreSixHallmarkKey;
  id: HallmarkId;
  displayName: string;
  mechanicClass: CoreSixMechanicClass;
  handlerId: CoreSixHandlerId;
  operationType: CoreSixOperationType;
  unlock: CoreSixUnlock;
  purchase: CoreSixPurchasePolicy;
  ownership: CoreSixOwnershipPolicy;
}>;

export type CoreSixHallmarkDefinitionFor<Key extends CoreSixHallmarkKey> = Readonly<
  Omit<CoreSixHallmarkDefinition, "key" | "mechanicClass" | "handlerId" | "operationType"> &
    CoreSixBranchContractFor<Key>
>;

type CoreSixOperationsMatchBranchContracts =
  Exclude<CoreSixOperation["hallmark"], CoreSixBranchContract["key"]> extends never
    ? Exclude<CoreSixBranchContract["key"], CoreSixOperation["hallmark"]> extends never
      ? true
      : never
    : never;

/** Compile-time coverage proof for the parsed operation and closed branch vocabularies. */
export const CORE_SIX_OPERATIONS_MATCH_BRANCH_CONTRACTS: CoreSixOperationsMatchBranchContracts = true;

/**
 * A handler receives trusted, parsed input and must return a complete next state or throw.
 * The sole reducer assigns event sequence and records events; handlers preserve eventSequence.
 */
export type CoreSixHandler<Operation extends CoreSixOperation = CoreSixOperation> = Readonly<{
  hallmark: Operation["hallmark"];
  apply: (
    context: Readonly<{ state: GameState; operation: Operation; appliedAtMs: number }>,
  ) => GameState;
}>;
