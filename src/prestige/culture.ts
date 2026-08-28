import { colonizationProgramId, cryobankProgramId, passageUpgradeId } from "../brands.js";
import { findColonizationProgram } from "./seeding.js";
import type {
  ColonizationProgramId,
  CryobankProgramId,
  PassageUpgradeId,
  ProducerId,
} from "../types/ids.js";
import type { LineageLedger } from "./layers.js";

export type CultureState = Readonly<{
  passages: number;
  purchasedPassageUpgrades: readonly Readonly<{
    upgradeId: PassageUpgradeId;
    rank: number;
  }>[];
  cryobankProgram: CryobankProgramId | null;
  queuedProducerAction: QueuedProducerAction | null;
}>;
export type QueuedProducerAction = Readonly<{
  producerId: ProducerId;
  queuedAtEventSequence: number;
  queuedAtActiveMs: number;
}>;

export type PassageUpgradeDefinition = Readonly<{
  id: PassageUpgradeId;
  maximumRank: number;
  costByRank: readonly number[];
  behaviorTarget:
    | "producer-action-queue"
    | "cryobank-program"
    | "plasticity-program-path"
    | "epigenetic-reconfiguration"
    | "network-containment";
  eligibility: "always" | "completed-host-transfer" | "hallmark-diversity";
}>;

export type CryobankProgramDefinition = Readonly<{
  id: CryobankProgramId;
  colonizationProgramId: ColonizationProgramId;
  relationId: string;
  effects: Readonly<{
    phenotypePreference: "proliferative" | "migratory" | "stress-tolerant";
    substrateConversionMultiplier: number;
    routeRiskDelta: number;
  }>;
}>;

export type ImmortalizationQuoteV1 = Readonly<{
  sourceEventSequence: number;
  passagesAwarded: number;
  available: boolean;
  reason: "available" | "missing-host-transfer" | "missing-boon" | "missing-hallmark-diversity";
}>;
export type CryobankProgramQuote = Readonly<{
  available: boolean;
  reason: "available" | "cryobank-not-acquired" | "unknown-cryobank-program";
  program: CryobankProgramDefinition | null;
}>;
export type ImmortalizationCryobankSelectionQuote = Readonly<{
  available: boolean;
  reason:
    | "available"
    | "immortalization-unavailable"
    | "unknown-cryobank-program"
    | "source-program-mismatch"
    | "insufficient-new-passages";
  passagesAwarded: number;
  cryobankCost: number | null;
  remainingAwardedPassages: number | null;
  program: CryobankProgramDefinition | null;
}>;

const ASSAY_DISCIPLINE_COSTS = Object.freeze([1]);
const CRYOBANK_COSTS = Object.freeze([2]);
const HIGH_THROUGHPUT_COSTS = Object.freeze([2]);
const CULTURE_PROTOCOL_COSTS = Object.freeze([2, 3]);
const CONTAINMENT_COSTS = Object.freeze([3]);

export const PASSAGE_UPGRADE_CATALOG: readonly PassageUpgradeDefinition[] = Object.freeze([
  Object.freeze({
    id: passageUpgradeId("cryobank"),
    maximumRank: 1,
    costByRank: CRYOBANK_COSTS,
    behaviorTarget: "cryobank-program",
    eligibility: "completed-host-transfer",
  }),
  Object.freeze({
    id: passageUpgradeId("assay_discipline"),
    maximumRank: 1,
    costByRank: ASSAY_DISCIPLINE_COSTS,
    behaviorTarget: "producer-action-queue",
    eligibility: "always",
  }),
  Object.freeze({
    id: passageUpgradeId("high_throughput"),
    maximumRank: 1,
    costByRank: HIGH_THROUGHPUT_COSTS,
    behaviorTarget: "plasticity-program-path",
    eligibility: "completed-host-transfer",
  }),
  Object.freeze({
    id: passageUpgradeId("culture_protocol"),
    maximumRank: 2,
    costByRank: CULTURE_PROTOCOL_COSTS,
    behaviorTarget: "epigenetic-reconfiguration",
    eligibility: "hallmark-diversity",
  }),
  Object.freeze({
    id: passageUpgradeId("containment"),
    maximumRank: 1,
    costByRank: CONTAINMENT_COSTS,
    behaviorTarget: "network-containment",
    eligibility: "completed-host-transfer",
  }),
]);

