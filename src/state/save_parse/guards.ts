import { bigNum } from "../../brands.js";
import { MAX_PENDING_PROGRESSION } from "../../types/state.js";
import type { BigNum } from "../../types/bignum.js";
import type { SerializedGameState } from "../../types/save.js";
import type { GameState } from "../../types/state.js";

/** Shared durable queue/work bound. Other generic collections inherit this repository limit. */
export const MAX_COLLECTION = MAX_PENDING_PROGRESSION;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);

export function object(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
/** ASVS 2.1.1: exact allowlists reject unknown and prototype-shaped records. */
export function exact(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    object(value) && Object.keys(value).every((key) => keys.includes(key) && !RESERVED.has(key))
  );
}
export function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
export function nonnegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}
export function safe(value: unknown): value is number {
  return finite(value) && Number.isSafeInteger(value);
}
export function natural(value: unknown): value is number {
  return safe(value) && value >= 0;
}
export function fraction(value: unknown): value is number {
  return nonnegative(value) && value <= 1;
}
export function identifier(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 128 && !RESERVED.has(value)
  );
}
export function array(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) && value.length <= MAX_COLLECTION ? value : undefined;
}
/** Oversized collections are hostile records, not recoverable leaf mistakes. */
export function hasOversizedCollection(value: unknown): boolean {
  if (Array.isArray(value))
    return value.length > MAX_COLLECTION || value.some((item) => hasOversizedCollection(item));
  return object(value) && Object.values(value).some((item) => hasOversizedCollection(item));
}
export function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}
export function ids<T extends string>(
  value: unknown,
  make: (value: string) => T,
): readonly T[] | undefined {
  const values = array(value);
  if (!values || !values.every(identifier) || !unique(values)) return undefined;
  try {
    return values.map(make);
  } catch {
    return undefined;
  }
}
export function numericRecord(
  value: unknown,
  valid: (value: unknown) => boolean,
): Readonly<Record<string, number>> | undefined {
  if (
    !object(value) ||
    Object.keys(value).length > MAX_COLLECTION ||
    Object.keys(value).some((key) => !identifier(key))
  )
    return undefined;
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!valid(item)) return undefined;
    result[key] = item as number;
  }
  return result;
}
/** Serialized values are canonical, so one numerical state has one durable encoding. */
export function numberValue(value: unknown): BigNum | undefined {
  if (!exact(value, ["mantissa", "exponent"]) || !finite(value.mantissa) || !safe(value.exponent))
    return undefined;
  try {
    const result = bigNum(value.mantissa, value.exponent);
    return Object.is(result.mantissa, value.mantissa) && result.exponent === value.exponent
      ? result
      : undefined;
  } catch {
    return undefined;
  }
}
/** Reconstruct output without invoking user-controlled prototypes. */
export function serial(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(serial);
  if (object(value)) {
    const result: Record<string, unknown> = {};
    Object.setPrototypeOf(result, null);
    for (const [key, item] of Object.entries(value)) {
      if (!identifier(key)) throw new Error("Unsafe state key.");
      result[key] = serial(item);
    }
    return result;
  }
  return value;
}

/** Typed current-state serializer for the durable p4 writer boundary. */
export function serialGameState(state: GameState): SerializedGameState {
  const result: Record<string, unknown> = {};
  Object.setPrototypeOf(result, null);
  for (const [key, item] of Object.entries(state)) {
    if (!identifier(key)) throw new Error("Unsafe state key.");
    result[key] = serial(item);
  }
  return result;
}
