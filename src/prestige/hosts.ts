import { hostCardId, hostDraftId, hostTraitId, lineageBoonId } from "../brands.js";
import { deriveSeedV1, mulberry32V1 } from "../state/deterministic_random.js";
import type {
  HostCardId,
  HostDraftId,
  HostRunId,
  HostTraitId,
  LineageBoonId,
} from "../types/ids.js";

export type HostTraitAxis = "immune-regime" | "tissue-ecology" | "host-horizon";
export type HostCard = Readonly<{
  id: HostCardId;
  immuneRegime: HostTraitId;
  tissueEcology: HostTraitId;
  hostHorizon: HostTraitId;
}>;
export type HostDraft = Readonly<{
  id: HostDraftId;
  sourceSeed: number;
  sourceEventSequence: number;
  cards: readonly [HostCard, HostCard, HostCard, HostCard];
  /** Durable authorization for the saved reveal count, retained after selection. */
  revealPolicy: "standard" | "extra-card-reveal";
  revealedCardIds: readonly HostCardId[];
  available: boolean;
  consumedCardId: HostCardId | null;
}>;
export type PurchasedLineageBoon =
  | Readonly<{
      boonId: LineageBoonId;
      kind: "pre-draft";
    }>
  | Readonly<{
      boonId: LineageBoonId;
      kind: "targeted-active-host";
      hostRunId: HostRunId;
      cardId: HostCardId;
      targetTraitId: HostTraitId;
    }>;
export type HostTraitDefinition = Readonly<{
  id: HostTraitId;
  axis: HostTraitAxis;
  relationId: string;
  liabilityRelationId: string;
  effects: Readonly<{
    immuneVisibilityDelta: number;
    pressureDelta: number;
    vesselCapacityBonus: number;
    vesselMaintenanceMultiplier: number;
    substrateConversionMultiplier: number;
    routeRiskDelta: number;
    hostRunwayReserveFloor: number;
  }>;
}>;
export type LineageBoonDefinition = Readonly<{
  id: LineageBoonId;
  cost: number;
  relationId: string;
  liabilityRelationId: string;
}>;

export const HOST_TRAIT_CATALOG: readonly HostTraitDefinition[] = Object.freeze([
  Object.freeze({
    id: hostTraitId("immune-vigilant"),
    axis: "immune-regime",
    relationId: "immune-clearance",
    liabilityRelationId: "detection-pressure",
    effects: Object.freeze({
      immuneVisibilityDelta: 1,
      pressureDelta: 1,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("immune-ordinary"),
    axis: "immune-regime",
    relationId: "immune-baseline",
    liabilityRelationId: "immune-baseline",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 0,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("immune-tolerant"),
    axis: "immune-regime",
    relationId: "immune-tolerance",
    liabilityRelationId: "damage-liability",
    effects: Object.freeze({
      immuneVisibilityDelta: -1,
      pressureDelta: -1,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("ecology-vascular"),
    axis: "tissue-ecology",
    relationId: "perfusion-yield",
    liabilityRelationId: "immune-visibility",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 0,
      vesselCapacityBonus: 1,
      vesselMaintenanceMultiplier: 1.1,
      substrateConversionMultiplier: 1.05,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("ecology-nutrient-poor"),
    axis: "tissue-ecology",
    relationId: "substrate-constraint",
    liabilityRelationId: "slow-yield",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 1,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 0.82,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("ecology-fibrotic"),
    axis: "tissue-ecology",
    relationId: "vessel-stability",
    liabilityRelationId: "remodel-upkeep",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 0,
      vesselCapacityBonus: 1,
      vesselMaintenanceMultiplier: 1.3,
      substrateConversionMultiplier: 1,
      routeRiskDelta: -0.03,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("horizon-brief"),
    axis: "host-horizon",
    relationId: "early-runway",
    liabilityRelationId: "short-horizon",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 0,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 0,
    }),
  }),
  Object.freeze({
    id: hostTraitId("horizon-ordinary"),
    axis: "host-horizon",
    relationId: "runway-baseline",
    liabilityRelationId: "runway-baseline",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 0,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 1,
    }),
  }),
  Object.freeze({
    id: hostTraitId("horizon-durable"),
    axis: "host-horizon",
    relationId: "extended-runway",
    liabilityRelationId: "surveillance",
    effects: Object.freeze({
      immuneVisibilityDelta: 0,
      pressureDelta: 1,
      vesselCapacityBonus: 0,
      vesselMaintenanceMultiplier: 1,
      substrateConversionMultiplier: 1,
      routeRiskDelta: 0,
      hostRunwayReserveFloor: 2,
    }),
  }),
]);

