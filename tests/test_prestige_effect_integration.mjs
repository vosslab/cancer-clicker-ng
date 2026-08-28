import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  hallmarkId,
  hostCardId,
  hostDraftId,
  hostRunId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import {
  applyElapsedHallmarkBoundary,
  projectManualDivisionHallmarkEffects,
  replicativeCapacityExhausted,
} from "../src/hallmarks/elapsed_effects.ts";
import { economyTick } from "../src/economy/tick.ts";
import { hallmarkEconomyModifier } from "../src/hallmarks/economy_effects.ts";
import { applyInflammation } from "../src/hallmarks/handlers/inflammation.ts";
import { applyMetabolicConversion } from "../src/hallmarks/handlers/metabolism.ts";
import {
  applyReplicativeBudget,
  effectiveTelomereReserve,
  hasDivisionLimitWarning,
} from "../src/hallmarks/handlers/replicative_budget.ts";
import { effectiveImmuneVisibility } from "../src/hallmarks/handlers/immune_visibility.ts";
import {
  applyPerfusionLayout,
  perfusionMaintenanceAtpDebit,
} from "../src/hallmarks/handlers/perfusion_layout.ts";
import { effectiveRouteCommitmentRisk } from "../src/hallmarks/handlers/route_commitment.ts";
import { prestigeEffects } from "../src/prestige/effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { stageGateResult } from "../src/stages/gates.ts";

function currentRun({
  siteId = "liver",
  programId = "exploit_niche",
  immuneRegime = "immune-ordinary",
  tissueEcology = "ecology-vascular",
  hostHorizon = "horizon-ordinary",
  applications = [],
} = {}) {
  const initial = createInitialGameState();
  const card = { id: hostCardId("card:integration"), immuneRegime, tissueEcology, hostHorizon };
  const draftId = hostDraftId("draft:integration");
  const runId = hostRunId("host-run:integration");
  return {
    ...initial,
    metastasis: {
      ...initial.metastasis,
      activeNicheContext: { siteId, allocationRank: 1, programId },
    },
    hostTransfer: {
      ...initial.hostTransfer,
      activeHost: { hostRunId: runId, card },
      pendingDraft: {
        id: draftId,
        sourceSeed: 1,
        sourceEventSequence: 0,
        cards: [card, card, card, card],
        revealPolicy: "standard",
        revealedCardIds: [card.id],
        available: false,
        consumedCardId: card.id,
      },
    },
    lineageLedger: {
      ...initial.lineageLedger,
      currentHostRunId: runId,
      lineageBoonApplications: applications.map((application) => ({
        ...application,
        draftId,
        hostRunId: runId,
        cardId: card.id,
      })),
    },
  };
}

function metabolic(state) {
  return {
    ...state,
    currentStage: stageId("avascular_lesion"),
    substrate: bigNum(4, 0),
    atp: bigNum(0, 0),
    hallmarkLevels: [{ id: hallmarkId("metabolic_deregulation"), level: 1 }],
  };
}

function perfused(state, overrides = {}) {
  const region = {
    id: regionId("integration-rim"),
    capacity: 8,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
  };
  return {
    ...state,
    currentStage: stageId("hypoxic_lesion"),
    activeTimeMs: 0,
    oxygenPressure: 4,
    atp: bigNum(2, 0),
    hallmarkLevels: [{ id: hallmarkId("angiogenesis"), level: 1 }],
    regions: [region],
    ...overrides,
  };
}

test("selected niche changes real metabolic conversion and final route risk", () => {
  const exploit = metabolic(currentRun({ programId: "exploit_niche" }));
  const occult = metabolic(currentRun({ programId: "occult_niche" }));
  const operation = {
    type: "convert-substrate",
    hallmark: "metabolic_deregulation",
    amount: bigNum(2, 0),
  };
  const exploitAfter = applyMetabolicConversion({ state: exploit, operation, appliedAtMs: 0 });
  const occultAfter = applyMetabolicConversion({ state: occult, operation, appliedAtMs: 0 });
  assert.ok(exploitAfter.atp.mantissa > occultAfter.atp.mantissa);
  const route = routeId("venous-exit");
  assert.ok(
    effectiveRouteCommitmentRisk({ ...exploit, routeRiskById: { [route]: 0.4 } }, route) >
      effectiveRouteCommitmentRisk({ ...occult, routeRiskById: { [route]: 0.4 } }, route),
  );
});