export const CRYOBANK_PROGRAM_CATALOG: readonly CryobankProgramDefinition[] = Object.freeze([
  Object.freeze({
    id: cryobankProgramId("cryobank_exploit"),
    colonizationProgramId: colonizationProgramId("exploit_niche"),
    relationId: "cryobank-exploit-proliferation",
    effects: Object.freeze({
      phenotypePreference: "proliferative",
      substrateConversionMultiplier: 1.06,
      routeRiskDelta: 0.03,
    }),
  }),
  Object.freeze({
    id: cryobankProgramId("cryobank_occult"),
    colonizationProgramId: colonizationProgramId("occult_niche"),
    relationId: "cryobank-occult-resilience",
    effects: Object.freeze({
      phenotypePreference: "stress-tolerant",
      substrateConversionMultiplier: 0.96,
      routeRiskDelta: -0.05,
    }),
  }),
  Object.freeze({
    id: cryobankProgramId("cryobank_remodel"),
    colonizationProgramId: colonizationProgramId("remodel_niche"),
    relationId: "cryobank-remodel-migration",
    effects: Object.freeze({
      phenotypePreference: "migratory",
      substrateConversionMultiplier: 1,
      routeRiskDelta: -0.02,
    }),
  }),
]);

function requireSafeNatural(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${label} must be a safe natural.`);
}

export function createEmptyCultureState(): CultureState {
  return Object.freeze({
    passages: 0,
    purchasedPassageUpgrades: Object.freeze([]),
    cryobankProgram: null,
    queuedProducerAction: null,
  });
}

export function findPassageUpgrade(id: PassageUpgradeId): PassageUpgradeDefinition | undefined {
  return PASSAGE_UPGRADE_CATALOG.find((upgrade) => upgrade.id === id);
}

export function findCryobankProgram(id: CryobankProgramId): CryobankProgramDefinition | undefined {
  return CRYOBANK_PROGRAM_CATALOG.find((program) => program.id === id);
}

export function hasPassageUpgrade(state: CultureState, upgradeId: PassageUpgradeId): boolean {
  const purchase = state.purchasedPassageUpgrades.find((item) => item.upgradeId === upgradeId);
  return purchase !== undefined && purchase.rank > 0;
}

/** Computes the L3 selection gate from durable culture state and a catalog-owned program. */
export function cryobankProgramQuote(
  state: CultureState,
  programId: CryobankProgramId,
): CryobankProgramQuote {
  const program = findCryobankProgram(programId);
  if (!program) {
    return Object.freeze({ available: false, reason: "unknown-cryobank-program", program: null });
  }
  if (!hasPassageUpgrade(state, passageUpgradeId("cryobank"))) {
    return Object.freeze({ available: false, reason: "cryobank-not-acquired", program: null });
  }
  return Object.freeze({ available: true, reason: "available", program });
}

/**
 * Quotes the one L3 transition that can retain a selected L1 program as culture:
 * an accepted immortalization buys cryobank rank one from its newly awarded Passages.
 */
export function immortalizationCryobankSelectionQuote(
  ledger: LineageLedger,
  sourceEventSequence: number,
  activeColonizationProgramId: ColonizationProgramId | null,
  selectedProgramId: CryobankProgramId,
): ImmortalizationCryobankSelectionQuote {
  const immortalization = immortalizationQuoteV1(ledger, sourceEventSequence);
  const program = findCryobankProgram(selectedProgramId);
  const upgrade = findPassageUpgrade(passageUpgradeId("cryobank"));
  const cryobankCost = upgrade?.costByRank[0] ?? null;
  if (!immortalization.available) {
    return Object.freeze({
      available: false,
      reason: "immortalization-unavailable",
      passagesAwarded: immortalization.passagesAwarded,
      cryobankCost,
      remainingAwardedPassages: null,
      program: null,
    });
  }
  if (!program) {
    return Object.freeze({
      available: false,
      reason: "unknown-cryobank-program",
      passagesAwarded: immortalization.passagesAwarded,
      cryobankCost,
      remainingAwardedPassages: null,
      program: null,
    });
  }
  if (activeColonizationProgramId !== program.colonizationProgramId) {
    return Object.freeze({
      available: false,
      reason: "source-program-mismatch",
      passagesAwarded: immortalization.passagesAwarded,
      cryobankCost,
      remainingAwardedPassages: null,
      program: null,
    });
  }
  if (cryobankCost === null || immortalization.passagesAwarded < cryobankCost) {
    return Object.freeze({
      available: false,
      reason: "insufficient-new-passages",
      passagesAwarded: immortalization.passagesAwarded,
      cryobankCost,
      remainingAwardedPassages: null,
      program: null,
    });
  }
  const remainingAwardedPassages = immortalization.passagesAwarded - cryobankCost;
  return Object.freeze({
    available: true,
    reason: "available",
    passagesAwarded: immortalization.passagesAwarded,
    cryobankCost,
    remainingAwardedPassages,
    program,
  });
}

/** The culture catalog deliberately translates only surviving, declared L1 programs. */
export function assertCryobankProgramCatalog(): void {
  for (const program of CRYOBANK_PROGRAM_CATALOG) {
    if (!findColonizationProgram(program.colonizationProgramId)) {
      throw new Error(`Cryobank program ${program.id} references an unknown colonization program.`);
    }
  }
}

export function passageUpgradeQuote(
  ledger: LineageLedger,
  state: CultureState,
  upgradeId: PassageUpgradeId,
): Readonly<{ available: boolean; cost: number | null; reason: string }> {
  const upgrade = findPassageUpgrade(upgradeId);
  if (!upgrade) return Object.freeze({ available: false, cost: null, reason: "unknown-upgrade" });
  const purchase = state.purchasedPassageUpgrades.find((item) => item.upgradeId === upgradeId);
  const currentRank = purchase?.rank ?? 0;
  requireSafeNatural(currentRank, "Passage upgrade rank");
  if (currentRank >= upgrade.maximumRank)
    return Object.freeze({ available: false, cost: null, reason: "maximum-rank" });
  const eligibilityMet =
    upgrade.eligibility === "always" ||
    (upgrade.eligibility === "completed-host-transfer" && ledger.completedHostTransferCount > 0) ||
    (upgrade.eligibility === "hallmark-diversity" &&
      ledger.chosenHallmarksAcrossLineage.length >= 4);
  if (!eligibilityMet) return Object.freeze({ available: false, cost: null, reason: "ineligible" });
  const cost = upgrade.costByRank[currentRank];
  if (cost === undefined) throw new Error("Passage catalog rank cost is incomplete.");
  return Object.freeze({
    available: state.passages >= cost,
    cost,
    reason: state.passages >= cost ? "available" : "insufficient-passages",
  });
}

export function immortalizationQuoteV1(
  ledger: LineageLedger,
  sourceEventSequence: number,
): ImmortalizationQuoteV1 {
  requireSafeNatural(sourceEventSequence, "Immortalization source event sequence");
  const diversity = ledger.chosenHallmarksAcrossLineage.length;
  const stablePreparationBonus = ledger.terminalPreparation?.eligible === true ? 1 : 0;
  const passagesAwarded =
    1 + ledger.completedHostTransferCount + Math.floor(diversity / 4) + stablePreparationBonus;
  const reason =
    ledger.completedHostTransferCount < 1
      ? "missing-host-transfer"
      : ledger.usedLineageBoonIds.length < 1
        ? "missing-boon"
        : diversity < 1
          ? "missing-hallmark-diversity"
          : "available";
  return Object.freeze({
    sourceEventSequence,
    passagesAwarded,
    available: reason === "available",
    reason,
  });
}

assertCryobankProgramCatalog();
