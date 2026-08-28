import { hallmarkId, mutationId, stageId } from "../brands.js";
import { STAGE_IDS } from "../state/catalog.js";
import { stageDefinition } from "../stages/catalog.js";
import type { HallmarkId, MutationId, StageId } from "../types/ids.js";
import type {
  AtpSinkDefinition,
  AtpSinkId,
  ExtendedHallmarkDefinition,
  ExtendedHallmarkDefinitionFor,
  ExtendedHallmarkKey,
  ExtendedHallmarkMechanicClass,
  MutationDraftOffer,
  MutationDraftPoolId,
  MutationCard,
  MutationOfferThreshold,
} from "./extended_hallmark_types.js";

export const EXTENDED_HALLMARK_KEYS = [
  "metabolic_deregulation",
  "immune_destruction_avoidance",
  "tumor_promoting_inflammation",
  "genome_instability_mutation",
] as const satisfies readonly ExtendedHallmarkKey[];

type ExtendedHallmarkDefinitionByKey = Readonly<{
  [Key in ExtendedHallmarkKey]: ExtendedHallmarkDefinitionFor<Key>;
}>;

const EXTENDED_HALLMARK_BY_KEY = {
  metabolic_deregulation: {
    key: "metabolic_deregulation",
    id: hallmarkId("metabolic_deregulation"),
    displayName: "Deregulating cellular metabolism",
    mechanicClass: "energy-budgeting",
    handlerId: "apply-metabolic-conversion",
    operationType: "convert-substrate",
    unlock: { stageId: stageId("avascular_lesion"), capability: "atp-budget" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  immune_destruction_avoidance: {
    key: "immune_destruction_avoidance",
    id: hallmarkId("immune_destruction_avoidance"),
    displayName: "Avoiding immune destruction",
    mechanicClass: "visibility-management",
    handlerId: "apply-immune-visibility",
    operationType: "set-region-mask",
    unlock: { stageId: stageId("angiogenic_primary"), capability: "vessel-upkeep-concealment" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  tumor_promoting_inflammation: {
    key: "tumor_promoting_inflammation",
    id: hallmarkId("tumor_promoting_inflammation"),
    displayName: "Tumor-promoting inflammation",
    mechanicClass: "event-cultivation",
    handlerId: "apply-inflammation-episode",
    operationType: "activate-inflammation",
    unlock: { stageId: stageId("angiogenic_primary"), capability: "vessel-upkeep-concealment" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
  genome_instability_mutation: {
    key: "genome_instability_mutation",
    id: hallmarkId("genome_instability_mutation"),
    displayName: "Genome instability and mutation",
    mechanicClass: "mutation-drafting",
    handlerId: "apply-mutation-selection",
    operationType: "select-mutation",
    unlock: { stageId: stageId("angiogenic_primary"), capability: "vessel-upkeep-concealment" },
    purchase: { eventType: "purchase-hallmark", initialLevel: 1, maximumLevel: 1 },
    ownership: { requiredLevel: 1 },
  },
} as const satisfies ExtendedHallmarkDefinitionByKey;

export const EXTENDED_HALLMARK_CATALOG: readonly ExtendedHallmarkDefinition[] =
  EXTENDED_HALLMARK_KEYS.map((key) => EXTENDED_HALLMARK_BY_KEY[key]);

export const ATP_SINK_CATALOG = [
  {
    id: "acceleration",
    displayName: "Producer acceleration",
    minimumBudget: 0,
    maximumBudget: 100,
  },
  {
    id: "vessel-maintenance",
    displayName: "Vessel maintenance",
    minimumBudget: 0,
    maximumBudget: 100,
  },
  {
    id: "mutation-drafting",
    displayName: "Mutation drafting",
    minimumBudget: 0,
    maximumBudget: 100,
  },
] as const satisfies readonly AtpSinkDefinition[];
export const MAX_TOTAL_ATP_BUDGET = 200;

export const MUTATION_DRAFT_POOL_ID: MutationDraftPoolId = "early-instability";
export const MUTATION_DRAFT_OFFER_THRESHOLDS = [
  { id: "first-draft", burden: 1 },
] as const satisfies readonly MutationOfferThreshold[];
export const MUTATION_DRAFT_CARD_CATALOG = [
  {
    id: mutationId("repair_bypass"),
    displayName: "Repair bypass",
    benefit: { label: "Benefit", effect: "Faster producer acceleration allocation." },
    liability: { label: "Liability", effect: "Raises immune visibility." },
    genomeBurden: 1,
    effects: {
      producerMultiplier: 1.15,
      producerCostMultiplier: 0.9,
      conversionYieldMultiplier: 1,
      maskTokenCost: 1,
      routeDiscoveryBonus: 0,
      damagePressure: 0,
      immunePressure: 1,
    },
  },
  {
    id: mutationId("glycolytic_shift"),
    displayName: "Glycolytic shift",
    benefit: { label: "Benefit", effect: "Improves substrate conversion yield." },
    liability: { label: "Liability", effect: "Raises inflammatory damage." },
    genomeBurden: 1,
    effects: {
      producerMultiplier: 1,
      producerCostMultiplier: 1,
      conversionYieldMultiplier: 1.25,
      maskTokenCost: 1,
      routeDiscoveryBonus: 0,
      damagePressure: 1,
      immunePressure: 0,
    },
  },
  {
    id: mutationId("antigen_loss"),
    displayName: "Antigen loss",
    benefit: { label: "Benefit", effect: "Improves regional concealment." },
    liability: { label: "Liability", effect: "Reduces mutation drafting efficiency." },
    genomeBurden: 1,
    effects: {
      producerMultiplier: 1,
      producerCostMultiplier: 1,
      conversionYieldMultiplier: 1,
      maskTokenCost: 0,
      routeDiscoveryBonus: 0,
      damagePressure: 0,
      immunePressure: 1,
    },
  },
  {
    id: mutationId("invasive_clone"),
    displayName: "Invasive clone",
    benefit: { label: "Benefit", effect: "Improves route discovery progress." },
    liability: { label: "Liability", effect: "Raises damage pressure." },
    genomeBurden: 1,
    effects: {
      producerMultiplier: 1,
      producerCostMultiplier: 1,
      conversionYieldMultiplier: 1,
      maskTokenCost: 1,
      routeDiscoveryBonus: 1,
      damagePressure: 1,
      immunePressure: 0,
    },
  },
] as const satisfies readonly MutationCard[];
export const MUTATION_DRAFT_OFFER_CARD_COUNT = 3;
export const MAX_MUTATION_GENOME_BURDEN = 12;

const EXTENDED_HALLMARK_STAGE_ORDER: readonly StageId[] = STAGE_IDS.map(stageId);

function stageIndex(stage: StageId): number {
  const index = EXTENDED_HALLMARK_STAGE_ORDER.findIndex((candidate) => candidate === stage);
  if (index < 0) throw new Error("Extended-hallmark catalog references an unknown stage.");
  return index;
}

export function extendedHallmarkDefinition(key: ExtendedHallmarkKey): ExtendedHallmarkDefinition {
  return EXTENDED_HALLMARK_BY_KEY[key];
}
export function findExtendedHallmark(id: HallmarkId): ExtendedHallmarkDefinition | undefined {
  return EXTENDED_HALLMARK_CATALOG.find((definition) => definition.id === id);
}
export function hasReachedExtendedHallmarkUnlock(
  stage: StageId,
  key: ExtendedHallmarkKey,
): boolean {
  return stageIndex(stage) >= stageIndex(extendedHallmarkDefinition(key).unlock.stageId);
}
export function findAtpSink(id: AtpSinkId): AtpSinkDefinition {
  const sink = ATP_SINK_CATALOG.find((candidate) => candidate.id === id);
  if (!sink) throw new Error("ATP sink is unknown.");
  return sink;
}
export function findMutationDraftCard(id: MutationId): MutationCard | undefined {
  return MUTATION_DRAFT_CARD_CATALOG.find((card) => card.id === id);
}

export function assertExtendedHallmarkCatalog(
  definitions: readonly ExtendedHallmarkDefinition[] = EXTENDED_HALLMARK_CATALOG,
): void {
  if (definitions.length !== EXTENDED_HALLMARK_KEYS.length)
    throw new Error("Extended-hallmark catalog must contain exactly four definitions.");
  const keys = new Set(definitions.map((definition) => definition.key));
  const ids = new Set(definitions.map((definition) => definition.id));
  const classes = new Set<ExtendedHallmarkMechanicClass>(
    definitions.map((definition) => definition.mechanicClass),
  );
  const handlers = new Set(definitions.map((definition) => definition.handlerId));
  const operations = new Set(definitions.map((definition) => definition.operationType));
  if (
    keys.size !== definitions.length ||
    ids.size !== definitions.length ||
    classes.size !== definitions.length
  )
    throw new Error("Extended-hallmark catalog must have unique identities and mechanic classes.");
  if (handlers.size !== definitions.length || operations.size !== definitions.length)
    throw new Error("Extended-hallmark catalog must have one handler and operation per branch.");
  for (const key of EXTENDED_HALLMARK_KEYS)
    if (!keys.has(key)) throw new Error("Extended-hallmark catalog is missing a canonical branch.");
  for (const definition of definitions) {
    const stage = stageDefinition(definition.unlock.stageId);
    if (stage.operationalChange.actionId !== definition.unlock.capability)
      throw new Error("Extended-hallmark catalog capability must match its unlock stage.");
    if (
      definition.purchase.initialLevel !== 1 ||
      definition.purchase.maximumLevel !== 1 ||
      definition.ownership.requiredLevel !== 1
    )
      throw new Error("Extended-hallmark purchase levels must establish first ownership.");
  }
}

export function assertAtpSinkCatalog(
  definitions: readonly AtpSinkDefinition[] = ATP_SINK_CATALOG,
): void {
  if (definitions.length !== ATP_SINK_CATALOG.length)
    throw new Error("ATP sink catalog must contain exactly three sinks.");
  const ids = new Set(definitions.map((definition) => definition.id));
  if (ids.size !== definitions.length) throw new Error("ATP sinks must be unique.");
  let maximumTotal = 0;
  for (const sink of definitions) {
    if (
      !Number.isFinite(sink.minimumBudget) ||
      !Number.isFinite(sink.maximumBudget) ||
      sink.minimumBudget < 0 ||
      sink.maximumBudget < sink.minimumBudget ||
      sink.maximumBudget > 100
    )
      throw new Error("ATP sink budgets must be finite and bounded.");
    maximumTotal += sink.maximumBudget;
  }
  if (maximumTotal < MAX_TOTAL_ATP_BUDGET)
    throw new Error("ATP sink catalog cannot fund its declared total budget.");
}

export function assertMutationDraftCatalog(
  cards: readonly MutationCard[] = MUTATION_DRAFT_CARD_CATALOG,
  thresholds: readonly MutationOfferThreshold[] = MUTATION_DRAFT_OFFER_THRESHOLDS,
): void {
  if (cards.length < MUTATION_DRAFT_OFFER_CARD_COUNT)
    throw new Error("Mutation draft pool must supply a three-card offer.");
  if (new Set(cards.map((card) => card.id)).size !== cards.length)
    throw new Error("Mutation draft cards must have unique identities.");
  if (thresholds.length !== 1 || thresholds[0]?.id !== "first-draft")
    throw new Error("Mutation draft thresholds must declare one outstanding first draft.");
  for (const card of cards) {
    if (
      card.benefit.label.length === 0 ||
      card.benefit.effect.length === 0 ||
      card.liability.label.length === 0 ||
      card.liability.effect.length === 0 ||
      !Number.isSafeInteger(card.genomeBurden) ||
      card.genomeBurden < 1 ||
      card.genomeBurden > MAX_MUTATION_GENOME_BURDEN ||
      !Number.isFinite(card.effects.producerMultiplier) ||
      !Number.isFinite(card.effects.producerCostMultiplier) ||
      !Number.isFinite(card.effects.conversionYieldMultiplier) ||
      !Number.isSafeInteger(card.effects.maskTokenCost) ||
      !Number.isSafeInteger(card.effects.routeDiscoveryBonus) ||
      !Number.isSafeInteger(card.effects.damagePressure) ||
      !Number.isSafeInteger(card.effects.immunePressure) ||
      card.effects.producerMultiplier < 1 ||
      card.effects.producerMultiplier > 1.2 ||
      card.effects.producerCostMultiplier < 0.8 ||
      card.effects.producerCostMultiplier > 1 ||
      card.effects.conversionYieldMultiplier < 1 ||
      card.effects.conversionYieldMultiplier > 1.25 ||
      card.effects.maskTokenCost < 0 ||
      card.effects.maskTokenCost > 1 ||
      card.effects.routeDiscoveryBonus < 0 ||
      card.effects.routeDiscoveryBonus > 1 ||
      card.effects.damagePressure < 0 ||
      card.effects.damagePressure > 1 ||
      card.effects.immunePressure < 0 ||
      card.effects.immunePressure > 1
    )
      throw new Error("Mutation draft cards require bounded named benefit and liability rows.");
  }
}

/** Validates the durable snapshot before a generated offer enters shared state or save parsing. */
export function assertMutationDraftOffer(offer: MutationDraftOffer): void {
  if (offer.poolId !== MUTATION_DRAFT_POOL_ID)
    throw new Error("Mutation draft offer pool is unknown.");
  if (offer.cards.length !== MUTATION_DRAFT_OFFER_CARD_COUNT)
    throw new Error("Mutation draft offer must contain exactly three cards.");
  if (new Set(offer.cards.map((card) => card.id)).size !== MUTATION_DRAFT_OFFER_CARD_COUNT)
    throw new Error("Mutation draft offer cards must be unique.");
  if (
    !Number.isSafeInteger(offer.sourceSeed) ||
    !Number.isSafeInteger(offer.sourceSequence) ||
    offer.sourceSequence < 0 ||
    !STAGE_IDS.some((stage) => stage === offer.sourceStage) ||
    !Number.isSafeInteger(offer.threshold) ||
    offer.threshold < 1 ||
    offer.threshold > MAX_MUTATION_GENOME_BURDEN
  )
    throw new Error("Mutation draft offer provenance is invalid.");
  for (const card of offer.cards) {
    if (!findMutationDraftCard(card.id)) throw new Error("Mutation draft offer card is unknown.");
  }
}

assertExtendedHallmarkCatalog();
assertAtpSinkCatalog();
assertMutationDraftCatalog();
