import {
  eventId,
  hallmarkId,
  mutationId,
  offerId,
  producerId,
  programOptionId,
  regionId,
  routeId,
  stageId,
} from "../brands.js";
import type { GameEvent } from "../types/events.js";
import { isStageId } from "./catalog.js";

const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const CHECKPOINTS = new Set(["contact-inhibition", "nutrient-arrest", "damage-arrest"]);
const PHENOTYPES = new Set(["proliferative", "migratory", "stress-tolerant"]);

type EventValues = Readonly<Record<string, unknown>>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function boundedAmount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  );
}

function identifier(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 128 && !RESERVED.has(value)
  );
}

/** ASVS 2.1.1: only ordinary, enumerable own data-property records enter the reducer. */
function ownDataProperties(raw: unknown): Readonly<Record<string, PropertyDescriptor>> {
  if (
    typeof raw !== "object" ||
    raw === null ||
    Array.isArray(raw) ||
    Object.getPrototypeOf(raw) !== Object.prototype ||
    Object.getOwnPropertySymbols(raw).length !== 0
  )
    throw new Error("Event must be a plain record.");

  const descriptors = Object.getOwnPropertyDescriptors(raw);
  const keys = Object.getOwnPropertyNames(raw);
  if (keys.some((key) => RESERVED.has(key))) throw new Error("Event has an invalid shape.");
  return descriptors;
}

function eventValues(raw: unknown, expectedKeys: readonly string[]): EventValues {
  const descriptors = ownDataProperties(raw);
  const keys = Object.getOwnPropertyNames(raw);
  if (keys.length !== expectedKeys.length || keys.some((key) => !expectedKeys.includes(key)))
    throw new Error("Event has an invalid shape.");
  const result: Record<string, unknown> = {};
  for (const key of expectedKeys) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      throw new Error("Event properties must be enumerable data properties.");
    result[key] = descriptor.value;
  }
  return result;
}

function discriminant(raw: unknown): string {
  const descriptor = ownDataProperties(raw).type;
  if (
    !descriptor ||
    !("value" in descriptor) ||
    !descriptor.enumerable ||
    !identifier(descriptor.value)
  )
    throw new Error("Event discriminant is invalid.");
  return descriptor.value;
}

function valuesFor(raw: unknown, keys: readonly string[]): EventValues {
  const values = eventValues(raw, keys);
  if (!natural(values.atMs)) throw new Error("Event time is invalid.");
  return values;
}

function requireIdentifier(value: unknown, label: string): string {
  if (!identifier(value)) throw new Error(`${label} is invalid.`);
  return value;
}

function requireDeadline(value: unknown, label: string, atMs: number): number {
  if (!natural(value) || value < atMs) throw new Error(`${label} is invalid.`);
  return value;
}

/**
 * ASVS 2.1.1, 2.3.1, and 15.3.5: reconstruct a discriminated event from an
 * untrusted runtime record without reading inherited properties or spreading it.
 */
