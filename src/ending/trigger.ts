import { bigNum } from "../brands.js";
import { compare } from "../bignum/bignum.js";
import type { BigNum } from "../types/bignum.js";

/**
 * A modeled 5.0e10 m3 Chicago high-rise reference divided by 2.0e-15 m3 per cell.
 * This is a catalog scale reference, not a measurement claim about every building.
 */
export const CHICAGO_SKYSCRAPER_CELL_EQUIVALENT: BigNum = bigNum(2.5, 25);

export type SoftEndingEligibility =
  | Readonly<{ available: true }>
  | Readonly<{
      available: false;
      reason: "stage" | "network-tier" | "cell-scale" | "already-reached";
    }>;

/** Read-only state projection used to determine ending availability. */
export type SoftEndingTriggerState = Readonly<{
  cells: BigNum;
  currentStage: string;
  network: Readonly<{ globalTier: number }>;
  ending: Readonly<{ phase: "unreached" | "reached" }>;
}>;

/** Returns renderer-safe availability without making any state transition. */
export function softEndingEligibility(state: SoftEndingTriggerState): SoftEndingEligibility {
  if (state.ending.phase !== "unreached") return { available: false, reason: "already-reached" };
  if (state.currentStage !== "global_lab_contamination")
    return { available: false, reason: "stage" };
  if (state.network.globalTier < 1) return { available: false, reason: "network-tier" };
  if (compare(state.cells, CHICAGO_SKYSCRAPER_CELL_EQUIVALENT) < 0)
    return { available: false, reason: "cell-scale" };
  return { available: true };
}
