import { add, multiplyByNumber, sum, zero } from "../bignum/bignum.js";
import type { BigNum } from "../types/bignum.js";
import type {
  GameState,
  PendingProgression,
  RuntimeState,
  TrackedResourceSnapshot,
} from "../types/state.js";
import type { StageId } from "../types/ids.js";
import { assertCanonicalProducerLevels, STAGE_ONE_PRODUCERS } from "./producers.js";
import { eligibleNextStage } from "../stages/gates.js";
import { stageEconomyModifier } from "../stages/effects.js";
import { composeEconomyModifiers, hallmarkEconomyModifier } from "../hallmarks/economy_effects.js";
import {
  applyElapsedHallmarkBoundary,
  elapsedHallmarkClockMs,
  hasElapsedHallmarkEffect,
  type ElapsedHallmarkDurableProjection,
  projectElapsedHallmarkDurableEffects,
  replicativeCapacityExhausted,
} from "../hallmarks/elapsed_effects.js";
import {
  applyAtpAccelerationBoundary,
  atpAccelerationEconomyModifier,
  hasAtpAccelerationEffect,
} from "../hallmarks/m11_economy.js";
import {
  projectM11DurableTickEffects,
  type M11DurableTickProjection,
} from "../hallmarks/m11_tick_effects.js";
import {
  m11MutationProducerModifier,
  m11RegionalProducerModifier,
  m11RouteDiscoveryGainPerSecond,
} from "../hallmarks/m11_authoritative_effects.js";

