import { offerId } from "../brands.js";
import { compare, fromSafeInteger } from "../bignum/bignum.js";
import {
  MUTATION_DRAFT_CARD_CATALOG,
  MUTATION_DRAFT_OFFER_CARD_COUNT,
  MUTATION_DRAFT_OFFER_THRESHOLDS,
  MUTATION_DRAFT_POOL_ID,
  findMutationDraftCard,
  hasReachedExtendedHallmarkUnlock,
  extendedHallmarkDefinition,
} from "./extended_hallmark_catalog.js";
import { atpBudgetForSink } from "./atp_allocation.js";
import type { MutationId, OfferId, StageId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type {
  MutationDraftOffer,
  MutationCard,
  MutationOfferThreshold,
} from "./extended_hallmark_types.js";

const GENOME_INSTABILITY_KEY = "genome_instability_mutation";
const MUTATION_OFFER_VERSION = "mutation-offer-v1";

export type MutationOfferSource = Readonly<{
  deterministicSeed: number;
  eventSequence: number;
  currentStage: StageId;
  genomeBurden: number;
}>;

export type MutationDraftEligibility =
  | Readonly<{ eligible: true; source: MutationOfferSource; threshold: MutationOfferThreshold }>
  | Readonly<{
      eligible: false;
      reason:
        | "not-owned"
        | "not-unlocked"
        | "outstanding-offer"
        | "atp-unavailable"
        | "threshold-unavailable"
        | "invalid-provenance";
    }>;

function isSafeNatural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isUint32(value: number): boolean {
  return isSafeNatural(value) && value <= 0xffff_ffff;
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

function hasDraftingBudget(state: GameState): boolean {
  const budget = atpBudgetForSink(state, "mutation-drafting");
  return budget >= 25 && compare(state.atp, fromSafeInteger(1)) >= 0;
}

function sourceFor(state: GameState): MutationOfferSource | undefined {
  if (
    !isUint32(state.deterministicSeed) ||
    !isSafeNatural(state.eventSequence) ||
    !isSafeNatural(state.genomeBurden)
  )
    return undefined;
  return {
    deterministicSeed: state.deterministicSeed,
    eventSequence: state.eventSequence,
    currentStage: state.currentStage,
    genomeBurden: state.genomeBurden,
  };
}

function thresholdForBurden(burden: number): MutationOfferThreshold | undefined {
  return MUTATION_DRAFT_OFFER_THRESHOLDS.find((threshold) => threshold.burden === burden + 1);
}

/**
 * A small fixed-width mixer keeps offer derivation deterministic across render, reload, and replay.
 * It intentionally accepts only the state-owned seed and sequence; it never reads ambient entropy.
 */
function mix32(value: number): number {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function sourceHash(source: MutationOfferSource, cardIndex: number): number {
  let hash = source.deterministicSeed >>> 0;
  hash = mix32(hash ^ (source.eventSequence >>> 0));
  hash = mix32(hash ^ (source.genomeBurden >>> 0));
  for (let index = 0; index < source.currentStage.length; index += 1) {
    const code = source.currentStage.charCodeAt(index);
    hash = mix32(hash ^ code);
  }
  return mix32(hash ^ cardIndex);
}

function compareCardPriority(
  source: MutationOfferSource,
  left: MutationCard,
  right: MutationCard,
): number {
  const leftIndex = MUTATION_DRAFT_CARD_CATALOG.findIndex((card) => card.id === left.id);
  const rightIndex = MUTATION_DRAFT_CARD_CATALOG.findIndex((card) => card.id === right.id);
  if (leftIndex < 0 || rightIndex < 0) throw new Error("Mutation offer card is outside the pool.");
  const priorityDifference = sourceHash(source, leftIndex) - sourceHash(source, rightIndex);
  if (priorityDifference !== 0) return priorityDifference;
  return leftIndex - rightIndex;
}

function orderedCards(
  source: MutationOfferSource,
): readonly [MutationCard, MutationCard, MutationCard] {
  const cards = [...MUTATION_DRAFT_CARD_CATALOG];
  cards.sort((left, right) => compareCardPriority(source, left, right));
  const selected = cards.slice(0, MUTATION_DRAFT_OFFER_CARD_COUNT);
  const first = selected[0];
  const second = selected[1];
  const third = selected[2];
  if (!first || !second || !third) throw new Error("Mutation pool cannot create three cards.");
  return [first, second, third];
}

export function mutationOfferId(source: MutationOfferSource): OfferId {
  const threshold = thresholdForBurden(source.genomeBurden);
  if (!threshold) throw new Error("Mutation offer threshold is unavailable.");
  const identity = [
    MUTATION_OFFER_VERSION,
    source.deterministicSeed,
    source.eventSequence,
    source.currentStage,
    threshold.burden,
  ].join(":");
  return offerId(identity);
}

export function mutationDraftEligibility(state: GameState): MutationDraftEligibility {
  if (!isOwned(state)) return { eligible: false, reason: "not-owned" };
  if (!hasReachedExtendedHallmarkUnlock(state.currentStage, GENOME_INSTABILITY_KEY)) {
    return { eligible: false, reason: "not-unlocked" };
  }
  if (state.mutationOffers.length > 0) return { eligible: false, reason: "outstanding-offer" };
  if (!hasDraftingBudget(state)) return { eligible: false, reason: "atp-unavailable" };
  const source = sourceFor(state);
  if (!source) return { eligible: false, reason: "invalid-provenance" };
  const threshold = thresholdForBurden(source.genomeBurden);
  if (!threshold) return { eligible: false, reason: "threshold-unavailable" };
  return { eligible: true, source, threshold };
}

/** Generates the one saved offer snapshot for an already-approved state source. */
export function createMutationOffer(source: MutationOfferSource): MutationDraftOffer {
  if (!isUint32(source.deterministicSeed) || !isSafeNatural(source.eventSequence)) {
    throw new Error("Mutation offer source provenance is invalid.");
  }
  if (!isSafeNatural(source.genomeBurden))
    throw new Error("Mutation offer genome burden is invalid.");
  if (!hasReachedExtendedHallmarkUnlock(source.currentStage, GENOME_INSTABILITY_KEY)) {
    throw new Error("Mutation offer source stage is not eligible.");
  }
  const threshold = thresholdForBurden(source.genomeBurden);
  if (!threshold) throw new Error("Mutation offer threshold is unavailable.");
  const offer: MutationDraftOffer = {
    id: mutationOfferId(source),
    poolId: MUTATION_DRAFT_POOL_ID,
    cards: orderedCards(source),
    sourceSeed: source.deterministicSeed,
    sourceSequence: source.eventSequence,
    sourceStage: source.currentStage,
    threshold: threshold.burden,
  };
  return offer;
}

export function assertGeneratedMutationDraftOffer(
  offer: MutationDraftOffer,
  source: MutationOfferSource,
): void {
  const expected = createMutationOffer(source);
  if (
    offer.id !== expected.id ||
    offer.poolId !== expected.poolId ||
    offer.sourceSeed !== expected.sourceSeed ||
    offer.sourceSequence !== expected.sourceSequence ||
    offer.sourceStage !== expected.sourceStage ||
    offer.threshold !== expected.threshold
  )
    throw new Error("Mutation offer provenance does not match its deterministic source.");
  for (let index = 0; index < MUTATION_DRAFT_OFFER_CARD_COUNT; index += 1) {
    const actual = offer.cards[index];
    const expectedCard = expected.cards[index];
    if (!actual || !expectedCard || actual.id !== expectedCard.id) {
      throw new Error("Mutation offer cards are not in canonical deterministic order.");
    }
    const catalogCard = findMutationDraftCard(actual.id);
    if (!catalogCard || JSON.stringify(actual) !== JSON.stringify(catalogCard)) {
      throw new Error("Mutation offer card snapshot differs from the closed catalog.");
    }
  }
}

/** C's tick may call this pure projection; it never records an event or rerolls a saved offer. */
export function projectPendingMutationOffer(state: GameState): GameState {
  const eligibility = mutationDraftEligibility(state);
  if (!eligibility.eligible) return state;
  const offer = createMutationOffer(eligibility.source);
  return { ...state, mutationOffers: [offer] };
}

export function mutationOfferContains(offer: MutationDraftOffer, mutation: MutationId): boolean {
  return offer.cards.some((card) => card.id === mutation);
}
