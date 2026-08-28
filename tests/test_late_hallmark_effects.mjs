import assert from "node:assert/strict";
import test from "node:test";

import {
  bigNum,
  eventId,
  hallmarkId,
  lateProgramOptionId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { equals } from "../src/bignum/bignum.ts";
import { producerCellProductionRate } from "../src/economy/production.ts";
import { STAGE_ONE_PRODUCERS } from "../src/economy/producers.ts";
import { applyMetabolicConversion } from "../src/hallmarks/handlers/metabolism.ts";
import { applyInflammation } from "../src/hallmarks/handlers/inflammation.ts";
import { effectiveRouteCommitmentRisk } from "../src/hallmarks/handlers/route_commitment.ts";
import {
  effectiveLateHallmarkImmuneVisibility,
  eligiblePhenotypeRegions,
  isRetainedSenescentRegion,
  lateHallmarkInflammationDurationMultiplier,
  lateHallmarkPressure,
  lateHallmarkProductionMultiplier,
  microbiomeOfferQuote,
  phenotypeEligibilityQuote,
  programEligibilityQuote,
  senescenceResolutionQuote,
} from "../src/hallmarks/late_hallmark_effects.ts";
import {
  findMicrobiomeComposition,
  MICROBIOME_COMPOSITION_CATALOG,
  MICROBIOME_POOL_ID,
} from "../src/hallmarks/microbiome_catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { stageGateResult } from "../src/stages/gates.ts";

const REGION = regionId("late-effect-region");
const ROUTE = routeId("late-effect-route");

function activeState(overrides = {}) {
  const base = createInitialGameState();
  return {
    ...base,
    currentStage: stageId("global_lab_contamination"),
    activeTimeMs: 100,
    cells: bigNum(1_000, 0),
    substrate: bigNum(100, 0),
    hallmarkLevels: [
      { id: hallmarkId("phenotypic_plasticity"), level: 1 },
      { id: hallmarkId("epigenetic_reprogramming"), level: 1 },
      { id: hallmarkId("polymorphic_microbiomes"), level: 1 },
      { id: hallmarkId("senescent_cells"), level: 1 },
      { id: hallmarkId("proliferative_signaling"), level: 1 },
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("tumor_promoting_inflammation"), level: 1 },
    ],
    producerLevels: STAGE_ONE_PRODUCERS.map((producer) => ({ id: producer.id, level: 1 })),
    regions: [
      {
        id: REGION,
        capacity: 4,
        viability: 1,
        phenotype: "proliferative",
        vesselLinkIds: [eventId("late-effect-vessel")],
        routeIds: [ROUTE],
      },
    ],
    routeRiskById: { [ROUTE]: 0.5 },
    ...overrides,
  };
}

function installedComposition(state) {
  const composition = findMicrobiomeComposition("fermenter-pathobiont");
  assert.ok(composition);
  return {
    ...state,
    lateHallmarks: {
      ...state.lateHallmarks,
      microbiome: {
        ...state.lateHallmarks.microbiome,
        activeComposition: { offerId: "late-effect-offer", composition, installedAtMs: 100 },
      },
    },
  };
}

test("plasticity and an assigned program change production, route commitment risk, and host pressure", () => {
  const baseline = activeState({
    hallmarkLevels: [
      { id: hallmarkId("phenotypic_plasticity"), level: 1 },
      { id: hallmarkId("epigenetic_reprogramming"), level: 1 },
      { id: hallmarkId("proliferative_signaling"), level: 1 },
    ],
  });
  const programmed = {
    ...baseline,
    lateHallmarks: {
      ...baseline.lateHallmarks,
      epigenetic: {
        assignments: [
          {
            hallmarkId: hallmarkId("proliferative_signaling"),
            optionId: lateProgramOptionId("signaling:cycle-bias"),
          },
        ],
        cooldownDeadlineMs: null,
      },
    },
  };
  const baselineRate = producerCellProductionRate(baseline, STAGE_ONE_PRODUCERS[0].id);
  const programmedRate = producerCellProductionRate(programmed, STAGE_ONE_PRODUCERS[0].id);

  assert.equal(lateHallmarkProductionMultiplier(programmed) > 1, true);
  assert.equal(equals(programmedRate, baselineRate), false);
  assert.equal(effectiveRouteCommitmentRisk(programmed, ROUTE), 0.6);
  assert.equal(lateHallmarkPressure(programmed) > 0, true);
  assert.equal(stageGateResult(programmed, stageId("host_collapse")).eligible, true);
});