export const LINEAGE_BOON_CATALOG: readonly LineageBoonDefinition[] = Object.freeze([
  Object.freeze({
    id: lineageBoonId("extra_card_reveal"),
    cost: 2,
    relationId: "host-draft-reveal",
    liabilityRelationId: "imprint-opportunity",
  }),
  Object.freeze({
    id: lineageBoonId("protected_route_affinity"),
    cost: 3,
    relationId: "route-affinity-protection",
    liabilityRelationId: "portfolio-narrowing",
  }),
  Object.freeze({
    id: lineageBoonId("reduced_trait_liability"),
    cost: 3,
    relationId: "trait-liability-reduction",
    liabilityRelationId: "benefit-reduction",
  }),
]);

const IMMUNE_TRAITS = HOST_TRAIT_CATALOG.filter((trait) => trait.axis === "immune-regime");
const ECOLOGY_TRAITS = HOST_TRAIT_CATALOG.filter((trait) => trait.axis === "tissue-ecology");
const HORIZON_TRAITS = HOST_TRAIT_CATALOG.filter((trait) => trait.axis === "host-horizon");

function chooseTrait(stream: () => number, traits: readonly HostTraitDefinition[]): HostTraitId {
  const index = stream() % traits.length;
  const trait = traits[index];
  if (!trait) throw new Error("Host trait catalog is empty.");
  return trait.id;
}

function tupleKey(card: Omit<HostCard, "id">): string {
  return [card.immuneRegime, card.tissueEcology, card.hostHorizon].join("|");
}

export function generateHostDraftV1(
  input: Readonly<{
    lineageSeed: number;
    hostDraftSequence: number;
    sourceEventSequence: number;
    purchasedBoons: readonly PurchasedLineageBoon[];
  }>,
): HostDraft {
  const sourceSeed = deriveSeedV1(
    "host-draft-v1",
    input.lineageSeed,
    input.hostDraftSequence,
    input.sourceEventSequence,
  );
  const id = hostDraftId(`host-draft-v1:${input.lineageSeed}:${input.hostDraftSequence}`);
  const stream = mulberry32V1(sourceSeed);
  const cards: HostCard[] = [];
  const tuples = new Set<string>();
  while (cards.length < 4) {
    const candidate = {
      immuneRegime: chooseTrait(stream, IMMUNE_TRAITS),
      tissueEcology: chooseTrait(stream, ECOLOGY_TRAITS),
      hostHorizon: chooseTrait(stream, HORIZON_TRAITS),
    };
    const key = tupleKey(candidate);
    if (tuples.has(key)) continue;
    tuples.add(key);
    const card = { id: hostCardId(`${id}:${cards.length}`), ...candidate };
    cards.push(Object.freeze(card));
  }
  const [first, second, third, fourth] = cards;
  if (!first || !second || !third || !fourth) throw new Error("Host draft must have four cards.");
  const revealPolicy = input.purchasedBoons.some(
    (boon) => boon.kind === "pre-draft" && boon.boonId === lineageBoonId("extra_card_reveal"),
  )
    ? "extra-card-reveal"
    : "standard";
  const reveals =
    revealPolicy === "extra-card-reveal"
      ? [first.id, second.id, third.id, fourth.id]
      : [first.id, second.id, third.id];
  return Object.freeze({
    id,
    sourceSeed,
    sourceEventSequence: input.sourceEventSequence,
    cards: Object.freeze([first, second, third, fourth] as [
      HostCard,
      HostCard,
      HostCard,
      HostCard,
    ]),
    revealPolicy,
    revealedCardIds: Object.freeze(reveals),
    available: true,
    consumedCardId: null,
  });
}
