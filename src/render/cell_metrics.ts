import { toNumber } from "../bignum/bignum.js";
import { formatBigNum, formatQuantity } from "../bignum/format.js";
import type { BigNum } from "../types/bignum.js";
import type { NumberFormat } from "../types/state.js";

function requireNonnegative(value: BigNum, label: string): void {
  if (value.mantissa < 0) throw new Error(`${label} cannot be negative.`);
}

/** Keeps the discrete inventory biological while allowing aggregate suffixes at large scale. */
export function formatCellInventory(value: BigNum, format: NumberFormat): string {
  requireNonnegative(value, "Cell inventory");
  if (value.exponent >= 3) return formatQuantity(value, format, 1, "cell", "cells");
  const wholeCells = Math.floor(toNumber(value));
  return `${wholeCells.toFixed(0)} ${wholeCells === 1 ? "cell" : "cells"}`;
}

/** Shortens a visible rack price after its neighboring Cost label establishes the resource. */
export function formatCompactCellInventory(value: BigNum, format: NumberFormat): string {
  return formatCellInventory(value, format).replace(/ cells?$/, "");
}

function intervalDigits(secondsPerCell: number): number {
  if (secondsPerCell >= 10) return 0;
  if (secondsPerCell >= 1) return 1;
  return 2;
}

/** Expresses slow growth as an understandable interval, never a fractional cell object. */
export function formatCellRate(value: BigNum, format: NumberFormat): string {
  requireNonnegative(value, "Cell production rate");
  const numericValue = toNumber(value);
  if (numericValue === 0) return "0 cells/s";
  if (numericValue > 0 && numericValue < 1) {
    const secondsPerCell = 1 / numericValue;
    if (Number.isFinite(secondsPerCell)) {
      return `1 cell / ${secondsPerCell.toFixed(intervalDigits(secondsPerCell))} s`;
    }
  }
  return `${formatBigNum(value, format, 1)} cells/s`;
}

/** Keeps compact rack metrics readable without repeating the established cells unit. */
export function formatCompactCellRate(value: BigNum, format: NumberFormat): string {
  return formatCellRate(value, format)
    .replace(/^1 cell \/ /, "1/")
    .replace(/ cells\/s$/, "/s");
}