test("an installed microbiome composition changes conversion, inflammation duration, and operational visibility", () => {
  const state = installedComposition(activeState());
  const converted = applyMetabolicConversion({
    state,
    operation: {
      type: "convert-substrate",
      hallmark: "metabolic_deregulation",
      amount: { mantissa: 10, exponent: 0 },
    },
    appliedAtMs: state.activeTimeMs,
  });
  const inflamed = applyInflammation({
    state,
    operation: {
      type: "activate-inflammation",
      hallmark: "tumor_promoting_inflammation",
      regionId: REGION,
    },
    appliedAtMs: state.activeTimeMs,
  });

  assert.equal(equals(converted.atp, bigNum(10, 0)), false);
  assert.equal(lateHallmarkInflammationDurationMultiplier(state) > 1, true);
  assert.equal(inflamed.inflammationEpisodes[0].deadlineMs > state.activeTimeMs + 30_000, true);
  assert.equal(effectiveLateHallmarkImmuneVisibility(state, REGION) > 1, true);
});

test("retained senescence keeps the region but removes its productive contribution and adds local pressure", () => {
  const state = activeState({
    lateHallmarks: {
      ...createInitialGameState().lateHallmarks,
      senescence: {
        pendingDecisions: [],
        retainedRegions: [
          {
            decisionId: eventId("late-effect-senescence"),
            regionId: REGION,
            cause: "damage-failure",
            createdAtMs: 10,
            retainedAtMs: 100,
          },
        ],
      },
    },
  });

  assert.equal(isRetainedSenescentRegion(state, REGION), true);
  assert.equal(lateHallmarkProductionMultiplier(state), 0);
  assert.equal(lateHallmarkPressure(state) > 0, true);
  assert.equal(state.regions.length, 1);
});

test("locked late branches remain neutral even when durable rows are present", () => {
  const locked = installedComposition(
    activeState({
      currentStage: stageId("transformed_cell"),
      lateHallmarks: {
        ...createInitialGameState().lateHallmarks,
        epigenetic: {
          assignments: [
            {
              hallmarkId: hallmarkId("proliferative_signaling"),
              optionId: lateProgramOptionId("signaling:cycle-bias"),
            },
          ],
          cooldownDeadlineMs: null,
        },
        senescence: {
          pendingDecisions: [],
          retainedRegions: [
            {
              decisionId: eventId("locked-senescence"),
              regionId: REGION,
              cause: "damage-failure",
              createdAtMs: 10,
              retainedAtMs: 100,
            },
          ],
        },
      },
    }),
  );

  assert.equal(lateHallmarkProductionMultiplier(locked), 1);
  assert.equal(effectiveRouteCommitmentRisk(locked, ROUTE), 0.5);
  assert.equal(lateHallmarkPressure(locked), 0);
  assert.equal(effectiveLateHallmarkImmuneVisibility(locked, REGION), 1);
  assert.equal(isRetainedSenescentRegion(locked, REGION), false);
});

