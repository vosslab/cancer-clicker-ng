import {
  microbiomeCommunityId,
  microbiomeCompositionId,
  microbiomeNicheId,
  microbiomePoolId,
} from "../brands.js";
import type {
  MicrobiomeCommunityId,
  MicrobiomeCompositionId,
  MicrobiomePoolId,
} from "../types/ids.js";
import type {
  MicrobiomeCommunityDefinition,
  MicrobiomeCompatibility,
  MicrobiomeCompositionSnapshot,
  MicrobiomeEffects,
} from "./late_hallmark_types.js";

export const MICROBIOME_POOL_ID = microbiomePoolId("global-contamination");
export const MICROBIOME_NICHE_IDS = [
  microbiomeNicheId("surface"),
  microbiomeNicheId("interface"),
] as const;

const NEUTRAL_EFFECTS: MicrobiomeEffects = Object.freeze({
  substrateConversionMultiplier: 1,
  inflammationDurationMultiplier: 1,
  immuneVisibilityDelta: 0,
});

const MICROBIOME_BY_ID = Object.freeze({
  "butyrate-fermenter": Object.freeze({
    id: microbiomeCommunityId("butyrate-fermenter"),
    displayName: "Butyrate fermenter",
    effects: Object.freeze({
      substrateConversionMultiplier: 1.15,
      inflammationDurationMultiplier: 0.95,
      immuneVisibilityDelta: 0,
    }),
    morphologyContributorId: "hallmark:polymorphic_microbiomes",
  }),
  "mucosal-commensal": Object.freeze({
    id: microbiomeCommunityId("mucosal-commensal"),
    displayName: "Mucosal commensal",
    effects: Object.freeze({
      substrateConversionMultiplier: 1,
      inflammationDurationMultiplier: 0.9,
      immuneVisibilityDelta: -1,
    }),
    morphologyContributorId: "hallmark:polymorphic_microbiomes",
  }),
  "inflammatory-pathobiont": Object.freeze({
    id: microbiomeCommunityId("inflammatory-pathobiont"),
    displayName: "Inflammatory pathobiont",
    effects: Object.freeze({
      substrateConversionMultiplier: 1.08,
      inflammationDurationMultiplier: 1.25,
      immuneVisibilityDelta: 1,
    }),
    morphologyContributorId: "hallmark:polymorphic_microbiomes",
  }),
  "immune-modulating-biofilm": Object.freeze({
    id: microbiomeCommunityId("immune-modulating-biofilm"),
    displayName: "Immune-modulating biofilm",
    effects: Object.freeze({
      substrateConversionMultiplier: 0.95,
      inflammationDurationMultiplier: 1.1,
      immuneVisibilityDelta: -2,
    }),
    morphologyContributorId: "hallmark:polymorphic_microbiomes",
  }),
} satisfies Readonly<Record<string, MicrobiomeCommunityDefinition>>);

export const MICROBIOME_COMMUNITY_CATALOG: readonly MicrobiomeCommunityDefinition[] = Object.freeze(
  Object.values(MICROBIOME_BY_ID),
);

type CompositionPair = readonly [keyof typeof MICROBIOME_BY_ID, keyof typeof MICROBIOME_BY_ID];

const COMPOSITION_PAIRS = Object.freeze({
  "fermenter-commensal": ["butyrate-fermenter", "mucosal-commensal"],
  "fermenter-pathobiont": ["butyrate-fermenter", "inflammatory-pathobiont"],
  "commensal-biofilm": ["mucosal-commensal", "immune-modulating-biofilm"],
  "pathobiont-biofilm": ["inflammatory-pathobiont", "immune-modulating-biofilm"],
} as const satisfies Readonly<Record<string, CompositionPair>>);