test("capacity ceiling and ATP debit share a reversible current-run vessel quote", () => {
  const ordinary = perfused(
    currentRun({
      siteId: "brain",
      programId: "occult_niche",
      tissueEcology: "ecology-nutrient-poor",
    }),
  );
  const remodel = perfused(
    currentRun({ siteId: "brain", programId: "remodel_niche", tissueEcology: "ecology-fibrotic" }),
  );
  const operation = {
    type: "set-vessel-link",
    hallmark: "angiogenesis",
    regionId: regionId("integration-rim"),
    linked: true,
  };
  assert.throws(() => applyPerfusionLayout({ state: ordinary, operation, appliedAtMs: 0 }));
  const linked = applyPerfusionLayout({ state: remodel, operation, appliedAtMs: 0 });
  assert.equal(linked.regions[0].capacity, 10);
  assert.equal(perfusionMaintenanceAtpDebit(linked, 1), 2);
  const unlinked = applyPerfusionLayout({
    state: linked,
    operation: { ...operation, linked: false },
    appliedAtMs: 0,
  });
  assert.equal(unlinked.regions[0].capacity, 8);
  assert.equal(unlinked.vesselMaintenanceAtp, 0);
});

test("effective upkeep reserves the same debit it charges and tears down an unfunded link", () => {
  const state = perfused(
    currentRun({ siteId: "brain", programId: "remodel_niche", tissueEcology: "ecology-fibrotic" }),
  );
  const operation = {
    type: "set-vessel-link",
    hallmark: "angiogenesis",
    regionId: regionId("integration-rim"),
    linked: true,
  };
  const linked = applyPerfusionLayout({ state, operation, appliedAtMs: 0 });
  const unpaid = applyElapsedHallmarkBoundary({ ...linked, atp: bigNum(1, 0) });
  assert.deepEqual(unpaid.regions[0].vesselLinkIds, []);
  assert.equal(unpaid.regions[0].capacity, 8);
});

test("a selected-run vascular quote stays identical in live and offline shared tick paths", () => {
  const state = perfused(
    currentRun({ siteId: "brain", programId: "remodel_niche", tissueEcology: "ecology-fibrotic" }),
    { atp: bigNum(4, 0) },
  );
  const operation = {
    type: "set-vessel-link",
    hallmark: "angiogenesis",
    regionId: regionId("integration-rim"),
    linked: true,
  };
  const linked = applyPerfusionLayout({ state, operation, appliedAtMs: 0 });
  const live = economyTick(linked, 1_000, "live");
  const offline = economyTick(linked, 1_000, "offline");
  assert.deepEqual(offline.resourceSnapshot, live.resourceSnapshot);
  assert.deepEqual(offline.stateProjection, live.stateProjection);
});

