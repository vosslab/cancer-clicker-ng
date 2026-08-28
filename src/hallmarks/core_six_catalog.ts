import { hallmarkId, stageId } from "../brands.js";
import { STAGE_IDS } from "../state/catalog.js";
import { stageDefinition } from "../stages/catalog.js";
import type { HallmarkId, StageId } from "../types/ids.js";
import type {
  CoreSixHallmarkDefinition,
  CoreSixHallmarkDefinitionFor,
  CoreSixHallmarkKey,
  CoreSixMechanicClass,
} from "./core_six_types.js";

export const CORE_SIX_HALLMARK_KEYS = [
  "proliferative_signaling",
  "growth_suppressor_evasion",
  "cell_death_resistance",
  "replicative_immortality",
  "angiogenesis",
  "invasion_metastasis",
] as const satisfies readonly CoreSixHallmarkKey[];

type CoreSixDefinitionByKey = Readonly<{
  [Key in CoreSixHallmarkKey]: CoreSixHallmarkDefinitionFor<Key>;
}>;

const CORE_SIX_BY_KEY = {
  proliferative_signaling: {
    key: "proliferative_signaling",
    id: hallmarkId("proliferative_signaling"),
    displayName: "Sustaining proliferative signaling",
    mechanicClass: "division-allocation",
    handlerId: "apply-division-allocation",
    operationType: "set-signaling-allocation",
    unlock: { stageId: stageId("transformed_cell"), capability: "manual-burst" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  growth_suppressor_evasion: {
    key: "growth_suppressor_evasion",
    id: hallmarkId("growth_suppressor_evasion"),
    displayName: "Evading growth suppressors",
    mechanicClass: "checkpoint-routing",
    handlerId: "apply-checkpoint-routing",
    operationType: "select-checkpoint",
    unlock: { stageId: stageId("microcolony"), capability: "producer-checkpoint" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  cell_death_resistance: {
    key: "cell_death_resistance",
    id: hallmarkId("cell_death_resistance"),
    displayName: "Resisting cell death",
    mechanicClass: "damage-triage",
    handlerId: "apply-damage-triage",
    operationType: "resolve-triage",
    unlock: { stageId: stageId("avascular_lesion"), capability: "atp-budget" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  replicative_immortality: {
    key: "replicative_immortality",
    id: hallmarkId("replicative_immortality"),
    displayName: "Enabling replicative immortality",
    mechanicClass: "replicative-budget",
    handlerId: "apply-replicative-budget",
    operationType: "spend-telomerase",
    unlock: { stageId: stageId("hypoxic_lesion"), capability: "regional-perfusion" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  angiogenesis: {
    key: "angiogenesis",
    id: hallmarkId("angiogenesis"),
    displayName: "Inducing angiogenesis",
    mechanicClass: "perfusion-layout",
    handlerId: "apply-perfusion-layout",
    operationType: "set-vessel-link",
    unlock: { stageId: stageId("hypoxic_lesion"), capability: "regional-perfusion" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  invasion_metastasis: {
    key: "invasion_metastasis",
    id: hallmarkId("invasion_metastasis"),
    displayName: "Activating invasion and metastasis",
    mechanicClass: "route-commitment",
    handlerId: "apply-route-commitment",
    operationType: "commit-route",
    unlock: { stageId: stageId("invasive_carcinoma"), capability: "route-commitment" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
} as const satisfies CoreSixDefinitionByKey;

export const CORE_SIX_HALLMARK_CATALOG: readonly CoreSixHallmarkDefinition[] =
  CORE_SIX_HALLMARK_KEYS.map((key) => CORE_SIX_BY_KEY[key]);

const CORE_SIX_STAGE_ORDER: readonly StageId[] = STAGE_IDS.map(stageId);

function stageIndex(stage: StageId): number {
  const index = CORE_SIX_STAGE_ORDER.findIndex((candidate) => candidate === stage);
  if (index < 0) throw new Error("Core-six catalog references an unknown stage.");
  return index;
}

/** Looks up one core-six definition only after the closed key has been established. */
export function coreSixHallmarkDefinition(key: CoreSixHallmarkKey): CoreSixHallmarkDefinition {
  return CORE_SIX_BY_KEY[key];
}

/** Finds a core-six row from a branded hallmark ID without widening the closed catalog. */
export function findCoreSixHallmark(id: HallmarkId): CoreSixHallmarkDefinition | undefined {
  return CORE_SIX_HALLMARK_CATALOG.find((definition) => definition.id === id);
}

/** True when the current ladder position has reached a branch's declared stage capability. */
export function hasReachedCoreSixUnlock(stage: StageId, key: CoreSixHallmarkKey): boolean {
  const currentIndex = stageIndex(stage);
  const unlockIndex = stageIndex(coreSixHallmarkDefinition(key).unlock.stageId);
  return currentIndex >= unlockIndex;
}

/** Reject catalog drift before handlers, reducer, or UI can consume an incoherent row. */
export function assertCoreSixCatalog(
  definitions: readonly CoreSixHallmarkDefinition[] = CORE_SIX_HALLMARK_CATALOG,
): void {
  if (definitions.length !== CORE_SIX_HALLMARK_KEYS.length) {
    throw new Error("Core-six catalog must contain exactly six definitions.");
  }
  const keys = new Set(definitions.map((definition) => definition.key));
  const classes = new Set<CoreSixMechanicClass>(
    definitions.map((definition) => definition.mechanicClass),
  );
  const handlers = new Set(definitions.map((definition) => definition.handlerId));
  const operations = new Set(definitions.map((definition) => definition.operationType));
  if (keys.size !== definitions.length || classes.size !== definitions.length) {
    throw new Error("Core-six catalog must have unique identities and mechanic classes.");
  }
  if (handlers.size !== definitions.length || operations.size !== definitions.length) {
    throw new Error("Core-six catalog must have one handler and operation per branch.");
  }
  for (const key of CORE_SIX_HALLMARK_KEYS) {
    if (!keys.has(key)) throw new Error("Core-six catalog is missing a canonical branch.");
  }
  for (const definition of definitions) {
    const stageCapability = stageDefinition(definition.unlock.stageId).operationalChange.actionId;
    if (stageCapability !== definition.unlock.capability) {
      throw new Error("Core-six catalog capability must match its stage progression unlock stage.");
    }
    if (
      definition.purchase.initialLevel !== 1 ||
      definition.purchase.maximumLevel < 1 ||
      definition.ownership.requiredLevel !== 1
    ) {
      throw new Error("Core-six purchase levels must establish first ownership.");
    }
  }
}

assertCoreSixCatalog();
