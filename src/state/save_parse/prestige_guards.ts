import {
  hallmarkId,
  hostCardId,
  hostDraftId,
  hostRunId,
  hostTraitId,
  lineageBoonId,
  organTagId,
} from "../../brands.js";
import { HALLMARK_IDS } from "../catalog.js";
import { HOST_TRAIT_CATALOG, LINEAGE_BOON_CATALOG } from "../../prestige/hosts.js";
import { ORGAN_TAG_CATALOG } from "../../prestige/seeding.js";
import type { LineageLedger, TerminalPreparation } from "../../prestige/layers.js";
import { exact, identifier, natural, unique } from "./guards.js";

const UINT32_MAX = 0xffff_ffff;

export const PRESTIGE_KEYS = ["lineageLedger", "metastasis", "hostTransfer"] as const;
export const LEDGER_KEYS = [
  "lineageSeed",
  "hostRunSequence",
  "currentHostRunId",
  "completedL1ResetCount",
  "completedHostTransferCount",
  "hostCollapseAfterTransferCount",
  "successfulTransitCount",
  "organTagsSeen",
  "chosenHallmarksAcrossLineage",
  "usedLineageBoonIds",
  "lineageBoonApplications",
  "terminalPreparation",
  "hostDraftSequence",
  "networkSeed",
  "frontierSequence",
  "stabilizedRewardedNodeIds",
] as const;

export function exactShape(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!exact(value, keys) || Object.keys(value).length !== keys.length) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => "value" in descriptor && descriptor.enumerable,
  );
}

/** Read only own data descriptors: hostile save records never get to run accessors. */
export function safeArray(value: unknown): readonly unknown[] | undefined {
  if (!Array.isArray(value) || value.length > 256 || Object.keys(value).length !== value.length)
    return undefined;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable)
      return undefined;
  }
  const values: unknown[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (descriptor === undefined || !("value" in descriptor)) return undefined;
    values.push(descriptor.value as unknown);
  }
  return values;
}

export function uint32(value: unknown, allowZero = true): value is number {
  return natural(value) && value <= UINT32_MAX && (allowZero || value > 0);
}

export function isDraftCardId(cardId: unknown, draftId: unknown): boolean {
  if (!identifier(cardId) || !identifier(draftId)) return false;
  return [0, 1, 2, 3].some((index) => cardId === `${draftId}:${index}`);
}

export function canonicalIds<T extends string>(
  value: unknown,
  catalog: readonly T[],
  make: (id: string) => T,
): readonly T[] | undefined {
  const source = safeArray(value);
  if (!source || !source.every(identifier)) return undefined;
  const selected = source.map(make);
  if (!unique(selected) || selected.some((id) => !catalog.includes(id))) return undefined;
  const expected = catalog.filter((id) => selected.includes(id));
  return expected.length === selected.length &&
    expected.every((id, index) => id === selected[index])
    ? expected
    : undefined;
}

