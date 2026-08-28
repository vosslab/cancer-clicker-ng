import { prestigeId, stageId } from "../../brands.js";
import type { PendingProgression } from "../../types/state.js";
import { MAX_PENDING_PROGRESSION } from "../../types/state.js";
import { isPrestigeId, isStageId } from "../catalog.js";
import { array, exact, identifier, natural } from "./guards.js";

/** P3 queue records are structural simulation history, never recoverable leaves. */
export function parsePendingProgression(
  value: unknown,
  activeTimeMs: number,
): readonly PendingProgression[] | undefined {
  const values = array(value);
  if (!values || values.length > MAX_PENDING_PROGRESSION) return undefined;
  const result: PendingProgression[] = [];
  for (const item of values) {
    if (
      !exact(item, ["kind", "id", "firstObservedAtActiveMs"]) ||
      !identifier(item.id) ||
      !natural(item.firstObservedAtActiveMs) ||
      item.firstObservedAtActiveMs > activeTimeMs
    )
      return undefined;
    if (item.kind === "stage" && isStageId(item.id))
      result.push({
        kind: "stage",
        id: stageId(item.id),
        firstObservedAtActiveMs: item.firstObservedAtActiveMs,
      });
    else if (item.kind === "prestige" && isPrestigeId(item.id))
      result.push({
        kind: "prestige",
        id: prestigeId(item.id),
        firstObservedAtActiveMs: item.firstObservedAtActiveMs,
      });
    else return undefined;
  }
  return new Set(result.map((item) => `${item.kind}:${item.id}`)).size === result.length
    ? result
    : undefined;
}
