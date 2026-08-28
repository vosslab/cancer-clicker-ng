import { stageId } from "../brands.js";
import type { StageId } from "../types/ids.js";

/** The state catalog owns stable identities imported by later stage and hallmark modules. */
export const STAGE_IDS = [
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
] as const;

/**
 * The typed ladder is derived from the sole ordered stage catalog. Reducers use
 * it to prevent a persisted or replayed event from skipping known stages.
 */
const ORDERED_STAGE_IDS: readonly StageId[] = STAGE_IDS.map(stageId);

/** Returns the one canonical successor, or undefined for the terminal stage. */
export function nextStageId(currentStageId: StageId): StageId | undefined {
  const index = ORDERED_STAGE_IDS.indexOf(currentStageId);
  return index < 0 ? undefined : ORDERED_STAGE_IDS[index + 1];
}

/** True only for adjacent entries in the canonical ordered stage catalog. */
export function isImmediateStageTransition(fromStageId: StageId, toStageId: StageId): boolean {
  return nextStageId(fromStageId) === toStageId;
}

/** Resets restart an owned run and are the only durable non-adjacent stage records. */
export function isRecordedStageTransition(fromStageId: StageId, toStageId: StageId): boolean {
  return (
    isImmediateStageTransition(fromStageId, toStageId) ||
    (fromStageId === "host_collapse" && toStageId === "transformed_cell")
  );
}

export const HALLMARK_IDS = [
  "proliferative_signaling",
  "growth_suppressor_evasion",
  "cell_death_resistance",
  "replicative_immortality",
  "angiogenesis",
  "invasion_metastasis",
  "metabolic_deregulation",
  "immune_destruction_avoidance",
  "tumor_promoting_inflammation",
  "genome_instability_mutation",
  "phenotypic_plasticity",
  "epigenetic_reprogramming",
  "polymorphic_microbiomes",
  "senescent_cells",
] as const;

export const PRESTIGE_IDS = ["L1", "L2", "L3", "L4"] as const;

export function isStageId(value: string): boolean {
  return (STAGE_IDS as readonly string[]).includes(value);
}
export function isHallmarkId(value: string): boolean {
  return (HALLMARK_IDS as readonly string[]).includes(value);
}
export function isPrestigeId(value: string): boolean {
  return (PRESTIGE_IDS as readonly string[]).includes(value);
}
