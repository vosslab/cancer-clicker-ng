import { eventId } from "../../brands.js";
import { isLateHallmarkOperational } from "../late_hallmark_effects.js";
import { hasDivisionLimitWarning } from "./replicative_budget.js";
import type { GameState } from "../../types/state.js";

export type SenescenceFactoryOrigin = Readonly<{
  atMs: number;
  originSequence: number;
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

/**
 * Projects decisions from an already accepted biological transition.  It deliberately has no
 * damage-failure branch: production does not yet create a durable damage incident to consume.
 */
export function projectSenescenceDecisions(
  before: GameState,
  after: GameState,
  origin: SenescenceFactoryOrigin,
): GameState {
  if (
    !natural(origin.atMs) ||
    !natural(origin.originSequence) ||
    !natural(after.deterministicSeed)
  ) {
    throw new Error("Senescence factory origin is invalid.");
  }
  if (!isLateHallmarkOperational(after, "senescent_cells")) return after;
  const occupied = new Set<string>([
    ...after.lateHallmarks.senescence.pendingDecisions.map((decision) => String(decision.regionId)),
    ...after.lateHallmarks.senescence.retainedRegions.map((record) => String(record.regionId)),
  ]);
  const candidates = after.regions
    .filter((region) => {
      const prior = before.regions.find((candidate) => candidate.id === region.id);
      return (
        prior !== undefined &&
        !occupied.has(String(region.id)) &&
        !hasDivisionLimitWarning(before, prior) &&
        hasDivisionLimitWarning(after, region)
      );
    })
    .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    .map((region) => ({
      id: eventId(
        `senescence:replicative-limit:${after.deterministicSeed}:${origin.originSequence}:${origin.atMs}:${region.id}`,
      ),
      regionId: region.id,
      cause: "replicative-limit" as const,
      createdAtMs: origin.atMs,
    }));
  if (candidates.length === 0) return after;
  const pendingDecisions = [...after.lateHallmarks.senescence.pendingDecisions, ...candidates].sort(
    (left, right) =>
      left.createdAtMs - right.createdAtMs || String(left.id).localeCompare(String(right.id)),
  );
  return {
    ...after,
    lateHallmarks: {
      ...after.lateHallmarks,
      senescence: { ...after.lateHallmarks.senescence, pendingDecisions },
    },
  };
}
