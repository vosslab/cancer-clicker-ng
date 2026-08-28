import { compare } from "../../bignum/bignum.js";
import type { SoftEndingState } from "../../types/state.js";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT } from "../../ending/trigger.js";
import { exact, natural, numberValue, object } from "./guards.js";

export type EndingSaveContext = Readonly<{
  activeTimeMs: number;
  eventSequence: number;
  networkGlobalTier: number;
}>;

/** Rebuilds ending evidence from an exact current-schema record without fabrication. */
export function parseEnding(
  value: unknown,
  context: EndingSaveContext,
): SoftEndingState | undefined {
  if (!object(value)) return undefined;
  if (value.phase === "unreached")
    return exact(value, ["phase"]) ? Object.freeze({ phase: "unreached" }) : undefined;
  if (value.phase !== "reached") return undefined;
  if (
    !exact(value, [
      "phase",
      "reachedAtActiveMs",
      "sourceEventSequence",
      "reachedCells",
      "reachedNetworkTier",
    ])
  )
    return undefined;
  const reachedCells = numberValue(value.reachedCells);
  if (
    reachedCells === undefined ||
    !natural(value.reachedAtActiveMs) ||
    !natural(value.sourceEventSequence) ||
    !natural(value.reachedNetworkTier) ||
    value.reachedAtActiveMs > context.activeTimeMs ||
    value.sourceEventSequence >= context.eventSequence ||
    value.reachedNetworkTier < 1 ||
    value.reachedNetworkTier > context.networkGlobalTier ||
    compare(reachedCells, CHICAGO_SKYSCRAPER_CELL_EQUIVALENT) < 0
  )
    return undefined;
  const parsed: SoftEndingState = Object.freeze({
    phase: "reached",
    reachedAtActiveMs: value.reachedAtActiveMs,
    sourceEventSequence: value.sourceEventSequence,
    reachedCells,
    reachedNetworkTier: value.reachedNetworkTier,
  });
  return parsed;
}
