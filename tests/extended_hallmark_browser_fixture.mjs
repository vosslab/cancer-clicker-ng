import { bigNum, hallmarkId, regionId, stageId } from "../src/brands.ts";
import { HALLMARK_IDS } from "../src/state/catalog.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { serializeGameState } from "../src/state/save_load.ts";

function region(name, routes = []) {
  return {
    id: regionId(name),
    capacity: 4,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: ["vessel:extended-hallmark-rim"],
    routeIds: routes.map(regionId),
  };
}

/** A valid current-save baseline with all extended-hallmark branches available, but none acquired. */
export function extendedHallmarkBrowserFixture() {
  const initial = createInitialGameState();
  const primary = region("extended-hallmark-rim", ["extended-hallmark-route"]);
  return {
    ...initial,
    cells: bigNum(1, 9),
    substrate: bigNum(9, 0),
    atp: bigNum(9, 0),
    activeTimeMs: 100,
    currentStage: stageId("angiogenic_primary"),
    deterministicSeed: 19,
    hallmarkLevels: HALLMARK_IDS.map((id) => ({ id: hallmarkId(id), level: 0 })),
    producerLevels: initial.producerLevels.map((level) => ({ ...level, level: 1 })),
    regions: [primary, region("extended-hallmark-neighbor")],
    routeRiskById: { "extended-hallmark-route": 0.4 },
    concealmentTokens: 2,
  };
}

export function extendedHallmarkBrowserFixtureSave() {
  return serializeGameState(extendedHallmarkBrowserFixture(), 1_000);
}
