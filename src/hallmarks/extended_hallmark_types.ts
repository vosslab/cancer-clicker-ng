import { bigNum } from "../brands.js";
import type { BigNum } from "../types/bignum.js";
import type { HallmarkId, MutationId, OfferId, RegionId, StageId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { StageActionId } from "../stages/stage_types.js";

/** The four extended branches are a closed subset of the canonical 14-hallmark registry. */
export type ExtendedHallmarkKey =
  | "metabolic_deregulation"
  | "immune_destruction_avoidance"
  | "tumor_promoting_inflammation"
  | "genome_instability_mutation";

export type ExtendedHallmarkMechanicClass =
  "energy-budgeting" | "visibility-management" | "event-cultivation" | "mutation-drafting";

export type ExtendedHallmarkHandlerId =
  | "apply-metabolic-conversion"
  | "apply-immune-visibility"
  | "apply-inflammation-episode"
  | "apply-mutation-selection";

export type AtpSinkId = "acceleration" | "vessel-maintenance" | "mutation-drafting";

/**
 * This is the raw-event/save transport form of a BigNum. It deliberately is
 * not the opaque BigNum domain value, which only trusted constructors create.
 */
export type CanonicalBigNumDto = Readonly<{ mantissa: number; exponent: number }>;

/** Rejects hostile, noncanonical, zero, negative, or structural conversion amounts. */
export function parsePositiveCanonicalBigNumDto(value: unknown): CanonicalBigNumDto {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  )
    throw new Error("Conversion amount is invalid.");
  const keys = Object.getOwnPropertyNames(value);
  if (keys.length !== 2 || !keys.includes("mantissa") || !keys.includes("exponent"))
    throw new Error("Conversion amount is invalid.");
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const mantissa = descriptors.mantissa;
  const exponent = descriptors.exponent;
  if (
    !mantissa ||
    !("value" in mantissa) ||
    !mantissa.enumerable ||
    !exponent ||
    !("value" in exponent) ||
    !exponent.enumerable ||
    typeof mantissa.value !== "number" ||
    typeof exponent.value !== "number" ||
    !Number.isFinite(mantissa.value) ||
    !Number.isSafeInteger(exponent.value)
  )
    throw new Error("Conversion amount is invalid.");
  const restored = bigNum(mantissa.value, exponent.value);
  if (
    restored.mantissa !== mantissa.value ||
    restored.exponent !== exponent.value ||
    restored.mantissa <= 0
  )
    throw new Error("Conversion amount must be positive and canonical.");
  return { mantissa: restored.mantissa, exponent: restored.exponent };
}

/** Converts a validated raw DTO only at the trusted parser-to-domain seam. */
export function bigNumFromConversionAmount(amount: CanonicalBigNumDto): BigNum {
  return bigNum(amount.mantissa, amount.exponent);
}

export type ConvertSubstrateOperation = Readonly<{
  type: "convert-substrate";
  hallmark: "metabolic_deregulation";
  amount: CanonicalBigNumDto;
}>;
export type SetRegionMaskOperation = Readonly<{
  type: "set-region-mask";
  hallmark: "immune_destruction_avoidance";
  regionId: RegionId;
  masked: boolean;
}>;
export type ActivateInflammationOperation = Readonly<{
  type: "activate-inflammation";
  hallmark: "tumor_promoting_inflammation";
  regionId: RegionId;
}>;
export type SelectMutationOperation = Readonly<{
  type: "select-mutation";
  hallmark: "genome_instability_mutation";
  offerId: OfferId;
  mutationId: MutationId;
}>;

/** Parsed extended-hallmark operations are closed domain commands, never raw DOM records. */
export type ExtendedHallmarkOperation =
  | ConvertSubstrateOperation
  | SetRegionMaskOperation
  | ActivateInflammationOperation
  | SelectMutationOperation;
export type ExtendedHallmarkOperationType = ExtendedHallmarkOperation["type"];

