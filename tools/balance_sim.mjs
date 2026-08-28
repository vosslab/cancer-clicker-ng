#!/usr/bin/env node
/** Deterministic calibration evidence over the source-owned visible decision surface. */
import childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { compare, divide, isPositive } from "../src/bignum/bignum.ts";
import { bigNum } from "../src/brands.ts";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { parseRuntimeEvent } from "../src/state/event_parse.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseNormalizedGameState } from "../src/state/save_load.ts";
import { projectVisibleDecisionSurface } from "../src/state/decision_surface.ts";

const TOOL = "tools/balance_sim.mjs";
const FORMAT_VERSION = 3;
const POLICY_IDS = [
  "greedy-payback",
  "naive-cheapest",
  "hallmark-first",
  "prestige-rush",
  "check-in-idle",
];
const ACTION_KINDS = new Set([
  "divide",
  "producer",
  "hallmark",
  "stage",
  "prestige",
  "network",
  "allocation",
]);
const POLICIES = Object.freeze({
  "greedy-payback": Object.freeze({
    displayName: "Local growth",
    behavior:
      "Select the visible producer action with the shortest disclosed cells-cost-per-marginal-cells-per-second payback; preserve surface order for ties.",
  }),
  "naive-cheapest": Object.freeze({
    displayName: "Naive cheapest",
    behavior:
      "Select the lowest disclosed visible cost regardless of biological effect; unpriced actions sort as zero-cost.",
  }),
  "hallmark-first": Object.freeze({
    displayName: "Adaptive drafter",
    behavior:
      "Select visible hallmark choices first, then their visible mutation, phenotype, and program follow-ups.",
  }),
  "prestige-rush": Object.freeze({
    displayName: "Network architect",
    behavior:
      "Select visible stage, reset, prestige, dissemination, and ending actions before local growth choices.",
  }),
  "check-in-idle": Object.freeze({
    displayName: "Stealth seeder",
    behavior:
      "Advance on the declared elapsed schedule and act only on every third decision window when a visible route, network, or prestige action is available.",
  }),
});