test("phenotype quotes exclude missing and senescence-related regions and agree with reducer cooldown legality", () => {
  const state = activeState();
  const eligible = phenotypeEligibilityQuote(state, REGION, state.activeTimeMs);
  assert.equal(eligible.eligible, true);
  assert.deepEqual(eligible.eligibleChoices, ["proliferative", "migratory", "stress-tolerant"]);
  assert.equal(eligiblePhenotypeRegions(state, state.activeTimeMs).length, 1);
  const changed = recordEvent(state, {
    type: "assign-region-phenotype",
    regionId: REGION,
    phenotype: "migratory",
    atMs: state.activeTimeMs,
  });
  const cooling = phenotypeEligibilityQuote(changed, REGION, changed.activeTimeMs);
  assert.equal(cooling.eligible, false);
  assert.equal(cooling.reason, "cooldown-active");
  assert.equal(cooling.remainingCooldownMs > 0, true);
  assert.throws(() =>
    recordEvent(changed, {
      type: "assign-region-phenotype",
      regionId: REGION,
      phenotype: "proliferative",
      atMs: changed.activeTimeMs,
    }),
  );
  const pending = {
    ...state,
    lateHallmarks: {
      ...state.lateHallmarks,
      senescence: {
        pendingDecisions: [
          {
            id: eventId("pending-region"),
            regionId: REGION,
            cause: "damage-failure",
            createdAtMs: 1,
          },
        ],
        retainedRegions: [],
      },
    },
  };
  assert.equal(phenotypeEligibilityQuote(pending, REGION, 100).reason, "senescence-pending");
  const retained = {
    ...pending,
    lateHallmarks: {
      ...pending.lateHallmarks,
      senescence: {
        pendingDecisions: [],
        retainedRegions: [
          {
            decisionId: eventId("retained-region"),
            regionId: REGION,
            cause: "damage-failure",
            createdAtMs: 1,
            retainedAtMs: 100,
          },
        ],
      },
    },
  };
  assert.equal(phenotypeEligibilityQuote(retained, REGION, 100).reason, "senescence-retained");
  assert.equal(
    phenotypeEligibilityQuote(state, regionId("cleared"), 100).reason,
    "region-unavailable",
  );
});

test("program, saved-offer, and senescence quotes expose the same legal operation boundaries", () => {
  const state = activeState({ atp: bigNum(100, 0) });
  const program = programEligibilityQuote(
    state,
    hallmarkId("proliferative_signaling"),
    state.activeTimeMs,
  );
  assert.equal(program.available, true);
  assert.equal(
    program.options.every((option) => option.eligible),
    true,
  );
  const programmed = recordEvent(state, {
    type: "reconfigure-hallmark-program",
    hallmarkId: hallmarkId("proliferative_signaling"),
    optionId: lateProgramOptionId("signaling:burst-bias"),
    atMs: state.activeTimeMs,
  });
  assert.equal(
    programEligibilityQuote(
      programmed,
      hallmarkId("proliferative_signaling"),
      programmed.activeTimeMs,
    ).reason,
    "cooldown-active",
  );
  const offered = {
    ...state,
    lateHallmarks: {
      ...state.lateHallmarks,
      microbiome: {
        ...state.lateHallmarks.microbiome,
        pendingOffer: {
          id: "quoted-offer",
          poolId: MICROBIOME_POOL_ID,
          compositions: [
            MICROBIOME_COMPOSITION_CATALOG[0],
            MICROBIOME_COMPOSITION_CATALOG[1],
            MICROBIOME_COMPOSITION_CATALOG[2],
          ],
          sourceSeed: 1,
          sourceSequence: 0,
          sourceStage: state.currentStage,
          expiresAtMs: 200,
        },
      },
    },
  };
  const offer = microbiomeOfferQuote(offered, 100);
  assert.equal(offer.available, true);
  assert.equal(offer.offer?.compositions.length, 3);
  const installed = recordEvent(offered, {
    type: "install-microbiome-composition",
    offerId: "quoted-offer",
    compositionId: MICROBIOME_COMPOSITION_CATALOG[0].id,
    atMs: 100,
  });
  assert.equal(microbiomeOfferQuote(installed, 100).reason, "no-offer");
  assert.equal(microbiomeOfferQuote(offered, 200).reason, "offer-expired");
  const pending = {
    ...state,
    lateHallmarks: {
      ...state.lateHallmarks,
      senescence: {
        pendingDecisions: [
          {
            id: eventId("quoted-decision"),
            regionId: REGION,
            cause: "replicative-limit",
            createdAtMs: 1,
          },
        ],
        retainedRegions: [],
      },
    },
  };
  const decision = senescenceResolutionQuote(pending, eventId("quoted-decision"), 100);
  assert.equal(decision.available, true);
  assert.equal(decision.keepEligible, true);
  assert.equal(decision.clearEligible, true);
  const kept = recordEvent(pending, {
    type: "resolve-senescence-decision",
    decisionId: eventId("quoted-decision"),
    action: "keep",
    atMs: 100,
  });
  assert.equal(
    senescenceResolutionQuote(kept, eventId("quoted-decision"), 100).reason,
    "decision-unavailable",
  );
});
