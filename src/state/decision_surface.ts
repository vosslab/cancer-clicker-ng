import { parseRuntimeEvent } from "./event_parse.js";
import { recordEvent } from "./events.js";
import { dto } from "./decision_surface/builders.js";
import { buildCultureCandidates } from "./decision_surface/culture.js";
import type {
  VisibleAction,
  VisibleDecisionSurface,
  VisibleResource,
} from "./decision_surface/contracts.js";
import { buildEndingCandidates } from "./decision_surface/ending.js";
import {
  buildHallmarkAllocationCandidates,
  buildHallmarkFollowupCandidates,
  buildHallmarkPurchaseCandidates,
} from "./decision_surface/hallmarks.js";
import { buildNetworkCandidates } from "./decision_surface/network.js";
import { buildProducerCandidates } from "./decision_surface/producers.js";
import { buildRegionalActionCandidates } from "./decision_surface/regional_actions.js";
import { buildResetCandidates, buildStageCandidates } from "./decision_surface/resets.js";
import type { ReplayVisibleProgression } from "../types/replay.js";
import type { GameState } from "../types/state.js";

export type {
  VisibleAction,
  VisibleActionKind,
  VisibleDecisionSurface,
  VisibleResource,
} from "./decision_surface/contracts.js";

/**
 * Projects durable game state into the compact, presentation-independent
 * progression surface used by semantic replay and future headless consumers.
 */
export function projectVisibleProgression(state: GameState): ReplayVisibleProgression {
  return Object.freeze({
    currentStageId: state.currentStage,
    endingPhase: state.ending.phase,
    pendingProgression: Object.freeze(
      state.pendingProgression.map((item) => Object.freeze({ kind: item.kind, id: item.id })),
    ),
    earnedPrestigeIds: Object.freeze(
      state.prestigeAvailability
        .filter((availability) => availability.status === "earned")
        .map((availability) => availability.id),
    ),
    activeHost:
      state.hostTransfer.activeHost === null
        ? null
        : Object.freeze({
            hostRunId: state.hostTransfer.activeHost.hostRunId,
            cardId: state.hostTransfer.activeHost.card.id,
          }),
    pendingHostDraft:
      state.hostTransfer.pendingDraft === null
        ? null
        : Object.freeze({
            draftId: state.hostTransfer.pendingDraft.id,
            revealedCardIds: Object.freeze(state.hostTransfer.pendingDraft.revealedCardIds),
            consumedCardIds:
              state.hostTransfer.pendingDraft.consumedCardId === null
                ? Object.freeze([])
                : Object.freeze([state.hostTransfer.pendingDraft.consumedCardId]),
          }),
    culture: Object.freeze({
      passages: state.culture.passages,
      purchasedUpgrades: Object.freeze(
        state.culture.purchasedPassageUpgrades.map((upgrade) =>
          Object.freeze({ upgradeId: upgrade.upgradeId, rank: upgrade.rank }),
        ),
      ),
      cryobankProgramId: state.culture.cryobankProgram,
      queuedProducerId: state.culture.queuedProducerAction?.producerId ?? null,
    }),
    network: Object.freeze({
      globalTier: state.network.globalTier,
      transmissionPressure: Object.freeze({
        mantissa: state.network.transmissionPressure.mantissa,
        exponent: state.network.transmissionPressure.exponent,
      }),
      pendingFrontierId: state.network.pendingFrontier?.id ?? null,
      activeMandateId: state.network.activeCampaign?.mandate.id ?? null,
      activeCampaignId: state.network.activeCampaign?.mandate.campaignId ?? null,
      nodeStatuses: Object.freeze(
        state.network.nodes.map((node) => Object.freeze({ nodeId: node.id, status: node.status })),
      ),
      edgeStatuses: Object.freeze(
        state.network.edges.map((edge) => Object.freeze({ edgeId: edge.id, status: edge.status })),
      ),
    }),
  });
}

function validateCandidateInventory(
  state: GameState,
  actions: readonly VisibleAction[],
): readonly VisibleAction[] {
  const identities = new Set<string>();
  for (const action of actions) {
    if (identities.has(action.id)) {
      throw new Error(`Visible decision surface contains duplicate action ${action.id}.`);
    }
    identities.add(action.id);
    recordEvent(state, parseRuntimeEvent(action.event));
  }
  return actions;
}

/**
 * This sole composition boundary retains catalog and saved-choice ordering.
 * Individual builders own visibility while the event funnel remains authoritative for legality.
 */
function composeCandidates(state: GameState): readonly VisibleAction[] {
  return [
    ...buildProducerCandidates(state),
    ...buildHallmarkPurchaseCandidates(state),
    ...buildStageCandidates(state),
    ...buildHallmarkAllocationCandidates(state),
    ...buildRegionalActionCandidates(state),
    ...buildHallmarkFollowupCandidates(state),
    ...buildResetCandidates(state),
    ...buildCultureCandidates(state),
    ...buildNetworkCandidates(state),
    ...buildEndingCandidates(state),
  ];
}

/** Projects canonical balances and only parser-valid, reducer-accepted visible actions. */
export function projectVisibleDecisionSurface(state: GameState): VisibleDecisionSurface {
  const actions = validateCandidateInventory(state, composeCandidates(state));
  return Object.freeze({
    progression: projectVisibleProgression(state),
    displayedBalances: Object.freeze({
      cells: dto(state.cells),
      substrate: dto(state.substrate),
      atp: dto(state.atp),
      passages: state.culture.passages,
      ...(state.network.globalTier > 0
        ? { pressure: dto(state.network.transmissionPressure) }
        : {}),
    } satisfies Partial<Record<VisibleResource, ReturnType<typeof dto> | number>>),
    actions: Object.freeze(actions),
  });
}
