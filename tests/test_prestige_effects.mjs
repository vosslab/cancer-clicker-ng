import assert from "node:assert/strict";
import test from "node:test";

import { hostCardId, hostDraftId, hostRunId, regionId, routeId } from "../src/brands.ts";
import {
  prestigeEffectivePressure,
  prestigeEffects,
  prestigeImmuneVisibility,
  prestigeProtectedRouteIds,
  prestigeReplicativeReserveFloor,
  prestigeRouteRisk,
  prestigeSubstrateConversion,
  prestigeVesselMaintenance,
  prestigeVesselQuote,
} from "../src/prestige/effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";

function currentRun({
  siteId = "liver",
  programId = "exploit_niche",
  immuneRegime = "immune-ordinary",
  tissueEcology = "ecology-vascular",
  hostHorizon = "horizon-ordinary",
  applications = [],
  usedLineageBoonIds = [],
} = {}) {
  const initial = createInitialGameState();
  const card = {
    id: hostCardId("card:current"),
    immuneRegime,
    tissueEcology,
    hostHorizon,
  };
  const hostRunIdValue = hostRunId("host-run:current");
  const draftId = hostDraftId("draft:current");
  return {
    ...initial,
    metastasis: {
      ...initial.metastasis,
      activeNicheContext: { siteId, allocationRank: 1, programId },
    },
    hostTransfer: {
      ...initial.hostTransfer,
      activeHost: { hostRunId: hostRunIdValue, card },
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
      currentHostRunId: hostRunIdValue,
      lineageBoonApplications: applications.map((application) => ({
        ...application,
        draftId: application.draftId ?? draftId,
        hostRunId: application.hostRunId ?? hostRunIdValue,
        cardId: application.cardId ?? card.id,
      })),
      usedLineageBoonIds,
    },
  };
}

test("exploit and occult current contexts move conversion and route risk in opposite directions", () => {
  const exploit = currentRun({ programId: "exploit_niche" });
  const occult = currentRun({ programId: "occult_niche" });
  assert.ok(prestigeSubstrateConversion(exploit, 1) > prestigeSubstrateConversion(occult, 1));
  assert.ok(
    prestigeRouteRisk(exploit, routeId("venous-exit"), 0.4) >
      prestigeRouteRisk(occult, routeId("venous-exit"), 0.4),
  );
});

test("niche and active-host lifecycle contributions are independently operational and compose", () => {
  const both = currentRun();
  const nicheOnly = {
    ...both,
    hostTransfer: { ...both.hostTransfer, activeHost: null },
    lineageLedger: { ...both.lineageLedger, currentHostRunId: null },
  };
  const hostOnly = {
    ...both,
    metastasis: { ...both.metastasis, activeNicheContext: null },
  };
  const neither = createInitialGameState();
  assert.deepEqual(prestigeEffects(neither), {
    substrateConversionMultiplier: 1,
    vesselMaintenanceMultiplier: 1,
    vesselCapacityBonus: 0,
    routeRiskDelta: 0,
    immuneVisibilityDelta: 0,
    pressureDelta: 0,
    hostRunwayReserveFloor: 0,
    protectedRouteIds: [],
  });
  assert.ok(prestigeEffects(nicheOnly).substrateConversionMultiplier > 1);
  assert.ok(prestigeEffects(hostOnly).vesselCapacityBonus > 0);
  assert.equal(
    prestigeEffects(both).vesselCapacityBonus,
    prestigeEffects(nicheOnly).vesselCapacityBonus + prestigeEffects(hostOnly).vesselCapacityBonus,
  );
});

test("remodel and fibrotic choices increase bounded vessel capacity and upkeep", () => {
  const remodelFibrotic = currentRun({
    siteId: "brain",
    programId: "remodel_niche",
    tissueEcology: "ecology-fibrotic",
  });
  const exploitFibrotic = currentRun({
    siteId: "brain",
    programId: "exploit_niche",
    tissueEcology: "ecology-fibrotic",
  });
  assert.ok(
    prestigeVesselQuote(remodelFibrotic, regionId("target")).capacityBonus >
      prestigeVesselQuote(exploitFibrotic, regionId("target")).capacityBonus,
  );
  assert.ok(
    prestigeVesselMaintenance(remodelFibrotic, 1) > prestigeVesselMaintenance(exploitFibrotic, 1),
  );
});

test("vigilant and tolerant host traits reverse visibility and pressure contributions", () => {
  const vigilant = currentRun({ immuneRegime: "immune-vigilant" });
  const tolerant = currentRun({ immuneRegime: "immune-tolerant" });
  assert.ok(
    prestigeImmuneVisibility(vigilant, regionId("target"), 1) >
      prestigeImmuneVisibility(tolerant, regionId("target"), 1),
  );
  assert.ok(prestigeEffectivePressure(vigilant, 1) > prestigeEffectivePressure(tolerant, 1));
});

