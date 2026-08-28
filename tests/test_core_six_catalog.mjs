import assert from "node:assert/strict";
import test from "node:test";
import { hallmarkId, stageId } from "../src/brands.ts";
import {
  assertCoreSixCatalog,
  CORE_SIX_HALLMARK_CATALOG,
  CORE_SIX_HALLMARK_KEYS,
  findCoreSixHallmark,
  hasReachedCoreSixUnlock,
} from "../src/hallmarks/core_six_catalog.ts";
import { CORE_SIX_OPERATIONS_MATCH_BRANCH_CONTRACTS } from "../src/hallmarks/core_six_types.ts";
import { STAGE_IDS } from "../src/state/catalog.ts";
import { stageDefinition } from "../src/stages/catalog.ts";

const EXPECTED = [
  [
    "proliferative_signaling",
    "division-allocation",
    "apply-division-allocation",
    "set-signaling-allocation",
  ],
  [
    "growth_suppressor_evasion",
    "checkpoint-routing",
    "apply-checkpoint-routing",
    "select-checkpoint",
  ],
  ["cell_death_resistance", "damage-triage", "apply-damage-triage", "resolve-triage"],
  ["replicative_immortality", "replicative-budget", "apply-replicative-budget", "spend-telomerase"],
  ["angiogenesis", "perfusion-layout", "apply-perfusion-layout", "set-vessel-link"],
  ["invasion_metastasis", "route-commitment", "apply-route-commitment", "commit-route"],
];

test("core-six core-six catalog exactly covers six identities with distinct mechanic-handler operations", () => {
  assert.deepEqual(
    CORE_SIX_HALLMARK_KEYS,
    EXPECTED.map(([key]) => key),
  );
  assert.deepEqual(
    CORE_SIX_HALLMARK_CATALOG.map((definition) => [
      definition.key,
      definition.mechanicClass,
      definition.handlerId,
      definition.operationType,
    ]),
    EXPECTED,
  );
  assert.equal(new Set(CORE_SIX_HALLMARK_CATALOG.map((definition) => definition.id)).size, 6);
  assert.equal(
    new Set(CORE_SIX_HALLMARK_CATALOG.map((definition) => definition.mechanicClass)).size,
    6,
  );
  assert.equal(
    new Set(CORE_SIX_HALLMARK_CATALOG.map((definition) => definition.handlerId)).size,
    6,
  );
  assert.equal(
    new Set(CORE_SIX_HALLMARK_CATALOG.map((definition) => definition.operationType)).size,
    6,
  );
  assert.equal(CORE_SIX_OPERATIONS_MATCH_BRANCH_CONTRACTS, true);
  assertCoreSixCatalog();
});

test("core-six core-six stage capabilities gate the declared unlock without local stage literals", () => {
  for (const definition of CORE_SIX_HALLMARK_CATALOG) {
    const stage = stageDefinition(definition.unlock.stageId);
    assert.equal(stage.operationalChange.actionId, definition.unlock.capability, definition.key);
    assert.equal(hasReachedCoreSixUnlock(definition.unlock.stageId, definition.key), true);
    const unlockIndex = STAGE_IDS.indexOf(definition.unlock.stageId);
    assert.ok(unlockIndex >= 0, definition.key);
    if (unlockIndex > 0) {
      assert.equal(
        hasReachedCoreSixUnlock(stageId(STAGE_IDS[unlockIndex - 1]), definition.key),
        false,
        definition.key,
      );
    }
  }
  assert.equal(findCoreSixHallmark(hallmarkId("angiogenesis"))?.key, "angiogenesis");
  assert.equal(findCoreSixHallmark(hallmarkId("metabolic_deregulation")), undefined);
});

test("core-six core-six catalog rejects missing, duplicate, unknown, and mismatched rows", () => {
  const definitions = structuredClone(CORE_SIX_HALLMARK_CATALOG);
  assert.throws(() => assertCoreSixCatalog(definitions.slice(1)), /exactly six/);
  const duplicate = structuredClone(definitions);
  duplicate[1].key = duplicate[0].key;
  assert.throws(() => assertCoreSixCatalog(duplicate), /unique identities/);
  const unknown = structuredClone(definitions);
  unknown[1].key = "unknown";
  assert.throws(() => assertCoreSixCatalog(unknown), /canonical branch/);
  const capabilityMismatch = structuredClone(definitions);
  capabilityMismatch[0].unlock.capability = "route-commitment";
  assert.throws(() => assertCoreSixCatalog(capabilityMismatch), /capability/);
});
