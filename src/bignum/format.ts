import type { BigNum } from "../types/bignum.js";
import type { NumberFormat } from "../types/state.js";

import { illionNameForGroup, shortSuffixForGroup } from "./illion.js";

function requireFractionalDigits(fractionalDigits: number): void {
  if (!Number.isSafeInteger(fractionalDigits) || fractionalDigits < 0 || fractionalDigits > 6) {
    throw new Error("Fractional digits must be a safe integer from 0 through 6.");
  }
}

function isNegative(value: BigNum): boolean {
  return value.mantissa < 0;
}

function fixedCoefficient(value: number, fractionalDigits: number): string {
  const formattedValue = value.toFixed(fractionalDigits);
  return formattedValue;
}

function roundedCoefficient(value: number, fractionalDigits: number): number {
  const formattedValue = fixedCoefficient(value, fractionalDigits);
  const roundedValue = Number(formattedValue);
  return roundedValue;
}

function prefixSign(value: BigNum, renderedMagnitude: string): string {
  return isNegative(value) ? `-${renderedMagnitude}` : renderedMagnitude;
}

function ordinaryDecimal(value: BigNum, fractionalDigits: number): string {
  const magnitude = Math.abs(value.mantissa) * 10 ** value.exponent;
  const renderedMagnitude = fixedCoefficient(magnitude, fractionalDigits);
  const renderedValue = prefixSign(value, renderedMagnitude);
  return renderedValue;
}

function scientificNotation(value: BigNum, fractionalDigits: number): string {
  let exponent = value.exponent;
  let magnitude = Math.abs(value.mantissa);
  if (roundedCoefficient(magnitude, fractionalDigits) >= 10 && exponent < Number.MAX_SAFE_INTEGER) {
    magnitude /= 10;
    exponent += 1;
  }
  const coefficient = fixedCoefficient(magnitude, fractionalDigits);
  const renderedMagnitude = `${coefficient}e${exponent}`;
  const renderedValue = prefixSign(value, renderedMagnitude);
  return renderedValue;
}

function triadGroup(value: BigNum): number {
  const group = Math.floor(value.exponent / 3);
  return group;
}

function triadCoefficient(value: BigNum, group: number): number {
  const groupExponent = 3 * group;
  const decimalOffset = value.exponent - groupExponent;
  const coefficient = Math.abs(value.mantissa) * 10 ** decimalOffset;
  return coefficient;
}

function magnitudeLabel(group: number, format: NumberFormat): string | undefined {
  if (format === "short") {
    return shortSuffixForGroup(group);
  }
  return illionNameForGroup(group) ?? shortSuffixForGroup(group);
}

function resolvedTriad(
  value: BigNum,
  fractionalDigits: number,
): Readonly<{ group: number; coefficient: number }> {
  let group = triadGroup(value);
  let coefficient = triadCoefficient(value, group);
  if (roundedCoefficient(coefficient, fractionalDigits) >= 1000) {
    group += 1;
    coefficient = triadCoefficient(value, group);
  }
  return { group, coefficient };
}

function formattedTriad(value: BigNum, format: NumberFormat, fractionalDigits: number): string {
  const { group, coefficient } = resolvedTriad(value, fractionalDigits);

  const label = magnitudeLabel(group, format);
  if (label === undefined) {
    return scientificNotation(value, fractionalDigits);
  }

  const coefficientText = fixedCoefficient(coefficient, fractionalDigits);
  const magnitudeText = label.length === 0 ? coefficientText : `${coefficientText} ${label}`;
  const renderedValue = prefixSign(value, magnitudeText);
  return renderedValue;
}

export function formatBigNum(
  value: BigNum,
  format: NumberFormat,
  fractionalDigits: number,
): string {
  requireFractionalDigits(fractionalDigits);
  if (value.exponent < 3) {
    return ordinaryDecimal(value, fractionalDigits);
  }
  return formattedTriad(value, format, fractionalDigits);
}

/** The full illion title for the value's displayed triad, when that triad has a name. */
export function formatMagnitudeName(value: BigNum, fractionalDigits: number): string | undefined {
  requireFractionalDigits(fractionalDigits);
  if (value.exponent < 3) return undefined;
  return illionNameForGroup(resolvedTriad(value, fractionalDigits).group);
}

function usesSingularUnit(value: BigNum): boolean {
  return value.exponent === 0 && (value.mantissa === 1 || value.mantissa === -1);
}

export function formatQuantity(
  value: BigNum,
  format: NumberFormat,
  fractionalDigits: number,
  singularUnit: string,
  pluralUnit: string,
): string {
  const renderedValue = formatBigNum(value, format, fractionalDigits);
  const unit = usesSingularUnit(value) ? singularUnit : pluralUnit;
  const renderedQuantity = `${renderedValue} ${unit}`;
  return renderedQuantity;
}
