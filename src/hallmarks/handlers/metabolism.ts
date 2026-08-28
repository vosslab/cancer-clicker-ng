import { hallmarkId } from "../../brands.js";
import { add, compare, multiplyByNumber, subtract } from "../../bignum/bignum.js";
import { m11ConversionYieldMultiplier } from "../m11_authoritative_effects.js";
import { hasReachedM11Unlock, m11HallmarkDefinition } from "../m11_catalog.js";
import {
  bigNumFromConversionAmount,
  type ConvertSubstrateOperation,
  type M11Handler,
  type M11HandlerResult,
} from "../m11_types.js";
import type { GameState } from "../../types/state.js";

const METABOLISM_KEY = "metabolic_deregulation";

function ownsMetabolism(state: GameState): boolean {
  const definition = m11HallmarkDefinition(METABOLISM_KEY);
  return state.hallmarkLevels.some(
    (level) =>
      level.id === definition.id &&
      Number.isSafeInteger(level.level) &&
      level.level >= definition.ownership.requiredLevel,
  );
}

function assertConversion(
  context: Readonly<{ state: GameState; operation: ConvertSubstrateOperation }>,
): void {
  const { operation, state } = context;
  const definition = m11HallmarkDefinition(METABOLISM_KEY);
  if (operation.type !== definition.operationType || operation.hallmark !== METABOLISM_KEY) {
    throw new Error("Metabolic conversion operation is not owned by cellular metabolism.");
  }
  if (!hasReachedM11Unlock(state.currentStage, METABOLISM_KEY) || !ownsMetabolism(state)) {
    throw new Error("Cellular metabolism is not operational.");
  }
  const amount = bigNumFromConversionAmount(operation.amount);
  if (compare(state.substrate, amount) < 0) {
    throw new Error("Metabolic conversion exceeds available substrate.");
  }
}

/**
 * Exchanges one exact canonical substrate amount for ATP with any selected closed-pool yield.
 * This handler never creates cells: producer acceleration is paid separately by the economy tick.
 */
export function applyMetabolicConversion<State extends GameState>(
  context: Readonly<{ state: State; operation: ConvertSubstrateOperation; appliedAtMs: number }>,
): M11HandlerResult<State> {
  assertConversion(context);
  const amount = bigNumFromConversionAmount(context.operation.amount);
  const nextState = {
    ...context.state,
    substrate: subtract(context.state.substrate, amount),
    atp: add(
      context.state.atp,
      multiplyByNumber(amount, m11ConversionYieldMultiplier(context.state)),
    ),
  };
  return nextState;
}

/** Narrow handler imported by the M11 catalog dispatcher; reducer sequencing remains external. */
export const METABOLIC_CONVERSION_HANDLER: M11Handler<ConvertSubstrateOperation> = {
  hallmark: METABOLISM_KEY,
  apply: applyMetabolicConversion,
};

/** Stable catalog identity for code that needs the owning hallmark without string reconstruction. */
export const METABOLIC_CONVERSION_HALLMARK_ID = hallmarkId(METABOLISM_KEY);
