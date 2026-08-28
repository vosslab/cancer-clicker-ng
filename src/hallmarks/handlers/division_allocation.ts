import { coreSixHallmarkDefinition, hasReachedCoreSixUnlock } from "../core_six_catalog.js";
import type { CoreSixHandler, SetSignalingAllocationOperation } from "../core_six_types.js";
import type { GameState } from "../../types/state.js";

/** The selected mode tells a later click or tick adapter where a newly acquired pulse is applied. */
export type DivisionAllocationFocus = "manual-burst" | "producer-cycle";

/**
 * Maps the persisted player decision to its future operation without generating a resource.
 * The event handler only changes the mode; a click or tick adapter owns a later acquired pulse.
 */
export function divisionAllocationFocus(
  allocation: SetSignalingAllocationOperation["allocation"],
): DivisionAllocationFocus {
  return allocation === "burst" ? "manual-burst" : "producer-cycle";
}

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function plainDataRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype ||
    Object.getOwnPropertySymbols(value).length !== 0
  ) {
    throw new Error(`${label} must be a plain data record.`);
  }
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (const descriptor of Object.values(descriptors)) {
    if (!("value" in descriptor) || !descriptor.enumerable) {
      throw new Error(`${label} must contain enumerable data properties.`);
    }
  }
  return value as Readonly<Record<string, unknown>>;
}

function assertExactKeys(
  record: Readonly<Record<string, unknown>>,
  expected: readonly string[],
  label: string,
): void {
  const keys = Object.keys(record);
  if (keys.length !== expected.length || keys.some((key) => !expected.includes(key))) {
    throw new Error(`${label} has an invalid shape.`);
  }
}

function assertDivisionAllocationOperation(operation: SetSignalingAllocationOperation): void {
  const record = plainDataRecord(operation, "Division-allocation operation");
  assertExactKeys(record, ["type", "hallmark", "allocation"], "Division-allocation operation");
  if (record.type !== "set-signaling-allocation") {
    throw new Error("Division-allocation operation type is invalid.");
  }
  if (record.hallmark !== "proliferative_signaling") {
    throw new Error("Division-allocation hallmark is invalid.");
  }
  if (record.allocation !== "burst" && record.allocation !== "cycle") {
    throw new Error("Division-allocation choice is invalid.");
  }
}

function assertEligibleDivisionAllocation(state: GameState): void {
  const definition = coreSixHallmarkDefinition("proliferative_signaling");
  const owned = state.hallmarkLevels.find((level) => level.id === definition.id);
  if (!owned || !natural(owned.level) || owned.level < definition.ownership.requiredLevel) {
    throw new Error("Proliferative signaling must be owned at level one.");
  }
  if (!hasReachedCoreSixUnlock(state.currentStage, definition.key)) {
    throw new Error("Proliferative signaling has not reached its catalog unlock.");
  }
  if (!natural(state.manualDivisionCharge) || !natural(state.cycleFillRate)) {
    throw new Error("Division-allocation state is invalid.");
  }
}

/**
 * Projects a signaling choice without recording an event or advancing eventSequence.
 * The reducer remains the sole event-sequence and persistence owner.
 */
export function applyDivisionAllocation(
  context: Readonly<{
    state: GameState;
    operation: SetSignalingAllocationOperation;
    appliedAtMs: number;
  }>,
): GameState {
  if (!natural(context.appliedAtMs)) throw new Error("Division-allocation time is invalid.");
  assertDivisionAllocationOperation(context.operation);
  assertEligibleDivisionAllocation(context.state);

  const allocation = context.operation.allocation;
  if (allocation === context.state.signalingAllocation) {
    throw new Error("Division-allocation choice is already active.");
  }

  const nextState =
    allocation === "burst"
      ? {
          ...context.state,
          signalingAllocation: allocation,
        }
      : {
          ...context.state,
          signalingAllocation: allocation,
        };
  return nextState;
}

/** core-six's closed core-six handler value for sustaining proliferative signaling. */
export const divisionAllocationHandler: CoreSixHandler<SetSignalingAllocationOperation> = {
  hallmark: "proliferative_signaling",
  apply: applyDivisionAllocation,
};
