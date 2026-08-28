import { hallmarkId } from "../../brands.js";
import { compare, fromSafeInteger, subtract } from "../../bignum/bignum.js";
import {
  assertGeneratedMutationDraftOffer,
  mutationOfferContains,
  type MutationOfferSource,
} from "../mutation_offer_generator.js";
import {
  hasReachedExtendedHallmarkUnlock,
  extendedHallmarkDefinition,
} from "../extended_hallmark_catalog.js";
import { atpBudgetForSink } from "../atp_allocation.js";
import type {
  ExtendedHallmarkHandler,
  ExtendedHallmarkHandlerResult,
  SelectMutationOperation,
} from "../extended_hallmark_types.js";
import type { GameState } from "../../types/state.js";

const GENOME_INSTABILITY_KEY = "genome_instability_mutation";

function isSafeNatural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isOwned(state: GameState): boolean {
  const definition = extendedHallmarkDefinition(GENOME_INSTABILITY_KEY);
  return state.hallmarkLevels.some(
    (level) =>
      level.id === definition.id &&
      isSafeNatural(level.level) &&
      level.level >= definition.ownership.requiredLevel,
  );
}

function offerSource(
  state: GameState,
  offer: GameState["mutationOffers"][number],
): MutationOfferSource {
  if (
    offer.sourceSeed !== state.deterministicSeed ||
    offer.sourceSequence < 0 ||
    !Number.isSafeInteger(offer.sourceSequence) ||
    !Number.isSafeInteger(offer.threshold) ||
    offer.threshold < 1
  )
    throw new Error("Mutation selection offer provenance is invalid or stale.");
  const sourceBurden = offer.threshold - 1;
  return {
    deterministicSeed: offer.sourceSeed,
    eventSequence: offer.sourceSequence,
    currentStage: offer.sourceStage,
    genomeBurden: sourceBurden,
  };
}

function assertSelection(state: GameState, operation: SelectMutationOperation): void {
  if (operation.type !== "select-mutation" || operation.hallmark !== GENOME_INSTABILITY_KEY) {
    throw new Error("Mutation selection operation is not owned by genome instability.");
  }
  if (
    !isOwned(state) ||
    !hasReachedExtendedHallmarkUnlock(state.currentStage, GENOME_INSTABILITY_KEY)
  ) {
    throw new Error("Genome instability is not owned or unlocked.");
  }
  if (state.mutationOffers.length !== 1) throw new Error("Mutation selection requires one offer.");
  const offer = state.mutationOffers[0];
  if (!offer) throw new Error("Mutation selection requires one offer.");
  assertGeneratedMutationDraftOffer(offer, offerSource(state, offer));
  if (!mutationOfferContains(offer, operation.mutationId)) {
    throw new Error("Mutation selection is not in the saved offer.");
  }
  if (
    state.chosenMutations.includes(operation.mutationId) ||
    state.mutationLiabilities.includes(operation.mutationId)
  )
    throw new Error("Mutation selection has already been consumed.");
  if (
    atpBudgetForSink(state, "mutation-drafting") < 25 ||
    compare(state.atp, fromSafeInteger(1)) < 0
  ) {
    throw new Error("Mutation selection requires one funded ATP draft.");
  }
}

function nextBurden(state: GameState, operation: SelectMutationOperation): number {
  const offer = state.mutationOffers[0];
  if (!offer) throw new Error("Mutation selection requires one offer.");
  const selected = offer.cards.find((card) => card.id === operation.mutationId);
  if (!selected || !isSafeNatural(state.genomeBurden)) {
    throw new Error("Mutation selection burden is invalid.");
  }
  const burden = state.genomeBurden + selected.genomeBurden;
  if (!isSafeNatural(burden)) throw new Error("Mutation selection burden overflows.");
  return burden;
}

/**
 * Applies exactly one saved mutation choice. The reducer records the event sequence;
 * this handler owns only the atomic pending-offer consumption and burden/liability projection.
 */
export function applyMutationSelection(
  context: Readonly<{
    state: GameState;
    operation: SelectMutationOperation;
    appliedAtMs: number;
  }>,
): ExtendedHallmarkHandlerResult<GameState> {
  const { operation, state } = context;
  assertSelection(state, operation);
  const genomeBurden = nextBurden(state, operation);
  const nextState: ExtendedHallmarkHandlerResult<GameState> = {
    ...state,
    mutationOffers: [],
    chosenMutations: [...state.chosenMutations, operation.mutationId],
    mutationLiabilities: [...state.mutationLiabilities, operation.mutationId],
    genomeBurden,
    atp: subtract(state.atp, fromSafeInteger(1)),
  };
  return nextState;
}

export const MUTATION_DRAFT_HANDLER: ExtendedHallmarkHandler<SelectMutationOperation> = {
  hallmark: GENOME_INSTABILITY_KEY,
  apply: applyMutationSelection,
};

export const MUTATION_DRAFT_HALLMARK_ID = hallmarkId(GENOME_INSTABILITY_KEY);
