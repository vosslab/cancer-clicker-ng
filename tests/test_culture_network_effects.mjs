import assert from "node:assert/strict";
import test from "node:test";

import {
  cryobankProgramId,
  bigNum,
  hallmarkId,
  networkNodeId,
  passageUpgradeId,
  regionId,
  routeId,
  stageId,
} from "../src/brands.ts";
import { cellProductionRate } from "../src/economy/production.ts";
import { applyMetabolicConversion } from "../src/hallmarks/handlers/metabolism.ts";
import { effectiveRouteCommitmentRisk } from "../src/hallmarks/handlers/route_commitment.ts";
import {
  phenotypeEligibilityQuote,
  isLateHallmarkOperational,
} from "../src/hallmarks/late_hallmark_effects.ts";
import { plasticityDefinition } from "../src/hallmarks/plasticity_catalog.ts";
import {
  cultureEffects,
  cultureLateProgramInterfacesAvailable,
  cultureProtocolCooldownDeadline,
  cultureRouteRisk,
  cultureSubstrateConversion,
} from "../src/prestige/culture_effects.ts";
import { generateNetworkFrontierV1 } from "../src/prestige/network.ts";
import {
  networkLocalEffects,
  networkNodeCreditQuote,
  networkMorphologyContributions,
} from "../src/prestige/network_effects.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { recordEvent } from "../src/state/events.ts";
import { createGameColonyScene } from "../src/svg/colony_visual_state.ts";

function cryobankCulture(programId) {
  return {
    passages: 0,
    purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("cryobank"), rank: 1 }],
    cryobankProgram: programId,
    queuedProducerAction: null,
  };
}

function postL3State() {
  return {
    ...createInitialGameState(),
    currentStage: stageId("global_lab_contamination"),
    lineageLedger: { ...createInitialGameState().lineageLedger, networkSeed: 19 },
  };
}

test("cryobank culture composes after reset-local effects without restoring L1 allocation", () => {
  const state = {
    ...postL3State(),
    culture: cryobankCulture(cryobankProgramId("cryobank_exploit")),
    metastasis: { ...createInitialGameState().metastasis, allocations: [] },
  };
  assert.deepEqual(cultureEffects(state), {
    substrateConversionMultiplier: 1.06,
    routeRiskDelta: 0.03,
    phenotypePreference: "proliferative",
  });
  assert.equal(cultureSubstrateConversion(state, 1), 1.06);
  assert.ok(Math.abs(cultureRouteRisk(state, 0.4) - 0.43) < Number.EPSILON);
  assert.equal(state.metastasis.allocations.length, 0);
});

test("high throughput adds a post-L3 gate while ordinary late behavior remains reachable before L3", () => {
  const preL3 = {
    ...createInitialGameState(),
    currentStage: stageId("metastatic_burden"),
    hallmarkLevels: [{ id: hallmarkId("phenotypic_plasticity"), level: 1 }],
    regions: [
      {
        id: regionId("region-v1:one"),
        capacity: 2,
        viability: 1,
        phenotype: "migratory",
        vesselLinkIds: [],
        routeIds: [],
      },
    ],
  };
  assert.equal(cultureLateProgramInterfacesAvailable(preL3), true);
  assert.equal(isLateHallmarkOperational(preL3, "phenotypic_plasticity"), true);

  const postL3Locked = {
    ...preL3,
    lineageLedger: { ...preL3.lineageLedger, networkSeed: 19 },
  };
  assert.equal(cultureLateProgramInterfacesAvailable(postL3Locked), false);
  assert.equal(isLateHallmarkOperational(postL3Locked, "phenotypic_plasticity"), false);

  const postL3Open = {
    ...postL3Locked,
    culture: {
      ...postL3Locked.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("high_throughput"), rank: 1 }],
    },
  };
  assert.equal(cultureLateProgramInterfacesAvailable(postL3Open), true);
  assert.equal(isLateHallmarkOperational(postL3Open, "phenotypic_plasticity"), true);
  assert.equal(phenotypeEligibilityQuote(postL3Open, regionId("region-v1:one"), 0).eligible, true);
});

