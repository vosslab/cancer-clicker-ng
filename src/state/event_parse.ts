import {
  bigNum,
  eventId,
  hallmarkId,
  lateProgramOptionId,
  microbiomeCompositionId,
  microbiomeOfferId,
  mutationId,
  offerId,
  prestigeId,
  producerId,
  regionId,
  routeId,
  stageId,
} from "../brands.js";
import type { GameEvent } from "../types/events.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type { PendingProgression, TrackedResourceSnapshot } from "../types/state.js";
import { MAX_PENDING_PROGRESSION, TRACKED_RESOURCE_KEYS } from "../types/state.js";
import { isPrestigeId, isStageId } from "./catalog.js";
import { parsePositiveCanonicalBigNumDto } from "../hallmarks/extended_hallmark_types.js";
import { ATP_SINK_CATALOG } from "../hallmarks/extended_hallmark_catalog.js";
import { PLASTICITY_PHENOTYPES } from "../hallmarks/plasticity_catalog.js";
import { findLateProgramOption } from "../hallmarks/program_catalog.js";
import { findMicrobiomeComposition } from "../hallmarks/microbiome_catalog.js";
import { isSenescenceAction } from "../hallmarks/senescence_catalog.js";

const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const CHECKPOINTS = new Set(["contact-inhibition", "nutrient-arrest", "damage-arrest"]);

