import { quoteProducerPurchase } from "../../economy/costs.js";
import { STAGE_ONE_PRODUCERS } from "../../economy/producers.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  cryobankProgramQuote,
  PASSAGE_UPGRADE_CATALOG,
  passageUpgradeQuote,
} from "../../prestige/culture.js";
import { projectL3Reset } from "../../prestige/reset.js";
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
    ...CRYOBANK_PROGRAM_CATALOG.flatMap((program) => {
      const immortalizationEvent = {
        type: "perform-immortalization" as const,
        cryobankProgramId: program.id,
        ...env,
      };
      const canImmortalize =
        state.lineageLedger.networkSeed === null &&
        projectL3Reset(state, immortalizationEvent) !== undefined;
      const cryobankQuote = cryobankProgramQuote(state.culture, program.id);
      return [
        ...(canImmortalize
          ? [
              visibleAction("prestige", immortalizationEvent, "Perform immortalization.", [
                "culture",
                program.id,
              ]),
            ]
          : []),
        ...(state.culture.cryobankProgram !== program.id && cryobankQuote.available
          ? [
              visibleAction(
                "prestige",
                { type: "select-cryobank-program", cryobankProgramId: program.id, ...env },
                "Select a cryobank program.",
                ["culture", program.id],
              ),
            ]
          : []),
      ];
    }),
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
