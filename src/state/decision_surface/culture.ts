import { quoteProducerPurchase } from "../../economy/costs.js";
import { STAGE_ONE_PRODUCERS } from "../../economy/producers.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  PASSAGE_UPGRADE_CATALOG,
  passageUpgradeQuote,
} from "../../prestige/culture.js";
import type { GameState } from "../../types/state.js";
import type { VisibleAction } from "./contracts.js";
import { envelope, visibleAction } from "./builders.js";

/** Passage upgrades, cryobank choices, immortalization, and queued assays. */
export function buildCultureCandidates(state: GameState): readonly VisibleAction[] {
  const env = envelope(state);
  return [
    ...PASSAGE_UPGRADE_CATALOG.flatMap((upgrade) => {
      const quote = passageUpgradeQuote(state.lineageLedger, state.culture, upgrade.id);
      if (!quote.available || quote.cost === null) return [];
      return [
        visibleAction(
          "prestige",
          { type: "purchase-passage-upgrade", upgradeId: upgrade.id, ...env },
          "Purchase a culture passage upgrade.",
          ["culture", upgrade.id],
          { resource: "passages", value: quote.cost },
        ),
      ];
    }),
    ...CRYOBANK_PROGRAM_CATALOG.flatMap((program) => [
      ...(state.currentStage === "host_collapse"
        ? [
            visibleAction(
              "prestige",
              { type: "perform-immortalization", cryobankProgramId: program.id, ...env },
              "Perform immortalization.",
              ["culture", program.id],
            ),
          ]
        : []),
      ...(state.culture.cryobankProgram !== program.id &&
      state.culture.purchasedPassageUpgrades.some(
        (purchase) => purchase.upgradeId === "cryobank" && purchase.rank > 0,
      )
        ? [
            visibleAction(
              "prestige",
              { type: "select-cryobank-program", cryobankProgramId: program.id, ...env },
              "Select a cryobank program.",
              ["culture", program.id],
            ),
          ]
        : []),
    ]),
    ...(state.culture.purchasedPassageUpgrades.some(
      (purchase) => purchase.upgradeId === "assay_discipline" && purchase.rank > 0,
    )
      ? STAGE_ONE_PRODUCERS.filter(
          (producer) => quoteProducerPurchase(state, producer.id, 1).affordable,
        )
      : []
    ).map((producer) =>
      visibleAction(
        "prestige",
        { type: "queue-assay-producer-action", producerId: producer.id, ...env },
        "Queue a producer assay action.",
        ["culture", producer.id],
      ),
    ),
  ];
}
