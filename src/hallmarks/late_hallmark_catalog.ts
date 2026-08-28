import { hallmarkId, stageId } from "../brands.js";
import { stageDefinition } from "../stages/catalog.js";
import type { HallmarkId, StageId } from "../types/ids.js";
import type {
  LateHallmarkDefinition,
  LateHallmarkKey,
  LateHallmarkMechanicClass,
} from "./late_hallmark_types.js";

export const LATE_HALLMARK_KEYS = [
  "phenotypic_plasticity",
  "epigenetic_reprogramming",
  "polymorphic_microbiomes",
  "senescent_cells",
] as const satisfies readonly LateHallmarkKey[];

type LateHallmarkByKey = Readonly<Record<LateHallmarkKey, LateHallmarkDefinition>>;

const LATE_HALLMARK_BY_KEY = Object.freeze({
  phenotypic_plasticity: Object.freeze({
    key: "phenotypic_plasticity",
    id: hallmarkId("phenotypic_plasticity"),
    displayName: "Unlocking phenotypic plasticity",
    mechanicClass: "phenotype-switching",
    activation: Object.freeze({
      stageId: stageId("metastatic_burden"),
      capability: "phenotype-allocation",
      prestigeId: "L3",
    }),
    morphologyContributorId: "hallmark:phenotypic_plasticity",
    purchase: Object.freeze({ eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 }),
  }),
  epigenetic_reprogramming: Object.freeze({
    key: "epigenetic_reprogramming",
    id: hallmarkId("epigenetic_reprogramming"),
    displayName: "Nonmutational epigenetic reprogramming",
    mechanicClass: "program-editing",
    activation: Object.freeze({
      stageId: stageId("immortalized_culture"),
      capability: "culture-program-space",
      prestigeId: "L3",
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
    purchase: Object.freeze({ eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 }),
  }),
  polymorphic_microbiomes: Object.freeze({
    key: "polymorphic_microbiomes",
    id: hallmarkId("polymorphic_microbiomes"),
    displayName: "Polymorphic microbiomes",
    mechanicClass: "community-composition",
    activation: Object.freeze({
      stageId: stageId("global_lab_contamination"),
      capability: "contamination-node-community",
      prestigeId: null,
    }),
    morphologyContributorId: "hallmark:polymorphic_microbiomes",
    purchase: Object.freeze({ eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 }),
  }),
  senescent_cells: Object.freeze({
    key: "senescent_cells",
    id: hallmarkId("senescent_cells"),
    displayName: "Senescent cells",
    mechanicClass: "senescence-management",
    activation: Object.freeze({
      stageId: stageId("immortalized_culture"),
      capability: "culture-program-space",
      prestigeId: "L3",
    }),
    morphologyContributorId: "hallmark:senescent_cells",
    purchase: Object.freeze({ eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 }),
  }),
} satisfies LateHallmarkByKey);

export const LATE_HALLMARK_CATALOG: readonly LateHallmarkDefinition[] = Object.freeze(
  LATE_HALLMARK_KEYS.map((key) => LATE_HALLMARK_BY_KEY[key]),
);

export function lateHallmarkDefinition(key: LateHallmarkKey): LateHallmarkDefinition {
  return LATE_HALLMARK_BY_KEY[key];
}

export function findLateHallmark(id: HallmarkId): LateHallmarkDefinition | undefined {
  return LATE_HALLMARK_CATALOG.find((definition) => definition.id === id);
}

export function hasReachedLateHallmarkActivation(stage: StageId, key: LateHallmarkKey): boolean {
  const activationStage = lateHallmarkDefinition(key).activation.stageId;
  const currentIndex = stageIndex(stage);
  const activationIndex = stageIndex(activationStage);
  return currentIndex >= activationIndex;
}

function stageIndex(id: StageId): number {
  const canonicalIndex = [
    "transformed_cell",
    "microcolony",
    "avascular_lesion",
    "hypoxic_lesion",
    "angiogenic_primary",
    "invasive_carcinoma",
    "intravasation",
    "micrometastatic_seeding",
    "metastatic_burden",
    "host_collapse",
    "immortalized_culture",
    "global_lab_contamination",
  ].indexOf(id);
  if (canonicalIndex < 0) throw new Error("Late-hallmark catalog references an unknown stage.");
  return canonicalIndex;
}

export function assertLateHallmarkCatalog(
  definitions: readonly LateHallmarkDefinition[] = LATE_HALLMARK_CATALOG,
): void {
  if (definitions.length !== LATE_HALLMARK_KEYS.length)
    throw new Error("Late-hallmark catalog must contain exactly four definitions.");
  const keys = new Set(definitions.map((definition) => definition.key));
  const ids = new Set(definitions.map((definition) => definition.id));
  const mechanics = new Set<LateHallmarkMechanicClass>(
    definitions.map((definition) => definition.mechanicClass),
  );
  if (
    keys.size !== definitions.length ||
    ids.size !== definitions.length ||
    mechanics.size !== definitions.length
  )
    throw new Error(
      "Late-hallmark catalog must have unique branch identities and mechanic classes.",
    );
  for (const key of LATE_HALLMARK_KEYS) {
    if (!keys.has(key)) throw new Error("Late-hallmark catalog is missing a canonical branch.");
  }
  for (const definition of definitions) {
    const actionId = stageDefinition(definition.activation.stageId).operationalChange.actionId;
    if (actionId !== definition.activation.capability)
      throw new Error("Late-hallmark activation capability must match its declared stage.");
    if (definition.purchase.initialLevel !== 1 || definition.purchase.maximumLevel !== 1)
      throw new Error("Late-hallmark purchase must establish one owned branch level.");
  }
}

assertLateHallmarkCatalog();