export type ExtendedHallmarkBranchContract =
  | Readonly<{
      key: "metabolic_deregulation";
      mechanicClass: "energy-budgeting";
      handlerId: "apply-metabolic-conversion";
      operationType: "convert-substrate";
    }>
  | Readonly<{
      key: "immune_destruction_avoidance";
      mechanicClass: "visibility-management";
      handlerId: "apply-immune-visibility";
      operationType: "set-region-mask";
    }>
  | Readonly<{
      key: "tumor_promoting_inflammation";
      mechanicClass: "event-cultivation";
      handlerId: "apply-inflammation-episode";
      operationType: "activate-inflammation";
    }>
  | Readonly<{
      key: "genome_instability_mutation";
      mechanicClass: "mutation-drafting";
      handlerId: "apply-mutation-selection";
      operationType: "select-mutation";
    }>;

export type ExtendedHallmarkBranchContractFor<Key extends ExtendedHallmarkKey> = Extract<
  ExtendedHallmarkBranchContract,
  Readonly<{ key: Key }>
>;
export type ExtendedHallmarkUnlock = Readonly<{ stageId: StageId; capability: StageActionId }>;
export type ExtendedHallmarkPurchasePolicy = Readonly<{
  eventType: "purchase-hallmark";
  initialLevel: 1;
  maximumLevel: 1;
}>;
export type ExtendedHallmarkOwnershipPolicy = Readonly<{ requiredLevel: 1 }>;
export type ExtendedHallmarkDefinition = Readonly<{
  key: ExtendedHallmarkKey;
  id: HallmarkId;
  displayName: string;
  mechanicClass: ExtendedHallmarkMechanicClass;
  handlerId: ExtendedHallmarkHandlerId;
  operationType: ExtendedHallmarkOperationType;
  unlock: ExtendedHallmarkUnlock;
  purchase: ExtendedHallmarkPurchasePolicy;
  ownership: ExtendedHallmarkOwnershipPolicy;
}>;
export type ExtendedHallmarkDefinitionFor<Key extends ExtendedHallmarkKey> = Readonly<
  Omit<ExtendedHallmarkDefinition, "key" | "mechanicClass" | "handlerId" | "operationType"> &
    ExtendedHallmarkBranchContractFor<Key>
>;

export type AtpSinkDefinition = Readonly<{
  id: AtpSinkId;
  displayName: string;
  minimumBudget: number;
  maximumBudget: number;
}>;

export type MutationDraftPoolId = "early-instability";
export type MutationCardRow = Readonly<{ label: string; effect: string }>;
/** Closed numeric effects are the saveable authority; display prose is never executable. */
export type MutationCardEffects = Readonly<{
  producerMultiplier: number;
  producerCostMultiplier: number;
  conversionYieldMultiplier: number;
  maskTokenCost: number;
  routeDiscoveryBonus: number;
  damagePressure: number;
  immunePressure: number;
}>;
export type MutationCard = Readonly<{
  id: MutationId;
  displayName: string;
  benefit: MutationCardRow;
  liability: MutationCardRow;
  genomeBurden: number;
  effects: MutationCardEffects;
}>;
/** A pending saved snapshot has exactly three unique, canonically ordered cards. */
export type MutationDraftOffer = Readonly<{
  id: OfferId;
  poolId: MutationDraftPoolId;
  cards: readonly [MutationCard, MutationCard, MutationCard];
  sourceSeed: number;
  sourceSequence: number;
  /** Stage is part of the deterministic source tuple and survives later transitions. */
  sourceStage: StageId;
  threshold: number;
}>;
export type MutationOfferThreshold = Readonly<{ id: "first-draft"; burden: number }>;

/** Extended-hallmark handlers preserve the reducer-owned event sequence. */
export type ExtendedHallmarkHandlerResult<_State extends GameState = GameState> = GameState;
export type ExtendedHallmarkHandler<
  Operation extends ExtendedHallmarkOperation = ExtendedHallmarkOperation,
> = Readonly<{
  hallmark: Operation["hallmark"];
  apply: (
    context: Readonly<{ state: GameState; operation: Operation; appliedAtMs: number }>,
  ) => ExtendedHallmarkHandlerResult;
}>;

type ExtendedHallmarkOperationsMatchBranchContracts =
  Exclude<
    ExtendedHallmarkOperation["hallmark"],
    ExtendedHallmarkBranchContract["key"]
  > extends never
    ? Exclude<
        ExtendedHallmarkBranchContract["key"],
        ExtendedHallmarkOperation["hallmark"]
      > extends never
      ? true
      : never
    : never;
export const EXTENDED_HALLMARK_OPERATIONS_MATCH_BRANCH_CONTRACTS: ExtendedHallmarkOperationsMatchBranchContracts = true;