test("culture protocol shortens only a new cooldown deadline and retains unrelated liabilities", () => {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("culture_protocol"), rank: 2 }],
    },
    chosenMutations: ["repair_bypass"],
    mutationLiabilities: ["repair_bypass"],
  };
  assert.equal(cultureProtocolCooldownDeadline(state, 100, 1_100), 600);
  assert.deepEqual(state.chosenMutations, ["repair_bypass"]);
  assert.deepEqual(state.mutationLiabilities, ["repair_bypass"]);
});

test("post-L3 culture drives handlers and reducer deadlines after L1 state has cleared", () => {
  const route = routeId("culture-route");
  const cellRegion = regionId("culture-region");
  const initial = createInitialGameState();
  const state = {
    ...postL3State(),
    activeTimeMs: 100,
    culture: {
      ...cryobankCulture(cryobankProgramId("cryobank_exploit")),
      purchasedPassageUpgrades: [
        { upgradeId: passageUpgradeId("cryobank"), rank: 1 },
        { upgradeId: passageUpgradeId("high_throughput"), rank: 1 },
        { upgradeId: passageUpgradeId("culture_protocol"), rank: 2 },
      ],
    },
    metastasis: { ...initial.metastasis, activeNicheContext: null },
    substrate: bigNum(2, 0),
    atp: bigNum(0, 0),
    routeRiskById: { [route]: 0.4 },
    regions: [
      {
        id: cellRegion,
        capacity: 2,
        viability: 1,
        phenotype: "migratory",
        vesselLinkIds: [],
        routeIds: [route],
      },
    ],
    hallmarkLevels: [
      { id: hallmarkId("metabolic_deregulation"), level: 1 },
      { id: hallmarkId("invasion_metastasis"), level: 1 },
      { id: hallmarkId("phenotypic_plasticity"), level: 1 },
    ],
    chosenMutations: ["repair_bypass"],
    mutationLiabilities: ["repair_bypass"],
  };
  const converted = applyMetabolicConversion({
    state,
    operation: {
      type: "convert-substrate",
      hallmark: "metabolic_deregulation",
      amount: bigNum(2, 0),
    },
    appliedAtMs: state.activeTimeMs,
  });
  assert.equal(converted.atp.mantissa, 2.12);
  assert.equal(effectiveRouteCommitmentRisk(state, route), 0.23);
  assert.deepEqual(
    phenotypeEligibilityQuote(state, cellRegion, state.activeTimeMs).eligibleChoices,
    ["proliferative", "migratory", "stress-tolerant"],
  );
  const changed = recordEvent(state, {
    type: "assign-region-phenotype",
    regionId: cellRegion,
    phenotype: "proliferative",
    atMs: state.activeTimeMs,
  });
  assert.equal(
    changed.lateHallmarks.plasticity.switchCooldownByRegion[cellRegion],
    state.activeTimeMs + Math.ceil(plasticityDefinition("proliferative").switchCooldownMs * 0.5),
  );
  assert.deepEqual(changed.chosenMutations, state.chosenMutations);
  assert.deepEqual(changed.mutationLiabilities, state.mutationLiabilities);
});