export function parseLineageLedger(
  value: unknown,
  activeTimeMs: number,
): LineageLedger | undefined {
  if (!exactShape(value, LEDGER_KEYS)) return undefined;
  if (
    !uint32(value.lineageSeed, false) ||
    !natural(value.hostRunSequence) ||
    !(value.currentHostRunId === null || identifier(value.currentHostRunId)) ||
    !natural(value.completedL1ResetCount) ||
    !natural(value.completedHostTransferCount) ||
    !natural(value.hostCollapseAfterTransferCount) ||
    !natural(value.successfulTransitCount) ||
    !natural(value.hostDraftSequence) ||
    !(value.networkSeed === null || uint32(value.networkSeed)) ||
    !natural(value.frontierSequence)
  )
    return undefined;
  const organTagsSeen = canonicalIds(value.organTagsSeen, ORGAN_TAG_CATALOG, organTagId);
  const chosenHallmarksAcrossLineage = canonicalIds(
    value.chosenHallmarksAcrossLineage,
    HALLMARK_IDS.map(hallmarkId),
    hallmarkId,
  );
  const usedLineageBoonIds = canonicalIds(
    value.usedLineageBoonIds,
    LINEAGE_BOON_CATALOG.map((boon) => boon.id),
    lineageBoonId,
  );
  const lineageBoonApplications = safeArray(value.lineageBoonApplications);
  const stabilizedRewardedNodeIds = safeArray(value.stabilizedRewardedNodeIds);
  if (
    organTagsSeen === undefined ||
    chosenHallmarksAcrossLineage === undefined ||
    usedLineageBoonIds === undefined ||
    !lineageBoonApplications ||
    !stabilizedRewardedNodeIds ||
    !stabilizedRewardedNodeIds.every(identifier) ||
    !unique(stabilizedRewardedNodeIds)
  )
    return undefined;
  const parsedApplications: LineageLedger["lineageBoonApplications"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const application of lineageBoonApplications) {
    if (
      !exactShape(application, ["boonId", "kind", "draftId"]) &&
      !exactShape(application, [
        "boonId",
        "kind",
        "draftId",
        "hostRunId",
        "cardId",
        "targetTraitId",
      ])
    )
      return undefined;
    if (
      !identifier(application.boonId) ||
      !identifier(application.draftId) ||
      !usedLineageBoonIds.includes(lineageBoonId(application.boonId))
    )
      return undefined;
    const draftMatch = new RegExp(`^host-draft-v1:${value.lineageSeed}:(\\d+)$`).exec(
      application.draftId,
    );
    const sequence = draftMatch === null ? undefined : Number(draftMatch[1]);
    if (!natural(sequence) || sequence < 1 || sequence > value.hostDraftSequence) return undefined;
    if (application.kind === "pre-draft") {
      if (
        !exactShape(application, ["boonId", "kind", "draftId"]) ||
        (application.boonId !== "extra_card_reveal" &&
          application.boonId !== "protected_route_affinity")
      )
        return undefined;
      parsedApplications.push({
        boonId: lineageBoonId(application.boonId),
        kind: "pre-draft",
        draftId: hostDraftId(application.draftId),
      });
    } else if (application.kind === "targeted-active-host") {
      if (
        !exactShape(application, [
          "boonId",
          "kind",
          "draftId",
          "hostRunId",
          "cardId",
          "targetTraitId",
        ]) ||
        application.boonId !== "reduced_trait_liability" ||
        !identifier(application.hostRunId) ||
        !identifier(application.cardId) ||
        !identifier(application.targetTraitId) ||
        !HOST_TRAIT_CATALOG.some((trait) => trait.id === application.targetTraitId) ||
        !new RegExp(`^host-run-v1:${value.lineageSeed}:(\\d+)$`).test(application.hostRunId) ||
        !isDraftCardId(application.cardId, application.draftId)
      )
        return undefined;
      const runSequence = Number(/:(\d+)$/.exec(application.hostRunId)?.[1]);
      if (!natural(runSequence) || runSequence < 1 || runSequence > value.hostRunSequence)
        return undefined;
      parsedApplications.push({
        boonId: lineageBoonId(application.boonId),
        kind: "targeted-active-host",
        draftId: hostDraftId(application.draftId),
        hostRunId: hostRunId(application.hostRunId),
        cardId: hostCardId(application.cardId),
        targetTraitId: hostTraitId(application.targetTraitId),
      });
    } else return undefined;
  }
  const boonOrder = LINEAGE_BOON_CATALOG.map((boon) => boon.id);
  const applicationKey = (entry: (typeof parsedApplications)[number]): string =>
    `${entry.draftId}|${entry.boonId}|${entry.kind}`;
  if (
    !unique(parsedApplications.map(applicationKey)) ||
    !parsedApplications.every((entry, index) => {
      if (index === 0) return true;
      const prior = parsedApplications[index - 1]!;
      const priorSequence = Number(/:(\d+)$/.exec(String(prior.draftId))?.[1]);
      const sequence = Number(/:(\d+)$/.exec(String(entry.draftId))?.[1]);
      return (
        sequence > priorSequence ||
        (sequence === priorSequence &&
          boonOrder.indexOf(entry.boonId) > boonOrder.indexOf(prior.boonId))
      );
    })
  )
    return undefined;
  const currentHostRunId =
    value.currentHostRunId === null ? null : hostRunId(value.currentHostRunId);
  const preparation = parseTerminalPreparation(
    value.terminalPreparation,
    currentHostRunId,
    activeTimeMs,
  );
  if (preparation === undefined) return undefined;
  return {
    lineageSeed: value.lineageSeed,
    hostRunSequence: value.hostRunSequence,
    currentHostRunId,
    completedL1ResetCount: value.completedL1ResetCount,
    completedHostTransferCount: value.completedHostTransferCount,
    hostCollapseAfterTransferCount: value.hostCollapseAfterTransferCount,
    successfulTransitCount: value.successfulTransitCount,
    organTagsSeen,
    chosenHallmarksAcrossLineage,
    usedLineageBoonIds,
    lineageBoonApplications: parsedApplications,
    terminalPreparation: preparation,
    hostDraftSequence: value.hostDraftSequence,
    networkSeed: value.networkSeed,
    frontierSequence: value.frontierSequence,
    stabilizedRewardedNodeIds,
  };
}

function parseTerminalPreparation(
  value: unknown,
  currentHostRunId: string | null,
  activeTimeMs: number,
): TerminalPreparation | null | undefined {
  if (value === null) return null;
  if (
    !exactShape(value, ["hostRunId", "eligible", "assessedAtActiveMs"]) ||
    !identifier(value.hostRunId) ||
    typeof value.eligible !== "boolean" ||
    !natural(value.assessedAtActiveMs) ||
    value.assessedAtActiveMs > activeTimeMs ||
    currentHostRunId === null ||
    value.hostRunId !== currentHostRunId
  )
    return undefined;
  return {
    hostRunId: hostRunId(value.hostRunId),
    eligible: value.eligible,
    assessedAtActiveMs: value.assessedAtActiveMs,
  };
}
