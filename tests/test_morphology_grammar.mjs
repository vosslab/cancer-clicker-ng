import assert from "node:assert/strict";
import test from "node:test";

import {
  MORPHOLOGY_AXES,
  MORPHOLOGY_RULES,
  MORPHOLOGY_VARIATION_BUDGETS,
  STAGE_MORPHOLOGY_FIXTURES,
  resolve_morphology,
} from "../src/svg/morphology.ts";
import {
  MAX_NOISE_OCTAVES,
  MIN_NOISE_OCTAVES,
  fbm_2d,
  hash_seed,
  mulberry32,
  value_noise_2d,
} from "../src/svg/noise.ts";

function source(
  layer,
  contributorId,
  label = contributorId,
  referenceRowId = "morphology:pleomorphism",
) {
  return { layer, contributorId, label, referenceRowId };
}

function axis(
  layer,
  name,
  value,
  contributorId = `${layer}:${name}`,
  referenceRowId = "morphology:pleomorphism",
) {
  return {
    axis: name,
    mode: MORPHOLOGY_RULES[name].mode,
    value,
    source: source(layer, contributorId, contributorId, referenceRowId),
  };
}

function category(
  layer,
  field,
  value,
  priority,
  contributorId,
  referenceRowId = "morphology:abnormal_mitosis",
) {
  return {
    field,
    value,
    priority,
    source: source(layer, contributorId, contributorId, referenceRowId),
  };
}

function numericFields(params) {
  return MORPHOLOGY_AXES.map((name) => [name, params[name]]);
}

test("versioned FNV and Mulberry32 vectors protect the deterministic wire contract", () => {
  assert.equal(hash_seed([]), 2166136261);
  assert.equal(hash_seed(["m16"]), 2036044061);
  assert.equal(hash_seed(["m16", 7]), 739239246);
  assert.equal(hash_seed([1, 2, 3]), 1028841795);
  assert.equal(hash_seed(["stage", 305419896, "slot"]), 1923504138);

  const first = mulberry32(1);
  assert.deepEqual(
    [first(), first(), first(), first(), first()],
    [
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
      0.9683778982143849,
    ],
  );
  const second = mulberry32(305419896);
  assert.deepEqual(
    [second(), second(), second(), second(), second()],
    [
      0.10615200875326991, 0.941276284167543, 0.9398706152569503, 0.2338848018553108,
      0.9045877147000283,
    ],
  );
});

test("fresh seeded streams are isolated from each other", () => {
  const advanced = mulberry32(1);
  advanced();
  advanced();
  const fresh = mulberry32(1);
  assert.equal(fresh(), 0.6270739405881613);
  const unrelated = mulberry32(2);
  unrelated();
  assert.equal(mulberry32(1)(), 0.6270739405881613);
});

test("morphology baseline is complete, finite, frozen, and traceable", () => {
  const resolution = resolve_morphology(17);
  assert.equal(Object.isFrozen(resolution), true);
  assert.equal(Object.isFrozen(resolution.params), true);
  assert.equal(Object.isFrozen(resolution.provenance), true);
  assert.deepEqual(Object.keys(resolution.params).sort(), [
    "asymmetry",
    "depthStratum",
    "dissemination",
    "elongation",
    "heterogeneity",
    "invasion",
    "membraneWaviness",
    "mitoticState",
    "necrosis",
    "nuclearEccentricity",
    "nuclearToCytoplasmicRatio",
    "polarity",
    "tissueDisorganization",
  ]);
  for (const [name, value] of numericFields(resolution.params)) {
    assert.equal(Number.isFinite(value), true, `${name} is finite`);
    assert.equal(resolution.provenance[name][0].contributorId, "baseline:morphology-v1");
    assert.equal(resolution.provenance[name][0].referenceRowId, "morphology:baseline");
  }
  assert.equal(resolution.provenance.mitoticState[0].contributorId, "baseline:morphology-v1");
  assert.equal(resolution.provenance.depthStratum[0].contributorId, "baseline:morphology-v1");
});

test("same declarations and seed are byte-stable while another seed stays in the family", () => {
  const declarations = { stage: STAGE_MORPHOLOGY_FIXTURES.invasive_carcinoma.contributions };
  const first = resolve_morphology(123, declarations);
  const repeated = resolve_morphology(123, declarations);
  const varied = resolve_morphology(124, declarations);
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first.params, varied.params);
  assert.equal(first.params.mitoticState, varied.params.mitoticState);
  assert.equal(first.params.depthStratum, varied.params.depthStratum);
  assert.ok(first.params.invasion > 0.4);
});

