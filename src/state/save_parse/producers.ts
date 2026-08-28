import { producerId } from "../../brands.js";
import { assertCanonicalProducerLevels } from "../../economy/producers.js";
import type { ProducerLevel } from "../../types/state.js";
import { array, exact, identifier, natural, object } from "./guards.js";

function parseProducerLevels(value: unknown): readonly ProducerLevel[] | undefined {
  const values = array(value);
  if (!values) return undefined;
  const levels: ProducerLevel[] = [];
  for (const entry of values) {
    if (!exact(entry, ["id", "level"]) || !identifier(entry.id) || !natural(entry.level))
      return undefined;
    levels.push({ id: producerId(entry.id), level: entry.level });
  }
  return levels;
}

/** Current save inventories are complete, ordered producer-catalog snapshots. */
export function parseCanonicalProducerLevels(value: unknown): readonly ProducerLevel[] | undefined {
  const levels = parseProducerLevels(value);
  if (levels === undefined) return undefined;
  try {
    return assertCanonicalProducerLevels(levels);
  } catch {
    return undefined;
  }
}

export function hasDuplicateRecordIds(value: unknown): boolean {
  const values = array(value);
  if (!values) return false;
  const ids = values.map((item) => (object(item) && typeof item.id === "string" ? item.id : null));
  return ids.some((id) => id === null) || new Set(ids).size !== ids.length;
}
