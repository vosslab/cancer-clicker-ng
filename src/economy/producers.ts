import { bigNum, producerId, stageId } from "../brands.js";
import type { BigNum } from "../types/bignum.js";
import type { ProducerId, StageId } from "../types/ids.js";
import type { ProducerLevel } from "../types/state.js";

export type ProducerDefinition = Readonly<{
  id: ProducerId;
  displayName: string;
  baseCellRate: BigNum;
  firstCost: BigNum;
  growth: number;
  unlockStage: StageId;
}>;

/**
 * Opening-economy values are catalog-owned balance inputs; calibration tunes these data,
 * never the purchasing or production algorithms.
 */
export const STAGE_ONE_PRODUCERS = [
  {
    id: producerId("producer"),
    displayName: "Cyclin D",
    baseCellRate: bigNum(1, -1),
    firstCost: bigNum(1, 0),
    growth: 1.12,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("cdk4"),
    displayName: "CDK4",
    baseCellRate: bigNum(4, -1),
    firstCost: bigNum(12, 0),
    growth: 1.13,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("myc"),
    displayName: "MYC",
    baseCellRate: bigNum(15, -1),
    firstCost: bigNum(70, 0),
    growth: 1.14,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("ras"),
    displayName: "RAS",
    baseCellRate: bigNum(6, 0),
    firstCost: bigNum(420, 0),
    growth: 1.15,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("telomerase"),
    displayName: "Telomerase",
    baseCellRate: bigNum(25, 0),
    firstCost: bigNum(2, 3),
    growth: 1.16,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("egfr"),
    displayName: "EGFR",
    baseCellRate: bigNum(11, 1),
    firstCost: bigNum(12, 3),
    growth: 1.17,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("pi3k"),
    displayName: "PI3K",
    baseCellRate: bigNum(5, 2),
    firstCost: bigNum(75, 3),
    growth: 1.18,
    unlockStage: stageId("transformed_cell"),
  },
  {
    id: producerId("replication_fork"),
    displayName: "Replication Fork",
    baseCellRate: bigNum(22, 2),
    firstCost: bigNum(5, 5),
    growth: 1.19,
    unlockStage: stageId("transformed_cell"),
  },
] as const satisfies readonly ProducerDefinition[];

function assertCatalog(): void {
  if (STAGE_ONE_PRODUCERS.length !== 8)
    throw new Error("Stage-one catalog must contain eight producers.");
  const ids = new Set(STAGE_ONE_PRODUCERS.map((producer) => producer.id));
  if (ids.size !== STAGE_ONE_PRODUCERS.length)
    throw new Error("Producer identifiers must be unique.");
}
assertCatalog();

export function producerDefinition(id: ProducerId): ProducerDefinition {
  const definition = STAGE_ONE_PRODUCERS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error("Unknown producer.");
  return definition;
}

function validLevel(level: ProducerLevel): boolean {
  return Number.isSafeInteger(level.level) && level.level >= 0;
}

/** Requires the persisted/current inventory to exactly mirror catalog order. */
export function assertCanonicalProducerLevels(
  levels: readonly ProducerLevel[],
): readonly ProducerLevel[] {
  if (levels.length !== STAGE_ONE_PRODUCERS.length)
    throw new Error("Producer levels must contain the complete catalog.");
  for (let index = 0; index < STAGE_ONE_PRODUCERS.length; index += 1) {
    const expected = STAGE_ONE_PRODUCERS[index];
    const level = levels[index];
    if (!expected || !level || level.id !== expected.id || !validLevel(level))
      throw new Error("Producer levels are not canonical.");
  }
  return levels;
}
