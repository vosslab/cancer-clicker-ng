import assert from "node:assert/strict";
import test from "node:test";
import { fromSafeInteger } from "../src/bignum/bignum.ts";
import { hallmarkId } from "../src/brands.ts";
import {
  projectVisibleDecisionSurface,
  projectVisibleProgression,
} from "../src/state/decision_surface.ts";
import { parseRuntimeEvent } from "../src/state/event_parse.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { AUTHORED_NETWORK_NODE_CATALOG } from "../src/prestige/network.ts";

function fundedState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    cells: fromSafeInteger(10_000),
    substrate: fromSafeInteger(100),
    atp: fromSafeInteger(100),
  };
}

function networkEvent(state, type, fields) {
  return recordEvent(state, {
    type,
    ...fields,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

function activeCampaignState() {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    currentStage: "global_lab_contamination",
    activeTimeMs: 200,
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 61 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "stabilize-network-node", { nodeId: node.id });
  const frontier = state.network.pendingFrontier;
  if (!frontier) throw new Error("Expected an authored network frontier.");
  return networkEvent(state, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[0].id,
  });
}

function renewedFrontierState() {
  const selected = activeCampaignState();
  const generatedNodeId = selected.network.activeCampaign?.mandate.generatedNodeIds[0];
  if (!generatedNodeId) throw new Error("Expected an active generated network node.");
  return networkEvent(selected, "stabilize-network-node", { nodeId: generatedNodeId });
}

function signalingState() {
  const initial = createInitialGameState();
  return {
    ...initial,
    hallmarkLevels: [
      ...initial.hallmarkLevels,
      { id: hallmarkId("proliferative_signaling"), level: 1 },
    ],
  };
}

test("visible actions are parser-valid reducer transitions from their projected state", () => {
  const state = fundedState();
  const surface = projectVisibleDecisionSurface(state);
  assert.ok(surface.actions.length > 0);
  for (const candidate of surface.actions) {
    assert.doesNotThrow(() => recordEvent(state, parseRuntimeEvent(candidate.event)));
  }
});

test("surface keeps replay progression compact and exposes canonical numeric balances", () => {
  const state = fundedState();
  const surface = projectVisibleDecisionSurface(state);
  assert.deepEqual(surface.progression, projectVisibleProgression(state));
  assert.deepEqual(surface.displayedBalances.cells, { mantissa: 1, exponent: 4 });
});

test("producer candidates retain catalog order while legal quantities reflect current balances", () => {
  const surface = projectVisibleDecisionSurface(fundedState());
  const producerIds = surface.actions
    .filter((candidate) => candidate.kind === "producer")
    .map((candidate) => candidate.event.producerId);
  assert.equal(producerIds[0], "producer");
  assert.ok(producerIds.includes("cdk4"));
});

test("surface presents player decisions and keeps runtime/presentation events outside policy input", () => {
  const types = projectVisibleDecisionSurface(fundedState()).actions.map(
    (candidate) => candidate.event.type,
  );
  assert.ok(types.includes("click-divide"));
  assert.ok(!types.includes("apply-offline-accrual"));
  assert.ok(!types.includes("set-number-format"));
});

test("saved campaign choices retain saved order without duplicating authored network actions", () => {
  const surface = projectVisibleDecisionSurface(activeCampaignState());
  const ids = surface.actions.map((candidate) => candidate.id);
  assert.equal(new Set(ids).size, ids.length);
  const generated = surface.actions.filter(
    (candidate) =>
      candidate.event.type === "stabilize-network-node" &&
      candidate.event.nodeId.includes("generated-node-v1:"),
  );
  assert.ok(generated.length > 0);
  for (const candidate of surface.actions)
    assert.doesNotThrow(() =>
      recordEvent(activeCampaignState(), parseRuntimeEvent(candidate.event)),
    );
});

test("surface values are deeply frozen and reflect current visible balances", () => {
  const first = projectVisibleDecisionSurface(fundedState());
  const second = projectVisibleDecisionSurface({
    ...fundedState(),
    cells: fromSafeInteger(20_000),
  });
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.actions));
  assert.ok(Object.isFrozen(first.actions[0]));
  assert.notDeepEqual(first.displayedBalances.cells, second.displayedBalances.cells);
});

test("completed campaign edges stay historical while the renewed frontier remains selectable", () => {
  const state = renewedFrontierState();
  assert.equal(state.network.activeCampaign, null);
  assert.ok(state.network.pendingFrontier);
  const surface = projectVisibleDecisionSurface(state);
  const historicalCampaignEdgeIds = new Set(
    state.network.edges.filter((edge) => edge.campaignId !== null).map((edge) => edge.id),
  );
  assert.equal(
    surface.actions.some(
      (candidate) =>
        candidate.event.type === "commit-dissemination-edge" &&
        historicalCampaignEdgeIds.has(candidate.event.edgeId),
    ),
    false,
  );
  assert.ok(
    surface.actions.some((candidate) => candidate.event.type === "choose-dissemination-mandate"),
  );
  for (const candidate of surface.actions)
    assert.doesNotThrow(() => recordEvent(state, parseRuntimeEvent(candidate.event)));
});

test("reprojecting after an accepted allocation offers the alternate state-changing choice", () => {
  const initial = signalingState();
  const firstSurface = projectVisibleDecisionSurface(initial);
  const cycle = firstSurface.actions.find(
    (candidate) =>
      candidate.event.type === "set-signaling-allocation" && candidate.event.allocation === "cycle",
  );
  assert.ok(cycle);
  const afterCycle = recordEvent(initial, parseRuntimeEvent(cycle.event));
  const secondSurface = projectVisibleDecisionSurface(afterCycle);
  const allocations = secondSurface.actions.filter(
    (candidate) => candidate.event.type === "set-signaling-allocation",
  );
  assert.deepEqual(
    allocations.map((candidate) => candidate.event.allocation),
    ["burst"],
  );
  for (const candidate of allocations)
    assert.doesNotThrow(() => recordEvent(afterCycle, parseRuntimeEvent(candidate.event)));
});
