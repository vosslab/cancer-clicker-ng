#!/usr/bin/env node
/**
 * Deterministic calibration runner over the source-owned visible decision surface.
 * It is intentionally a design-evidence tool, not an in-game bot or a benchmark.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { replayEconomyOffline } from "../src/economy/offline.ts";
import { parseRuntimeEvent } from "../src/state/event_parse.ts";
import { recordEvent } from "../src/state/events.ts";
import { createInitialGameState } from "../src/state/game_state.ts";
import { parseNormalizedGameState } from "../src/state/save_load.ts";
import { projectVisibleDecisionSurface } from "../src/state/decision_surface.ts";

const TOOL = "tools/balance_sim.mjs";
const FORMAT_VERSION = 1;
const PROFILE_IDS = [
  "local_growth",
  "stealth_seeder",
  "adaptive_drafter",
  "network_architect",
  "naive_cheapest",
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

function fail(message) {
  throw new Error(`balance_sim: ${message}`);
}

function usage() {
  return `${TOOL}\n\nUsage:\n  node --import tsx ${TOOL} --scenario tools/balance_scenarios/<file>.json [--output output_balance/balance_report.json]\n\nThe scenario must be a tracked JSON file under tools/balance_scenarios/. Output stays under output_balance/.`;
}

function parseArgs(argv) {
  let scenario;
  let output = "output_balance/balance_report.json";
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === "--help") return { help: true };
    if (option !== "--scenario" && option !== "--output") fail(`unknown option ${option}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) fail(`${option} requires a value`);
    if (option === "--scenario") scenario = value;
    else output = value;
    index += 1;
  }
  if (scenario === undefined) fail("--scenario is required");
  return { scenario, output, help: false };
}

function within(root, candidate, label) {
  const relative = path.relative(root, candidate);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
    fail(`${label} must stay within ${path.relative(process.cwd(), root) || "."}`);
}

function readScenario(input) {
  const root = process.cwd();
  const scenariosRoot = path.resolve(root, "tools/balance_scenarios");
  const requested = path.resolve(root, input);
  within(scenariosRoot, requested, "scenario");
  if (!fs.existsSync(requested)) fail(`scenario does not exist: ${input}`);
  const canonical = fs.realpathSync(requested);
  const canonicalRoot = fs.realpathSync(scenariosRoot);
  within(canonicalRoot, canonical, "scenario");
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(canonical, "utf8"));
  } catch (error) {
    fail(`scenario JSON is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }
  return parsed;
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
  if (raw.formatVersion !== 1 || typeof raw.id !== "string" || raw.id.length === 0)
    fail("scenario formatVersion or id is invalid");
  if (typeof raw.semanticRevision !== "string" || typeof raw.curveRevision !== "string")
    fail("scenario revisions are invalid");
  if (!Array.isArray(raw.seeds) || raw.seeds.length === 0 || !raw.seeds.every(natural))
    fail("scenario seeds must be nonempty natural numbers");
  if (!natural(raw.actionBudget) || raw.actionBudget === 0)
    fail("actionBudget must be a positive natural number");
  if (!Array.isArray(raw.elapsedScheduleMs) || !raw.elapsedScheduleMs.every(natural))
    fail("elapsedScheduleMs must contain natural numbers");
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
  if (
    raw.decisionWitness === null ||
    typeof raw.decisionWitness !== "object" ||
    Array.isArray(raw.decisionWitness)
  )
    fail("decisionWitness must be an object");
  const witness = raw.decisionWitness;
  if (
    !["L1", "L2", "L3", "L4", "ending"].includes(witness.system) ||
    typeof witness.question !== "string" ||
    !Array.isArray(witness.alternatives)
  )
    fail("decisionWitness is invalid");
  return raw;
}

function initialState(scenario, seed) {
  const state =
    scenario.initial.kind === "new-game"
      ? createInitialGameState()
      : parseNormalizedGameState(scenario.initial.state);
  if (state === undefined) fail("durable scenario snapshot fails the current p8 save boundary");
  // The seed is explicit scenario provenance. A durable snapshot owns game seed semantics.
  if (scenario.initial.kind === "new-game") {
    if (seed !== state.deterministicSeed)
      fail(`new-game seed ${state.deterministicSeed} differs from declared seed ${seed}`);
    return state;
  }
  if (state.deterministicSeed !== seed)
    fail(`snapshot seed ${state.deterministicSeed} differs from declared seed ${seed}`);
  return state;
}

function costOrder(action) {
  const cost = action.displayedCost;
  if (cost === undefined) return [-1, -1];
  if (typeof cost.value === "number") return [0, cost.value];
  return [cost.value.exponent, cost.value.mantissa];
}

function compareCost(left, right) {
  const leftCost = costOrder(left);
  const rightCost = costOrder(right);
  if (leftCost[0] !== rightCost[0]) return leftCost[0] - rightCost[0];
  if (leftCost[1] !== rightCost[1]) return leftCost[1] - rightCost[1];
  return 0;
}

function matching(surface, allowedKinds, predicate) {
  return surface.actions.filter((action) => allowedKinds.has(action.kind) && predicate(action));
}

function chooseByOrder(surface, allowedKinds, predicates) {
  for (const predicate of predicates) {
    const choice = matching(surface, allowedKinds, predicate)[0];
    if (choice !== undefined) return choice;
  }
  return matching(surface, allowedKinds, () => true)[0];
}

/** Policies inspect only this visible data argument and preserve surface ordering for ties. */
function chooseAction(profileId, surface, allowedKinds) {
  const tagged = (tags) => (action) => tags.some((tag) => action.effectTags.includes(tag));
  if (profileId === "local_growth")
    return chooseByOrder(surface, allowedKinds, [
      tagged(["culture", "producer", "proliferative_signaling"]),
      (action) => action.kind === "producer",
      (action) => action.kind === "divide",
    ]);
  if (profileId === "stealth_seeder")
    return chooseByOrder(surface, allowedKinds, [
      tagged(["mask", "route", "vessel", "network", "containment"]),
      (action) => action.kind === "network",
      (action) => action.kind === "allocation",
    ]);
  if (profileId === "adaptive_drafter")
    return chooseByOrder(surface, allowedKinds, [
      tagged(["mutation", "hallmark", "phenotype", "late-program"]),
      (action) => action.kind === "hallmark",
      (action) => action.kind === "allocation",
    ]);
  if (profileId === "network_architect")
    return chooseByOrder(surface, allowedKinds, [
      (action) => action.kind === "network",
      tagged(["reset", "culture", "stage", "ending"]),
      (action) => action.kind === "prestige",
    ]);
  const choices = matching(surface, allowedKinds, () => true);
  return [...choices].sort((left, right) => compareCost(left, right))[0];
}

