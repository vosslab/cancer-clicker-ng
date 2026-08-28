import type {
  EventId,
  HallmarkId,
  LateProgramOptionId,
  MicrobiomeCommunityId,
  MicrobiomeCompositionId,
  MicrobiomeNicheId,
  MicrobiomeOfferId,
  MicrobiomePoolId,
  RegionId,
  StageId,
} from "../types/ids.js";
import type { Phenotype } from "../types/state.js";
import type { StageActionId } from "../stages/stage_types.js";

export type LateHallmarkKey =
  | "phenotypic_plasticity"
  | "epigenetic_reprogramming"
  | "polymorphic_microbiomes"
  | "senescent_cells";

export type LateHallmarkMechanicClass =
  "phenotype-switching" | "program-editing" | "community-composition" | "senescence-management";

export type LateHallmarkMorphologyContributorId =
  | "hallmark:phenotypic_plasticity"
  | "hallmark:epigenetic_reprogramming"
  | "hallmark:polymorphic_microbiomes"
  | "hallmark:senescent_cells";

export type LateHallmarkActivationRequirement = Readonly<{
  stageId: StageId;
  capability: StageActionId;
  prestigeId: "L3" | null;
}>;

export type LateHallmarkDefinition = Readonly<{
  key: LateHallmarkKey;
  id: HallmarkId;
  displayName: string;
  mechanicClass: LateHallmarkMechanicClass;
  activation: LateHallmarkActivationRequirement;
  morphologyContributorId: LateHallmarkMorphologyContributorId;
  purchase: Readonly<{ eventType: "purchase-hallmark"; initialLevel: 1; maximumLevel: 1 }>;
}>;

export type PhenotypeEffects = Readonly<{
  productionPerSecondMultiplier: number;
  routeRiskDelta: number;
  pressureDelta: number;
}>;

export type PlasticityDefinition = Readonly<{
  phenotype: Phenotype;
  displayName: string;
  effects: PhenotypeEffects;
  switchCooldownMs: number;
  morphologyContributorId: "hallmark:phenotypic_plasticity";
}>;

export type LateProgramTarget =
  "proliferative_signaling" | "genome_instability_mutation" | "phenotypic_plasticity";

export type ProgramEffects = Readonly<{
  productionPerSecondMultiplier: number;
  routeRiskDelta: number;
  pressureDelta: number;
}>;

export type LateProgramDefinition = Readonly<{
  id: LateProgramOptionId;
  target: LateProgramTarget;
  displayName: string;
  atpCost: number;
  cooldownMs: number;
  effects: ProgramEffects;
  morphologyContributorId: "hallmark:epigenetic_reprogramming";
}>;

export type MicrobiomeEffects = Readonly<{
  substrateConversionMultiplier: number;
  inflammationDurationMultiplier: number;
  immuneVisibilityDelta: number;
}>;

export type MicrobiomeCommunityDefinition = Readonly<{
  id: MicrobiomeCommunityId;
  displayName: string;
  effects: MicrobiomeEffects;
  morphologyContributorId: "hallmark:polymorphic_microbiomes";
}>;

export type MicrobiomeNicheSnapshot = Readonly<{
  nicheId: MicrobiomeNicheId;
  communityId: MicrobiomeCommunityId;
  label: string;
  effects: MicrobiomeEffects;
}>;

export type MicrobiomeCompatibility = Readonly<{
  kind: "compatible" | "incompatible";
  label: string;
  effects: MicrobiomeEffects;
}>;

export type MicrobiomeCompositionSnapshot = Readonly<{
  id: MicrobiomeCompositionId;
  niches: readonly [MicrobiomeNicheSnapshot, MicrobiomeNicheSnapshot];
  compatibility: MicrobiomeCompatibility;
}>;

export type MicrobiomeOfferSnapshot = Readonly<{
  id: MicrobiomeOfferId;
  poolId: MicrobiomePoolId;
  compositions: readonly [
    MicrobiomeCompositionSnapshot,
    MicrobiomeCompositionSnapshot,
    MicrobiomeCompositionSnapshot,
  ];
  sourceSeed: number;
  sourceSequence: number;
  sourceStage: StageId;
  expiresAtMs: number;
}>;

export type ProgramAssignment = Readonly<{
  hallmarkId: HallmarkId;
  optionId: LateProgramOptionId;
}>;

export type ActiveMicrobiomeComposition = Readonly<{
  offerId: MicrobiomeOfferId;
  composition: MicrobiomeCompositionSnapshot;
  installedAtMs: number;
}>;

export type SenescenceCause = "replicative-limit" | "damage-failure";
export type SenescenceAction = "keep" | "clear";

export type SenescenceDecision = Readonly<{
  id: EventId;
  regionId: RegionId;
  cause: SenescenceCause;
  createdAtMs: number;
}>;

export type RetainedSenescence = Readonly<{
  decisionId: EventId;
  regionId: RegionId;
  cause: SenescenceCause;
  createdAtMs: number;
  retainedAtMs: number;
}>;

export type LateHallmarksState = Readonly<{
  plasticity: Readonly<{ switchCooldownByRegion: Readonly<Record<string, number>> }>;
  epigenetic: Readonly<{
    assignments: readonly ProgramAssignment[];
    cooldownDeadlineMs: number | null;
  }>;
  microbiome: Readonly<{
    activeComposition: ActiveMicrobiomeComposition | null;
    pendingOffer: MicrobiomeOfferSnapshot | null;
    nextRotationDeadlineMs: number | null;
    rotationSequence: number;
  }>;
  senescence: Readonly<{
    pendingDecisions: readonly SenescenceDecision[];
    retainedRegions: readonly RetainedSenescence[];
  }>;
}>;

/** Creates the p5 migration baseline without retaining any provisional late-hallmark scaffolding. */
export function emptyLateHallmarksState(): LateHallmarksState {
  const state = {
    plasticity: Object.freeze({ switchCooldownByRegion: Object.freeze({}) }),
    epigenetic: Object.freeze({ assignments: Object.freeze([]), cooldownDeadlineMs: null }),
    microbiome: Object.freeze({
      activeComposition: null,
      pendingOffer: null,
      nextRotationDeadlineMs: null,
      rotationSequence: 0,
    }),
    senescence: Object.freeze({
      pendingDecisions: Object.freeze([]),
      retainedRegions: Object.freeze([]),
    }),
  };
  return Object.freeze(state);
}

export type SenescenceDefinition = Readonly<{
  cause: SenescenceCause;
  retainedEffects: Readonly<{
    localSecretoryPressureDelta: number;
    productionPerSecondMultiplier: number;
  }>;
  morphologyContributorId: "hallmark:senescent_cells";
}>;