test("network effects are node-local and containment changes only its selected node", () => {
  const primary = networkNodeId("authored-node-v1:primary-lab");
  const relay = networkNodeId("authored-node-v1:vascular-relay");
  const initial = createInitialGameState();
  const state = {
    ...postL3State(),
    producerLevels: initial.producerLevels.map((level) =>
      level.id === "producer" ? { ...level, level: 1 } : level,
    ),
    network: {
      ...initial.network,
      nodes: [
        {
          id: primary,
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
        {
          id: relay,
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
      ],
      containedNodeId: primary,
    },
  };
  assert.deepEqual(networkLocalEffects(state, primary), {
    throughputMultiplier: 0.85,
    detectionDelta: -0.12,
    adjacencyBonus: 0,
    adjacencyTags: ["urban", "relay"],
  });
  assert.deepEqual(networkLocalEffects(state, relay), {
    throughputMultiplier: 1.08,
    detectionDelta: 0.04,
    adjacencyBonus: 0,
    adjacencyTags: ["vascular", "relay"],
  });
  assert.deepEqual(
    cellProductionRate(state),
    cellProductionRate({ ...state, network: initial.network }),
  );
});

test("active campaigns and containment emit named node-layer morphology provenance", () => {
  const frontier = generateNetworkFrontierV1({
    networkSeed: 19,
    globalTier: 0,
    frontierSequence: 0,
    sourceEventSequence: 4,
  });
  const mandate = frontier.mandates[0];
  const containedNodeId = networkNodeId("authored-node-v1:protected-enclave");
  const state = {
    ...postL3State(),
    network: {
      ...createInitialGameState().network,
      nodes: [
        {
          id: containedNodeId,
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
      ],
      containedNodeId,
      activeCampaign: { mandate: { ...mandate, status: "selected" }, selectedAtActiveMs: 3 },
    },
  };
  const contributions = networkMorphologyContributions(state);
  assert.equal(contributions.length, 2);
  assert.equal(contributions[0]?.source.contributorId, `network:campaign:${mandate.id}`);
  assert.equal(contributions[1]?.source.contributorId, `network:containment:${containedNodeId}`);
  assert.equal(
    contributions.every((contribution) => contribution.source.layer === "regional"),
    true,
  );
});

test("node credit combines only the named stable node's output and committed topology", () => {
  const primary = networkNodeId("authored-node-v1:primary-lab");
  const relay = networkNodeId("authored-node-v1:vascular-relay");
  const enclave = networkNodeId("authored-node-v1:protected-enclave");
  const initial = createInitialGameState();
  const state = {
    ...postL3State(),
    producerLevels: initial.producerLevels.map((level) =>
      level.id === "replication_fork" ? { ...level, level: 1 } : level,
    ),
    network: {
      ...initial.network,
      nodes: [primary, relay, enclave].map((id) => ({
        id,
        sourceKind: "authored",
        campaignId: null,
        status: "stable",
        establishedAtActiveMs: 1,
        stabilizedAtActiveMs: 2,
      })),
      edges: [
        {
          id: "authored-edge-v1:primary-to-relay",
          fromNodeId: primary,
          toNodeId: relay,
          status: "committed",
          campaignId: null,
        },
        {
          id: "authored-edge-v1:relay-to-enclave",
          fromNodeId: relay,
          toNodeId: enclave,
          status: "committed",
          campaignId: null,
        },
      ],
    },
  };
  const quote = networkNodeCreditQuote(state, enclave);
  assert.equal(quote.available, true);
  assert.equal(quote.reason, "available");
  assert.deepEqual(quote.cellProductionRate, cellProductionRate(state));
  assert.equal(quote.throughputMultiplier, 0.9);
  assert.equal(quote.detectionDelta, -0.08);
  assert.equal(quote.detectionMultiplier, 1.08);
  assert.equal(quote.committedIncidentEdges, 1);
  assert.equal(quote.mandateAdjacencyBonus, 0);
  assert.equal(quote.uniqueTagCount, 4);
  assert.equal(quote.productionCredit, 3);
  assert.equal(quote.directedDepthCredit, 2);
  assert.equal(quote.adjacencyCredit, 1);
  assert.equal(quote.diversityCredit, 2);
  assert.equal(quote.credit, 8);
  assert.notDeepEqual(quote.effectiveOutput, quote.cellProductionRate);

  const collected = {
    ...state,
    lineageLedger: { ...state.lineageLedger, stabilizedRewardedNodeIds: [enclave] },
  };
  assert.equal(networkNodeCreditQuote(collected, enclave).reason, "already-collected");
  const scene = createGameColonyScene({
    ...state,
    network: { ...state.network, containedNodeId: enclave },
  });
  assert.equal(
    scene.visual.declarations.regional.node.some(
      (contribution) => contribution.source.contributorId === `network:containment:${enclave}`,
    ),
    true,
  );
});

test("node diversity starts after the first unique local tag and stays bounded", () => {
  const primary = networkNodeId("authored-node-v1:primary-lab");
  const initial = createInitialGameState();
  const state = {
    ...postL3State(),
    network: {
      ...initial.network,
      nodes: [
        {
          id: primary,
          sourceKind: "authored",
          campaignId: null,
          status: "stable",
          establishedAtActiveMs: 1,
          stabilizedAtActiveMs: 2,
        },
      ],
    },
  };
  const quote = networkNodeCreditQuote(state, primary);
  assert.equal(quote.committedIncidentEdges, 0);
  assert.equal(quote.mandateAdjacencyBonus, 0);
  assert.equal(quote.uniqueTagCount, 2);
  assert.equal(quote.diversityCredit, 1);
});
