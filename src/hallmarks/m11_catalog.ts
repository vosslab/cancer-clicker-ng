import { hallmarkId, mutationId, stageId } from "../brands.js";
import { STAGE_IDS } from "../state/catalog.js";
import { stageDefinition } from "../stages/catalog.js";
import type { HallmarkId, MutationId, StageId } from "../types/ids.js";
import type {
  AtpSinkDefinition,
  AtpSinkId,
  M11HallmarkDefinition,
  M11HallmarkDefinitionFor,
  M11HallmarkKey,
  M11MechanicClass,
  M11MutationOffer,
  M11MutationPoolId,
  MutationCard,
  MutationOfferThreshold,
} from "./m11_types.js";

export const M11_HALLMARK_KEYS = [
  "metabolic_deregulation",
  "immune_destruction_avoidance",
  "tumor_promoting_inflammation",
  "genome_instability_mutation",
] as const satisfies readonly M11HallmarkKey[];

type M11DefinitionByKey = Readonly<{
  [Key in M11HallmarkKey]: M11HallmarkDefinitionFor<Key>;
}>;

const M11_BY_KEY = {
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
} as const satisfies M11DefinitionByKey;

export const M11_HALLMARK_CATALOG: readonly M11HallmarkDefinition[] = M11_HALLMARK_KEYS.map(
  (key) => M11_BY_KEY[key],
);

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

