/**
 * Pure L3 culture modifiers. Culture is the only source for these effects:
 * L1 allocation and site state have intentionally been cleared before this
 * adapter is consulted.
 */
import { passageUpgradeId } from "../brands.js";
import type { Phenotype } from "../types/state.js";
import { findCryobankProgram, hasPassageUpgrade } from "./culture.js";
import type { GameState } from "../types/state.js";

export type CultureEffects = Readonly<{
  substrateConversionMultiplier: number;
  routeRiskDelta: number;
  phenotypePreference: Phenotype | null;
}>;

const NEUTRAL_CULTURE_EFFECTS: CultureEffects = Object.freeze({
  substrateConversionMultiplier: 1,
  routeRiskDelta: 0,
  phenotypePreference: null,
});

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number, label: string): number {
  return Math.min(maximum, Math.max(minimum, requireFinite(value, label)));
}

function cultureProtocolRank(state: GameState): number {
  const purchase = state.culture.purchasedPassageUpgrades.find(
    (candidate) => candidate.upgradeId === passageUpgradeId("culture_protocol"),
  );
  return purchase?.rank ?? 0;
}

/** Resolves the selected cryobank translation without consulting cleared L1 state. */
export function cultureEffects(state: GameState): CultureEffects {
  const selectedProgramId = state.culture.cryobankProgram;
  if (selectedProgramId === null) return NEUTRAL_CULTURE_EFFECTS;
  const program = findCryobankProgram(selectedProgramId);
  if (!program) throw new Error("Culture cryobank program is not catalog-backed.");
  if (!hasPassageUpgrade(state.culture, passageUpgradeId("cryobank"))) {
    throw new Error("Culture cryobank program requires its purchased passage upgrade.");
  }
  return Object.freeze({
    substrateConversionMultiplier: clamp(
      program.effects.substrateConversionMultiplier,
      0.5,
      1.5,
      "Culture conversion",
    ),
    routeRiskDelta: clamp(program.effects.routeRiskDelta, -1, 1, "Culture route risk"),
    phenotypePreference: program.effects.phenotypePreference,
  });
}

/** Applies culture after M14's current-run conversion contribution. */
export function cultureSubstrateConversion(state: GameState, baseMultiplier: number): number {
  return clamp(
    requireFinite(baseMultiplier, "Base substrate conversion") *
      cultureEffects(state).substrateConversionMultiplier,
    0.5,
    1.5,
    "Culture substrate conversion",
  );
}

/** Applies the saved culture route preference as the final risk adjustment. */
export function cultureRouteRisk(state: GameState, rawRisk: number): number {
  return clamp(
    requireFinite(rawRisk, "Raw route risk") + cultureEffects(state).routeRiskDelta,
    0,
    1,
    "Culture route risk",
  );
}

export function culturePhenotypePreference(state: GameState): Phenotype | null {
  return cultureEffects(state).phenotypePreference;
}

/**
 * Ordinary late interfaces remain available through the first 2022 run. Once
 * immortalization has minted a network seed, high-throughput becomes the
 * additional culture-owned requirement.
 */
export function cultureLateProgramInterfacesAvailable(state: GameState): boolean {
  return (
    state.lineageLedger.networkSeed === null ||
    hasPassageUpgrade(state.culture, passageUpgradeId("high_throughput"))
  );
}

/**
 * Shortens only newly written late-program deadlines. Existing mutation IDs,
 * liabilities, and other late state remain outside this scalar helper.
 */
export function cultureProtocolCooldownDeadline(
  state: GameState,
  atMs: number,
  ordinaryDeadlineMs: number,
): number {
  if (!Number.isSafeInteger(atMs) || atMs < 0) throw new Error("Cooldown time must be natural.");
  if (!Number.isSafeInteger(ordinaryDeadlineMs) || ordinaryDeadlineMs < atMs) {
    throw new Error("Cooldown deadline must be a natural future deadline.");
  }
  const rank = cultureProtocolRank(state);
  if (rank === 0) return ordinaryDeadlineMs;
  if (rank < 0 || rank > 2) throw new Error("Culture protocol rank is invalid.");
  const duration = ordinaryDeadlineMs - atMs;
  const retainedFraction = rank === 1 ? 0.75 : 0.5;
  const shortenedDuration = Math.ceil(duration * retainedFraction);
  return atMs + shortenedDuration;
}
