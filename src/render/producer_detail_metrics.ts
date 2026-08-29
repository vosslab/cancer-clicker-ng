import { divide, isZero, multiplyByNumber } from "../bignum/bignum.js";
import { formatBigNum } from "../bignum/format.js";
import {
  cellProductionRate,
  producerCellProductionRate,
  producerPurchaseCellProductionBenefit,
} from "../economy/production.js";
import { producerDefinition } from "../economy/producers.js";
import type { BigNum } from "../types/bignum.js";
import type { ProducerId } from "../types/ids.js";
import type { GameState, NumberFormat } from "../types/state.js";
import { producerLevelFor } from "../state/producer_levels.js";
import { formatCellRate } from "./cell_metrics.js";

export type ProducerDetailMetrics = Readonly<{
  owned: number;
  unitOutput: string;
  fleetOutput: string;
  automaticGrowthShare: string;
  catalogRate: string;
}>;

function percentage(value: BigNum, total: BigNum, format: NumberFormat): string {
  if (isZero(total)) return "0.0%";
  return `${formatBigNum(multiplyByNumber(divide(value, total), 100), format, 1)}%`;
}

/**
 * Player-facing producer facts derived from the authoritative production path.
 * This intentionally reports current, reproducible state rather than claiming an untracked lifetime total.
 */
export function producerDetailMetrics(game: GameState, id: ProducerId): ProducerDetailMetrics {
  const producer = producerDefinition(id);
  const owned = producerLevelFor(game, id);
  const unitRate = producerPurchaseCellProductionBenefit(game, id, 1);
  const fleetRate = producerCellProductionRate(game, id);
  const totalRate = cellProductionRate(game);

  return {
    owned,
    unitOutput: formatCellRate(unitRate, game.numberFormat),
    fleetOutput: formatCellRate(fleetRate, game.numberFormat),
    automaticGrowthShare: percentage(fleetRate, totalRate, game.numberFormat),
    catalogRate: percentage(unitRate, producer.baseCellRate, game.numberFormat),
  };
}