test("durable horizon raises the reserve floor above brief horizon", () => {
  const brief = currentRun({ hostHorizon: "horizon-brief" });
  const durable = currentRun({ hostHorizon: "horizon-durable" });
  assert.ok(
    prestigeReplicativeReserveFloor(durable, 0) > prestigeReplicativeReserveFloor(brief, 0),
  );
  assert.equal(prestigeReplicativeReserveFloor(durable, 0), 2);
  assert.equal(prestigeReplicativeReserveFloor(durable, 3), 3);
  assert.equal(prestigeReplicativeReserveFloor(createInitialGameState(), 3), 3);
});

test("protected route affinity applies only to compatible routes from the current draft", () => {
  const state = currentRun({
    siteId: "lung",
    applications: [{ boonId: "protected_route_affinity", kind: "pre-draft" }],
  });
  assert.deepEqual(prestigeProtectedRouteIds(state), [routeId("venous-exit")]);
  assert.ok(
    prestigeRouteRisk(state, routeId("venous-exit"), 0.5) <
      prestigeRouteRisk(state, routeId("arterial-exit"), 0.5),
  );
  const foreignDraft = currentRun({
    siteId: "lung",
    applications: [
      {
        boonId: "protected_route_affinity",
        kind: "pre-draft",
        draftId: hostDraftId("draft:historic"),
      },
    ],
  });
  assert.deepEqual(prestigeProtectedRouteIds(foreignDraft), []);
});

test("targeted liability reduction preserves a trait benefit and reduces only that trait liability", () => {
  const reduced = currentRun({
    tissueEcology: "ecology-fibrotic",
    applications: [
      {
        boonId: "reduced_trait_liability",
        kind: "targeted-active-host",
        targetTraitId: "ecology-fibrotic",
      },
    ],
  });
  const plain = currentRun({ tissueEcology: "ecology-fibrotic" });
  assert.equal(
    prestigeVesselQuote(reduced, regionId("target")).capacityBonus,
    prestigeVesselQuote(plain, regionId("target")).capacityBonus,
  );
  assert.ok(prestigeVesselMaintenance(reduced, 1) < prestigeVesselMaintenance(plain, 1));
  const foreignTarget = currentRun({
    tissueEcology: "ecology-fibrotic",
    applications: [
      {
        boonId: "reduced_trait_liability",
        kind: "targeted-active-host",
        targetTraitId: "ecology-fibrotic",
        draftId: hostDraftId("draft:historic"),
      },
    ],
  });
  assert.equal(prestigeVesselMaintenance(foreignTarget, 1), prestigeVesselMaintenance(plain, 1));
});

test("historic portfolio and foreign boon provenance remain neutral", () => {
  const initial = createInitialGameState();
  const historicalOnly = {
    ...initial,
    metastasis: {
      ...initial.metastasis,
      allocations: [{ siteId: "liver", rank: 3 }],
      programs: [{ siteId: "liver", programId: "exploit_niche" }],
    },
    lineageLedger: { ...initial.lineageLedger, usedLineageBoonIds: ["protected_route_affinity"] },
  };
  assert.deepEqual(prestigeEffects(historicalOnly), {
    substrateConversionMultiplier: 1,
    vesselMaintenanceMultiplier: 1,
    vesselCapacityBonus: 0,
    routeRiskDelta: 0,
    immuneVisibilityDelta: 0,
    pressureDelta: 0,
    hostRunwayReserveFloor: 0,
    protectedRouteIds: [],
  });
  const extraReveal = currentRun({
    applications: [{ boonId: "extra_card_reveal", kind: "pre-draft" }],
  });
  assert.deepEqual(prestigeEffects(extraReveal), prestigeEffects(currentRun()));
});

test("effects are frozen and helper boundaries reject nonfinite inputs while clamping outputs", () => {
  const state = currentRun({ programId: "exploit_niche", immuneRegime: "immune-vigilant" });
  assert.equal(Object.isFrozen(prestigeEffects(state)), true);
  assert.equal(Object.isFrozen(prestigeEffects(state).protectedRouteIds), true);
  assert.equal(prestigeSubstrateConversion(state, 9), 1.5);
  assert.equal(prestigeEffectivePressure(state, Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER);
  assert.throws(() => prestigeRouteRisk(state, routeId("venous-exit"), Number.NaN), /finite/);
  assert.throws(() => prestigeImmuneVisibility(state, regionId("target"), Infinity), /finite/);
});
