import { lateProgramOptionId } from "../brands.js";
import type { HallmarkId, LateProgramOptionId } from "../types/ids.js";
import type { LateProgramDefinition, LateProgramTarget } from "./late_hallmark_types.js";

export const LATE_PROGRAM_OPTION_KEYS = [
  "signaling:burst-bias",
  "signaling:cycle-bias",
  "mutation:contain-liability",
  "mutation:amplify-benefit",
  "plasticity:commit-growth",
  "plasticity:commit-survival",
] as const;

type LateProgramOptionKey = (typeof LATE_PROGRAM_OPTION_KEYS)[number];
type ProgramByKey = Readonly<Record<LateProgramOptionKey, LateProgramDefinition>>;

const PROGRAM_BY_KEY = Object.freeze({
  "signaling:burst-bias": Object.freeze({
    id: lateProgramOptionId("signaling:burst-bias"),
    target: "proliferative_signaling",
    displayName: "Burst-biased signaling",
    atpCost: 12,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 1,
      routeRiskDelta: 0,
      pressureDelta: 1,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
  "signaling:cycle-bias": Object.freeze({
    id: lateProgramOptionId("signaling:cycle-bias"),
    target: "proliferative_signaling",
    displayName: "Cycle-biased signaling",
    atpCost: 12,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 1.12,
      routeRiskDelta: 0,
      pressureDelta: 0,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
  "mutation:contain-liability": Object.freeze({
    id: lateProgramOptionId("mutation:contain-liability"),
    target: "genome_instability_mutation",
    displayName: "Contain mutation liability",
    atpCost: 18,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 0.96,
      routeRiskDelta: 0,
      pressureDelta: -1,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
  "mutation:amplify-benefit": Object.freeze({
    id: lateProgramOptionId("mutation:amplify-benefit"),
    target: "genome_instability_mutation",
    displayName: "Amplify mutation benefit",
    atpCost: 18,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 1.14,
      routeRiskDelta: 0.05,
      pressureDelta: 1,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
  "plasticity:commit-growth": Object.freeze({
    id: lateProgramOptionId("plasticity:commit-growth"),
    target: "phenotypic_plasticity",
    displayName: "Commit plasticity to growth",
    atpCost: 15,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 1.1,
      routeRiskDelta: 0.05,
      pressureDelta: 1,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
  "plasticity:commit-survival": Object.freeze({
    id: lateProgramOptionId("plasticity:commit-survival"),
    target: "phenotypic_plasticity",
    displayName: "Commit plasticity to survival",
    atpCost: 15,
    cooldownMs: 120_000,
    effects: Object.freeze({
      productionPerSecondMultiplier: 0.98,
      routeRiskDelta: -0.05,
      pressureDelta: -1,
    }),
    morphologyContributorId: "hallmark:epigenetic_reprogramming",
  }),
} satisfies ProgramByKey);

export const LATE_PROGRAM_CATALOG: readonly LateProgramDefinition[] = Object.freeze(
  LATE_PROGRAM_OPTION_KEYS.map((key) => PROGRAM_BY_KEY[key]),
);

export function findLateProgramOption(id: LateProgramOptionId): LateProgramDefinition | undefined {
  return LATE_PROGRAM_CATALOG.find((definition) => definition.id === id);
}

export function lateProgramOptionsForTarget(
  target: LateProgramTarget,
): readonly LateProgramDefinition[] {
  const options = LATE_PROGRAM_CATALOG.filter((definition) => definition.target === target);
  return Object.freeze(options);
}

export function isLateProgramOptionAllowed(
  hallmarkId: HallmarkId,
  optionId: LateProgramOptionId,
): boolean {
  const option = findLateProgramOption(optionId);
  return option?.target === hallmarkId;
}

export function assertLateProgramCatalog(
  definitions: readonly LateProgramDefinition[] = LATE_PROGRAM_CATALOG,
): void {
  if (definitions.length !== LATE_PROGRAM_OPTION_KEYS.length)
    throw new Error("Late-program catalog must contain every declared option.");
  const ids = new Set(definitions.map((definition) => definition.id));
  if (ids.size !== definitions.length)
    throw new Error("Late-program catalog must have unique option IDs.");
  for (const key of LATE_PROGRAM_OPTION_KEYS) {
    if (!ids.has(lateProgramOptionId(key)))
      throw new Error("Late-program catalog is missing a declared option.");
  }
  for (const definition of definitions) {
    if (!Number.isSafeInteger(definition.atpCost) || definition.atpCost <= 0)
      throw new Error("Late-program ATP cost must be a positive safe integer.");
    if (!Number.isSafeInteger(definition.cooldownMs) || definition.cooldownMs <= 0)
      throw new Error("Late-program cooldown must be a positive simulation-time duration.");
  }
}

assertLateProgramCatalog();
