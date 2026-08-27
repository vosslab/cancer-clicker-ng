import type { BigNum } from "../types/bignum.js";
import {
  add,
  compare,
  divide,
  fromNumber,
  isNegative,
  isZero,
  multiply,
  multiplyByNumber,
  pow,
  subtract,
  zero,
} from "./bignum.js";

const RECURRENCE_QUANTITY_MAX = 10_000;

function requireNonnegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a nonnegative safe integer.`);
  }
}

function requireGrowth(growth: number): void {
  if (!Number.isFinite(growth) || growth < 1) {
    throw new Error("Growth must be a finite number at least one.");
  }
}

function requireCost(firstCost: BigNum): void {
  if (isNegative(firstCost)) {
    throw new Error("First cost must be nonnegative.");
  }
}

function requireQuantityFitsOwned(owned: number, quantity: number): void {
  if (quantity > Number.MAX_SAFE_INTEGER - owned) {
    throw new Error("Owned plus quantity must be a safe integer.");
  }
}

function requireQuoteInputs(
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): void {
  requireCost(firstCost);
  requireGrowth(growth);
  requireNonnegativeSafeInteger(owned, "Owned");
  requireNonnegativeSafeInteger(quantity, "Quantity");
  requireQuantityFitsOwned(owned, quantity);
}

function orderedRecurrenceCost(
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): BigNum {
  const ratio = fromNumber(growth);
  let total = zero();
  let term = multiply(firstCost, pow(ratio, owned));

  for (let index = 0; index < quantity; index += 1) {
    total = add(total, term);
    if (index + 1 < quantity) {
      term = multiply(term, ratio);
    }
  }

  return total;
}

function normalClosedFormCost(
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): BigNum {
  const ratio = fromNumber(growth);
  const initialTerm = multiply(firstCost, pow(ratio, owned));
  const numerator = subtract(pow(ratio, quantity), fromNumber(1));
  const denominator = subtract(ratio, fromNumber(1));
  return multiply(initialTerm, divide(numerator, denominator));
}

function nearOneClosedFormCost(
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): BigNum | undefined {
  const delta = growth - 1;
  if (!(delta > 0 && delta <= 1e-8)) {
    return undefined;
  }

  const logGrowth = Math.log1p(delta);
  const scaledLog = logGrowth * quantity;
  const numerator = Math.expm1(scaledLog);
  const coefficient = numerator / delta;
  if (
    !Number.isFinite(logGrowth) ||
    !Number.isFinite(scaledLog) ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(coefficient) ||
    coefficient <= 0
  ) {
    return undefined;
  }

  try {
    const ratio = fromNumber(growth);
    const initialTerm = multiply(firstCost, pow(ratio, owned));
    return multiply(initialTerm, fromNumber(coefficient));
  } catch {
    return undefined;
  }
}

/**
 * Returns the authoritative debit for an additional producer purchase.
 */
export function geometricCost(
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): BigNum {
  requireQuoteInputs(firstCost, growth, owned, quantity);

  if (quantity === 0) {
    return zero();
  }
  if (isZero(firstCost)) {
    return zero();
  }
  if (growth === 1) {
    return multiplyByNumber(firstCost, quantity);
  }
  if (quantity <= RECURRENCE_QUANTITY_MAX) {
    return orderedRecurrenceCost(firstCost, growth, owned, quantity);
  }

  const stableCost = nearOneClosedFormCost(firstCost, growth, owned, quantity);
  return stableCost ?? normalClosedFormCost(firstCost, growth, owned, quantity);
}

function isAffordable(
  budget: BigNum,
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantity: number,
): boolean {
  return compare(geometricCost(firstCost, growth, owned, quantity), budget) <= 0;
}

function nextExponentialProbe(current: number, capacity: number): number {
  if (current > Math.floor(capacity / 2)) {
    return capacity;
  }
  return current * 2;
}

/**
 * Returns the greatest affordable additional purchase quantity.
 */
export function maxAffordable(
  budget: BigNum,
  firstCost: BigNum,
  growth: number,
  owned: number,
  quantityLimit?: number,
): number {
  if (isNegative(budget)) {
    throw new Error("Budget must be nonnegative.");
  }
  requireQuoteInputs(firstCost, growth, owned, 0);

  const maximumPurchasable = Number.MAX_SAFE_INTEGER - owned;
  if (quantityLimit !== undefined) {
    requireNonnegativeSafeInteger(quantityLimit, "Quantity limit");
    if (quantityLimit > maximumPurchasable) {
      throw new Error("Quantity limit exceeds representable purchase capacity.");
    }
  }

  const capacity = quantityLimit ?? maximumPurchasable;
  if (capacity === 0) {
    return 0;
  }
  if (isZero(firstCost)) {
    if (quantityLimit === undefined) {
      throw new Error("Zero-cost purchases without a limit are unbounded.");
    }
    return quantityLimit;
  }
  if (!isAffordable(budget, firstCost, growth, owned, 1)) {
    return 0;
  }

  let affordable = 1;
  let unaffordable = capacity;
  while (affordable < capacity) {
    const probe = nextExponentialProbe(affordable, capacity);
    if (isAffordable(budget, firstCost, growth, owned, probe)) {
      affordable = probe;
      continue;
    }
    unaffordable = probe;
    break;
  }

  if (affordable === capacity) {
    return affordable;
  }

  while (unaffordable - affordable > 1) {
    const midpoint = affordable + Math.floor((unaffordable - affordable) / 2);
    if (isAffordable(budget, firstCost, growth, owned, midpoint)) {
      affordable = midpoint;
    } else {
      unaffordable = midpoint;
    }
  }

  return affordable;
}
