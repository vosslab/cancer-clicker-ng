import {
  colonizationProgramId,
  disseminationMandateId,
  hallmarkId,
  hostCardId,
  hostDraftId,
  hostRunId,
  hostTraitId,
  lineageBoonId,
  networkCampaignId,
  networkEdgeId,
  networkFrontierId,
  networkNodeId,
  organSiteId,
  organTagId,
  passageUpgradeId,
} from "../../brands.js";
import { HALLMARK_IDS } from "../catalog.js";
import {
  generateHostDraftV1,
  HOST_TRAIT_CATALOG,
  LINEAGE_BOON_CATALOG,
  type HostCard,
  type HostDraft,
} from "../../prestige/hosts.js";
import { deriveSeedV1 } from "../deterministic_random.js";
import {
  COLONIZATION_PROGRAM_CATALOG,
  ORGAN_SITE_CATALOG,
  ORGAN_TAG_CATALOG,
} from "../../prestige/seeding.js";
import {
  CRYOBANK_PROGRAM_CATALOG,
  PASSAGE_UPGRADE_CATALOG,
  type CultureState,
} from "../../prestige/culture.js";
import {
  AUTHORED_NETWORK_EDGE_CATALOG,
  AUTHORED_NETWORK_NODE_CATALOG,
  generateNetworkFrontierV1,
  hasValidMandatePlan,
  hasValidActiveNetworkCampaign,
  hasValidNetworkFrontierSource,
  hasValidNetworkFrontier,
  type DisseminationMandate,
  type NetworkFrontierSource,
  type NetworkState,
} from "../../prestige/network.js";
import { STAGE_ONE_PRODUCERS } from "../../economy/producers.js";
import type {
  HostTransferState,
  LineageLedger,
  MetastasisState,
  TerminalPreparation,
} from "../../prestige/layers.js";
import type { GameState } from "../../types/state.js";
import { exact, identifier, natural, numberValue, serial, unique } from "./guards.js";

