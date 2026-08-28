import { divide } from "../bignum/bignum.js";
import { formatBigNum, formatQuantity } from "../bignum/format.js";
import type { BigNum } from "../types/bignum.js";
import type { NumberFormat } from "../types/state.js";
import {
  CHICAGO_SKYSCRAPER_CELL_EQUIVALENT,
  softEndingEligibility,
  type SoftEndingTriggerState,
} from "./trigger.js";

export type EndingPresentation = Readonly<{
  mode: "unavailable" | "available" | "reached";
  headline: string;
  sceneMode: "colony" | "chicago-scale";
  cellCount: string;
  volume: string | null;
  chicagoHighRiseVolumes: string | null;
  nextNetworkAction: string;
}>;

/** Local future-state seam; p8 GameState supplies this exact read-only projection. */
export type EndingPresentationState = SoftEndingTriggerState &
  Readonly<{
    numberFormat: NumberFormat;
  }>;

/** Formats the scale reference through the one canonical BigNum number grammar. */
export function formatEndingScale(
  value: BigNum,
  format: NumberFormat,
): Readonly<{
  volume: string;
  chicagoHighRiseVolumes: string;
}> {
  const volume = `${formatBigNum(value, format, 2)} m3 of cell volume`;
  const ratio = divide(value, CHICAGO_SKYSCRAPER_CELL_EQUIVALENT);
  const chicagoHighRiseVolumes = formatBigNum(ratio, format, 2);
  return { volume, chicagoHighRiseVolumes };
}

/** Builds an inert presentation model; DOM and focus ownership remain in the Solid leaf. */
export function endingPresentation(state: EndingPresentationState): EndingPresentation {
  const cellCount = formatQuantity(state.cells, state.numberFormat, 2, "cell", "cells");
  const scale =
    state.ending.phase === "reached" ? formatEndingScale(state.cells, state.numberFormat) : null;
  const nextNetworkAction = "Continue building and renewing the dissemination network.";
  if (state.ending.phase === "reached") {
    return {
      mode: "reached",
      headline: "Chicago scale report open",
      sceneMode: "chicago-scale",
      cellCount,
      volume: scale?.volume ?? null,
      chicagoHighRiseVolumes: scale?.chicagoHighRiseVolumes ?? null,
      nextNetworkAction,
    };
  }
  const eligibility = softEndingEligibility(state);
  if (eligibility.available) {
    return {
      mode: "available",
      headline: "Your colony has reached Chicago scale",
      sceneMode: "colony",
      cellCount,
      volume: null,
      chicagoHighRiseVolumes: null,
      nextNetworkAction,
    };
  }
  return {
    mode: "unavailable",
    headline: "The Chicago scale report is still ahead",
    sceneMode: "colony",
    cellCount,
    volume: null,
    chicagoHighRiseVolumes: null,
    nextNetworkAction,
  };
}