test("host visibility and reserve effects reach operational consumers without changing raw counters", () => {
  const vigilant = currentRun({ immuneRegime: "immune-vigilant" });
  const tolerant = currentRun({ immuneRegime: "immune-tolerant" });
  const target = regionId("origin");
  assert.ok(
    effectiveImmuneVisibility(vigilant, target) > effectiveImmuneVisibility(tolerant, target),
  );
  const durable = {
    ...currentRun({ hostHorizon: "horizon-durable" }),
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    regions: [
      {
        id: target,
        capacity: 1,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    telomereReserveByRegion: { [target]: 0 },
    reserveFloor: 0,
  };
  assert.equal(replicativeCapacityExhausted(durable), false);
  const after = applyElapsedHallmarkBoundary(durable);
  assert.equal(after.reserveFloor, 0);
  assert.equal(after.telomereReserveByRegion[target], 0);
});

test("effective reserve floor unifies warnings, banking, and consumption without inflating storage", () => {
  const target = regionId("reserve-integration");
  const base = {
    ...currentRun({ hostHorizon: "horizon-durable" }),
    currentStage: stageId("hypoxic_lesion"),
    hallmarkLevels: [{ id: hallmarkId("replicative_immortality"), level: 1 }],
    regions: [
      {
        id: target,
        capacity: 1,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
    telomereReserveByRegion: { [target]: 0 },
    reserveFloor: 0,
    telomeraseCharges: 1,
  };
  assert.equal(effectiveTelomereReserve(base, target), 2);
  assert.equal(hasDivisionLimitWarning(base, base.regions[0]), false);
  assert.throws(() =>
    applyReplicativeBudget(
      base,
      {
        type: "spend-telomerase",
        hallmark: "replicative_immortality",
        target: "bank-reserve-floor",
        charges: 1,
      },
      0,
    ),
  );
  assert.equal(projectManualDivisionHallmarkEffects(base).telomereReserveByRegion[target], 0);
  assert.equal(applyElapsedHallmarkBoundary(base).telomereReserveByRegion[target], 0);
  const rawThree = { ...base, telomereReserveByRegion: { [target]: 3 } };
  assert.equal(effectiveTelomereReserve(rawThree, target), 3);
  assert.equal(projectManualDivisionHallmarkEffects(rawThree).telomereReserveByRegion[target], 2);
});

test("immune regime changes the accepted inflammation operation", () => {
  const target = regionId("inflammation-integration");
  const withRegime = (immuneRegime) => ({
    ...currentRun({ immuneRegime }),
    currentStage: stageId("angiogenic_primary"),
    hallmarkLevels: [{ id: hallmarkId("tumor_promoting_inflammation"), level: 1 }],
    regions: [
      {
        id: target,
        capacity: 2,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: ["vessel:fixture"],
        routeIds: [],
      },
    ],
  });
  const operation = {
    type: "activate-inflammation",
    hallmark: "tumor_promoting_inflammation",
    regionId: target,
  };
  assert.equal(
    applyInflammation({ state: withRegime("immune-vigilant"), operation, appliedAtMs: 0 })
      .inflammationEpisodes.length,
    1,
  );
  assert.throws(() =>
    applyInflammation({ state: withRegime("immune-tolerant"), operation, appliedAtMs: 0 }),
  );
});

test("vigilant and tolerant hosts alter the composed host-pressure gate", () => {
  const stateFor = (immuneRegime) => ({
    ...currentRun({ immuneRegime }),
    cells: bigNum(1_000, 0),
    oxygenPressure: 0,
    damagePressure: 0,
    immunePressure: 0,
  });
  assert.equal(
    stageGateResult(stateFor("immune-vigilant"), stageId("host_collapse")).eligible,
    true,
  );
  assert.equal(
    stageGateResult(stateFor("immune-tolerant"), stageId("host_collapse")).eligible,
    false,
  );
});

test("provenance gates the protected route and targeted liability at real consumers", () => {
  const protectedState = currentRun({
    siteId: "lung",
    applications: [{ kind: "pre-draft", boonId: "protected_route_affinity" }],
  });
  assert.ok(
    effectiveRouteCommitmentRisk(
      { ...protectedState, routeRiskById: { [routeId("venous-exit")]: 0.5 } },
      routeId("venous-exit"),
    ) <
      effectiveRouteCommitmentRisk(
        { ...protectedState, routeRiskById: { [routeId("arterial-exit")]: 0.5 } },
        routeId("arterial-exit"),
      ),
  );
  const plain = currentRun({ tissueEcology: "ecology-fibrotic" });
  const reduced = currentRun({
    tissueEcology: "ecology-fibrotic",
    applications: [
      {
        kind: "targeted-active-host",
        boonId: "reduced_trait_liability",
        targetTraitId: "ecology-fibrotic",
      },
    ],
  });
  assert.ok(
    prestigeEffects(reduced).vesselMaintenanceMultiplier <
      prestigeEffects(plain).vesselMaintenanceMultiplier,
  );
});

test("protected route affinity changes the authoritative invasion producer strategy", () => {
  const route = routeId("venous-exit");
  const state = {
    ...currentRun({
      siteId: "lung",
      programId: "occult_niche",
      applications: [{ kind: "pre-draft", boonId: "protected_route_affinity" }],
    }),
    hallmarkLevels: [{ id: hallmarkId("invasion_metastasis"), level: 1 }],
    routeRiskById: { [route]: 0.15 },
    committedCellCommitments: { [route]: 1 },
  };
  const protectedModifier = hallmarkEconomyModifier(state, "cdk4");
  const unprotectedModifier = hallmarkEconomyModifier(
    {
      ...state,
      lineageLedger: { ...state.lineageLedger, lineageBoonApplications: [] },
    },
    "cdk4",
  );
  assert.ok(protectedModifier.productionMultiplier > unprotectedModifier.productionMultiplier);
});