const UINT32_MAX = 0xffff_ffff;
const PRESTIGE_KEYS = ["lineageLedger", "metastasis", "hostTransfer"] as const;
const CULTURE_KEYS = [
  "passages",
  "purchasedPassageUpgrades",
  "cryobankProgram",
  "queuedProducerAction",
] as const;
const NETWORK_KEYS = [
  "globalTier",
  "transmissionPressure",
  "nodes",
  "edges",
  "pendingFrontier",
  "activeCampaign",
  "completedCampaigns",
  "containedNodeId",
] as const;
const LEDGER_KEYS = [
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

function exactShape(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (!exact(value, keys) || Object.keys(value).length !== keys.length) return false;
  return Object.values(Object.getOwnPropertyDescriptors(value)).every(
    (descriptor) => "value" in descriptor && descriptor.enumerable,
  );
}

/** Read only own data descriptors: hostile save records never get to run accessors. */
function safeArray(value: unknown): readonly unknown[] | undefined {
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

function uint32(value: unknown, allowZero = true): value is number {
  return natural(value) && value <= UINT32_MAX && (allowZero || value > 0);
}

function isDraftCardId(cardId: unknown, draftId: unknown): boolean {
  if (!identifier(cardId) || !identifier(draftId)) return false;
  return [0, 1, 2, 3].some((index) => cardId === `${draftId}:${index}`);
}

function canonicalIds<T extends string>(
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

function terminalPreparation(
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

function parseLedger(value: unknown, activeTimeMs: number): LineageLedger | undefined {
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
  const preparation = terminalPreparation(
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

function parseMetastasis(value: unknown): MetastasisState | undefined {
  if (!exactShape(value, ["metastaticPotential", "allocations", "programs", "activeNicheContext"]))
    return undefined;
  const metastaticPotential = numberValue(value.metastaticPotential);
  const allocations = safeArray(value.allocations);
  const programs = safeArray(value.programs);
  if (!metastaticPotential || metastaticPotential.mantissa < 0 || !allocations || !programs)
    return undefined;
  const parsedAllocations: Array<{ siteId: ReturnType<typeof organSiteId>; rank: number }> = [];
  for (const allocation of allocations) {
    if (
      !exactShape(allocation, ["siteId", "rank"]) ||
      !identifier(allocation.siteId) ||
      !natural(allocation.rank)
    )
      return undefined;
    const site = ORGAN_SITE_CATALOG.find((entry) => entry.id === allocation.siteId);
    if (!site || allocation.rank < 1 || allocation.rank > site.allocationCosts.length)
      return undefined;
    parsedAllocations.push({ siteId: site.id, rank: allocation.rank });
  }
  const canonicalSites = ORGAN_SITE_CATALOG.filter((site) =>
    parsedAllocations.some((allocation) => allocation.siteId === site.id),
  ).map((site) => site.id);
  if (
    !unique(parsedAllocations.map((allocation) => String(allocation.siteId))) ||
    !canonicalSites.every((id, index) => id === parsedAllocations[index]?.siteId)
  )
    return undefined;
  const parsedPrograms: Array<{
    siteId: ReturnType<typeof organSiteId>;
    programId: ReturnType<typeof colonizationProgramId>;
  }> = [];
  for (const program of programs) {
    if (
      !exactShape(program, ["siteId", "programId"]) ||
      !identifier(program.siteId) ||
      !identifier(program.programId)
    )
      return undefined;
    const site = ORGAN_SITE_CATALOG.find((entry) => entry.id === program.siteId);
    const definition = COLONIZATION_PROGRAM_CATALOG.find((entry) => entry.id === program.programId);
    if (
      !site ||
      !definition ||
      !parsedAllocations.some((allocation) => allocation.siteId === site.id && allocation.rank > 0)
    )
      return undefined;
    parsedPrograms.push({ siteId: site.id, programId: definition.id });
  }
  const canonicalProgramSites = ORGAN_SITE_CATALOG.filter((site) =>
    parsedPrograms.some((program) => program.siteId === site.id),
  ).map((site) => site.id);
  if (
    !unique(parsedPrograms.map((program) => String(program.siteId))) ||
    !canonicalProgramSites.every((id, index) => id === parsedPrograms[index]?.siteId)
  )
    return undefined;
  let activeNicheContext: MetastasisState["activeNicheContext"];
  const context = value.activeNicheContext;
  if (context === null) {
    // ASVS 2.2.3: the pre-L1 empty aggregate has one closed null-context form.
    if (
      metastaticPotential.mantissa !== 0 ||
      metastaticPotential.exponent !== 0 ||
      parsedAllocations.length !== 0 ||
      parsedPrograms.length !== 0
    )
      return undefined;
    activeNicheContext = null;
  } else {
    if (
      !exactShape(context, ["siteId", "allocationRank", "programId"]) ||
      !identifier(context.siteId) ||
      !natural(context.allocationRank) ||
      !identifier(context.programId)
    )
      return undefined;
    const allocation = parsedAllocations.find((entry) => entry.siteId === context.siteId);
    const program = parsedPrograms.find((entry) => entry.siteId === context.siteId);
    if (
      allocation === undefined ||
      allocation.rank !== context.allocationRank ||
      allocation.rank < 1 ||
      program === undefined ||
      program.programId !== context.programId
    )
      return undefined;
    activeNicheContext = {
      siteId: allocation.siteId,
      allocationRank: allocation.rank as 1 | 2 | 3,
      programId: program.programId,
    };
  }
  return {
    metastaticPotential,
    allocations: parsedAllocations,
    programs: parsedPrograms,
    activeNicheContext,
  };
}

function parseCard(value: unknown, expectedId?: string): HostCard | undefined {
  if (!exactShape(value, ["id", "immuneRegime", "tissueEcology", "hostHorizon"])) return undefined;
  if (
    !identifier(value.id) ||
    !identifier(value.immuneRegime) ||
    !identifier(value.tissueEcology) ||
    !identifier(value.hostHorizon) ||
    (expectedId !== undefined && value.id !== expectedId)
  )
    return undefined;
  const immuneRegime = HOST_TRAIT_CATALOG.find(
    (trait) => trait.id === value.immuneRegime && trait.axis === "immune-regime",
  );
  const tissueEcology = HOST_TRAIT_CATALOG.find(
    (trait) => trait.id === value.tissueEcology && trait.axis === "tissue-ecology",
  );
  const hostHorizon = HOST_TRAIT_CATALOG.find(
    (trait) => trait.id === value.hostHorizon && trait.axis === "host-horizon",
  );
  if (!immuneRegime || !tissueEcology || !hostHorizon) return undefined;
  return {
    id: hostCardId(value.id),
    immuneRegime: hostTraitId(value.immuneRegime),
    tissueEcology: hostTraitId(value.tissueEcology),
    hostHorizon: hostTraitId(value.hostHorizon),
  };
}

function parseDraft(
  value: unknown,
  ledger: LineageLedger,
  eventSequence: number,
): HostDraft | null | undefined {
  if (value === null) return null;
  if (
    !exactShape(value, [
      "id",
      "sourceSeed",
      "sourceEventSequence",
      "cards",
      "revealPolicy",
      "revealedCardIds",
      "available",
      "consumedCardId",
    ])
  )
    return undefined;
  const expectedId = `host-draft-v1:${ledger.lineageSeed}:${ledger.hostDraftSequence}`;
  if (
    !identifier(value.id) ||
    value.id !== expectedId ||
    !uint32(value.sourceSeed, false) ||
    !natural(value.sourceEventSequence) ||
    value.sourceEventSequence >= eventSequence ||
    !(value.revealPolicy === "standard" || value.revealPolicy === "extra-card-reveal") ||
    typeof value.available !== "boolean" ||
    !(value.consumedCardId === null || identifier(value.consumedCardId))
  )
    return undefined;
  const sourceCards = safeArray(value.cards);
  const sourceReveals = safeArray(value.revealedCardIds);
  if (
    !sourceCards ||
    sourceCards.length !== 4 ||
    !sourceReveals ||
    !sourceReveals.every(identifier)
  )
    return undefined;
  const draftId = value.id;
  const cards = sourceCards.map((card, index) => parseCard(card, `${draftId}:${index}`));
  if (cards.some((card): card is undefined => card === undefined)) return undefined;
  const parsedCards = cards as [HostCard, HostCard, HostCard, HostCard];
  const tupleKeys = parsedCards.map((card) =>
    [card.immuneRegime, card.tissueEcology, card.hostHorizon].join("|"),
  );
  const parsedReveals = sourceReveals.map(hostCardId);
  const expectedRevealCount = value.revealPolicy === "extra-card-reveal" ? 4 : 3;
  const expectedReveals = parsedCards.slice(0, expectedRevealCount).map((card) => card.id);
  const hasExtraRevealAuthorization = ledger.lineageBoonApplications.some(
    (application) =>
      application.kind === "pre-draft" &&
      application.boonId === lineageBoonId("extra_card_reveal") &&
      application.draftId === value.id,
  );
  const generated = generateHostDraftV1({
    lineageSeed: ledger.lineageSeed,
    hostDraftSequence: ledger.hostDraftSequence,
    sourceEventSequence: value.sourceEventSequence,
    purchasedBoons: [],
  });
  if (
    !unique(tupleKeys) ||
    !unique(parsedReveals) ||
    parsedReveals.length !== expectedRevealCount ||
    parsedReveals.length !== expectedReveals.length ||
    !expectedReveals.every((id, index) => id === parsedReveals[index]) ||
    (value.revealPolicy === "extra-card-reveal") !== hasExtraRevealAuthorization ||
    (value.available && value.consumedCardId !== null) ||
    (!value.available && value.consumedCardId === null) ||
    (value.consumedCardId !== null && !parsedReveals.includes(hostCardId(value.consumedCardId))) ||
    value.sourceSeed !==
      deriveSeedV1(
        "host-draft-v1",
        ledger.lineageSeed,
        ledger.hostDraftSequence,
        value.sourceEventSequence,
      ) ||
    JSON.stringify(generated.cards) !== JSON.stringify(parsedCards)
  )
    return undefined;
  return {
    id: hostDraftId(value.id),
    sourceSeed: value.sourceSeed,
    sourceEventSequence: value.sourceEventSequence,
    cards: parsedCards,
    revealPolicy: value.revealPolicy,
    revealedCardIds: parsedReveals,
    available: value.available,
    consumedCardId: value.consumedCardId === null ? null : hostCardId(value.consumedCardId),
  };
}

function parseHostTransfer(
  value: unknown,
  ledger: LineageLedger,
  eventSequence: number,
): HostTransferState | undefined {
  if (
    !exactShape(value, ["hostImprints", "purchasedBoons", "activeHost", "pendingDraft"]) ||
    !natural(value.hostImprints)
  )
    return undefined;
  const sourcePurchases = safeArray(value.purchasedBoons);
  if (!sourcePurchases) return undefined;
  const purchasedBoons: HostTransferState["purchasedBoons"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const purchase of sourcePurchases) {
    if (
      !exactShape(purchase, ["boonId", "kind"]) &&
      !exactShape(purchase, ["boonId", "kind", "hostRunId", "cardId", "targetTraitId"])
    )
      return undefined;
    if (
      !identifier(purchase.boonId) ||
      !ledger.usedLineageBoonIds.includes(lineageBoonId(purchase.boonId))
    )
      return undefined;
    if (purchase.kind === "pre-draft") {
      if (
        !exactShape(purchase, ["boonId", "kind"]) ||
        (purchase.boonId !== "extra_card_reveal" && purchase.boonId !== "protected_route_affinity")
      )
        return undefined;
      purchasedBoons.push({
        boonId: lineageBoonId(purchase.boonId),
        kind: "pre-draft",
      });
    } else if (purchase.kind === "targeted-active-host") {
      if (
        !exactShape(purchase, ["boonId", "kind", "hostRunId", "cardId", "targetTraitId"]) ||
        purchase.boonId !== "reduced_trait_liability" ||
        !identifier(purchase.hostRunId) ||
        !identifier(purchase.cardId) ||
        !identifier(purchase.targetTraitId) ||
        !HOST_TRAIT_CATALOG.some((trait) => trait.id === purchase.targetTraitId)
      )
        return undefined;
      purchasedBoons.push({
        boonId: lineageBoonId(purchase.boonId),
        kind: "targeted-active-host",
        hostRunId: hostRunId(purchase.hostRunId),
        cardId: hostCardId(purchase.cardId),
        targetTraitId: hostTraitId(purchase.targetTraitId),
      });
    } else return undefined;
  }
  const boonOrder = LINEAGE_BOON_CATALOG.map((boon) => boon.id);
  if (
    !unique(purchasedBoons.map((purchase) => String(purchase.boonId))) ||
    !purchasedBoons.every(
      (purchase, index) =>
        index === 0 ||
        boonOrder.indexOf(purchasedBoons[index - 1]!.boonId) < boonOrder.indexOf(purchase.boonId),
    )
  )
    return undefined;
  const draft = parseDraft(value.pendingDraft, ledger, eventSequence);
  if (draft === undefined) return undefined;
  if (value.activeHost === null) {
    if (ledger.currentHostRunId !== null || (draft !== null && !draft.available)) return undefined;
    return {
      hostImprints: value.hostImprints,
      purchasedBoons,
      activeHost: null,
      pendingDraft: draft,
    };
  }
  if (
    !exactShape(value.activeHost, ["hostRunId", "card"]) ||
    !identifier(value.activeHost.hostRunId)
  )
    return undefined;
  const card = parseCard(value.activeHost.card);
  const expectedRunId = `host-run-v1:${ledger.lineageSeed}:${ledger.hostRunSequence}`;
  if (
    card === undefined ||
    ledger.currentHostRunId === null ||
    value.activeHost.hostRunId !== ledger.currentHostRunId ||
    value.activeHost.hostRunId !== expectedRunId ||
    draft === null ||
    draft.available ||
    draft.consumedCardId !== card.id
  )
    return undefined;
  const matchingCard = draft.cards.find((candidate) => candidate.id === card.id);
  if (matchingCard === undefined || JSON.stringify(matchingCard) !== JSON.stringify(card))
    return undefined;
  return {
    hostImprints: value.hostImprints,
    purchasedBoons,
    activeHost: { hostRunId: hostRunId(value.activeHost.hostRunId), card },
    pendingDraft: draft,
  };
}

function canonicalOrdered(values: readonly string[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! < value);
}

/** ASVS 1.5.2 and 2.2.3: culture balances use catalog order and rank bounds. */
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

function parseGeneratedId(
  value: string,
  kind: "node" | "edge" | "frontier" | "mandate" | "campaign",
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
): readonly number[] | undefined {
  const patterns = {
    node: /^generated-node-v1:(\d+):(\d+):(\d+):(\d+):(\d+)$/,
    edge: /^generated-edge-v1:(\d+):(\d+):(\d+):(\d+):(\d+)$/,
    frontier: /^network-frontier-v1:(\d+):(\d+):(\d+)$/,
    mandate: /^network-frontier-v1:(\d+):(\d+):(\d+):(\d+)$/,
    campaign: /^network-campaign-v1:(\d+):(\d+):(\d+):(\d+)$/,
  } as const;
  const match = patterns[kind].exec(value);
  if (match === null) return undefined;
  const parts = match.slice(1).map(Number);
  if (!parts.every((part) => uint32(part))) return undefined;
  const [seed, tier, sequence] = parts;
  if (
    seed !== networkSeed ||
    tier === undefined ||
    sequence === undefined ||
    tier > globalTier ||
    sequence > frontierSequence
  )
    return undefined;
  if ((kind === "mandate" || kind === "campaign") && (parts[3] === undefined || parts[3] > 2))
    return undefined;
  return parts;
}

function parseSelectedMandate(
  value: unknown,
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
): DisseminationMandate | undefined {
  if (
    !exactShape(value, [
      "id",
      "category",
      "status",
      "campaignId",
      "generatedNodeIds",
      "plannedEdges",
      "completionPredicate",
      "effects",
    ]) ||
    !identifier(value.id) ||
    !(value.category === "deepen" || value.category === "widen" || value.category === "reroute") ||
    value.status !== "selected" ||
    !identifier(value.campaignId) ||
    !exactShape(value.effects, ["throughputMultiplier", "detectionDelta", "adjacencyBonus"]) ||
    typeof value.effects.throughputMultiplier !== "number" ||
    typeof value.effects.detectionDelta !== "number" ||
    typeof value.effects.adjacencyBonus !== "number" ||
    !Number.isFinite(value.effects.throughputMultiplier) ||
    !Number.isFinite(value.effects.detectionDelta) ||
    !Number.isFinite(value.effects.adjacencyBonus)
  )
    return undefined;
  const mandateParts = parseGeneratedId(
    value.id,
    "mandate",
    networkSeed,
    globalTier,
    frontierSequence,
  );
  const campaignParts = parseGeneratedId(
    value.campaignId,
    "campaign",
    networkSeed,
    globalTier,
    frontierSequence,
  );
  const categories = ["deepen", "widen", "reroute"] as const;
  const predicates = [
    "stabilize-generated-node",
    "commit-generated-edge",
    "stabilize-enclave-node",
  ] as const;
  const effects = [
    { throughputMultiplier: 1.16, detectionDelta: 0.08, adjacencyBonus: 0 },
    { throughputMultiplier: 1.04, detectionDelta: 0.03, adjacencyBonus: 2 },
    { throughputMultiplier: 0.92, detectionDelta: -0.1, adjacencyBonus: 1 },
  ] as const;
  const ordinal = mandateParts?.[3];
  const predicate = ordinal === undefined ? undefined : predicates[ordinal];
  const effect = ordinal === undefined ? undefined : effects[ordinal];
  if (
    mandateParts === undefined ||
    campaignParts === undefined ||
    ordinal === undefined ||
    !categories.includes(value.category) ||
    value.category !== categories[ordinal] ||
    predicate === undefined ||
    effect === undefined ||
    value.completionPredicate !== predicate ||
    campaignParts.some((part, index) => part !== mandateParts[index]) ||
    value.effects.throughputMultiplier !== effect.throughputMultiplier ||
    value.effects.detectionDelta !== effect.detectionDelta ||
    value.effects.adjacencyBonus !== effect.adjacencyBonus
  )
    return undefined;
  const rawNodes = safeArray(value.generatedNodeIds);
  const rawEdges = safeArray(value.plannedEdges);
  if (!rawNodes || rawNodes.length < 1 || !rawNodes.every(identifier) || !rawEdges)
    return undefined;
  const generatedNodeIds = rawNodes.map(networkNodeId);
  if (
    !unique(generatedNodeIds.map(String)) ||
    !generatedNodeIds.every((id, localOrdinal) => {
      const parts = parseGeneratedId(id, "node", networkSeed, globalTier, frontierSequence);
      return (
        parts !== undefined &&
        parts.slice(0, 4).every((part, index) => part === mandateParts[index]) &&
        parts[4] === localOrdinal
      );
    })
  )
    return undefined;
  const allowedNodeIds = new Set([
    ...AUTHORED_NETWORK_NODE_CATALOG.map((node) => String(node.id)),
    ...generatedNodeIds.map(String),
  ]);
  const plannedEdges: DisseminationMandate["plannedEdges"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const [localOrdinal, edge] of rawEdges.entries()) {
    if (
      !exactShape(edge, ["id", "fromNodeId", "toNodeId"]) ||
      !identifier(edge.id) ||
      !identifier(edge.fromNodeId) ||
      !identifier(edge.toNodeId) ||
      edge.fromNodeId === edge.toNodeId ||
      !allowedNodeIds.has(edge.fromNodeId) ||
      !allowedNodeIds.has(edge.toNodeId)
    )
      return undefined;
    const parts = parseGeneratedId(edge.id, "edge", networkSeed, globalTier, frontierSequence);
    if (
      parts === undefined ||
      !parts.slice(0, 4).every((part, index) => part === mandateParts[index]) ||
      parts[4] !== localOrdinal
    )
      return undefined;
    plannedEdges.push({
      id: networkEdgeId(edge.id),
      fromNodeId: networkNodeId(edge.fromNodeId),
      toNodeId: networkNodeId(edge.toNodeId),
    });
  }
  const mandate: DisseminationMandate = {
    id: disseminationMandateId(value.id),
    category: value.category,
    status: "selected",
    campaignId: networkCampaignId(value.campaignId),
    generatedNodeIds,
    plannedEdges,
    completionPredicate: predicate,
    effects: effect,
  };
  return hasValidMandatePlan(mandate) ? mandate : undefined;
}

function parseFrontierSource(
  value: unknown,
  networkSeed: number,
  globalTier: number,
  frontierSequence: number,
  eventSequence: number,
): NetworkFrontierSource | undefined {
  if (
    !exactShape(value, [
      "networkSeed",
      "id",
      "sourceSeed",
      "globalTier",
      "frontierSequence",
      "sourceEventSequence",
    ]) ||
    !uint32(value.networkSeed) ||
    value.networkSeed !== networkSeed ||
    !identifier(value.id) ||
    !uint32(value.sourceSeed) ||
    value.sourceSeed === 0 ||
    !uint32(value.globalTier) ||
    value.globalTier > globalTier ||
    !uint32(value.frontierSequence) ||
    value.frontierSequence > frontierSequence ||
    !natural(value.sourceEventSequence) ||
    value.sourceEventSequence >= eventSequence
  )
    return undefined;
  const source: NetworkFrontierSource = {
    networkSeed: value.networkSeed,
    id: networkFrontierId(value.id),
    sourceSeed: value.sourceSeed,
    globalTier: value.globalTier,
    frontierSequence: value.frontierSequence,
    sourceEventSequence: value.sourceEventSequence,
  };
  return hasValidNetworkFrontierSource(source) ? source : undefined;
}

export function parseNetwork(
  value: unknown,
  ledger: LineageLedger,
  activeTimeMs: number,
  eventSequence: number,
): NetworkState | undefined {
  if (!exactShape(value, NETWORK_KEYS)) return undefined;
  const globalTier = value.globalTier;
  if (!uint32(globalTier)) return undefined;
  const transmissionPressure = numberValue(value.transmissionPressure);
  const nodesRaw = safeArray(value.nodes);
  const edgesRaw = safeArray(value.edges);
  const completedRaw = safeArray(value.completedCampaigns);
  if (
    transmissionPressure === undefined ||
    transmissionPressure.mantissa < 0 ||
    nodesRaw === undefined ||
    edgesRaw === undefined ||
    completedRaw === undefined
  )
    return undefined;
  const isEmpty =
    globalTier === 0 &&
    transmissionPressure.mantissa === 0 &&
    transmissionPressure.exponent === 0 &&
    nodesRaw.length === 0 &&
    edgesRaw.length === 0 &&
    value.pendingFrontier === null &&
    value.activeCampaign === null &&
    completedRaw.length === 0 &&
    value.containedNodeId === null;
  if (ledger.networkSeed === null) {
    return isEmpty && ledger.frontierSequence === 0 && ledger.stabilizedRewardedNodeIds.length === 0
      ? {
          globalTier: 0,
          transmissionPressure,
          nodes: [],
          edges: [],
          pendingFrontier: null,
          activeCampaign: null,
          completedCampaigns: [],
          containedNodeId: null,
        }
      : undefined;
  }
  const networkSeed = ledger.networkSeed;
  const nodes: NetworkState["nodes"] extends readonly (infer T)[] ? T[] : never = [];
  for (const node of nodesRaw) {
    if (
      !exactShape(node, [
        "id",
        "sourceKind",
        "campaignId",
        "status",
        "establishedAtActiveMs",
        "stabilizedAtActiveMs",
      ]) ||
      !identifier(node.id) ||
      !(node.sourceKind === "authored" || node.sourceKind === "generated") ||
      !(node.campaignId === null || identifier(node.campaignId)) ||
      !(node.status === "established" || node.status === "stable") ||
      !natural(node.establishedAtActiveMs) ||
      node.establishedAtActiveMs > activeTimeMs ||
      !(node.stabilizedAtActiveMs === null || natural(node.stabilizedAtActiveMs)) ||
      (node.stabilizedAtActiveMs !== null &&
        (node.stabilizedAtActiveMs < node.establishedAtActiveMs ||
          node.stabilizedAtActiveMs > activeTimeMs)) ||
      (node.status === "stable") !== (node.stabilizedAtActiveMs !== null)
    )
      return undefined;
    if (node.sourceKind === "authored") {
      if (
        node.campaignId !== null ||
        !AUTHORED_NETWORK_NODE_CATALOG.some((definition) => definition.id === node.id)
      )
        return undefined;
    } else if (
      node.campaignId === null ||
      parseGeneratedId(node.id, "node", networkSeed, globalTier, ledger.frontierSequence) ===
        undefined ||
      parseGeneratedId(
        node.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      ) === undefined
    )
      return undefined;
    nodes.push({
      id: networkNodeId(node.id),
      sourceKind: node.sourceKind,
      campaignId: node.campaignId === null ? null : networkCampaignId(node.campaignId),
      status: node.status,
      establishedAtActiveMs: node.establishedAtActiveMs,
      stabilizedAtActiveMs: node.stabilizedAtActiveMs,
    });
  }
  const authoredNodeIds = AUTHORED_NETWORK_NODE_CATALOG.filter((definition) =>
    nodes.some((node) => node.id === definition.id),
  ).map((definition) => definition.id);
  const firstGeneratedNodeIndex = nodes.findIndex((node) => node.sourceKind === "generated");
  if (
    !unique(nodes.map((node) => String(node.id))) ||
    !authoredNodeIds.every((id, index) => nodes[index]?.id === id) ||
    (firstGeneratedNodeIndex >= 0 &&
      nodes.slice(firstGeneratedNodeIndex).some((node) => node.sourceKind !== "generated"))
  )
    return undefined;
  const nodeIds = new Set(nodes.map((node) => String(node.id)));
  const authoredNodeIdSet = new Set(AUTHORED_NETWORK_NODE_CATALOG.map((node) => String(node.id)));
  const edges: NetworkState["edges"] extends readonly (infer T)[] ? T[] : never = [];
  for (const edge of edgesRaw) {
    if (
      !exactShape(edge, ["id", "fromNodeId", "toNodeId", "status", "campaignId"]) ||
      !identifier(edge.id) ||
      !identifier(edge.fromNodeId) ||
      !identifier(edge.toNodeId) ||
      !(edge.status === "committed" || edge.status === "retired") ||
      !(edge.campaignId === null || identifier(edge.campaignId)) ||
      !(nodeIds.has(edge.fromNodeId) || authoredNodeIdSet.has(edge.fromNodeId)) ||
      !(nodeIds.has(edge.toNodeId) || authoredNodeIdSet.has(edge.toNodeId)) ||
      edge.fromNodeId === edge.toNodeId
    )
      return undefined;
    if (edge.campaignId === null) {
      const definition = AUTHORED_NETWORK_EDGE_CATALOG.find((entry) => entry.id === edge.id);
      if (
        definition === undefined ||
        definition.fromNodeId !== edge.fromNodeId ||
        definition.toNodeId !== edge.toNodeId
      )
        return undefined;
    } else if (
      parseGeneratedId(edge.id, "edge", networkSeed, globalTier, ledger.frontierSequence) ===
        undefined ||
      parseGeneratedId(
        edge.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      ) === undefined
    )
      return undefined;
    if (edge.campaignId !== null) {
      const edgeParts = parseGeneratedId(
        edge.id,
        "edge",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      );
      const campaignParts = parseGeneratedId(
        edge.campaignId,
        "campaign",
        networkSeed,
        globalTier,
        ledger.frontierSequence,
      );
      if (
        edgeParts === undefined ||
        campaignParts === undefined ||
        edgeParts.slice(0, 4).some((part, index) => part !== campaignParts[index])
      )
        return undefined;
    }
    edges.push({
      id: networkEdgeId(edge.id),
      fromNodeId: networkNodeId(edge.fromNodeId),
      toNodeId: networkNodeId(edge.toNodeId),
      status: edge.status,
      campaignId: edge.campaignId === null ? null : networkCampaignId(edge.campaignId),
    });
  }
  if (
    !unique(edges.map((edge) => String(edge.id))) ||
    !canonicalOrdered(edges.map((edge) => String(edge.id)))
  )
    return undefined;
  const parseFrontier = (): NetworkState["pendingFrontier"] | undefined => {
    const frontier = value.pendingFrontier;
    if (frontier === null) return null;
    if (
      !exactShape(frontier, [
        "id",
        "networkSeed",
        "sourceSeed",
        "globalTier",
        "frontierSequence",
        "sourceEventSequence",
        "mandates",
      ]) ||
      !identifier(frontier.id) ||
      frontier.networkSeed !== networkSeed ||
      !uint32(frontier.sourceSeed) ||
      frontier.sourceSeed === 0 ||
      !uint32(frontier.globalTier) ||
      !uint32(frontier.frontierSequence) ||
      !natural(frontier.sourceEventSequence) ||
      frontier.sourceEventSequence > eventSequence
    )
      return undefined;
    const rawMandates = safeArray(frontier.mandates);
    if (!rawMandates || rawMandates.length !== 3) return undefined;
    let canonicalMandates: string;
    try {
      canonicalMandates = JSON.stringify(serial(rawMandates));
    } catch {
      return undefined;
    }
    const generated = generateNetworkFrontierV1({
      networkSeed,
      globalTier: frontier.globalTier,
      frontierSequence: frontier.frontierSequence,
      sourceEventSequence: frontier.sourceEventSequence,
    });
    if (
      frontier.id !== generated.id ||
      frontier.networkSeed !== generated.networkSeed ||
      frontier.sourceSeed !== generated.sourceSeed ||
      frontier.globalTier !== globalTier ||
      frontier.frontierSequence !== ledger.frontierSequence ||
      canonicalMandates !== JSON.stringify(generated.mandates) ||
      !hasValidNetworkFrontier(generated)
    )
      return undefined;
    return generated;
  };
  const pendingFrontier = parseFrontier();
  if (pendingFrontier === undefined) return undefined;
  if (!(value.containedNodeId === null || identifier(value.containedNodeId))) return undefined;
  let activeCampaign: NetworkState["activeCampaign"];
  if (value.activeCampaign === null) activeCampaign = null;
  else {
    if (
      !exactShape(value.activeCampaign, ["sourceFrontier", "mandate", "selectedAtActiveMs"]) ||
      !natural(value.activeCampaign.selectedAtActiveMs) ||
      value.activeCampaign.selectedAtActiveMs > activeTimeMs ||
      pendingFrontier !== null
    )
      return undefined;
    const sourceFrontier = parseFrontierSource(
      value.activeCampaign.sourceFrontier,
      networkSeed,
      globalTier,
      ledger.frontierSequence,
      eventSequence,
    );
    const mandate = parseSelectedMandate(
      value.activeCampaign.mandate,
      networkSeed,
      sourceFrontier?.globalTier ?? globalTier,
      sourceFrontier?.frontierSequence ?? ledger.frontierSequence,
    );
    if (
      sourceFrontier === undefined ||
      mandate === undefined ||
      !mandate.generatedNodeIds.every((id) =>
        nodes.some((node) => node.id === id && node.campaignId === mandate.campaignId),
      ) ||
      !mandate.plannedEdges.every((planned) =>
        edges.some(
          (edge) =>
            edge.id === planned.id &&
            edge.fromNodeId === planned.fromNodeId &&
            edge.toNodeId === planned.toNodeId &&
            edge.campaignId === mandate.campaignId,
        ),
      )
    )
      return undefined;
    activeCampaign = {
      sourceFrontier,
      mandate,
      selectedAtActiveMs: value.activeCampaign.selectedAtActiveMs,
    };
    if (!hasValidActiveNetworkCampaign(activeCampaign)) return undefined;
  }
  const completedCampaigns: NetworkState["completedCampaigns"] extends readonly (infer T)[]
    ? T[]
    : never = [];
  for (const entry of completedRaw) {
    if (
      !exactShape(entry, [
        "sourceFrontier",
        "mandate",
        "selectedAtActiveMs",
        "completedAtActiveMs",
      ]) ||
      !natural(entry.selectedAtActiveMs) ||
      !natural(entry.completedAtActiveMs) ||
      entry.selectedAtActiveMs > entry.completedAtActiveMs ||
      entry.completedAtActiveMs > activeTimeMs
    )
      return undefined;
    const sourceFrontier = parseFrontierSource(
      entry.sourceFrontier,
      networkSeed,
      globalTier,
      ledger.frontierSequence,
      eventSequence,
    );
    const mandate = parseSelectedMandate(
      entry.mandate,
      networkSeed,
      sourceFrontier?.globalTier ?? globalTier,
      sourceFrontier?.frontierSequence ?? ledger.frontierSequence,
    );
    if (sourceFrontier === undefined || mandate === undefined) return undefined;
    const campaign = { sourceFrontier, mandate, selectedAtActiveMs: entry.selectedAtActiveMs };
    if (!hasValidActiveNetworkCampaign(campaign)) return undefined;
    completedCampaigns.push({ ...campaign, completedAtActiveMs: entry.completedAtActiveMs });
  }
  if (
    !unique(completedCampaigns.map((campaign) => String(campaign.mandate.id))) ||
    (activeCampaign !== null &&
      completedCampaigns.some((campaign) => campaign.mandate.id === activeCampaign.mandate.id))
  )
    return undefined;
  if (
    completedCampaigns.length !== globalTier ||
    !completedCampaigns.every(
      (campaign, index) =>
        campaign.sourceFrontier.globalTier === index &&
        campaign.sourceFrontier.frontierSequence === index &&
        (index === 0 ||
          (campaign.sourceFrontier.sourceEventSequence >
            completedCampaigns[index - 1]!.sourceFrontier.sourceEventSequence &&
            campaign.selectedAtActiveMs >= completedCampaigns[index - 1]!.completedAtActiveMs)),
    ) ||
    (activeCampaign !== null &&
      (activeCampaign.sourceFrontier.globalTier !== globalTier ||
        activeCampaign.sourceFrontier.frontierSequence !== globalTier ||
        ledger.frontierSequence !== globalTier + 1)) ||
    (pendingFrontier !== null &&
      (pendingFrontier.globalTier !== globalTier ||
        pendingFrontier.frontierSequence !== globalTier ||
        ledger.frontierSequence !== globalTier)) ||
    (globalTier > 0 && activeCampaign === null && pendingFrontier === null)
  )
    return undefined;
  const plans = [
    ...(activeCampaign === null ? [] : [activeCampaign.mandate]),
    ...completedCampaigns.map((campaign) => campaign.mandate),
  ];
  const expectedGeneratedNodeIds = new Set(plans.flatMap((mandate) => mandate.generatedNodeIds));
  const expectedGeneratedNodeCampaigns = new Map(
    plans.flatMap((mandate) =>
      mandate.generatedNodeIds.map((nodeId) => [nodeId, mandate.campaignId] as const),
    ),
  );
  const expectedGeneratedEdges = new Map(
    plans.flatMap((mandate) => mandate.plannedEdges.map((edge) => [edge.id, edge] as const)),
  );
  if (
    !nodes
      .filter((node) => node.sourceKind === "generated")
      .every(
        (node) =>
          expectedGeneratedNodeIds.has(node.id) &&
          node.campaignId === expectedGeneratedNodeCampaigns.get(node.id),
      ) ||
    expectedGeneratedNodeIds.size !==
      nodes.filter((node) => node.sourceKind === "generated").length ||
    !edges
      .filter((edge) => edge.campaignId !== null)
      .every((edge) => {
        const planned = expectedGeneratedEdges.get(edge.id);
        const campaign = plans.find((mandate) =>
          mandate.plannedEdges.some((item) => item.id === edge.id),
        )?.campaignId;
        return (
          planned !== undefined &&
          edge.campaignId === campaign &&
          planned.fromNodeId === edge.fromNodeId &&
          planned.toNodeId === edge.toNodeId
        );
      }) ||
    expectedGeneratedEdges.size !== edges.filter((edge) => edge.campaignId !== null).length
  )
    return undefined;
  const containedNodeId =
    value.containedNodeId === null ? null : networkNodeId(value.containedNodeId);
  if (
    containedNodeId !== null &&
    !nodes.some(
      (node) =>
        node.id === containedNodeId &&
        node.sourceKind === "authored" &&
        (node.status === "established" || node.status === "stable"),
    )
  )
    return undefined;
  if (
    !ledger.stabilizedRewardedNodeIds.every((id) =>
      nodes.some((node) => node.id === id && node.status === "stable"),
    ) ||
    !canonicalOrdered(ledger.stabilizedRewardedNodeIds)
  )
    return undefined;
  return {
    globalTier,
    transmissionPressure,
    nodes,
    edges,
    pendingFrontier,
    activeCampaign,
    completedCampaigns,
    containedNodeId,
  };
}

/**
 * ASVS 1.5.2, 2.1.1-2.1.3, 2.2.1-2.2.3, 2.3.1/2.3.3, and 15.3.3/15.3.5-15.3.6:
 * reconstruct p6 prestige state only from exact plain records, catalog allowlists, and coherent
 * state-machine relations. Browser storage contains no sensitive credentials (ASVS 14.3.3).
 */
export function parsePrestige(
  value: unknown,
  state: Pick<GameState, "activeTimeMs" | "eventSequence">,
): Pick<GameState, "lineageLedger" | "metastasis" | "hostTransfer"> | undefined {
  if (!exactShape(value, PRESTIGE_KEYS)) return undefined;
  const lineageLedger = parseLedger(value.lineageLedger, state.activeTimeMs);
  if (lineageLedger === undefined) return undefined;
  const metastasis = parseMetastasis(value.metastasis);
  if (metastasis === undefined) return undefined;
  const hostTransfer = parseHostTransfer(value.hostTransfer, lineageLedger, state.eventSequence);
  if (hostTransfer === undefined) return undefined;
  if (
    hostTransfer.purchasedBoons.some((purchase) =>
      lineageLedger.lineageBoonApplications.some(
        (application) => application.boonId === purchase.boonId,
      ),
    )
  )
    return undefined;
  for (const purchase of hostTransfer.purchasedBoons) {
    if (purchase.kind !== "targeted-active-host") continue;
    const active = hostTransfer.activeHost;
    if (
      active === null ||
      purchase.hostRunId !== active.hostRunId ||
      purchase.cardId !== active.card.id ||
      ![active.card.immuneRegime, active.card.tissueEcology, active.card.hostHorizon].includes(
        purchase.targetTraitId,
      )
    )
      return undefined;
  }
  for (const application of lineageLedger.lineageBoonApplications) {
    if (application.kind !== "targeted-active-host") continue;
    if (application.hostRunId !== lineageLedger.currentHostRunId) continue;
    const active = hostTransfer.activeHost;
    const draft = hostTransfer.pendingDraft;
    if (
      active === null ||
      draft === null ||
      draft.available ||
      draft.consumedCardId !== active.card.id ||
      application.draftId !== draft.id ||
      application.hostRunId !== active.hostRunId ||
      application.cardId !== active.card.id ||
      ![active.card.immuneRegime, active.card.tissueEcology, active.card.hostHorizon].includes(
        application.targetTraitId,
      )
    )
      return undefined;
  }
  return { lineageLedger, metastasis, hostTransfer };
}
