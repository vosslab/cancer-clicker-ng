import {
  colonizationProgramId,
  hostCardId,
  hostDraftId,
  hostRunId,
  hostTraitId,
  lineageBoonId,
  organSiteId,
} from "../../brands.js";
import { deriveSeedV1 } from "../deterministic_random.js";
import {
  generateHostDraftV1,
  HOST_TRAIT_CATALOG,
  LINEAGE_BOON_CATALOG,
  type HostCard,
  type HostDraft,
} from "../../prestige/hosts.js";
import { COLONIZATION_PROGRAM_CATALOG, ORGAN_SITE_CATALOG } from "../../prestige/seeding.js";
import type { HostTransferState, LineageLedger, MetastasisState } from "../../prestige/layers.js";
import type { StageId } from "../../types/ids.js";
import { identifier, natural, numberValue, unique } from "./guards.js";
import { exactShape, safeArray, uint32 } from "./prestige_guards.js";

export function parseMetastasis(
  value: unknown,
  currentStage: StageId,
  completedL1ResetCount: number,
): MetastasisState | undefined {
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
    const hasPreL1Planning =
      metastaticPotential.mantissa !== 0 ||
      metastaticPotential.exponent !== 0 ||
      parsedAllocations.length !== 0 ||
      parsedPrograms.length !== 0;
    // A selected L1 run owns active context. Before it, host collapse owns the planning portfolio.
    if (hasPreL1Planning && (currentStage !== "host_collapse" || completedL1ResetCount !== 0))
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

export function parseHostTransfer(
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
