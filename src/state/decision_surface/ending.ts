import { softEndingEligibility } from "../../ending/trigger.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, visibleAction } from "./builders.js";

/** The continuing soft-ending action appears only at its canonical eligibility boundary. */
export function buildEndingCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  return softEndingEligibility(state).available
    ? [
        visibleAction(
          "stage",
          { type: "reach-soft-ending", ...env },
          "Reach the soft ending and continue play.",
          ["ending"],
        ),
      ]
    : [];
}
