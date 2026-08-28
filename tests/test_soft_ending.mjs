import assert from "node:assert/strict";
import test from "node:test";
import { bigNum } from "../src/brands.ts";
import {
  CHICAGO_SKYSCRAPER_CELL_EQUIVALENT,
  softEndingEligibility,
} from "../src/ending/trigger.ts";
import { endingPresentation, formatEndingScale } from "../src/ending/sequence.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseSave, serializeGameState } from "../src/state/save_load.ts";
import { AUTHORED_NETWORK_NODE_CATALOG } from "../src/prestige/network.ts";

function networkEvent(state, type, fields) {
  return recordEvent(state, {
    type,
    ...fields,
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

function eligibleState() {
  const initial = createInitialGameState();
  let state = {
    ...initial,
    currentStage: "global_lab_contamination",
    activeTimeMs: 900,
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 41 },
  };
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "establish-dissemination-node", { nodeId: node.id });
  for (const node of AUTHORED_NETWORK_NODE_CATALOG)
    state = networkEvent(state, "stabilize-network-node", { nodeId: node.id });
  const frontier = state.network.pendingFrontier;
  if (!frontier) throw new Error("Expected L4 frontier.");
  state = networkEvent(state, "choose-dissemination-mandate", {
    frontierId: frontier.id,
    mandateId: frontier.mandates[0].id,
  });
  const nodeId = frontier.mandates[0].generatedNodeIds[0];
  if (!nodeId) throw new Error("Expected generated L4 node.");
  state = networkEvent(state, "stabilize-network-node", { nodeId });
  return { ...state, cells: CHICAGO_SKYSCRAPER_CELL_EQUIVALENT };
}

function reach(state) {
  return recordEvent(state, {
    type: "reach-soft-ending",
    sourceEventSequence: state.eventSequence,
    atMs: state.activeTimeMs,
  });
}

test("soft ending requires the one L4 tier, Chicago scale, and explicit event", () => {
  const initial = createInitialGameState();
  assert.deepEqual(softEndingEligibility(initial), { available: false, reason: "stage" });
  const atStage = { ...initial, currentStage: "global_lab_contamination" };
  assert.deepEqual(softEndingEligibility(atStage), { available: false, reason: "network-tier" });
  const withTier = { ...atStage, network: { ...atStage.network, globalTier: 1 } };
  assert.deepEqual(softEndingEligibility(withTier), { available: false, reason: "cell-scale" });

  const before = eligibleState();
  const reached = reach(before);
  assert.equal(reached.ending.phase, "reached");
  assert.equal(reached.ending.sourceEventSequence, before.eventSequence);
  assert.equal(reached.ending.reachedAtActiveMs, before.activeTimeMs);
  assert.deepEqual(reached.ending.reachedCells, before.cells);
  assert.equal(reached.ending.reachedNetworkTier, 1);
  assert.equal(reached.eventSequence, before.eventSequence + 1);
  assert.deepEqual(softEndingEligibility(reached), { available: false, reason: "already-reached" });
});

test("soft ending transition rejects stale, duplicate, and malformed intent atomically", () => {
  const before = eligibleState();
  const snapshot = structuredClone(before);
  assert.throws(
    () =>
      recordEvent(before, {
        type: "reach-soft-ending",
        sourceEventSequence: before.eventSequence + 1,
        atMs: before.activeTimeMs,
      }),
    /stale/,
  );
  assert.deepEqual(before, snapshot);
  assert.throws(
    () => recordEvent(before, { type: "reach-soft-ending", atMs: before.activeTimeMs }),
    /invalid shape/,
  );
  const reached = reach(before);
  const reachedSnapshot = structuredClone(reached);
  assert.throws(() => reach(reached), /unavailable/);
  assert.deepEqual(reached, reachedSnapshot);
});

test("p8 ending evidence round-trips and forged evidence rejects", () => {
  const reached = reach(eligibleState());
  const raw = serializeGameState(reached, 1234);
  const loaded = parseSave(raw);
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected current ending save to load.");
  assert.equal(loaded.notices.length, 0);
  assert.deepEqual(loaded.state.ending, reached.ending);

  const forged = JSON.parse(raw);
  forged.state.ending.reachedCells = { mantissa: 1, exponent: 5 };
  assert.equal(parseSave(JSON.stringify(forged)).status, "rejected");
  forged.state.ending.reachedCells = { ...reached.cells };
  forged.state.ending.sourceEventSequence = forged.state.eventSequence;
  assert.equal(parseSave(JSON.stringify(forged)).status, "rejected");
  forged.state.ending.sourceEventSequence = reached.ending.sourceEventSequence;
  forged.state.ending.reachedNetworkTier = 999;
  assert.equal(parseSave(JSON.stringify(forged)).status, "rejected");
});

test("p7 provisional ending flags migrate to unreached without fabricated evidence", () => {
  const raw = JSON.parse(serializeGameState(eligibleState(), 1200));
  raw.progressionVersion = 7;
  raw.state.endingReached = true;
  delete raw.state.ending;
  const loaded = parseSave(JSON.stringify(raw));
  assert.equal(loaded.status, "loaded");
  if (loaded.status !== "loaded") throw new Error("Expected p7 save to migrate.");
  assert.deepEqual(loaded.state.ending, { phase: "unreached" });
  assert.equal(
    loaded.notices.some((notice) => notice.field === "ending"),
    true,
  );
});

test("ending presentation reframes scale without changing the precise cell resource", () => {
  const reached = reach(eligibleState());
  const presentation = endingPresentation(reached);
  assert.equal(presentation.mode, "reached");
  assert.equal(presentation.sceneMode, "chicago-scale");
  assert.match(presentation.cellCount, /cells/);
  assert.match(presentation.volume ?? "", /m3 of cell volume/);
  assert.equal(presentation.chicagoHighRiseVolumes, "1.00");
  assert.deepEqual(formatEndingScale(bigNum(5, 25), "full"), {
    volume: "50.00 septillion m3 of cell volume",
    chicagoHighRiseVolumes: "2.00",
  });
  const afterClick = recordEvent(reached, { type: "click-divide", atMs: reached.activeTimeMs });
  assert.deepEqual(afterClick.ending.reachedCells, reached.ending.reachedCells);
  assert.equal(afterClick.ending.phase, "reached");
  assert.deepEqual(afterClick.network.transmissionPressure, reached.network.transmissionPressure);
});
