import type {
  SenescenceAction,
  SenescenceCause,
  SenescenceDefinition,
} from "./late_hallmark_types.js";

export const SENESCENCE_CAUSES = [
  "replicative-limit",
  "damage-failure",
] as const satisfies readonly SenescenceCause[];
export const SENESCENCE_ACTIONS = ["keep", "clear"] as const satisfies readonly SenescenceAction[];

const SENESCENCE_BY_CAUSE = Object.freeze({
  "replicative-limit": Object.freeze({
    cause: "replicative-limit",
    retainedEffects: Object.freeze({
      localSecretoryPressureDelta: 1,
      productionPerSecondMultiplier: 0,
    }),
    morphologyContributorId: "hallmark:senescent_cells",
  }),
  "damage-failure": Object.freeze({
    cause: "damage-failure",
    retainedEffects: Object.freeze({
      localSecretoryPressureDelta: 2,
      productionPerSecondMultiplier: 0,
    }),
    morphologyContributorId: "hallmark:senescent_cells",
  }),
} satisfies Readonly<Record<SenescenceCause, SenescenceDefinition>>);

export const SENESCENCE_CATALOG: readonly SenescenceDefinition[] = Object.freeze(
  SENESCENCE_CAUSES.map((cause) => SENESCENCE_BY_CAUSE[cause]),
);

export function senescenceDefinition(cause: SenescenceCause): SenescenceDefinition {
  return SENESCENCE_BY_CAUSE[cause];
}

export function isSenescenceAction(value: string): value is SenescenceAction {
  return (SENESCENCE_ACTIONS as readonly string[]).includes(value);
}

export function assertSenescenceCatalog(
  definitions: readonly SenescenceDefinition[] = SENESCENCE_CATALOG,
): void {
  if (definitions.length !== SENESCENCE_CAUSES.length)
    throw new Error("Senescence catalog must contain every failure cause.");
  const causes = new Set(definitions.map((definition) => definition.cause));
  if (causes.size !== definitions.length)
    throw new Error("Senescence catalog causes must be unique.");
  for (const cause of SENESCENCE_CAUSES) {
    if (!causes.has(cause)) throw new Error("Senescence catalog is missing a failure cause.");
  }
  for (const definition of definitions) {
    if (definition.retainedEffects.productionPerSecondMultiplier !== 0)
      throw new Error("Retained senescence must prevent regional division.");
  }
}

assertSenescenceCatalog();