export function parseRuntimeEvent(raw: unknown): GameEvent {
  const type = discriminant(raw);
  switch (type) {
    case "click-divide": {
      const values = valuesFor(raw, ["type", "atMs"]);
      return { type, atMs: values.atMs as number };
    }
    case "purchase-producer": {
      const values = valuesFor(raw, ["type", "producerId", "quantity", "atMs"]);
      if (!natural(values.quantity) || values.quantity === 0)
        throw new Error("Producer quantity is invalid.");
      return {
        type,
        producerId: producerId(requireIdentifier(values.producerId, "Producer identifier")),
        quantity: values.quantity,
        atMs: values.atMs as number,
      };
    }
    case "purchase-hallmark": {
      const values = valuesFor(raw, ["type", "hallmarkId", "atMs"]);
      return {
        type,
        hallmarkId: hallmarkId(requireIdentifier(values.hallmarkId, "Hallmark identifier")),
        atMs: values.atMs as number,
      };
    }
    case "advance-stage": {
      const values = valuesFor(raw, ["type", "fromStageId", "toStageId", "atMs"]);
      const fromStageId = requireIdentifier(values.fromStageId, "Source stage");
      const toStageId = requireIdentifier(values.toStageId, "Target stage");
      if (!isStageId(fromStageId) || !isStageId(toStageId))
        throw new Error("Stage transition is invalid.");
      return {
        type,
        fromStageId: stageId(fromStageId),
        toStageId: stageId(toStageId),
        atMs: values.atMs as number,
      };
    }
    case "perform-prestige-reset": {
      const values = valuesFor(raw, ["type", "atMs"]);
      return { type, atMs: values.atMs as number };
    }
    case "apply-offline-accrual": {
      const values = valuesFor(raw, ["type", "elapsedMs", "atMs"]);
      if (!natural(values.elapsedMs)) throw new Error("Offline elapsed time is invalid.");
      return { type, elapsedMs: values.elapsedMs, atMs: values.atMs as number };
    }
    case "set-number-format": {
      const values = valuesFor(raw, ["type", "numberFormat", "atMs"]);
      if (values.numberFormat !== "short" && values.numberFormat !== "full")
        throw new Error("Number format is invalid.");
      return { type, numberFormat: values.numberFormat, atMs: values.atMs as number };
    }
    case "set-signaling-allocation": {
      const values = valuesFor(raw, ["type", "allocation", "atMs"]);
      if (values.allocation !== "burst" && values.allocation !== "cycle")
        throw new Error("Signaling allocation is invalid.");
      return { type, allocation: values.allocation, atMs: values.atMs as number };
    }
    case "select-checkpoint": {
      const values = valuesFor(raw, ["type", "checkpoint", "atMs"]);
      if (typeof values.checkpoint !== "string" || !CHECKPOINTS.has(values.checkpoint))
        throw new Error("Checkpoint is invalid.");
      return {
        type,
        checkpoint: values.checkpoint as "contact-inhibition" | "nutrient-arrest" | "damage-arrest",
        atMs: values.atMs as number,
      };
    }
    case "resolve-triage": {
      const values = valuesFor(raw, ["type", "eventId", "action", "atMs"]);
      if (
        values.action !== "absorb" &&
        values.action !== "repair" &&
        values.action !== "lose-region"
      )
        throw new Error("Triage action is invalid.");
      return {
        type,
        eventId: eventId(requireIdentifier(values.eventId, "Triage event identifier")),
        action: values.action,
        atMs: values.atMs as number,
      };
    }
    case "set-vessel-link": {
      const values = valuesFor(raw, ["type", "regionId", "linked", "atMs"]);
      if (typeof values.linked !== "boolean") throw new Error("Vessel-link value is invalid.");
      return {
        type,
        regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
        linked: values.linked,
        atMs: values.atMs as number,
      };
    }
    case "commit-route": {
      const values = valuesFor(raw, ["type", "routeId", "cells", "atMs"]);
      if (!boundedAmount(values.cells) || values.cells === 0)
        throw new Error("Route commitment is invalid.");
      return {
        type,
        routeId: routeId(requireIdentifier(values.routeId, "Route identifier")),
        cells: values.cells,
        atMs: values.atMs as number,
      };
    }
    case "set-atp-budget": {
      const values = valuesFor(raw, ["type", "sink", "amount", "atMs"]);
      if (!boundedAmount(values.amount)) throw new Error("ATP budget is invalid.");
      return {
        type,
        sink: requireIdentifier(values.sink, "ATP budget sink"),
        amount: values.amount,
        atMs: values.atMs as number,
      };
    }
    case "select-mutation": {
      const values = valuesFor(raw, ["type", "offerId", "mutationId", "atMs"]);
      return {
        type,
        offerId: offerId(requireIdentifier(values.offerId, "Mutation offer identifier")),
        mutationId: mutationId(requireIdentifier(values.mutationId, "Mutation identifier")),
        atMs: values.atMs as number,
      };
    }
    case "switch-phenotype": {
      const values = valuesFor(raw, [
        "type",
        "regionId",
        "phenotype",
        "cooldownDeadlineMs",
        "atMs",
      ]);
      if (typeof values.phenotype !== "string" || !PHENOTYPES.has(values.phenotype))
        throw new Error("Phenotype is invalid.");
      const atMs = values.atMs as number;
      return {
        type,
        regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
        phenotype: values.phenotype as "proliferative" | "migratory" | "stress-tolerant",
        cooldownDeadlineMs: requireDeadline(values.cooldownDeadlineMs, "Phenotype cooldown", atMs),
        atMs,
      };
    }
    case "edit-program": {
      const values = valuesFor(raw, [
        "type",
        "hallmarkId",
        "optionId",
        "cooldownDeadlineMs",
        "atMs",
      ]);
      const atMs = values.atMs as number;
      return {
        type,
        hallmarkId: hallmarkId(requireIdentifier(values.hallmarkId, "Program hallmark identifier")),
        optionId: programOptionId(requireIdentifier(values.optionId, "Program option identifier")),
        cooldownDeadlineMs: requireDeadline(values.cooldownDeadlineMs, "Program cooldown", atMs),
        atMs,
      };
    }
    case "select-microbiome": {
      const values = valuesFor(raw, ["type", "offerId", "atMs"]);
      return {
        type,
        offerId: offerId(requireIdentifier(values.offerId, "Microbiome offer identifier")),
        atMs: values.atMs as number,
      };
    }
    case "resolve-senescence": {
      const values = valuesFor(raw, ["type", "eventId", "action", "atMs"]);
      if (values.action !== "keep" && values.action !== "clear")
        throw new Error("Senescence action is invalid.");
      return {
        type,
        eventId: eventId(requireIdentifier(values.eventId, "Senescence event identifier")),
        action: values.action,
        atMs: values.atMs as number,
      };
    }
    default:
      throw new Error("Unknown event type.");
  }
}
