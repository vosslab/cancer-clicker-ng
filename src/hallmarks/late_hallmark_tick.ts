import { microbiomeOfferId } from "../brands.js";
import type { GameState } from "../types/state.js";
import { isLateHallmarkOperational } from "./late_hallmark_effects.js";
import {
  MICROBIOME_COMPOSITION_CATALOG,
  MICROBIOME_OFFER_DURATION_MS,
  MICROBIOME_POOL_ID,
} from "./microbiome_catalog.js";
import type { MicrobiomeOfferSnapshot } from "./late_hallmark_types.js";

/** Deliberately narrow: M12 rotation cannot replace any other late-hallmark relation. */
export type LateHallmarkDurableTickProjection = Readonly<{
  microbiome: GameState["lateHallmarks"]["microbiome"];
}>;

function natural(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function elapsedClock(state: GameState): number {
  if (!natural(state.activeTimeMs) || !natural(state.totalOfflineMs))
    throw new Error("Late-hallmark elapsed clock is invalid.");
  if (state.activeTimeMs > Number.MAX_SAFE_INTEGER - state.totalOfflineMs)
    throw new Error("Late-hallmark elapsed clock cannot advance safely.");
  return state.activeTimeMs + state.totalOfflineMs;
}

function offerFor(
  state: GameState,
  createdAtMs: number,
  sourceSequence: number,
): MicrobiomeOfferSnapshot {
  if (!natural(state.deterministicSeed) || !natural(sourceSequence))
    throw new Error("Microbiome offer source is invalid.");
  if (createdAtMs > Number.MAX_SAFE_INTEGER - MICROBIOME_OFFER_DURATION_MS)
    throw new Error("Microbiome offer deadline cannot advance safely.");
  // The omitted catalog row varies by durable seed/sequence; the saved card order stays catalog order.
  const omitted =
    (state.deterministicSeed + sourceSequence) % MICROBIOME_COMPOSITION_CATALOG.length;
  const compositions = MICROBIOME_COMPOSITION_CATALOG.filter((_, index) => index !== omitted);
  if (compositions.length !== 3)
    throw new Error("Microbiome catalog cannot construct three cards.");
  const expiresAtMs = createdAtMs + MICROBIOME_OFFER_DURATION_MS;
  return Object.freeze({
    id: microbiomeOfferId(
      `microbiome:${MICROBIOME_POOL_ID}:${state.deterministicSeed}:${sourceSequence}:${state.currentStage}`,
    ),
    poolId: MICROBIOME_POOL_ID,
    compositions: [compositions[0]!, compositions[1]!, compositions[2]!] as const,
    sourceSeed: state.deterministicSeed,
    sourceSequence,
    sourceStage: state.currentStage,
    expiresAtMs,
  });
}

/** Sole durable writer for the pending microbiome card set and its rotation clock. */
export function projectLateHallmarkDurableTickEffects(
  state: GameState,
  elapsedMs: number,
): LateHallmarkDurableTickProjection {
  if (!natural(elapsedMs)) throw new Error("Late-hallmark tick elapsed time is invalid.");
  if (elapsedMs === 0) return { microbiome: state.lateHallmarks.microbiome };
  if (!isLateHallmarkOperational(state, "polymorphic_microbiomes")) {
    return { microbiome: state.lateHallmarks.microbiome };
  }
  const start = elapsedClock(state);
  if (start > Number.MAX_SAFE_INTEGER - elapsedMs) throw new Error("Late-hallmark tick overflows.");
  const end = start + elapsedMs;
  let pendingOffer = state.lateHallmarks.microbiome.pendingOffer;
  let nextRotationDeadlineMs = state.lateHallmarks.microbiome.nextRotationDeadlineMs;
  let rotationSequence = state.lateHallmarks.microbiome.rotationSequence;
  if (!natural(rotationSequence)) throw new Error("Microbiome rotation sequence is invalid.");
  // An installed composition owns a quiet interval before the next choice is offered.
  if (pendingOffer === null) {
    if (state.lateHallmarks.microbiome.activeComposition !== null) {
      if (nextRotationDeadlineMs === null)
        throw new Error("Microbiome waiting deadline is invalid.");
      if (nextRotationDeadlineMs > end) return { microbiome: state.lateHallmarks.microbiome };
      pendingOffer = offerFor(state, nextRotationDeadlineMs, rotationSequence);
    } else {
      if (nextRotationDeadlineMs !== null)
        throw new Error("Initial microbiome deadline is invalid.");
      pendingOffer = offerFor(state, start, rotationSequence);
    }
    nextRotationDeadlineMs = pendingOffer.expiresAtMs;
    if (rotationSequence === Number.MAX_SAFE_INTEGER)
      throw new Error("Microbiome rotation sequence cannot advance safely.");
    rotationSequence += 1;
  } else if (nextRotationDeadlineMs !== pendingOffer.expiresAtMs) {
    throw new Error("Microbiome offer deadline is invalid.");
  }
  while (nextRotationDeadlineMs !== null && nextRotationDeadlineMs <= end) {
    pendingOffer = offerFor(state, nextRotationDeadlineMs, rotationSequence);
    nextRotationDeadlineMs = pendingOffer.expiresAtMs;
    if (rotationSequence === Number.MAX_SAFE_INTEGER)
      throw new Error("Microbiome rotation sequence cannot advance safely.");
    rotationSequence += 1;
  }
  return {
    microbiome: {
      ...state.lateHallmarks.microbiome,
      pendingOffer,
      nextRotationDeadlineMs,
      rotationSequence,
    },
  };
}