function natural(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
export type TickMode = "live" | "offline";
/** Tick adapters expose only identities; durable observation times are owned by their adapters. */
type StageEligibility = Readonly<{ kind: "stage"; id: StageId }>;
type PrestigeEligibility = Readonly<{ kind: "prestige"; id: PendingProgression["id"] }>;
export type EconomyStepResult = Readonly<{
  resourceSnapshot: TrackedResourceSnapshot;
  stageEligibility: readonly StageEligibility[];
  prestigeEligibility: readonly PrestigeEligibility[];
  /** Live adapters retain these pure durable elapsed effects; offline recording owns persistence. */
  stateProjection?: ElapsedHallmarkDurableProjection;
  /** M11 is independently verified by offline replay before these three durable fields are merged. */
  m11Projection?: M11DurableTickProjection;
}>;
export type OfflineStepResult = EconomyStepResult;
export type EconomyTick = (
  state: GameState,
  elapsedMs: number,
  mode: TickMode,
) => EconomyStepResult;
function cellRate(state: GameState): BigNum {
  // An owned branch with no reserve above its protected floor cannot keep dividing for free.
  if (replicativeCapacityExhausted(state)) return zero();
  const levels = assertCanonicalProducerLevels(state.producerLevels);
  const rates = STAGE_ONE_PRODUCERS.map((producer, index) => {
    const level = levels[index];
    if (!level) throw new Error("Producer levels are invalid.");
    const modifier = composeEconomyModifiers(
      stageEconomyModifier(state, producer.id),
      hallmarkEconomyModifier(state, producer.id),
    );
    const rate = multiplyByNumber(producer.baseCellRate, level.level);
    const m11Rate =
      m11RegionalProducerModifier(state, producer.id) *
      m11MutationProducerModifier(state, producer.id).rate;
    return multiplyByNumber(
      rate,
      modifier.productionMultiplier *
        atpAccelerationEconomyModifier(state, producer.id).productionMultiplier *
        m11Rate,
    );
  });
  return sum(rates);
}

function m11DeadlineOffset(state: GameState, consumedMs: number): number | undefined {
  const clock = state.activeTimeMs + state.totalOfflineMs + consumedMs;
  const deadlines = state.inflammationEpisodes
    .map((episode) => episode.deadlineMs - clock)
    .filter((offset) => Number.isSafeInteger(offset) && offset > 0);
  return deadlines.length === 0 ? undefined : Math.min(...deadlines);
}

function m11ProjectionCreatesOffer(
  before: GameState,
  projection: M11DurableTickProjection,
): boolean {
  return before.mutationOffers.length === 0 && projection.mutationOffers.length === 1;
}

/** The single production formula used by both live and M5 offline replay. */
export const applyEconomyTick: EconomyTick = function applyEconomyTick(
  state: GameState,
  elapsedMs: number,
  mode: TickMode,
): OfflineStepResult {
  if ((mode !== "live" && mode !== "offline") || !natural(elapsedMs))
    throw new Error("Economy tick elapsed time is invalid.");
  if (elapsedMs === 0)
    return {
      resourceSnapshot: { cells: state.cells, substrate: state.substrate, atp: state.atp },
      stageEligibility: [],
      prestigeEligibility: [],
    };
  const m11Projection = projectM11DurableTickEffects(state, elapsedMs);
  const m11DraftCharge = m11ProjectionCreatesOffer(state, m11Projection);
  let projected = state;
  const appliesElapsedHallmarks =
    hasElapsedHallmarkEffect(state) ||
    hasAtpAccelerationEffect(state) ||
    state.inflammationEpisodes.length > 0 ||
    m11DraftCharge;
  let producedCells: BigNum;
  let cellsAfterSegments: BigNum | undefined;
  if (!appliesElapsedHallmarks) {
    producedCells = multiplyByNumber(cellRate(state), elapsedMs / 1000);
  } else {
    producedCells = zero();
    cellsAfterSegments = state.cells;
    let remainingMs = elapsedMs;
    let consumedMs = 0;
    const elapsedClock = elapsedHallmarkClockMs(state);
    while (remainingMs > 0) {
      const offset = (elapsedClock + consumedMs) % 1_000;
      const untilBoundary = offset === 0 ? 1_000 : 1_000 - offset;
      const deadlineOffset = m11DeadlineOffset(state, consumedMs);
      const segmentMs = Math.min(remainingMs, untilBoundary, deadlineOffset ?? remainingMs);
      const virtualClocked =
        mode === "live"
          ? { ...projected, activeTimeMs: state.activeTimeMs + consumedMs }
          : { ...projected, totalOfflineMs: state.totalOfflineMs + consumedMs };
      const segmentCells = multiplyByNumber(cellRate(virtualClocked), segmentMs / 1000);
      producedCells = add(producedCells, segmentCells);
      cellsAfterSegments = add(cellsAfterSegments, segmentCells);
      remainingMs -= segmentMs;
      consumedMs += segmentMs;
      if (segmentMs === untilBoundary) {
        // M10 vessel maintenance owns its debit first; M11 acceleration can spend only the remainder.
        const routeClocked =
          mode === "live"
            ? { ...projected, activeTimeMs: state.activeTimeMs + consumedMs }
            : { ...projected, totalOfflineMs: state.totalOfflineMs + consumedMs };
        const routeGain = m11RouteDiscoveryGainPerSecond(routeClocked);
        const routeDiscoveryProgress = projected.routeDiscoveryProgress + routeGain;
        if (!Number.isSafeInteger(routeDiscoveryProgress))
          throw new Error("M11 route discovery overflows.");
        projected = {
          ...applyAtpAccelerationBoundary(applyElapsedHallmarkBoundary(projected)),
          routeDiscoveryProgress,
        };
      }
    }
  }
  const resourceSnapshot = {
    cells: cellsAfterSegments ?? add(state.cells, producedCells),
    substrate: projected.substrate,
    atp: projected.atp,
  };
  const postTickState = { ...state, ...resourceSnapshot };
  const nextStage = eligibleNextStage(postTickState);
  const stageEligibility =
    nextStage === undefined
      ? []
      : [
          {
            kind: "stage" as const,
            id: nextStage,
          },
        ];
  return {
    resourceSnapshot,
    stageEligibility,
    prestigeEligibility: [],
    ...(appliesElapsedHallmarks
      ? { stateProjection: projectElapsedHallmarkDurableEffects(state, elapsedMs) }
      : {}),
    ...(state.inflammationEpisodes.length > 0 ||
    m11DraftCharge ||
    m11Projection.routeDiscoveryProgress !== state.routeDiscoveryProgress
      ? { m11Projection }
      : {}),
  };
};
export const economyTick = applyEconomyTick;

/** Advances live simulation time with an injected monotonic timestamp. */
export function advanceLiveTick(state: RuntimeState, nowMs: number): RuntimeState {
  if (!natural(nowMs) || !natural(state.lastTickAtMs) || nowMs < state.lastTickAtMs)
    throw new Error("Live tick clock is invalid.");
  const elapsedMs = nowMs - state.lastTickAtMs;
  if (
    !natural(state.game.activeTimeMs) ||
    state.game.activeTimeMs > Number.MAX_SAFE_INTEGER - elapsedMs
  )
    throw new Error("Live tick active time is invalid.");
  if (
    !natural(state.pendingOfflineMs) ||
    (state.saveStatus !== "idle" && state.saveStatus !== "saving" && state.saveStatus !== "error")
  )
    throw new Error("Live tick runtime state is invalid.");
  const result = applyEconomyTick(state.game, elapsedMs, "live");
  const activeTimeMs = state.game.activeTimeMs + elapsedMs;
  const knownProgression = new Set(
    state.game.pendingProgression.map((item) => `${item.kind}:${item.id}`),
  );
  const newStageProgression = result.stageEligibility
    .filter((item) => !knownProgression.has(`${item.kind}:${item.id}`))
    .map((item) => ({ ...item, firstObservedAtActiveMs: activeTimeMs }));
  if (state.game.pendingProgression.length + newStageProgression.length > 256)
    throw new Error("Live tick progression queue exceeds durable capacity.");
  const game = {
    ...state.game,
    ...result.stateProjection,
    ...result.m11Projection,
    ...result.resourceSnapshot,
    activeTimeMs,
    pendingProgression: [...state.game.pendingProgression, ...newStageProgression],
  };
  return { ...state, game, lastTickAtMs: nowMs };
}
