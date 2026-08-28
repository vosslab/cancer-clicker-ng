import assert from "node:assert/strict";
import test from "node:test";

import { CULTURE_NETWORK_PROP_KINDS } from "../src/svg/culture_network_props.tsx";

test("culture and network map each named board role to one editable scene prop kind", () => {
  assert.deepEqual(CULTURE_NETWORK_PROP_KINDS, [
    "dish",
    "cryobank",
    "assay",
    "passage",
    "site",
    "route",
    "containment",
    "mandate",
  ]);
  assert.equal(new Set(CULTURE_NETWORK_PROP_KINDS).size, CULTURE_NETWORK_PROP_KINDS.length);
});
