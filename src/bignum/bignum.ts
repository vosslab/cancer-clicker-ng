import { bigNum } from "../brands.js";
import type { BigNum } from "../types/bignum.js";

const PRECISION_DIGITS = 15;

function requireFiniteNumber(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be finite.`);
  }
}

function requireSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be a safe integer.`);
  }
}

function safeIntegerSum(left: number, right: number): number {
  if (
    (right > 0 && left > Number.MAX_SAFE_INTEGER - right) ||
    (right < 0 && left < Number.MIN_SAFE_INTEGER - right)
  ) {
    throw new Error("BigNum exponent is outside the safe-integer range.");
  }
  return left + right;
}

function safeIntegerDifference(left: number, right: number): number {
  return safeIntegerSum(left, -right);
}

function gapExceedsPrecision(largeExponent: number, smallExponent: number): boolean {
  if (largeExponent < smallExponent) {
    throw new Error("BigNum exponent gap requires descending exponents.");
  }
  if (largeExponent > Number.MIN_SAFE_INTEGER + PRECISION_DIGITS) {
    return smallExponent < largeExponent - PRECISION_DIGITS;
  }
  return false;
}

function magnitudeComparison(left: BigNum, right: BigNum): -1 | 0 | 1 {
  if (left.exponent < right.exponent) {
    return -1;
  }
  if (left.exponent > right.exponent) {
    return 1;
  }
  const leftMantissa = Math.abs(left.mantissa);
  const rightMantissa = Math.abs(right.mantissa);
  if (leftMantissa < rightMantissa) {
    return -1;
  }
  if (leftMantissa > rightMantissa) {
    return 1;
  }
  return 0;
}

function resultFromPower(base: BigNum, exponent: number, negative: boolean): BigNum {
  const exponentProduct = base.exponent * exponent;
  const mantissaLogProduct = Math.log10(Math.abs(base.mantissa)) * exponent;
  if (!Number.isFinite(exponentProduct) || !Number.isFinite(mantissaLogProduct)) {
    throw new Error("BigNum power result is not representable.");
  }

  // Keep the fractional mantissa logarithm separate from the large exponent
  // product. Adding it directly to a near-limit safe integer can round it away.
  const exponentWhole = Math.floor(exponentProduct);
  const exponentFraction = exponentProduct - exponentWhole;
  const mantissaWhole = Math.floor(mantissaLogProduct);
  const mantissaFraction = mantissaLogProduct - mantissaWhole;
  requireSafeInteger(exponentWhole, "BigNum power exponent");
  requireSafeInteger(mantissaWhole, "BigNum power exponent");

  const combinedFraction = exponentFraction + mantissaFraction;
  const fractionCarry = Math.floor(combinedFraction);
  const resultExponent = safeIntegerSum(
    safeIntegerSum(exponentWhole, mantissaWhole),
    fractionCarry,
  );
  const mantissaMagnitude = 10 ** (combinedFraction - fractionCarry);
  if (!Number.isFinite(mantissaMagnitude) || mantissaMagnitude === 0) {
    throw new Error("BigNum power mantissa is not representable.");
  }
  return bigNum(negative ? -mantissaMagnitude : mantissaMagnitude, resultExponent);
}

export function zero(): BigNum {
  return bigNum(0, 0);
}

export function one(): BigNum {
  return bigNum(1, 0);
}

export function fromNumber(value: number): BigNum {
  requireFiniteNumber(value, "BigNum source number");
  return bigNum(value, 0);
}

export function fromSafeInteger(value: number): BigNum {
  requireSafeInteger(value, "BigNum source number");
  return bigNum(value, 0);
}

export function isZero(value: BigNum): boolean {
  return value.mantissa === 0;
}

export function isPositive(value: BigNum): boolean {
  return value.mantissa > 0;
}

export function isNegative(value: BigNum): boolean {
  return value.mantissa < 0;
}

export function abs(value: BigNum): BigNum {
  return bigNum(Math.abs(value.mantissa), value.exponent);
}

export function negate(value: BigNum): BigNum {
  return bigNum(-value.mantissa, value.exponent);
}

export function compare(left: BigNum, right: BigNum): -1 | 0 | 1 {
  if (isNegative(left) !== isNegative(right)) {
    return isNegative(left) ? -1 : 1;
  }
  if (isZero(left) || isZero(right)) {
    if (isZero(left) && isZero(right)) {
      return 0;
    }
    return isZero(left) ? -1 : 1;
  }

  const magnitudeOrder = magnitudeComparison(left, right);
  if (!isNegative(left) || magnitudeOrder === 0) {
    return magnitudeOrder;
  }
  return magnitudeOrder === -1 ? 1 : -1;
}

export function equals(left: BigNum, right: BigNum): boolean {
  return compare(left, right) === 0;
}

export function min(left: BigNum, right: BigNum): BigNum {
  return compare(left, right) <= 0 ? left : right;
}

export function max(left: BigNum, right: BigNum): BigNum {
  return compare(left, right) >= 0 ? left : right;
}

