import {
  ATP_SINK_CATALOG,
  M11_MUTATION_CARD_CATALOG,
  M11_MUTATION_OFFER_THRESHOLDS,
  MAX_TOTAL_ATP_BUDGET,
} from "../hallmarks/m11_catalog.js";
import { assertM11GeneratedMutationOffer } from "../hallmarks/mutation_offer_generator.js";
import { MAX_CONCEALMENT_TOKENS } from "../hallmarks/handlers/immune_visibility.js";
import type { GameState } from "../types/state.js";

const M11_SAVE_FIELDS = new Set([
  "atp",
  "atpBudget",
  "atpSinks",
  "immuneVisibilityByRegion",
  "concealmentTokens",
  "maskedRegions",
  "inflammationEpisodes",
  "regionalInflammation",
  "mutationOffers",
  "chosenMutations",
  "mutationLiabilities",
  "genomeBurden",
]);

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function assertAtpBudget(state: GameState): void {
  const budgetEntries = Object.entries(state.atpBudget);
  const sinkIds = budgetEntries.map(([sink]) => sink).sort();
  if (!sameStrings([...state.atpSinks].sort(), sinkIds)) {
    throw new Error("ATP sink inventory must exactly match its budget records.");
  }
  let total = 0;
  for (const [sinkId, amount] of budgetEntries) {
    const sink = ATP_SINK_CATALOG.find((candidate) => candidate.id === sinkId);
    if (sink === undefined) throw new Error("ATP budget contains an unknown sink.");
    if (!natural(amount) || amount < sink.minimumBudget || amount > sink.maximumBudget) {
      throw new Error("ATP budget is outside its declared sink bounds.");
    }
    total += amount;
  }
  if (!natural(total) || total > MAX_TOTAL_ATP_BUDGET) {
    throw new Error("ATP budget exceeds its declared total.");
  }
}

function assertVisibilityAndEpisodes(state: GameState): void {
  const regions = new Set<string>(state.regions.map((region) => region.id));
  if (!natural(state.concealmentTokens) || state.concealmentTokens > MAX_CONCEALMENT_TOKENS) {
    throw new Error("Concealment token state is invalid.");
  }
  if (
    new Set(state.maskedRegions).size !== state.maskedRegions.length ||
    !state.maskedRegions.every((regionId) => regions.has(regionId)) ||
    !Object.entries(state.immuneVisibilityByRegion).every(
      ([regionId, visibility]) => regions.has(regionId) && natural(visibility) && visibility <= 1,
    ) ||
    !state.maskedRegions.every((regionId) => state.immuneVisibilityByRegion[regionId] === 0)
  ) {
    throw new Error("Immune visibility relations are invalid.");
  }
  const episodeIds = new Set<string>();
  const episodeRegions = new Set<string>();
  const m11ElapsedClock = state.activeTimeMs + state.totalOfflineMs;
  if (!natural(m11ElapsedClock)) throw new Error("M11 elapsed clock is invalid.");
  for (const episode of state.inflammationEpisodes) {
    if (
      !episodeIds.add(episode.id) ||
      !episodeRegions.add(episode.regionId) ||
      !regions.has(episode.regionId) ||
      !natural(episode.deadlineMs) ||
      episode.deadlineMs <= m11ElapsedClock
    ) {
      throw new Error("Inflammation episode relations are invalid.");
    }
  }
  if (
    !Object.entries(state.regionalInflammation).every(
      ([regionId, level]) => regions.has(regionId) && level === 1 && episodeRegions.has(regionId),
    ) ||
    ![...episodeRegions].every((regionId) => state.regionalInflammation[regionId] === 1)
  ) {
    throw new Error("Regional inflammation must exactly represent active episodes.");
  }
}

function assertMutationOffers(state: GameState): void {
  if (!natural(state.genomeBurden) || state.mutationOffers.length > 1) {
    throw new Error("Mutation offer state is invalid.");
  }
  const canonicalMutationIds = M11_MUTATION_CARD_CATALOG.map((card) => card.id);
  const chosen = state.chosenMutations;
  const liabilities = state.mutationLiabilities;
  if (
    chosen.length > canonicalMutationIds.length ||
    liabilities.length > canonicalMutationIds.length ||
    new Set(chosen).size !== chosen.length ||
    new Set(liabilities).size !== liabilities.length ||
    !chosen.every((id) => canonicalMutationIds.includes(id)) ||
    !liabilities.every((id) => canonicalMutationIds.includes(id)) ||
    !sameStrings(chosen, liabilities)
  ) {
    throw new Error("Chosen mutations and liabilities must be the same canonical selection.");
  }
  const canonicalSelection = canonicalMutationIds.filter((id) => chosen.includes(id));
  if (!sameStrings(chosen, canonicalSelection)) {
    throw new Error("Chosen mutations are not in canonical catalog order.");
  }
  const offer = state.mutationOffers[0];
  if (offer === undefined) return;
  if (!M11_MUTATION_OFFER_THRESHOLDS.some((threshold) => threshold.burden === offer.threshold)) {
    throw new Error("Mutation offer threshold is unknown.");
  }
  assertM11GeneratedMutationOffer(offer, {
    deterministicSeed: offer.sourceSeed,
    eventSequence: offer.sourceSequence,
    currentStage: offer.sourceStage,
    genomeBurden: offer.threshold - 1,
  });
  const pendingIds = offer.cards.map((card) => card.id);
  if (
    pendingIds.some((id) => state.chosenMutations.includes(id)) ||
    pendingIds.some((id) => state.mutationLiabilities.includes(id))
  ) {
    throw new Error("A pending mutation offer cannot contain an already selected card.");
  }
}

/** ASVS 2.2.3, 2.3.3, 15.3.5, and 15.3.6: validate all M11 durable relations together. */
export function assertM11SaveInvariants(state: GameState): void {
  assertAtpBudget(state);
  assertVisibilityAndEpisodes(state);
  assertMutationOffers(state);
}

/** M11 records are semantic state; a bad leaf cannot be silently recovered into a new save. */
export function hasM11RecoveryNotice(field: string): boolean {
  return M11_SAVE_FIELDS.has(field);
}