test("discrete traits are frozen, independently seeded, and constrained by mitotic state", () => {
  const quiescent = resolve_morphology(123);
  const repeated = resolve_morphology(123);
  const changed = resolve_morphology(124);
  assert.equal(Object.isFrozen(quiescent.traits), true);
  assert.equal(Object.isFrozen(quiescent.traits.polarityOrientation), true);
  assert.equal(Object.isFrozen(quiescent.traits.mitosis), true);
  assert.deepEqual(quiescent.traits, repeated.traits);
  assert.ok(["round", "ovoid", "lobed", "spindle"].includes(changed.traits.familyVariant));
  assert.ok(changed.traits.polarityOrientation.bucket >= 0);
  assert.ok(changed.traits.polarityOrientation.bucket < 8);
  assert.equal(
    changed.traits.polarityOrientation.angleDegrees,
    changed.traits.polarityOrientation.bucket * 45,
  );
  assert.deepEqual(quiescent.traits.mitosis, { motif: "none", placement: "none" });

  const dividing = resolve_morphology(123, {
    stage: [category("stage", "mitoticState", "dividing", 10, "stage:dividing")],
  });
  assert.ok(["paired_nuclei", "bipolar_spindle"].includes(dividing.traits.mitosis.motif));
  assert.ok(["central", "offset", "peripheral"].includes(dividing.traits.mitosis.placement));
  const abnormal = resolve_morphology(123, {
    stage: [category("stage", "mitoticState", "abnormal", 10, "stage:abnormal")],
  });
  assert.equal(abnormal.traits.mitosis.motif, "multipolar_spindle");
  assert.ok(["central", "offset", "peripheral"].includes(abnormal.traits.mitosis.placement));
  assert.notDeepEqual(quiescent.traits, changed.traits);
});

test("ordered layers preserve independent regional contributors and prior provenance", () => {
  const common = {
    stage: [axis("stage", "asymmetry", 0.1, "stage:asymmetry")],
    hallmark: [axis("hallmark", "asymmetry", 0.1, "hallmark:asymmetry")],
    prestige: [axis("prestige", "asymmetry", 0.1, "prestige:asymmetry")],
    regional: {
      siteProgram: [axis("regional", "asymmetry", 0.1, "site:asymmetry")],
      host: [axis("regional", "asymmetry", 0.1, "host:asymmetry")],
    },
  };
  const withoutNode = resolve_morphology(4, common);
  const withNode = resolve_morphology(4, {
    ...common,
    regional: {
      ...common.regional,
      node: [axis("regional", "invasion", 0.25, "node:invasion")],
    },
  });
  assert.ok(withNode.params.invasion > withoutNode.params.invasion);
  assert.equal(withNode.params.asymmetry, withoutNode.params.asymmetry);
  assert.deepEqual(
    withNode.provenance.asymmetry.map((item) => item.contributorId),
    [
      "baseline:morphology-v1",
      "stage:asymmetry",
      "hallmark:asymmetry",
      "prestige:asymmetry",
      "site:asymmetry",
      "host:asymmetry",
      "individual:4",
    ],
  );
  assert.ok(withNode.provenance.invasion.some((item) => item.contributorId === "node:invasion"));
  assert.ok(
    withNode.provenance.invasion.some(
      (item) =>
        item.contributorId === "node:invasion" && item.referenceRowId === "morphology:pleomorphism",
    ),
  );
});

test("numeric axes clamp only after provenance retains every accepted source", () => {
  for (const name of MORPHOLOGY_AXES) {
    const rule = MORPHOLOGY_RULES[name];
    const upperValue = rule.mode === "add" ? 100 : 100;
    const lowerValue = -100;
    const upper = resolve_morphology(0, {
      stage: [axis("stage", name, upperValue, `upper:${name}`)],
    });
    const lower = resolve_morphology(0, {
      stage: [axis("stage", name, lowerValue, `lower:${name}`)],
    });
    assert.equal(upper.params[name], rule.maximum, `${name} upper clamp`);
    assert.equal(lower.params[name], rule.minimum, `${name} lower clamp`);
    assert.ok(upper.provenance[name].some((item) => item.contributorId === `upper:${name}`));
    assert.ok(lower.provenance[name].some((item) => item.contributorId === `lower:${name}`));
    assert.ok(
      upper.provenance[name].some((item) => item.contributorId === `resolver:clamp:${name}`),
    );
    assert.ok(
      upper.provenance[name].some(
        (item) =>
          item.contributorId === `resolver:clamp:${name}` &&
          item.referenceRowId === "morphology:resolver_clamp",
      ),
    );
    assert.ok(
      lower.provenance[name].some((item) => item.contributorId === `resolver:clamp:${name}`),
    );
  }
});