export function add(left: BigNum, right: BigNum): BigNum {
  if (isZero(left)) {
    return bigNum(right.mantissa, right.exponent);
  }
  if (isZero(right)) {
    return bigNum(left.mantissa, left.exponent);
  }

  const large = left.exponent >= right.exponent ? left : right;
  const small = large === left ? right : left;
  if (gapExceedsPrecision(large.exponent, small.exponent)) {
    return bigNum(large.mantissa, large.exponent);
  }

  const gap = large.exponent - small.exponent;
  return bigNum(large.mantissa + small.mantissa * 10 ** -gap, large.exponent);
}

export function subtract(left: BigNum, right: BigNum): BigNum {
  return add(left, negate(right));
}

export function multiply(left: BigNum, right: BigNum): BigNum {
  const exponent = safeIntegerSum(left.exponent, right.exponent);
  return bigNum(left.mantissa * right.mantissa, exponent);
}

export function divide(dividend: BigNum, divisor: BigNum): BigNum {
  if (isZero(divisor)) {
    throw new Error("Cannot divide a BigNum by zero.");
  }
  const exponent = safeIntegerDifference(dividend.exponent, divisor.exponent);
  return bigNum(dividend.mantissa / divisor.mantissa, exponent);
}

export function multiplyByNumber(value: BigNum, multiplier: number): BigNum {
  requireFiniteNumber(multiplier, "BigNum multiplier");
  return multiply(value, fromNumber(multiplier));
}

export function divideByNumber(value: BigNum, divisor: number): BigNum {
  requireFiniteNumber(divisor, "BigNum divisor");
  if (divisor === 0) {
    throw new Error("Cannot divide a BigNum by zero.");
  }
  return divide(value, fromNumber(divisor));
}

export function sum(values: readonly BigNum[]): BigNum {
  let total = zero();
  for (const value of values) {
    total = add(total, value);
  }
  return total;
}

export function pow(base: BigNum, exponent: number): BigNum {
  requireFiniteNumber(exponent, "BigNum power exponent");
  if (isZero(base)) {
    if (exponent <= 0) {
      throw new Error("Zero cannot be raised to a nonpositive exponent.");
    }
    return zero();
  }
  if (exponent === 0) {
    return one();
  }

  const negativeBase = isNegative(base);
  if (negativeBase && !Number.isSafeInteger(exponent)) {
    throw new Error("Negative BigNum bases require safe-integer exponents.");
  }
  if (Number.isSafeInteger(exponent)) {
    const mantissaMagnitude = Math.abs(base.mantissa) ** exponent;
    const exponentProduct = base.exponent * exponent;
    if (
      Number.isFinite(mantissaMagnitude) &&
      mantissaMagnitude !== 0 &&
      Number.isSafeInteger(exponentProduct)
    ) {
      const negativeResult = negativeBase && Math.abs(exponent % 2) === 1;
      return bigNum(negativeResult ? -mantissaMagnitude : mantissaMagnitude, exponentProduct);
    }
  }
  const negativeResult = negativeBase && Math.abs(exponent % 2) === 1;
  return resultFromPower(base, exponent, negativeResult);
}

export function log10(value: BigNum): number {
  if (!isPositive(value)) {
    throw new Error("BigNum logarithm requires a positive value.");
  }
  return value.exponent + Math.log10(value.mantissa);
}

export function toNumber(value: BigNum): number {
  return value.mantissa * 10 ** value.exponent;
}

export function toNumberClamped(value: BigNum, limit: number): number {
  requireFiniteNumber(limit, "BigNum conversion limit");
  if (limit < 0) {
    throw new Error("BigNum conversion limit must not be negative.");
  }
  if (limit === 0) {
    return 0;
  }
  const converted = toNumber(value);
  if (converted > limit) {
    return limit;
  }
  if (converted < -limit) {
    return -limit;
  }
  return converted;
}

export function approximatelyEquals(
  left: BigNum,
  right: BigNum,
  relativeTolerance: number,
): boolean {
  requireFiniteNumber(relativeTolerance, "BigNum relative tolerance");
  if (relativeTolerance < 0) {
    throw new Error("BigNum relative tolerance must not be negative.");
  }
  if (equals(left, right)) {
    return true;
  }
  if (relativeTolerance === 0 || isNegative(left) !== isNegative(right)) {
    return false;
  }
  const scale = max(abs(left), abs(right));
  if (isZero(scale)) {
    return true;
  }
  const difference = abs(subtract(left, right));
  const tolerance = bigNum(relativeTolerance, 0);
  const productMantissa = scale.mantissa * tolerance.mantissa;
  const productCarry = productMantissa >= 10 ? 1 : 0;
  const toleranceExponent = safeIntegerSum(tolerance.exponent, productCarry);

  if (toleranceExponent > 0 && scale.exponent > Number.MAX_SAFE_INTEGER - toleranceExponent) {
    return true;
  }
  if (toleranceExponent < 0 && scale.exponent < Number.MIN_SAFE_INTEGER - toleranceExponent) {
    return false;
  }

  const productExponent = safeIntegerSum(scale.exponent, toleranceExponent);
  if (difference.exponent !== productExponent) {
    return difference.exponent < productExponent;
  }
  return difference.mantissa <= productMantissa / 10 ** productCarry;
}
