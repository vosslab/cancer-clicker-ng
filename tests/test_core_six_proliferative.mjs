import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, stageId } from "../src/brands.ts";
import {
  applyDivisionAllocation,
  divisionAllocationFocus,
  divisionAllocationHandler,
} from "../src/hallmarks/handlers/division_allocation.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function ownedState(change = {}) {
  const state = createInitialGameState();
  return {
    ...state,
    hallmarkLevels: [{ id: hallmarkId("proliferative_signaling"), level: 1 }],
    ...change,
  };
}

function operation(allocation) {
  return { type: "set-signaling-allocation", hallmark: "proliferative_signaling", allocation };
}

function apply(state, allocation, appliedAtMs = 0) {
  return applyDivisionAllocation({ state, operation: operation(allocation), appliedAtMs });
}

function rejectWithoutMutation(state, rawOperation, appliedAtMs = 0) {
  const before = structuredClone(state);
  assert.throws(() =>
    applyDivisionAllocation({
      state,
      operation: rawOperation,
      appliedAtMs,
    }),
  );
  assert.deepEqual(state, before);
}

test("core-six proliferative signaling chooses the future burst or cycle lane without minting a pulse", () => {
  const cycleState = ownedState({ signalingAllocation: "burst", manualDivisionCharge: 4 });
  const cycle = apply(cycleState, "cycle", 12);
  assert.equal(cycle.signalingAllocation, "cycle");
  assert.equal(cycle.manualDivisionCharge, 4);
  assert.equal(cycle.cycleFillRate, 0);
  assert.equal(cycle.eventSequence, cycleState.eventSequence);

  const burst = apply(cycle, "burst", 13);
  assert.equal(burst.signalingAllocation, "burst");
  assert.equal(burst.manualDivisionCharge, 4);
  assert.equal(burst.cycleFillRate, 0);
  assert.equal(burst.eventSequence, cycle.eventSequence);
  assert.deepEqual(
    cycleState,
    ownedState({ signalingAllocation: "burst", manualDivisionCharge: 4 }),
  );
});

test("core-six proliferative signaling selects a distinct future operation rather than a scalar rate", () => {
  assert.equal(divisionAllocationFocus("burst"), "manual-burst");
  assert.equal(divisionAllocationFocus("cycle"), "producer-cycle");
  assert.equal(divisionAllocationHandler.hallmark, "proliferative_signaling");
  assert.equal(divisionAllocationHandler.apply, applyDivisionAllocation);
});

test("core-six proliferative signaling preserves division meters over repeated reallocation", () => {
  const initial = ownedState({
    signalingAllocation: "burst",
    manualDivisionCharge: 7,
    cycleFillRate: 3,
  });
  const allocations = ["cycle", "burst", "cycle", "burst"];
  const final = allocations.reduce(
    (state, allocation, index) => apply(state, allocation, index),
    initial,
  );

  assert.equal(final.manualDivisionCharge, initial.manualDivisionCharge);
  assert.equal(final.cycleFillRate, initial.cycleFillRate);
  assert.equal(final.eventSequence, initial.eventSequence);
  assert.equal(final.signalingAllocation, "burst");
});

test("core-six proliferative signaling requires owned level one and the catalog unlock", () => {
  rejectWithoutMutation(createInitialGameState(), operation("cycle"));
  rejectWithoutMutation(
    ownedState({ hallmarkLevels: [{ id: hallmarkId("proliferative_signaling"), level: 0 }] }),
    operation("cycle"),
  );
  rejectWithoutMutation(ownedState({ currentStage: stageId("unknown-stage") }), operation("cycle"));
  const unlocked = ownedState({ currentStage: stageId("transformed_cell") });
  assert.equal(apply(unlocked, "cycle").signalingAllocation, "cycle");
});

test("core-six proliferative signaling rejects hostile operation shapes and preserves source state", () => {
  const state = ownedState();
  rejectWithoutMutation(state, { ...operation("cycle"), unexpected: true });
  rejectWithoutMutation(state, {
    type: "set-signaling-allocation",
    hallmark: "wrong",
    allocation: "cycle",
  });
  rejectWithoutMutation(state, {
    type: "set-signaling-allocation",
    hallmark: "proliferative_signaling",
    allocation: "wrong",
  });
  rejectWithoutMutation(state, Object.create(operation("cycle")));
  rejectWithoutMutation(state, operation("cycle"), -1);
  rejectWithoutMutation(state, operation("cycle"), Number.MAX_SAFE_INTEGER + 1);
  rejectWithoutMutation(ownedState({ manualDivisionCharge: -1 }), operation("cycle"));
  rejectWithoutMutation(ownedState(), operation("burst"));
});