function actionReason(profileId, action) {
  const tags = action.effectTags.join(", ") || "visible action";
  return `${profileId} selected ${tags} from the ordered visible surface.`;
}

function cellMagnitude(dto) {
  return dto.exponent + Math.log10(Math.max(Math.abs(dto.mantissa), Number.MIN_VALUE));
}

function score(state, actions) {
  const cells = state.cells;
  const dimensions = {
    cellMagnitude: Number(cellMagnitude(cells).toFixed(6)),
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
  const aggregate = Number(
    (
      dimensions.cellMagnitude +
      dimensions.stageIndex +
      dimensions.networkTier * 3 +
      dimensions.endingReached * 2 +
      dimensions.acceptedActions / 100
    ).toFixed(6),
  );
  return { dimensions, aggregate };
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

function runProfile(scenario, profileId, seed) {
  const allowedKinds = new Set(scenario.allowedKinds);
  let state = initialState(scenario, seed);
  const actions = [];
  const milestoneList = [];
  let scheduleIndex = 0;
  for (let index = 0; index < scenario.actionBudget; index += 1) {
    const surface = projectVisibleDecisionSurface(state);
    const action = chooseAction(profileId, surface, allowedKinds);
    if (action === undefined) break;
    const before = state;
    try {
      state = recordEvent(state, parseRuntimeEvent(action.event));
    } catch (error) {
      fail(
        `policy ${profileId} selected an illegal visible action ${action.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    actions.push({
      index,
      actionId: action.id,
      kind: action.kind,
      atMs: state.activeTimeMs,
      visibleReason: actionReason(profileId, action),
    });
    milestones(before, state, state.activeTimeMs, milestoneList);
    const elapsedMs =
      scenario.elapsedScheduleMs[scheduleIndex % scenario.elapsedScheduleMs.length] ?? 0;
    scheduleIndex += 1;
    if (elapsedMs > 0) {
      const replayed = replayEconomyOffline(state, {
        kind: "ready",
        requestedElapsedMs: elapsedMs,
      });
      if (replayed.kind !== "applied") fail(`economy replay failed with ${replayed.code}`);
      state = replayed.state;
    }
  }
  return {
    id: profileId,
    seed,
    score: score(state, actions),
    actions,
    milestones: milestoneList,
    terminal: projectVisibleDecisionSurface(state).progression,
  };
}

function rankProfiles(profiles) {
  const ordered = [...profiles].sort(
    (left, right) =>
      right.score.aggregate - left.score.aggregate ||
      PROFILE_IDS.indexOf(left.id) - PROFILE_IDS.indexOf(right.id),
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

function findings(scenario, profiles) {
  const kinds = new Set(
    profiles.flatMap((profile) => profile.actions.map((action) => action.kind)),
  );
  const result = [];
  for (const kind of scenario.allowedKinds)
    if (!kinds.has(kind))
      result.push({
        kind: "dead-action",
        evidence: `No profile selected visible ${kind} actions in this equal-budget scenario.`,
      });
  if (new Set(profiles.map((profile) => profile.score.aggregate)).size === 1)
    result.push({
      kind: "dominance",
      evidence:
        "All profiles tied under this scenario aggregate; inspect action traces before tuning.",
    });
  if (!profiles.some((profile) => profile.terminal.network.globalTier > 0))
    result.push({
      kind: "unreachable-gate",
      evidence: "No profile reached a network tier within this action and elapsed budget.",
    });
  if (
    !profiles.some(
      (profile) =>
        profile.terminal.network.pendingFrontierId !== null ||
        profile.terminal.network.activeCampaignId !== null,
    )
  )
    result.push({
      kind: "l4-surface",
      evidence: "No terminal surface retained a visible L4 frontier or active campaign.",
    });
  if (scenario.decisionWitness.system === "ending")
    result.push({
      kind: "post-ending",
      evidence: profiles.some((profile) => profile.terminal.endingPhase === "reached")
        ? "Reached-ending traces retain projected continuation state."
        : "No profile reached the ending in this bounded run.",
    });
  return result;
}

function classify(reports) {
  const winner = (id) => reports.some((report) => report.winner === id);
  return {
    l1RouteReversal:
      winner("local_growth") && winner("stealth_seeder") ? "observed" : "not-observed",
    l2FixedCardRankDefeated: winner("adaptive_drafter") ? "observed" : "not-observed",
    l3UniversalFirstPassageRejected: reports.some((report) =>
      report.profiles.some(
        (profile) => profile.actions[0]?.actionId.includes("purchase-passage-upgrade") === false,
      ),
    )
      ? "observed"
      : "not-observed",
    l4AllDepthAndAllBreadthLose: reports.some((report) => report.winner === "network_architect")
      ? "observed"
      : "not-observed",
  };
}

function runScenario(scenario) {
  const profiles = PROFILE_IDS.flatMap((profileId) =>
    scenario.seeds.map((seed) => runProfile(scenario, profileId, seed)),
  );
  const ranked = rankProfiles(profiles);
  const winner = ranked[0];
  const runnerUp = ranked.find((profile) => profile.rank > winner.rank);
  return {
    id: scenario.id,
    decisionWitness: scenario.decisionWitness,
    profiles: ranked,
    winner: winner.id,
    runnerUp: runnerUp?.id,
    findings: findings(scenario, ranked),
  };
}

function outputPath(input) {
  const root = process.cwd();
  const outputRoot = path.resolve(root, "output_balance");
  const requested = path.resolve(root, input);
  within(outputRoot, requested, "output");
  if (path.extname(requested) !== ".json") fail("output must use a .json filename");
  fs.mkdirSync(outputRoot, { recursive: true });
  return requested;
}

// Narrow pure seams for offline semantic tests; the executable remains the only CLI owner.
export { chooseAction as selectVisibleAction, runScenario as runBalanceScenario };

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const scenario = assertScenario(readScenario(args.scenario));
  const report = {
    formatVersion: FORMAT_VERSION,
    generatedBy: {
      tool: TOOL,
      nodeVersion: process.version,
      scenarioId: scenario.id,
      semanticRevision: scenario.semanticRevision,
      curveRevision: scenario.curveRevision,
    },
    assumptions: {
      seeds: scenario.seeds,
      actionBudget: scenario.actionBudget,
      elapsedScheduleMs: scenario.elapsedScheduleMs,
      visibleSurfaceRevision: "decision-surface-v1",
    },
    scenarios: [],
    falsification: {},
  };
  const result = runScenario(scenario);
  report.scenarios.push(result);
  report.falsification = classify(report.scenarios);
  const destination = outputPath(args.output);
  fs.writeFileSync(destination, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`Wrote ${path.relative(process.cwd(), destination)} for ${scenario.id}.\n`);
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