type EventValues = Readonly<Record<string, unknown>>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function positiveNatural(value: unknown): value is number {
  return natural(value) && value > 0;
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

function ownDataValue(raw: unknown, key: string): unknown {
  const descriptor = ownDataProperties(raw)[key];
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new Error("Event properties must be enumerable data properties.");
  }
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


function purchaseQuantity(value: unknown): PurchaseQuantity {
  if (value === "max" || value === 1 || value === 10 || value === 100) return value;
  throw new Error("Producer quantity is invalid.");
}

function parseSnapshot(raw: unknown): TrackedResourceSnapshot {
  const values = eventValues(raw, TRACKED_RESOURCE_KEYS);
  const result: Record<string, ReturnType<typeof bigNum>> = {};
  for (const key of TRACKED_RESOURCE_KEYS) {
    const value = values[key];
    const fields = eventValues(value, ["mantissa", "exponent"]);
    if (
      typeof fields.mantissa !== "number" ||
      !Number.isFinite(fields.mantissa) ||
      typeof fields.exponent !== "number" ||
      !Number.isSafeInteger(fields.exponent)
    )
      throw new Error("Offline resource snapshot is invalid.");
    const restored = bigNum(fields.mantissa, fields.exponent);
    if (restored.mantissa !== fields.mantissa || restored.exponent !== fields.exponent)
      throw new Error("Offline resource snapshot is not canonical.");
    result[key] = restored;
  }
  return result as TrackedResourceSnapshot;
}

function parseProgression(raw: unknown, atMs: number): readonly PendingProgression[] {
  if (!Array.isArray(raw) || raw.length > MAX_PENDING_PROGRESSION)
    throw new Error("Offline progression is invalid.");
  const result: PendingProgression[] = [];
  const identities = new Set<string>();
  for (const item of raw) {
    const values = eventValues(item, ["kind", "id", "firstObservedAtActiveMs"]);
    if (!natural(values.firstObservedAtActiveMs) || values.firstObservedAtActiveMs !== atMs)
      throw new Error("Offline progression timestamp is invalid.");
    if (values.kind !== "stage" && values.kind !== "prestige")
      throw new Error("Offline progression kind is invalid.");
    const id = requireIdentifier(values.id, "Offline progression identifier");
    if (
      (values.kind === "stage" && !isStageId(id)) ||
      (values.kind === "prestige" && !isPrestigeId(id))
    )
      throw new Error("Offline progression identifier is unknown.");
    const identity = `${values.kind}:${id}`;
    if (identities.has(identity)) throw new Error("Offline progression is duplicated.");
    identities.add(identity);
    result.push(
      values.kind === "stage"
        ? { kind: "stage", id: stageId(id), firstObservedAtActiveMs: atMs }
        : { kind: "prestige", id: prestigeId(id), firstObservedAtActiveMs: atMs },
    );
  }
  return result;
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
      return {
        type,
        producerId: producerId(requireIdentifier(values.producerId, "Producer identifier")),
        quantity: purchaseQuantity(values.quantity),
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
      const values = valuesFor(raw, [
        "type",
        "elapsedMs",
        "atMs",
        "resourceSnapshot",
        "newlyObservedProgression",
      ]);
      if (!natural(values.elapsedMs)) throw new Error("Offline elapsed time is invalid.");
      const atMs = values.atMs as number;
      const resourceSnapshot = parseSnapshot(values.resourceSnapshot);
      const newlyObservedProgression = parseProgression(values.newlyObservedProgression, atMs);
      return {
        type,
        elapsedMs: values.elapsedMs,
        atMs,
        resourceSnapshot,
        newlyObservedProgression,
      };
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
    case "spend-telomerase": {
      const target = ownDataValue(raw, "target");
      if (target === "refill-region") {
        const values = valuesFor(raw, ["type", "target", "regionId", "charges", "atMs"]);
        if (!positiveNatural(values.charges)) throw new Error("Telomerase charges are invalid.");
        return {
          type,
          target,
          regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
          charges: values.charges,
          atMs: values.atMs as number,
        };
      }
      if (target === "bank-reserve-floor") {
        const values = valuesFor(raw, ["type", "target", "charges", "atMs"]);
        if (!positiveNatural(values.charges)) throw new Error("Telomerase charges are invalid.");
        return { type, target, charges: values.charges, atMs: values.atMs as number };
      }
      throw new Error("Telomerase target is invalid.");
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
      const requestedSink = requireIdentifier(values.sink, "ATP budget sink");
      const sink = ATP_SINK_CATALOG.find((candidate) => candidate.id === requestedSink);
      if (sink === undefined) throw new Error("ATP budget sink is invalid.");
      return {
        type,
        sink: sink.id,
        amount: values.amount,
        atMs: values.atMs as number,
      };
    }
    case "convert-substrate": {
      const values = valuesFor(raw, ["type", "amount", "atMs"]);
      // ASVS 1.5.2, 2.2.1, 15.3.3, and 15.3.5: allowlisted DTO reconstruction.
      const amount = parsePositiveCanonicalBigNumDto(values.amount);
      return { type, amount, atMs: values.atMs as number };
    }
    case "set-region-mask": {
      const values = valuesFor(raw, ["type", "regionId", "masked", "atMs"]);
      if (typeof values.masked !== "boolean") throw new Error("Region mask value is invalid.");
      return {
        type,
        regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
        masked: values.masked,
        atMs: values.atMs as number,
      };
    }
    case "activate-inflammation": {
      const values = valuesFor(raw, ["type", "regionId", "atMs"]);
      return {
        type,
        regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
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
    case "assign-region-phenotype": {
      const values = valuesFor(raw, ["type", "regionId", "phenotype", "atMs"]);
      if (typeof values.phenotype !== "string" || !PLASTICITY_PHENOTYPES.includes(values.phenotype as typeof PLASTICITY_PHENOTYPES[number]))
        throw new Error("Phenotype is invalid.");
      return {
        type,
        regionId: regionId(requireIdentifier(values.regionId, "Region identifier")),
        phenotype: values.phenotype as typeof PLASTICITY_PHENOTYPES[number],
        atMs: values.atMs as number,
      };
    }
    case "reconfigure-hallmark-program": {
      const values = valuesFor(raw, ["type", "hallmarkId", "optionId", "atMs"]);
      const optionId = lateProgramOptionId(requireIdentifier(values.optionId, "Program option identifier"));
      if (findLateProgramOption(optionId) === undefined) throw new Error("Program option is invalid.");
      return {
        type,
        hallmarkId: hallmarkId(requireIdentifier(values.hallmarkId, "Hallmark identifier")),
        optionId,
        atMs: values.atMs as number,
      };
    }
    case "install-microbiome-composition": {
      const values = valuesFor(raw, ["type", "offerId", "compositionId", "atMs"]);
      const compositionId = microbiomeCompositionId(requireIdentifier(values.compositionId, "Composition identifier"));
      if (findMicrobiomeComposition(compositionId) === undefined) throw new Error("Microbiome composition is invalid.");
      return {
        type,
        offerId: microbiomeOfferId(requireIdentifier(values.offerId, "Microbiome offer identifier")),
        compositionId,
        atMs: values.atMs as number,
      };
    }
    case "resolve-senescence-decision": {
      const values = valuesFor(raw, ["type", "decisionId", "action", "atMs"]);
      if (typeof values.action !== "string" || !isSenescenceAction(values.action))
        throw new Error("Senescence action is invalid.");
      return {
        type,
        decisionId: eventId(requireIdentifier(values.decisionId, "Senescence decision identifier")),
        action: values.action,
        atMs: values.atMs as number,
      };
    }
    default:
      throw new Error("Unknown event type.");
  }
}
