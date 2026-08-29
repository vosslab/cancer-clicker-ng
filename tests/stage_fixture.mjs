import { bigNum, regionId, routeId, stageId } from "../src/brands.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { serializeGameState } from "../src/state/save_load.ts";

function region(name, routeNames = []) {
  return {
    id: regionId(name),
    capacity: 10,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: ["vessel:fixture"],
    routeIds: routeNames.map(routeId),
  };
}

function stageIndex(id) {
  const index = STAGE_IDS.indexOf(id);
  if (index < 0) throw new Error("Unknown fixture stage.");
  return index;
}

/** A valid state one explicit event away from entering the requested stage. */
export function stageGateFixture(toStageId, { earnedL3 = true } = {}) {
  const targetIndex = stageIndex(toStageId);
  if (targetIndex === 0) return createInitialGameState();
  const currentStage = stageId(STAGE_IDS[targetIndex - 1]);
  const state = { ...createInitialGameState(), currentStage, activeTimeMs: 100 };
  const fixtureRegion = region("fixture-region");
  const secondRegion = region("fixture-region-two");
  switch (toStageId) {
    case "microcolony":
      return { ...state, cells: bigNum(10, 0), manualDivisionCharge: 1 };
    case "avascular_lesion":
      return {
        ...state,
        cells: bigNum(100, 0),
        producerLevels: state.producerLevels.map((level, index) =>
          index === 0 ? { ...level, level: 1 } : level,
        ),
      };
    case "hypoxic_lesion":
      return { ...state, regions: [fixtureRegion], oxygenPressure: 5 };
    case "angiogenic_primary":
      return { ...state, regions: [fixtureRegion] };
    case "invasive_carcinoma":
      return { ...state, regions: [fixtureRegion], routeDiscoveryProgress: 10 };
    case "intravasation":
      fixtureRegion.routeIds = [routeId("fixture-route")];
      return {
        ...state,
        regions: [fixtureRegion],
        committedCellCommitments: { "fixture-route": 1 },
        routeRiskById: { "fixture-route": 0 },
      };
    case "micrometastatic_seeding":
      return { ...state, regions: [fixtureRegion], seededSites: [fixtureRegion.id] };
    case "metastatic_burden":
      return {
        ...state,
        cells: bigNum(1_000, 0),
        regions: [fixtureRegion, secondRegion],
        seededSites: [fixtureRegion.id, secondRegion.id],
      };
    case "host_collapse":
      return { ...state, cells: bigNum(1_000, 0), oxygenPressure: 1 };
    case "immortalized_culture":
      return {
        ...state,
        prestigeAvailability: earnedL3 ? [{ id: "L3", status: "earned" }] : [],
      };
    case "global_lab_contamination":
      return { ...state, routeDiscoveryProgress: 100 };
    default:
      throw new Error("Fixture target must be a canonical noninitial stage.");
  }
}

/** Serializes the exact current save envelope for isolated browser storage setup. */
export function stageGateFixtureSave(toStageId, options = {}) {
  return serializeGameState(stageGateFixture(toStageId, options), 1_000);
}

/** Provides the complete earned producer ladder for bounded desktop-rack render checks. */
export function fullProducerRackFixtureSave(savedAtMs = 1_000) {
  const state = createInitialGameState();
  return serializeGameState(
    {
      ...state,
      cells: bigNum(1, 7),
      producerLevels: state.producerLevels.map((level) => ({ ...level, level: 1 })),
    },
    savedAtMs,
  );
}