function fail(message) {
  throw new Error(`balance_sim: ${message}`);
}
function repositoryRoot() {
  return childProcess
    .execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path.dirname(fileURLToPath(import.meta.url)),
      encoding: "utf8",
    })
    .trim();
}
function usage() {
  return `${TOOL}\n\nUsage:\n  node --import tsx ${TOOL} --suite [--output output_balance/balance_report.json]\n  node --import tsx ${TOOL} --scenario tools/balance_scenarios/<file>.json [--output output_balance/balance_report.json]\n\nWith no selector, --suite runs every tracked calibration scenario. Reports stay under output_balance/.`;
}
function parseArgs(argv) {
  let scenario;
  let suite = false;
  let output = "output_balance/balance_report.json";
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--help") return { help: true };
    if (option === "--suite") {
      suite = true;
      continue;
    }
    if (option !== "--scenario" && option !== "--output") fail(`unknown option ${option}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${option} requires a value`);
    if (option === "--scenario") scenario = value;
    else output = value;
    index += 1;
  }
  if (suite && scenario !== undefined) fail("choose either --suite or --scenario");
  return { scenario, suite: suite || scenario === undefined, output, help: false };
}
function within(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    fail(`${label} must stay within ${path.relative(repositoryRoot(), root) || "."}`);
}
function scenarioPath(root, input) {
  const scenariosRoot = path.resolve(root, "tools/balance_scenarios");
  const requested = path.resolve(root, input);
  within(scenariosRoot, requested, "scenario");
  if (!fs.existsSync(requested)) fail(`scenario does not exist: ${input}`);
  const canonical = fs.realpathSync(requested);
  within(fs.realpathSync(scenariosRoot), canonical, "scenario");
  return canonical;
}
function natural(value) {
  return Number.isSafeInteger(value) && value >= 0;
}
function assertScenario(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw))
    fail("scenario must be an object");
  const required = [
    "formatVersion",
    "id",
    "semanticRevision",
    "curveRevision",
    "seeds",
    "actionBudget",
    "elapsedScheduleMs",
    "allowedKinds",
    "initial",
    "decisionWitness",
  ];
  if (!required.every((key) => Object.hasOwn(raw, key))) fail("scenario omits a required field");
  if (raw.formatVersion !== 2 || typeof raw.id !== "string" || raw.id.length === 0)
    fail("scenario formatVersion or id is invalid");
  if (typeof raw.semanticRevision !== "string" || typeof raw.curveRevision !== "string")
    fail("scenario revisions are invalid");
  if (!Array.isArray(raw.seeds) || raw.seeds.length === 0 || !raw.seeds.every(natural))
    fail("scenario seeds must be nonempty natural numbers");
  if (!natural(raw.actionBudget) || raw.actionBudget === 0)
    fail("actionBudget must be a positive natural number");
  if (
    !Array.isArray(raw.elapsedScheduleMs) ||
    raw.elapsedScheduleMs.length === 0 ||
    !raw.elapsedScheduleMs.every(natural)
  )
    fail("elapsedScheduleMs must contain nonempty natural numbers");
  if (
    !Array.isArray(raw.allowedKinds) ||
    raw.allowedKinds.length === 0 ||
    !raw.allowedKinds.every((kind) => ACTION_KINDS.has(kind))
  )
    fail("allowedKinds must contain known visible action kinds");
  if (raw.initial === null || typeof raw.initial !== "object" || Array.isArray(raw.initial))
    fail("initial must be an object");
  if (raw.initial.kind !== "new-game" && raw.initial.kind !== "durable-snapshot")
    fail("initial.kind must be new-game or durable-snapshot");
  if (raw.initial.kind === "durable-snapshot" && raw.initial.state === undefined)
    fail("durable-snapshot requires state");
  const witness = raw.decisionWitness;
  if (
    witness === null ||
    typeof witness !== "object" ||
    Array.isArray(witness) ||
    !["L1", "L2", "L3", "L4", "ending"].includes(witness.system) ||
    typeof witness.question !== "string" ||
    !Array.isArray(witness.alternatives) ||
    !Array.isArray(witness.requiredVisibleEventTypes) ||
    witness.requiredVisibleEventTypes.length === 0 ||
    !witness.requiredVisibleEventTypes.every(
      (eventType) => typeof eventType === "string" && eventType.length > 0,
    ) ||
    new Set(witness.requiredVisibleEventTypes).size !== witness.requiredVisibleEventTypes.length ||
    !Array.isArray(witness.requiredActionTags) ||
    witness.requiredActionTags.length === 0 ||
    !witness.requiredActionTags.every((tag) => typeof tag === "string" && tag.length > 0) ||
    new Set(witness.requiredActionTags).size !== witness.requiredActionTags.length
  )
    fail("decisionWitness is invalid");
  return raw;
}
function readScenario(root, input) {
  const sourcePath = scenarioPath(root, input);
  try {
    return assertScenario(JSON.parse(fs.readFileSync(sourcePath, "utf8")));
  } catch (error) {
    fail(`scenario JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function readSuite(root) {
  const directory = path.resolve(root, "tools/balance_scenarios");
  const entries = fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith(".json"))
    .sort();
  if (entries.length === 0) fail("suite has no tracked scenario JSON files");
  return entries.map((entry) => readScenario(root, path.join("tools/balance_scenarios", entry)));
}
function initialState(scenario, seed) {
  const state =
    scenario.initial.kind === "new-game"
      ? createInitialGameState()
      : parseNormalizedGameState(scenario.initial.state);
  if (state === undefined) fail("durable scenario snapshot fails the current save boundary");
  if (state.deterministicSeed !== seed)
    fail(`scenario seed ${seed} differs from state seed ${state.deterministicSeed}`);
  return state;
}
function costOrder(action) {
  const cost = action.displayedCost;
  if (cost === undefined) return [-1, 0, 0];
  if (typeof cost.value === "number") return [0, cost.value, 0];
  return [1, cost.value.exponent, cost.value.mantissa];
}
function compareCost(left, right) {
  const leftCost = costOrder(left);
  const rightCost = costOrder(right);
  for (let index = 0; index < leftCost.length; index += 1) {
    const difference = leftCost[index] - rightCost[index];
    if (difference !== 0) return difference;
  }
  return 0;
}
function matching(surface, allowedKinds, predicate) {
  return surface.actions.filter((action) => allowedKinds.has(action.kind) && predicate(action));
}
function firstMatching(surface, allowedKinds, predicates) {
  for (const predicate of predicates) {
    const choice = matching(surface, allowedKinds, predicate)[0];
    if (choice !== undefined) return choice;
  }
  return undefined;
}
function hasTag(action, tags) {
  return tags.some((tag) => action.effectTags.includes(tag));
}
function cheapest(actions) {
  return [...actions].sort(compareCost)[0];
}
function dtoBigNum(value) {
  return bigNum(value.mantissa, value.exponent);
}
function hasPaybackQuote(action) {
  return (
    action.kind === "producer" &&
    action.displayedCost?.resource === "cells" &&
    typeof action.displayedCost.value !== "number" &&
    action.displayedBenefit?.metric === "cells-per-second" &&
    isPositive(dtoBigNum(action.displayedBenefit.value))
  );
}
function comparePayback(left, right) {
  const leftCost = dtoBigNum(left.displayedCost.value);
  const leftBenefit = dtoBigNum(left.displayedBenefit.value);
  const rightCost = dtoBigNum(right.displayedCost.value);
  const rightBenefit = dtoBigNum(right.displayedBenefit.value);
  const ratioOrder = compare(divide(leftCost, leftBenefit), divide(rightCost, rightBenefit));
  return ratioOrder === 0 ? compareCost(left, right) : ratioOrder;
}
function shortestPayback(actions) {
  return [...actions].sort(comparePayback)[0];
}
/** Policies inspect only the visible decision surface and deterministic window number. */
function chooseAction(policyId, surface, allowedKinds, windowIndex) {
  const allowed = matching(surface, allowedKinds, () => true);
  if (policyId === "greedy-payback") {
    const producers = matching(surface, allowedKinds, hasPaybackQuote);
    return (
      shortestPayback(producers) ??
      firstMatching(surface, allowedKinds, [
        (action) => hasTag(action, ["producer", "proliferative_signaling"]),
        (action) => action.kind === "divide",
      ]) ??
      allowed[0]
    );
  }
  if (policyId === "naive-cheapest") return cheapest(allowed);
  if (policyId === "hallmark-first")
    return (
      firstMatching(surface, allowedKinds, [
        (action) => action.kind === "hallmark",
        (action) => hasTag(action, ["mutation", "phenotype", "late-program", "microbiome"]),
        (action) => action.kind === "allocation",
        (action) => action.kind === "producer",
        (action) => action.kind === "divide",
      ]) ?? allowed[0]
    );
  if (policyId === "prestige-rush")
    return (
      firstMatching(surface, allowedKinds, [
        (action) => action.kind === "stage",
        (action) => action.kind === "prestige" || action.kind === "network",
        (action) => hasTag(action, ["reset", "culture", "network", "ending"]),
        (action) => action.kind === "hallmark",
        (action) => action.kind === "producer",
        (action) => action.kind === "divide",
      ]) ?? allowed[0]
    );
  if (windowIndex % 3 !== 0) return undefined;
  return firstMatching(surface, allowedKinds, [
    (action) => hasTag(action, ["route", "network", "transit", "reset", "culture"]),
    (action) => action.kind === "prestige" || action.kind === "network",
  ]);
}
function actionReason(policyId, action) {
  const tags = action.effectTags.join(", ") || "visible action";
  return `${policyId}: ${POLICIES[policyId].behavior} Selected ${tags}.`;
}
function cellMagnitude(dto) {
  return dto.exponent + Math.log10(Math.max(Math.abs(dto.mantissa), Number.MIN_VALUE));
}
function score(state, actions) {
  const dimensions = {
    cellMagnitude: Number(cellMagnitude(state.cells).toFixed(6)),
    stageIndex:
      state.currentStage === "global_lab_contamination"
        ? 12
        : state.currentStage === "host_collapse"
          ? 10
          : 0,
    networkTier: state.network.globalTier,
    endingReached: state.ending.phase === "reached" ? 1 : 0,
    acceptedActions: actions.length,
  };
  return {
    dimensions,
    aggregate: Number(
      (
        dimensions.cellMagnitude +
        dimensions.stageIndex +
        dimensions.networkTier * 3 +
        dimensions.endingReached * 2 +
        dimensions.acceptedActions / 100
      ).toFixed(6),
    ),
  };
}
function milestones(before, after, atMs, list) {
  if (
    before.producerLevels.every((entry) => entry.level === 0) &&
    after.producerLevels.some((entry) => entry.level > 0)
  )
    list.push({ name: "first-producer", atMs });
  if (
    before.hallmarkLevels.every((entry) => entry.level === 0) &&
    after.hallmarkLevels.some((entry) => entry.level > 0)
  )
    list.push({ name: "first-hallmark", atMs });
  if (before.currentStage !== after.currentStage)
    list.push({ name: `stage:${after.currentStage}`, atMs });
  if (before.network.globalTier !== after.network.globalTier)
    list.push({ name: `network-tier:${after.network.globalTier}`, atMs });
  if (before.ending.phase !== after.ending.phase) list.push({ name: "soft-ending", atMs });
}
function advanceSchedule(state, scenario, windowIndex) {
  const elapsedMs = scenario.elapsedScheduleMs[windowIndex % scenario.elapsedScheduleMs.length];
  if (elapsedMs === 0) return state;
  const replayed = replayEconomyOffline(state, { kind: "ready", requestedElapsedMs: elapsedMs });
  if (replayed.kind !== "applied") fail(`economy replay failed with ${replayed.code}`);
  return replayed.state;
}

function witnessWindowMatch(witness, surface) {
  const eventTypes = new Set(witness.requiredVisibleEventTypes);
  const tags = new Set(witness.requiredActionTags);
  const matchedEventTypes = [
    ...new Set(
      surface.actions
        .map((action) => action.event.type)
        .filter((eventType) => eventTypes.has(eventType)),
    ),
  ];
  const matchedTags = [
    ...new Set(
      surface.actions.flatMap((action) => action.effectTags.filter((tag) => tags.has(tag))),
    ),
  ];
  if (matchedEventTypes.length !== eventTypes.size || matchedTags.length !== tags.size)
    return undefined;
  const actionIds = surface.actions
    .filter(
      (action) =>
        eventTypes.has(action.event.type) || action.effectTags.some((tag) => tags.has(tag)),
    )
    .map((action) => action.id);
  return { actionIds, matchedEventTypes, matchedTags };
}

function runPolicy(scenario, policyId, seed) {
  const allowedKinds = new Set(scenario.allowedKinds);
  let state = initialState(scenario, seed);
  const actions = [];
  const idleWindows = [];
  const milestoneList = [];
  const witnessMatches = [];
  for (let windowIndex = 0; windowIndex < scenario.actionBudget; windowIndex += 1) {
    const surface = projectVisibleDecisionSurface(state);
    const witnessMatch = witnessWindowMatch(scenario.decisionWitness, surface);
    if (witnessMatch !== undefined)
      witnessMatches.push({
        policyId,
        seed,
        windowIndex,
        atMs: state.activeTimeMs,
        ...witnessMatch,
      });
    const action = chooseAction(policyId, surface, allowedKinds, windowIndex);
    if (action === undefined)
      idleWindows.push({
        windowIndex,
        atMs: state.activeTimeMs,
        reason: "policy check retained the visible state",
      });
    else {
      const before = state;
      try {
        state = recordEvent(state, parseRuntimeEvent(action.event));
      } catch (error) {
        fail(
          `policy ${policyId} selected illegal visible action ${action.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      actions.push({
        index: windowIndex,
        actionId: action.id,
        kind: action.kind,
        atMs: state.activeTimeMs,
        visibleReason: actionReason(policyId, action),
      });
      milestones(before, state, state.activeTimeMs, milestoneList);
    }
    state = advanceSchedule(state, scenario, windowIndex);
  }
  const terminal = projectVisibleDecisionSurface(state).progression;
  return {
    id: policyId,
    displayName: POLICIES[policyId].displayName,
    canonicalPolicy: policyId,
    behavior: POLICIES[policyId].behavior,
    seed,
    score: score(state, actions),
    actions,
    witnessMatches,
    idleWindows,
    milestones: milestoneList,
    terminal,
    completion: {
      actionWindows: scenario.actionBudget,
      acceptedActionCount: actions.length,
      idleWindowCount: idleWindows.length,
      progression: terminal,
    },
  };
}
function rankPolicies(policies) {
  const ordered = [...policies].sort(
    (left, right) =>
      right.score.aggregate - left.score.aggregate ||
      POLICY_IDS.indexOf(left.id) - POLICY_IDS.indexOf(right.id),
  );
  let rank = 0;
  let previous;
  for (let index = 0; index < ordered.length; index += 1) {
    if (previous === undefined || ordered[index].score.aggregate !== previous) rank = index + 1;
    ordered[index].rank = rank;
    previous = ordered[index].score.aggregate;
  }
  return ordered;
}
function findings(scenario, policies) {
  const kinds = new Set(policies.flatMap((policy) => policy.actions.map((action) => action.kind)));
  const result = [];
  for (const kind of scenario.allowedKinds)
    if (!kinds.has(kind))
      result.push({
        kind: "dead-action",
        evidence: `No policy selected visible ${kind} actions in this equal-window scenario.`,
      });
  if (new Set(policies.map((policy) => policy.score.aggregate)).size === 1)
    result.push({
      kind: "dominance",
      evidence:
        "All policies tied under this scenario aggregate; inspect the action traces before tuning.",
    });
  if (!policies.some((policy) => policy.terminal.network.globalTier > 0))
    result.push({
      kind: "unreachable-gate",
      evidence:
        "No policy reached a network tier within this declared window and elapsed schedule.",
    });
  if (
    !policies.some(
      (policy) =>
        policy.terminal.network.pendingFrontierId !== null ||
        policy.terminal.network.activeCampaignId !== null,
    )
  )
    result.push({
      kind: "l4-surface",
      evidence: "No terminal surface retained a visible L4 frontier or active campaign.",
    });
  if (scenario.decisionWitness.system === "ending")
    result.push({
      kind: "post-ending",
      evidence: policies.some((policy) => policy.terminal.endingPhase === "reached")
        ? "Reached-ending traces retain projected continuation state."
        : "No policy reached the ending in this bounded run.",
    });
  return result;
}
function runScenario(scenario) {
  const policies = POLICY_IDS.flatMap((policyId) =>
    scenario.seeds.map((seed) => runPolicy(scenario, policyId, seed)),
  );
  const ranked = rankPolicies(policies);
  const winner = ranked[0];
  const runnerUp = ranked.find((policy) => policy.rank > winner.rank);
  const reachability = witnessReachability(scenario, ranked);
  return {
    id: scenario.id,
    assumptions: {
      seeds: scenario.seeds,
      actionBudget: scenario.actionBudget,
      elapsedScheduleMs: scenario.elapsedScheduleMs,
      allowedKinds: scenario.allowedKinds,
      semanticRevision: scenario.semanticRevision,
      curveRevision: scenario.curveRevision,
    },
    decisionWitness: scenario.decisionWitness,
    policies: ranked,
    winner: winner.id,
    runnerUp: runnerUp?.id,
    findings: findings(scenario, ranked),
    witnessReachability: reachability,
  };
}
function summarizeOutliers(scenarios) {
  return scenarios.flatMap((scenario) =>
    scenario.findings.map((finding) => ({ scenarioId: scenario.id, ...finding })),
  );
}

function classifyFinding(scenario, finding) {
  const system = scenario.decisionWitness.system;
  if (finding.kind === "dead-action") {
    return {
      disposition: "scenario-observation",
      rationale:
        "A bounded policy window did not choose this visible action kind; that does not prove a permanently dead player action.",
    };
  }
  if (finding.kind === "dominance") {
    return {
      disposition: "scenario-observation",
      rationale:
        "An aggregate tie in one declared scenario is calibration evidence, not proof of permanent dominance across the game.",
    };
  }
  if (finding.kind === "unreachable-gate") {
    if (system === "L4") {
      return {
        disposition: "blocking-degeneracy",
        rationale:
          "The L4 witness declares a renewable network decision, so no reachable network tier would contradict that intended scope.",
      };
    }
    return {
      disposition: "scenario-observation",
      rationale:
        "This witness examines an earlier declared decision surface; later network access is outside its bounded scope.",
    };
  }
  if (finding.kind === "l4-surface") {
    if (system === "L4") {
      return {
        disposition: "blocking-degeneracy",
        rationale:
          "The L4 witness declares a renewable network decision, so an absent frontier or campaign would contradict that intended scope.",
      };
    }
    return {
      disposition: "scenario-observation",
      rationale:
        "This witness does not target the L4 decision surface, so its absence only records the scenario boundary.",
    };
  }
  if (finding.kind === "post-ending") {
    if (system === "ending" && finding.evidence.startsWith("No policy")) {
      return {
        disposition: "blocking-degeneracy",
        rationale:
          "The ending witness declares post-ending continuation, so no reached-ending trace would contradict that intended scope.",
      };
    }
    return {
      disposition: "confirmation",
      rationale:
        "The ending witness records reached continuation state in the declared post-ending scope.",
    };
  }
  fail(`unclassified finding kind ${finding.kind}`);
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function witnessReachability(scenario, policies) {
  const matches = policies.flatMap((policy) => policy.witnessMatches);
  return {
    requiredVisibleEventTypes: scenario.decisionWitness.requiredVisibleEventTypes,
    requiredActionTags: scenario.decisionWitness.requiredActionTags,
    matches,
  };
}

function witnessIntegrityFindings(scenarios) {
  return scenarios.flatMap((scenario) => {
    const reachability = scenario.witnessReachability;
    if (reachability.matches.length > 0) return [];
    return [
      {
        scenarioId: scenario.id,
        witnessSystem: scenario.decisionWitness.system,
        kind: "witness-integrity",
        disposition: "blocking-degeneracy",
        evidence:
          "No trace exposed the full declared event-type and action-tag set in one visible decision window.",
        rationale:
          "The scenario cannot answer its named question until its declared visible decision surface is reached.",
      },
    ];
  });
}

function candidateSelection(scenarios, visibleSurfaceRevision) {
  const curveRevisions = uniqueSorted(
    scenarios.map((scenario) => scenario.assumptions.curveRevision),
  );
  const semanticRevisions = uniqueSorted(
    scenarios.map((scenario) => scenario.assumptions.semanticRevision),
  );
  const observedFlags = scenarios.flatMap((scenario) =>
    scenario.findings.map((finding) => ({
      scenarioId: scenario.id,
      witnessSystem: scenario.decisionWitness.system,
      ...finding,
      ...classifyFinding(scenario, finding),
    })),
  );
  const observationBlocks = observedFlags.filter(
    (finding) => finding.disposition === "blocking-degeneracy",
  );
  const integrityBlocks = witnessIntegrityFindings(scenarios);
  const blockingFindings = [...observationBlocks, ...integrityBlocks];
  const selectedCandidate = {
    id: `shipped:${curveRevisions.join("+")}`,
    curveRevisions,
    semanticRevisions,
    visibleSurfaceRevision,
  };
  const remediation =
    blockingFindings.length === 0
      ? {
          status: "completed",
          rationale:
            "The bounded witness-integrity remediation completed before this fresh run; the suite now contains no demonstrated blocking degeneracy within a witness's intended scope.",
          completedScope: [
            "Distinct parser-validated L1, L2, and L3 durable scenario inputs replace duplicate new-game probes.",
            "Canonical persistence, reset-transition, and visible-surface contracts provide each named legal decision surface.",
          ],
        }
      : {
          status: "required",
          rationale:
            "A demonstrated blocking degeneracy requires one bounded curve or scenario-input redesign before the candidate can be selected.",
        };
  return {
    selectionMode: "single-shipped-candidate",
    inputs: {
      scenarioIds: scenarios.map((scenario) => scenario.id),
      policyIds: [...POLICY_IDS],
      curveRevisions,
      semanticRevisions,
      visibleSurfaceRevision,
    },
    candidate: selectedCandidate,
    selectedCandidate: blockingFindings.length === 0 ? selectedCandidate : null,
    observedFlags,
    blockingFindings,
    selection: blockingFindings.length === 0 ? "selected" : "withheld",
    rationale:
      blockingFindings.length === 0
        ? "The sole shipped candidate is selected because all five declared witness surfaces expose their full required event-type and action-tag sets, while every retained flag is a scoped observation or confirmation."
        : "Candidate selection is withheld until the reported blocking degeneracy receives one bounded redesign and a fresh run.",
    remediation,
  };
}

function completionSummary(scenarios) {
  return scenarios.flatMap((scenario) =>
    scenario.policies.map((policy) => ({
      scenarioId: scenario.id,
      policyId: policy.id,
      acceptedActionCount: policy.completion.acceptedActionCount,
      idleWindowCount: policy.completion.idleWindowCount,
      stage: policy.completion.progression.currentStageId,
      networkTier: policy.completion.progression.network.globalTier,
      endingPhase: policy.completion.progression.endingPhase,
    })),
  );
}
function outputPath(root, input) {
  const outputRoot = path.resolve(root, "output_balance");
  const requested = path.resolve(root, input);
  within(outputRoot, requested, "output");
  if (path.extname(requested) !== ".json") fail("output must use a .json filename");
  fs.mkdirSync(outputRoot, { recursive: true });
  return requested;
}
export { chooseAction as selectVisibleAction, runScenario as runBalanceScenario };
function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const root = repositoryRoot();
  const scenarios = args.suite ? readSuite(root) : [readScenario(root, args.scenario)];
  const results = scenarios.map(runScenario);
  const report = {
    formatVersion: FORMAT_VERSION,
    generatedBy: {
      tool: TOOL,
      nodeVersion: process.version,
      repositoryRoot: root,
      mode: args.suite ? "suite" : "scenario",
    },
    policyCatalog: POLICY_IDS.map((id) => ({ id, ...POLICIES[id] })),
    assumptions: {
      visibleSurfaceRevision: "decision-surface-v1",
      policyInput: "projectVisibleDecisionSurface only",
      scenarioCount: results.length,
    },
    scenarios: results,
    completion: completionSummary(results),
    outliers: summarizeOutliers(results),
    candidateSelection: candidateSelection(results, "decision-surface-v1"),
  };
  const destination = outputPath(root, args.output);
  fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Wrote ${path.relative(root, destination)} for ${results.length} scenario(s).\n`,
  );
}
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
