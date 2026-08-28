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
    vesselLinkIds: ["vessel:m11-rim"],
    routeIds: routes.map(regionId),
  };
}

/** A valid p4 baseline with all M11 branches available, but none acquired. */
export function m11BrowserFixture() {
  const initial = createInitialGameState();
  const primary = region("m11-rim", ["m11-route"]);
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
    regions: [primary, region("m11-neighbor")],
    routeRiskById: { "m11-route": 0.4 },
    concealmentTokens: 2,
  };
}

export function m11BrowserFixtureSave() {
  return serializeGameState(m11BrowserFixture(), 1_000);
}