function compatibilityFor(pair: CompositionPair): MicrobiomeCompatibility {
  const compatible =
    pair[0] !== "inflammatory-pathobiont" || pair[1] !== "immune-modulating-biofilm";
  const effects = compatible
    ? NEUTRAL_EFFECTS
    : Object.freeze({
        substrateConversionMultiplier: 0.9,
        inflammationDurationMultiplier: 1.2,
        immuneVisibilityDelta: 1,
      });
  const compatibility: MicrobiomeCompatibility = {
    kind: compatible ? "compatible" : "incompatible",
    label: compatible ? "Compatible communities" : "Incompatible communities",
    effects,
  };
  return Object.freeze(compatibility);
}

function compositionFromPair(id: string, pair: CompositionPair): MicrobiomeCompositionSnapshot {
  const first = MICROBIOME_BY_ID[pair[0]];
  const second = MICROBIOME_BY_ID[pair[1]];
  const niches = Object.freeze([
    Object.freeze({
      nicheId: MICROBIOME_NICHE_IDS[0],
      communityId: first.id,
      label: first.displayName,
      effects: first.effects,
    }),
    Object.freeze({
      nicheId: MICROBIOME_NICHE_IDS[1],
      communityId: second.id,
      label: second.displayName,
      effects: second.effects,
    }),
  ] as const);
  const compatibility = compatibilityFor(pair);
  const composition = {
    id: microbiomeCompositionId(id),
    niches,
    compatibility,
  };
  return Object.freeze(composition);
}

export const MICROBIOME_COMPOSITION_CATALOG: readonly MicrobiomeCompositionSnapshot[] =
  Object.freeze(
    Object.entries(COMPOSITION_PAIRS).map(([id, pair]) => compositionFromPair(id, pair)),
  );

export function findMicrobiomeCommunity(
  id: MicrobiomeCommunityId,
): MicrobiomeCommunityDefinition | undefined {
  return MICROBIOME_COMMUNITY_CATALOG.find((community) => community.id === id);
}

export function findMicrobiomeComposition(
  id: MicrobiomeCompositionId,
): MicrobiomeCompositionSnapshot | undefined {
  return MICROBIOME_COMPOSITION_CATALOG.find((composition) => composition.id === id);
}

export function isMicrobiomePool(id: MicrobiomePoolId): boolean {
  return id === MICROBIOME_POOL_ID;
}

export function assertMicrobiomeCompositionSnapshot(
  composition: MicrobiomeCompositionSnapshot,
): void {
  const catalogComposition = findMicrobiomeComposition(composition.id);
  if (!catalogComposition) throw new Error("Microbiome composition is unknown.");
  if (composition.niches.length !== 2)
    throw new Error("Microbiome composition must fill two niches.");
  for (let index = 0; index < composition.niches.length; index += 1) {
    const niche = composition.niches[index];
    const expected = catalogComposition.niches[index];
    if (
      !niche ||
      !expected ||
      niche.nicheId !== expected.nicheId ||
      niche.communityId !== expected.communityId
    )
      throw new Error("Microbiome composition niche does not match its catalog snapshot.");
  }
  if (composition.compatibility.kind !== catalogComposition.compatibility.kind)
    throw new Error("Microbiome composition compatibility does not match its catalog snapshot.");
}

export function assertMicrobiomeCatalog(
  communities: readonly MicrobiomeCommunityDefinition[] = MICROBIOME_COMMUNITY_CATALOG,
  compositions: readonly MicrobiomeCompositionSnapshot[] = MICROBIOME_COMPOSITION_CATALOG,
): void {
  if (communities.length !== 4 || compositions.length !== 4)
    throw new Error("Microbiome catalog must contain its four communities and four compositions.");
  const communityIds = new Set(communities.map((community) => community.id));
  const compositionIds = new Set(compositions.map((composition) => composition.id));
  if (communityIds.size !== communities.length || compositionIds.size !== compositions.length)
    throw new Error("Microbiome catalog identifiers must be unique.");
  for (const composition of compositions) assertMicrobiomeCompositionSnapshot(composition);
}

assertMicrobiomeCatalog();