test("hostile contributions reject nonfinite values, unknown names, modes, and sources", () => {
  assert.throws(() => resolve_morphology(1, { stage: [axis("stage", "elongation", Number.NaN)] }));
  assert.throws(() => resolve_morphology(1, { stage: [axis("stage", "elongation", Infinity)] }));
  assert.throws(() =>
    resolve_morphology(1, {
      stage: [{ axis: "unknown", mode: "add", value: 1, source: source("stage", "unknown") }],
    }),
  );
  assert.throws(() =>
    resolve_morphology(1, {
      stage: [
        { axis: "elongation", mode: "multiply", value: 1, source: source("stage", "bad-mode") },
      ],
    }),
  );
  assert.throws(() => resolve_morphology(1, { stage: [axis("stage", "elongation", 1, " ")] }));
  assert.throws(() =>
    resolve_morphology(1, { stage: [category("stage", "mitoticState", "unknown", 1, "bad")] }),
  );
  assert.throws(() =>
    resolve_morphology(1, {
      stage: [
        {
          axis: "elongation",
          mode: "add",
          value: 1,
          source: { layer: "stage", contributorId: "missing-row", label: "missing row" },
        },
      ],
    }),
  );
  assert.throws(() =>
    resolve_morphology(1, {
      stage: [
        {
          axis: "elongation",
          mode: "add",
          value: 1,
          source: {
            layer: "stage",
            contributorId: "unknown-row",
            label: "unknown row",
            referenceRowId: "morphology:not-a-row",
          },
        },
      ],
    }),
  );
});

test("categorical resolution uses priority, later layers, then lexical contributor IDs", () => {
  const priority = resolve_morphology(1, {
    stage: [category("stage", "mitoticState", "dividing", 12, "stage:high")],
    hallmark: [category("hallmark", "mitoticState", "abnormal", 11, "hallmark:low")],
  });
  assert.equal(priority.params.mitoticState, "dividing");
  const laterLayer = resolve_morphology(1, {
    stage: [category("stage", "depthStratum", "middle", 12, "stage:middle")],
    hallmark: [category("hallmark", "depthStratum", "deep", 12, "hallmark:deep")],
  });
  assert.equal(laterLayer.params.depthStratum, "deep");
  const lexical = resolve_morphology(1, {
    stage: [
      category("stage", "mitoticState", "dividing", 12, "stage:zeta"),
      category("stage", "mitoticState", "abnormal", 12, "stage:alpha"),
    ],
  });
  assert.equal(lexical.params.mitoticState, "abnormal");
});

test("individual variation is bounded by heterogeneity and never changes categories", () => {
  const declarations = {
    stage: [
      axis("stage", "heterogeneity", 0.4, "stage:heterogeneity"),
      category("stage", "mitoticState", "abnormal", 10, "stage:mitosis"),
      category("stage", "depthStratum", "deep", 100, "slot:depth"),
    ],
  };
  const first = resolve_morphology(10, declarations);
  const second = resolve_morphology(11, declarations);
  assert.equal(first.params.mitoticState, "abnormal");
  assert.equal(second.params.mitoticState, "abnormal");
  assert.equal(first.params.depthStratum, "deep");
  assert.equal(second.params.depthStratum, "deep");
  for (const [name, budget] of Object.entries(MORPHOLOGY_VARIATION_BUDGETS)) {
    const difference = Math.abs(first.params[name] - second.params[name]);
    assert.ok(difference <= 2 * first.params.heterogeneity * budget + 1e-12, `${name} budget`);
    assert.ok(first.provenance[name].some((item) => item.contributorId === "individual:10"));
  }
});

test("noise stays bounded across seed and octave limits with no ambient entropy", () => {
  for (const seed of [0, 1, 0xffffffff, hash_seed(["morphology", 7])]) {
    for (const octaves of [MIN_NOISE_OCTAVES, 2, MAX_NOISE_OCTAVES]) {
      const value = fbm_2d(seed, -4.25, 7.5, octaves);
      assert.ok(value >= 0 && value <= 1);
    }
    const value = value_noise_2d(seed, -3.5, 8.25);
    assert.ok(value >= 0 && value <= 1);
  }
  assert.throws(() => fbm_2d(1, 0, 0, 0));
  assert.throws(() => fbm_2d(1, 0, 0, 5));
  assert.throws(() => value_noise_2d(1, Number.NaN, 0));
  assert.throws(() => hash_seed([Number.NaN]));
});
