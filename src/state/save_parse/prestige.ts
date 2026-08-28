import type { GameState } from "../../types/state.js";
import { parseHostTransfer, parseMetastasis } from "./prestige_ending.js";
import { exactShape, parseLineageLedger, PRESTIGE_KEYS } from "./prestige_guards.js";

export { parseCulture } from "./prestige_culture.js";
export { parseNetwork } from "./prestige_network.js";

/**
 * Reconstruct persisted prestige state from exact plain records, catalog allowlists,
 * and coherent state-machine relations.
 */
export function parsePrestige(
  value: unknown,
  state: Pick<GameState, "activeTimeMs" | "eventSequence" | "currentStage">,
): Pick<GameState, "lineageLedger" | "metastasis" | "hostTransfer"> | undefined {
  if (!exactShape(value, PRESTIGE_KEYS)) return undefined;
  const lineageLedger = parseLineageLedger(value.lineageLedger, state.activeTimeMs);
  if (lineageLedger === undefined) return undefined;
  const metastasis = parseMetastasis(
    value.metastasis,
    state.currentStage,
    lineageLedger.completedL1ResetCount,
  );
  if (metastasis === undefined) return undefined;
  const hostTransfer = parseHostTransfer(value.hostTransfer, lineageLedger, state.eventSequence);
  if (hostTransfer === undefined) return undefined;
  if (
    hostTransfer.purchasedBoons.some((purchase) =>
      lineageLedger.lineageBoonApplications.some(
        (application) => application.boonId === purchase.boonId,
      ),
    )
  )
    return undefined;
  for (const purchase of hostTransfer.purchasedBoons) {
    if (purchase.kind !== "targeted-active-host") continue;
    const active = hostTransfer.activeHost;
    if (
      active === null ||
      purchase.hostRunId !== active.hostRunId ||
      purchase.cardId !== active.card.id ||
      ![active.card.immuneRegime, active.card.tissueEcology, active.card.hostHorizon].includes(
        purchase.targetTraitId,
      )
    )
      return undefined;
  }
  for (const application of lineageLedger.lineageBoonApplications) {
    if (application.kind !== "targeted-active-host") continue;
    if (application.hostRunId !== lineageLedger.currentHostRunId) continue;
    const active = hostTransfer.activeHost;
    const draft = hostTransfer.pendingDraft;
    if (
      active === null ||
      draft === null ||
      draft.available ||
      draft.consumedCardId !== active.card.id ||
      application.draftId !== draft.id ||
      application.hostRunId !== active.hostRunId ||
      application.cardId !== active.card.id ||
      ![active.card.immuneRegime, active.card.tissueEcology, active.card.hostHorizon].includes(
        application.targetTraitId,
      )
    )
      return undefined;
  }
  return { lineageLedger, metastasis, hostTransfer };
}