export const M11_MUTATION_POOL_ID: M11MutationPoolId = "early-instability";
export const M11_MUTATION_OFFER_THRESHOLDS = [
  { id: "first-draft", burden: 1 },
] as const satisfies readonly MutationOfferThreshold[];
export const M11_MUTATION_CARD_CATALOG = [
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
export const M11_MUTATION_OFFER_CARD_COUNT = 3;
export const MAX_MUTATION_GENOME_BURDEN = 12;

const M11_STAGE_ORDER: readonly StageId[] = STAGE_IDS.map(stageId);

function stageIndex(stage: StageId): number {
  const index = M11_STAGE_ORDER.findIndex((candidate) => candidate === stage);
  if (index < 0) throw new Error("M11 catalog references an unknown stage.");
  return index;
}

export function m11HallmarkDefinition(key: M11HallmarkKey): M11HallmarkDefinition {
  return M11_BY_KEY[key];
}
export function findM11Hallmark(id: HallmarkId): M11HallmarkDefinition | undefined {
  return M11_HALLMARK_CATALOG.find((definition) => definition.id === id);
}
export function hasReachedM11Unlock(stage: StageId, key: M11HallmarkKey): boolean {
  return stageIndex(stage) >= stageIndex(m11HallmarkDefinition(key).unlock.stageId);
}
export function findAtpSink(id: AtpSinkId): AtpSinkDefinition {
  const sink = ATP_SINK_CATALOG.find((candidate) => candidate.id === id);
  if (!sink) throw new Error("M11 ATP sink is unknown.");
  return sink;
}
export function findM11MutationCard(id: MutationId): MutationCard | undefined {
  return M11_MUTATION_CARD_CATALOG.find((card) => card.id === id);
}

export function assertM11Catalog(
  definitions: readonly M11HallmarkDefinition[] = M11_HALLMARK_CATALOG,
): void {
  if (definitions.length !== M11_HALLMARK_KEYS.length)
    throw new Error("M11 catalog must contain exactly four definitions.");
  const keys = new Set(definitions.map((definition) => definition.key));
  const ids = new Set(definitions.map((definition) => definition.id));
  const classes = new Set<M11MechanicClass>(
    definitions.map((definition) => definition.mechanicClass),
  );
  const handlers = new Set(definitions.map((definition) => definition.handlerId));
  const operations = new Set(definitions.map((definition) => definition.operationType));
  if (
    keys.size !== definitions.length ||
    ids.size !== definitions.length ||
    classes.size !== definitions.length
  )
    throw new Error("M11 catalog must have unique identities and mechanic classes.");
  if (handlers.size !== definitions.length || operations.size !== definitions.length)
    throw new Error("M11 catalog must have one handler and operation per branch.");
  for (const key of M11_HALLMARK_KEYS)
    if (!keys.has(key)) throw new Error("M11 catalog is missing a canonical branch.");
  for (const definition of definitions) {
    const stage = stageDefinition(definition.unlock.stageId);
    if (stage.operationalChange.actionId !== definition.unlock.capability)
      throw new Error("M11 catalog capability must match its M9 unlock stage.");
    if (
      definition.purchase.initialLevel !== 1 ||
      definition.purchase.maximumLevel !== 1 ||
      definition.ownership.requiredLevel !== 1
    )
      throw new Error("M11 purchase levels must establish first ownership.");
  }
}

export function assertAtpSinkCatalog(
  definitions: readonly AtpSinkDefinition[] = ATP_SINK_CATALOG,
): void {
  if (definitions.length !== ATP_SINK_CATALOG.length)
    throw new Error("M11 ATP sink catalog must contain exactly three sinks.");
  const ids = new Set(definitions.map((definition) => definition.id));
  if (ids.size !== definitions.length) throw new Error("M11 ATP sinks must be unique.");
  let maximumTotal = 0;
  for (const sink of definitions) {
    if (
      !Number.isFinite(sink.minimumBudget) ||
      !Number.isFinite(sink.maximumBudget) ||
      sink.minimumBudget < 0 ||
      sink.maximumBudget < sink.minimumBudget ||
      sink.maximumBudget > 100
    )
      throw new Error("M11 ATP sink budgets must be finite and bounded.");
    maximumTotal += sink.maximumBudget;
  }
  if (maximumTotal < MAX_TOTAL_ATP_BUDGET)
    throw new Error("M11 ATP sink catalog cannot fund its declared total budget.");
}

export function assertM11MutationCatalog(
  cards: readonly MutationCard[] = M11_MUTATION_CARD_CATALOG,
  thresholds: readonly MutationOfferThreshold[] = M11_MUTATION_OFFER_THRESHOLDS,
): void {
  if (cards.length < M11_MUTATION_OFFER_CARD_COUNT)
    throw new Error("M11 mutation pool must supply a three-card offer.");
  if (new Set(cards.map((card) => card.id)).size !== cards.length)
    throw new Error("M11 mutation cards must have unique identities.");
  if (thresholds.length !== 1 || thresholds[0]?.id !== "first-draft")
    throw new Error("M11 mutation thresholds must declare one outstanding first draft.");
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
      throw new Error("M11 mutation cards require bounded named benefit and liability rows.");
  }
}

/** Validates the durable snapshot before a generated offer enters shared state or save parsing. */
export function assertM11MutationOffer(offer: M11MutationOffer): void {
  if (offer.poolId !== M11_MUTATION_POOL_ID) throw new Error("M11 mutation offer pool is unknown.");
  if (offer.cards.length !== M11_MUTATION_OFFER_CARD_COUNT)
    throw new Error("M11 mutation offer must contain exactly three cards.");
  if (new Set(offer.cards.map((card) => card.id)).size !== M11_MUTATION_OFFER_CARD_COUNT)
    throw new Error("M11 mutation offer cards must be unique.");
  if (
    !Number.isSafeInteger(offer.sourceSeed) ||
    !Number.isSafeInteger(offer.sourceSequence) ||
    offer.sourceSequence < 0 ||
    !STAGE_IDS.some((stage) => stage === offer.sourceStage) ||
    !Number.isSafeInteger(offer.threshold) ||
    offer.threshold < 1 ||
    offer.threshold > MAX_MUTATION_GENOME_BURDEN
  )
    throw new Error("M11 mutation offer provenance is invalid.");
  for (const card of offer.cards) {
    if (!findM11MutationCard(card.id)) throw new Error("M11 mutation offer card is unknown.");
  }
}

assertM11Catalog();
assertAtpSinkCatalog();
assertM11MutationCatalog();
