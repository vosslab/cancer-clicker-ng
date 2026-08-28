import type { Phenotype } from "../types/state.js";
import type { PlasticityDefinition } from "./late_hallmark_types.js";

export const PLASTICITY_PHENOTYPES = [
  "proliferative",
  "migratory",
  "stress-tolerant",
] as const satisfies readonly Phenotype[];

const PLASTICITY_BY_PHENOTYPE = Object.freeze({
  proliferative: Object.freeze({
    phenotype: "proliferative",
    displayName: "Proliferative",
    effects: Object.freeze({
      productionPerSecondMultiplier: 1.2,
      routeRiskDelta: 0.1,
      pressureDelta: 1,
    }),
    switchCooldownMs: 60_000,
    morphologyContributorId: "hallmark:phenotypic_plasticity",
  }),
  migratory: Object.freeze({
    phenotype: "migratory",
    displayName: "Migratory",
    effects: Object.freeze({
      productionPerSecondMultiplier: 0.85,
      routeRiskDelta: -0.2,
      pressureDelta: 0,
    }),
    switchCooldownMs: 60_000,
    morphologyContributorId: "hallmark:phenotypic_plasticity",
  }),
  "stress-tolerant": Object.freeze({
    phenotype: "stress-tolerant",
    displayName: "Stress-tolerant",
    effects: Object.freeze({
      productionPerSecondMultiplier: 0.95,
      routeRiskDelta: 0,
      pressureDelta: -1,
    }),
    switchCooldownMs: 60_000,
    morphologyContributorId: "hallmark:phenotypic_plasticity",
  }),
} satisfies Readonly<Record<Phenotype, PlasticityDefinition>>);

export const PLASTICITY_CATALOG: readonly PlasticityDefinition[] = Object.freeze(
  PLASTICITY_PHENOTYPES.map((phenotype) => PLASTICITY_BY_PHENOTYPE[phenotype]),
);

export function plasticityDefinition(phenotype: Phenotype): PlasticityDefinition {
  return PLASTICITY_BY_PHENOTYPE[phenotype];
}

export function assertPlasticityCatalog(
  definitions: readonly PlasticityDefinition[] = PLASTICITY_CATALOG,
): void {
  if (definitions.length !== PLASTICITY_PHENOTYPES.length)
    throw new Error("Plasticity catalog must contain every phenotype.");
  const phenotypes = new Set(definitions.map((definition) => definition.phenotype));
  if (phenotypes.size !== definitions.length)
    throw new Error("Plasticity catalog must have unique phenotypes.");
  for (const phenotype of PLASTICITY_PHENOTYPES) {
    if (!phenotypes.has(phenotype)) throw new Error("Plasticity catalog is missing a phenotype.");
  }
  for (const definition of definitions) {
    if (!Number.isSafeInteger(definition.switchCooldownMs) || definition.switchCooldownMs <= 0)
      throw new Error("Plasticity cooldown must be a positive simulation-time duration.");
    if (
      !Number.isFinite(definition.effects.productionPerSecondMultiplier) ||
      definition.effects.productionPerSecondMultiplier <= 0
    )
      throw new Error("Plasticity production multiplier must be finite and positive.");
  }
}

assertPlasticityCatalog();
