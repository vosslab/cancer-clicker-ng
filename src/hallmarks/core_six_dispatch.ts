import {
  coreSixHallmarkDefinition,
  assertCoreSixCatalog,
  CORE_SIX_HALLMARK_CATALOG,
} from "./core_six_catalog.js";
import { CHECKPOINT_ROUTING_HANDLER } from "./handlers/checkpoint_routing.js";
import { DAMAGE_TRIAGE_HANDLER } from "./handlers/damage_triage.js";
import { divisionAllocationHandler } from "./handlers/division_allocation.js";
import { PERFUSION_LAYOUT_HANDLER } from "./handlers/perfusion_layout.js";
import { REPLICATIVE_BUDGET_HANDLER } from "./handlers/replicative_budget.js";
import { ROUTE_COMMITMENT_EFFECT } from "./handlers/route_commitment.js";
import type {
  CommitRouteOperation,
  CoreSixHandler,
  CoreSixHandlerId,
  CoreSixOperation,
  ResolveTriageOperation,
  SelectCheckpointOperation,
  SetSignalingAllocationOperation,
  SetVesselLinkOperation,
  SpendTelomeraseOperation,
} from "./core_six_types.js";
import type { GameState } from "../types/state.js";

type CoreSixHandlerRegistryEntry =
  | Readonly<{
      handlerId: "apply-division-allocation";
      hallmark: "proliferative_signaling";
      operationType: "set-signaling-allocation";
      handler: CoreSixHandler<SetSignalingAllocationOperation>;
    }>
  | Readonly<{
      handlerId: "apply-checkpoint-routing";
      hallmark: "growth_suppressor_evasion";
      operationType: "select-checkpoint";
      handler: CoreSixHandler<SelectCheckpointOperation>;
    }>
  | Readonly<{
      handlerId: "apply-damage-triage";
      hallmark: "cell_death_resistance";
      operationType: "resolve-triage";
      handler: CoreSixHandler<ResolveTriageOperation>;
    }>
  | Readonly<{
      handlerId: "apply-replicative-budget";
      hallmark: "replicative_immortality";
      operationType: "spend-telomerase";
      handler: CoreSixHandler<SpendTelomeraseOperation>;
    }>
  | Readonly<{
      handlerId: "apply-perfusion-layout";
      hallmark: "angiogenesis";
      operationType: "set-vessel-link";
      handler: CoreSixHandler<SetVesselLinkOperation>;
    }>
  | Readonly<{
      handlerId: "apply-route-commitment";
      hallmark: "invasion_metastasis";
      operationType: "commit-route";
      handler: CoreSixHandler<CommitRouteOperation>;
    }>;

export const CORE_SIX_HANDLER_REGISTRY: readonly CoreSixHandlerRegistryEntry[] = [
  {
    handlerId: "apply-division-allocation",
    hallmark: "proliferative_signaling",
    operationType: "set-signaling-allocation",
    handler: divisionAllocationHandler,
  },
  {
    handlerId: "apply-checkpoint-routing",
    hallmark: "growth_suppressor_evasion",
    operationType: "select-checkpoint",
    handler: CHECKPOINT_ROUTING_HANDLER,
  },
  {
    handlerId: "apply-damage-triage",
    hallmark: "cell_death_resistance",
    operationType: "resolve-triage",
    handler: DAMAGE_TRIAGE_HANDLER,
  },
  {
    handlerId: "apply-replicative-budget",
    hallmark: "replicative_immortality",
    operationType: "spend-telomerase",
    handler: REPLICATIVE_BUDGET_HANDLER,
  },
  {
    handlerId: "apply-perfusion-layout",
    hallmark: "angiogenesis",
    operationType: "set-vessel-link",
    handler: PERFUSION_LAYOUT_HANDLER,
  },
  {
    handlerId: "apply-route-commitment",
    hallmark: "invasion_metastasis",
    operationType: "commit-route",
    handler: ROUTE_COMMITMENT_EFFECT,
  },
];

function hasOneEntryForHandler(
  registry: readonly CoreSixHandlerRegistryEntry[],
  handlerId: CoreSixHandlerId,
): boolean {
  const matches = registry.filter((entry) => entry.handlerId === handlerId);
  return matches.length === 1;
}

/** Reject a registry that drifts from the closed catalog before any handler can run. */
export function assertCoreSixHandlerRegistry(
  registry: readonly CoreSixHandlerRegistryEntry[] = CORE_SIX_HANDLER_REGISTRY,
): void {
  assertCoreSixCatalog();
  if (registry.length !== CORE_SIX_HALLMARK_CATALOG.length) {
    throw new Error("Core-six handler registry must contain exactly six entries.");
  }
  for (const definition of CORE_SIX_HALLMARK_CATALOG) {
    if (!hasOneEntryForHandler(registry, definition.handlerId)) {
      throw new Error("Core-six handler registry must contain one handler per catalog row.");
    }
    const entry = registry.find((candidate) => candidate.handlerId === definition.handlerId);
    if (
      entry === undefined ||
      entry.hallmark !== definition.key ||
      entry.operationType !== definition.operationType ||
      entry.handler.hallmark !== definition.key
    ) {
      throw new Error("Core-six handler registry does not match its catalog identity.");
    }
  }
}

function findHandlerEntry(handlerId: CoreSixHandlerId): CoreSixHandlerRegistryEntry {
  const entry = CORE_SIX_HANDLER_REGISTRY.find((candidate) => candidate.handlerId === handlerId);
  if (entry === undefined) throw new Error("Core-six operation has no registered handler.");
  return entry;
}

function assertOperationMatchesCatalog(operation: CoreSixOperation): CoreSixHandlerRegistryEntry {
  const definition = coreSixHallmarkDefinition(operation.hallmark);
  if (definition.operationType !== operation.type) {
    throw new Error("Core-six operation type does not match its hallmark catalog row.");
  }
  const entry = findHandlerEntry(definition.handlerId);
  if (
    entry.hallmark !== operation.hallmark ||
    entry.operationType !== operation.type ||
    entry.handler.hallmark !== operation.hallmark
  ) {
    throw new Error("Core-six operation does not match its registered handler.");
  }
  return entry;
}

function applyRegisteredHandler(
  state: GameState,
  operation: CoreSixOperation,
  appliedAtMs: number,
  entry: CoreSixHandlerRegistryEntry,
): GameState {
  switch (entry.handlerId) {
    case "apply-division-allocation":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six division handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
    case "apply-checkpoint-routing":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six checkpoint handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
    case "apply-damage-triage":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six triage handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
    case "apply-replicative-budget":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six telomerase handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
    case "apply-perfusion-layout":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six perfusion handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
    case "apply-route-commitment":
      if (operation.type !== entry.operationType || operation.hallmark !== entry.hallmark) {
        throw new Error("Core-six route handler received a mismatched operation.");
      }
      return entry.handler.apply({ state, operation, appliedAtMs });
  }
}

/**
 * Applies one trusted parsed core-six operation through its catalog-authorized handler.
 * Event parsing, recording, and eventSequence advancement remain outside this module.
 */
export function applyCoreSixOperation(
  state: GameState,
  operation: CoreSixOperation,
  appliedAtMs: number,
): GameState {
  assertCoreSixHandlerRegistry();
  const entry = assertOperationMatchesCatalog(operation);
  const projection = applyRegisteredHandler(state, operation, appliedAtMs, entry);
  if (projection.eventSequence !== state.eventSequence) {
    throw new Error("Core-six handlers must preserve the reducer-owned event sequence.");
  }
  return projection;
}

assertCoreSixHandlerRegistry();
