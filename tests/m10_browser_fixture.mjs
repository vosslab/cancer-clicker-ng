import { bigNum, eventId, hallmarkId, regionId, routeId, stageId } from "../src/brands.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { HALLMARK_IDS } from "../src/state/catalog.ts";
import { serializeGameState } from "../src/state/save_load.ts";

const BRANCH_STAGE = {
  proliferative_signaling: "transformed_cell",
  growth_suppressor_evasion: "microcolony",
  cell_death_resistance: "avascular_lesion",
  replicative_immortality: "hypoxic_lesion",
  angiogenesis: "hypoxic_lesion",
  invasion_metastasis: "invasive_carcinoma",
};

function fixtureRegion(name, routes = []) {
  return {
    id: regionId(name),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: routes.map(routeId),
  };
}

/** A p4 baseline permits UI acquisition but never pre-owns a core-six branch. */
export function m10BrowserFixture(branch, { allBranches = false } = {}) {
  const stage = BRANCH_STAGE[branch];
  if (stage === undefined) throw new Error("Unknown M10 browser branch.");
  const initial = createInitialGameState();
  const levels = HALLMARK_IDS.map((key) => ({
    id: hallmarkId(key),
    level: 0,
  }));
  let state = {
    ...initial,
    activeTimeMs: 50,
    currentStage: stageId(allBranches ? "invasive_carcinoma" : stage),
    hallmarkLevels: levels,
  };
  if (allBranches) {
    const primary = fixtureRegion("m10-primary", ["m10-route"]);
    return {
      ...state,
      cells: bigNum(12, 0),
      regions: [primary],
      survivalCapacity: 2,
      damagePressure: 2,
      pendingDamageEvents: [
        { id: eventId("m10-damage"), regionId: primary.id, outcome: "repairable" },
      ],
      telomeraseCharges: 1,
      telomereReserveByRegion: { "m10-primary": 0 },
      reserveFloor: 0,
      atp: bigNum(10, 0),
      oxygenPressure: 5,
      routeRiskById: { "m10-route": 0.4 },
    };
  }
  if (branch === "cell_death_resistance") {
    const damaged = fixtureRegion("m10-damaged");
    state = {
      ...state,
      currentStage: stageId(allBranches ? "invasive_carcinoma" : "avascular_lesion"),
      regions: [damaged],
      survivalCapacity: 2,
      damagePressure: 2,
      pendingDamageEvents: [
        { id: eventId("m10-damage"), regionId: damaged.id, outcome: "repairable" },
      ],
    };
  }
  if (branch === "replicative_immortality") {
    const threatened = fixtureRegion("m10-threatened");
    state = {
      ...state,
      regions: state.regions.length > 0 ? state.regions : [threatened],
      telomeraseCharges: 1,
      telomereReserveByRegion: { "m10-threatened": 0 },
      reserveFloor: 0,
    };
  }
  if (branch === "angiogenesis") {
    const perfused = fixtureRegion("m10-perfusion");
    state = {
      ...state,
      regions: state.regions.length > 0 ? state.regions : [perfused],
      atp: bigNum(10, 0),
      oxygenPressure: 5,
    };
  }
  if (branch === "invasion_metastasis") {
    const primary = fixtureRegion("m10-primary", ["m10-route"]);
    state = {
      ...state,
      cells: bigNum(12, 0),
      regions: [primary],
      routeRiskById: { "m10-route": 0.4 },
    };
  }
  return state;
}

/** Serializes only a valid prerequisite baseline for browser-local storage setup. */
export function m10BrowserFixtureSave(branch, options) {
  return serializeGameState(m10BrowserFixture(branch, options), 1_000);
}
