import { passageUpgradeId } from "../../brands.js";
import { STAGE_ONE_PRODUCERS } from "../../economy/producers.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  PASSAGE_UPGRADE_CATALOG,
  type CultureState,
} from "../../prestige/culture.js";
import { identifier, natural, unique } from "./guards.js";
import { exactShape, safeArray } from "./prestige_guards.js";

const CULTURE_KEYS = [
  "passages",
  "purchasedPassageUpgrades",
  "cryobankProgram",
  "queuedProducerAction",
] as const;

export function parseCulture(
  value: unknown,
  activeTimeMs: number,
  eventSequence: number,
): CultureState | undefined {
  if (!exactShape(value, CULTURE_KEYS) || !natural(value.passages)) return undefined;
  const sourceUpgrades = safeArray(value.purchasedPassageUpgrades);
  if (!sourceUpgrades) return undefined;
  const purchasedPassageUpgrades: CultureState["purchasedPassageUpgrades"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const purchase of sourceUpgrades) {
    if (
      !exactShape(purchase, ["upgradeId", "rank"]) ||
      !identifier(purchase.upgradeId) ||
      !natural(purchase.rank)
    )
      return undefined;
    const definition = PASSAGE_UPGRADE_CATALOG.find((entry) => entry.id === purchase.upgradeId);
    if (
      definition === undefined ||
      purchase.rank < 1 ||
      purchase.rank > definition.maximumRank ||
      definition.costByRank.length !== definition.maximumRank ||
      definition.costByRank.some((cost) => !natural(cost) || cost < 1)
    )
      return undefined;
    purchasedPassageUpgrades.push({
      upgradeId: passageUpgradeId(purchase.upgradeId),
      rank: purchase.rank,
    });
  }
  const expected = PASSAGE_UPGRADE_CATALOG.filter((definition) =>
    purchasedPassageUpgrades.some((purchase) => purchase.upgradeId === definition.id),
  ).map((definition) => definition.id);
  if (
    !unique(purchasedPassageUpgrades.map((purchase) => String(purchase.upgradeId))) ||
    !expected.every((id, index) => id === purchasedPassageUpgrades[index]?.upgradeId)
  )
    return undefined;
  if (!(value.cryobankProgram === null || identifier(value.cryobankProgram))) return undefined;
  const cryobankProgram =
    value.cryobankProgram === null
      ? null
      : CRYOBANK_PROGRAM_CATALOG.find((program) => program.id === value.cryobankProgram)?.id;
  if (cryobankProgram === undefined) return undefined;
  if (
    cryobankProgram !== null &&
    !purchasedPassageUpgrades.some(
      (purchase) => purchase.upgradeId === passageUpgradeId("cryobank") && purchase.rank >= 1,
    )
  )
    return undefined;
  let queuedProducerAction: CultureState["queuedProducerAction"];
  if (value.queuedProducerAction === null) queuedProducerAction = null;
  else {
    const queued = value.queuedProducerAction;
    if (
      !exactShape(queued, ["producerId", "queuedAtEventSequence", "queuedAtActiveMs"]) ||
      !identifier(queued.producerId) ||
      !STAGE_ONE_PRODUCERS.some((producer) => producer.id === queued.producerId) ||
      !natural(queued.queuedAtEventSequence) ||
      queued.queuedAtEventSequence > eventSequence ||
      !natural(queued.queuedAtActiveMs) ||
      queued.queuedAtActiveMs > activeTimeMs ||
      !purchasedPassageUpgrades.some(
        (purchase) =>
          purchase.upgradeId === passageUpgradeId("assay_discipline") && purchase.rank >= 1,
      )
    )
      return undefined;
    queuedProducerAction = {
      producerId: STAGE_ONE_PRODUCERS.find((producer) => producer.id === queued.producerId)!.id,
      queuedAtEventSequence: queued.queuedAtEventSequence,
      queuedAtActiveMs: queued.queuedAtActiveMs,
    };
  }
  return {
    passages: value.passages,
    purchasedPassageUpgrades,
    cryobankProgram,
    queuedProducerAction,
  };
}
