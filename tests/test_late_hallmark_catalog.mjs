import assert from "node:assert/strict";
import test from "node:test";

import {
  hallmarkId,
  lateProgramOptionId,
  microbiomeCommunityId,
  microbiomeCompositionId,
  microbiomeOfferId,
  microbiomePoolId,
} from "../src/brands.ts";
import {
  assertLateHallmarkCatalog,
  findLateHallmark,
  LATE_HALLMARK_CATALOG,
  LATE_HALLMARK_KEYS,
} from "../src/hallmarks/late_hallmark_catalog.ts";
import {
  assertMicrobiomeCatalog,
  assertMicrobiomeCompositionSnapshot,
  findMicrobiomeCommunity,
  findMicrobiomeComposition,
  MICROBIOME_COMPOSITION_CATALOG,
  MICROBIOME_POOL_ID,
} from "../src/hallmarks/microbiome_catalog.ts";
import {
  assertPlasticityCatalog,
  plasticityDefinition,
  PLASTICITY_PHENOTYPES,
} from "../src/hallmarks/plasticity_catalog.ts";
import {
  assertLateProgramCatalog,
  findLateProgramOption,
  isLateProgramOptionAllowed,
  LATE_PROGRAM_OPTION_KEYS,
} from "../src/hallmarks/program_catalog.ts";
import {
  assertSenescenceCatalog,
  isSenescenceAction,
  senescenceDefinition,
} from "../src/hallmarks/senescence_catalog.ts";

test("late hallmark catalogs expose the closed 2022 decision vocabulary", () => {
  assert.deepEqual(
    LATE_HALLMARK_CATALOG.map((definition) => definition.key),
    LATE_HALLMARK_KEYS,
  );
  assert.deepEqual(PLASTICITY_PHENOTYPES, ["proliferative", "migratory", "stress-tolerant"]);
  assert.deepEqual(LATE_PROGRAM_OPTION_KEYS, [
    "signaling:burst-bias",
    "signaling:cycle-bias",
    "mutation:contain-liability",
    "mutation:amplify-benefit",
    "plasticity:commit-growth",
    "plasticity:commit-survival",
  ]);
  assert.equal(MICROBIOME_COMPOSITION_CATALOG.length, 4);
  assertLateHallmarkCatalog();
  assertPlasticityCatalog();
  assertLateProgramCatalog();
  assertMicrobiomeCatalog();
  assertSenescenceCatalog();
});

test("branded late identifiers reject empty values and keep unrelated microbiome identities separate", () => {
  assert.throws(() => lateProgramOptionId(" "), /must not be empty/);
  assert.throws(() => microbiomeCommunityId(""), /must not be empty/);
  assert.throws(() => microbiomeCompositionId(""), /must not be empty/);
  assert.throws(() => microbiomeOfferId(""), /must not be empty/);
  assert.equal(microbiomePoolId("global-contamination"), MICROBIOME_POOL_ID);
});

test("catalog lookups return frozen executable definitions for real branded identifiers", () => {
  const hallmark = findLateHallmark(LATE_HALLMARK_CATALOG[0].id);
  const phenotype = plasticityDefinition("migratory");
  const option = findLateProgramOption(lateProgramOptionId("signaling:cycle-bias"));
  const community = findMicrobiomeCommunity(microbiomeCommunityId("mucosal-commensal"));
  const composition = findMicrobiomeComposition(microbiomeCompositionId("commensal-biofilm"));
  assert.ok(hallmark);
  assert.ok(option);
  assert.ok(community);
  assert.ok(composition);
  assert.equal(Object.isFrozen(hallmark), true);
  assert.equal(Object.isFrozen(phenotype.effects), true);
  assert.equal(Object.isFrozen(option), true);
  assert.equal(Object.isFrozen(community.effects), true);
  assert.equal(Object.isFrozen(composition.niches), true);
  assert.equal(isLateProgramOptionAllowed(hallmark.id, option.id), false);
  assert.equal(isLateProgramOptionAllowed(hallmarkId("proliferative_signaling"), option.id), true);
  assert.equal(
    senescenceDefinition("replicative-limit").retainedEffects.productionPerSecondMultiplier,
    0,
  );
  assert.equal(isSenescenceAction("keep"), true);
  assert.equal(isSenescenceAction("unknown"), false);
});

test("catalog validators reject a mismatched microbiome snapshot and incoherent closed rows", () => {
  const snapshot = structuredClone(MICROBIOME_COMPOSITION_CATALOG[0]);
  snapshot.niches[0].communityId = microbiomeCommunityId("immune-modulating-biofilm");
  assert.throws(() => assertMicrobiomeCompositionSnapshot(snapshot), /does not match/);

  const lateRows = structuredClone(LATE_HALLMARK_CATALOG);
  lateRows[1].key = lateRows[0].key;
  assert.throws(() => assertLateHallmarkCatalog(lateRows), /unique branch identities/);

  const programRows = [
    ...LATE_PROGRAM_OPTION_KEYS.map((key) => findLateProgramOption(lateProgramOptionId(key))),
  ];
  assert.equal(
    programRows.every((row) => row !== undefined),
    true,
  );
});
