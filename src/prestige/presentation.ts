import { formatBigNum } from "../bignum/format.js";
import type { GameState } from "../types/state.js";
import type {
  ColonizationProgramId,
  EventId,
  HostCardId,
  HostDraftId,
  HostTraitId,
  LineageBoonId,
  OrganSiteId,
} from "../types/ids.js";
import { hostTransferResetQuoteV1, metastasisResetQuoteV1 } from "./reset.js";
import { HOST_TRAIT_CATALOG, LINEAGE_BOON_CATALOG } from "./hosts.js";
import {
  COLONIZATION_PROGRAM_CATALOG,
  ORGAN_SITE_CATALOG,
  ROUTE_COMPATIBILITY_CATALOG,
} from "./seeding.js";

export type PrestigeReason =
  | "available"
  | "not-host-collapse"
  | "l1-not-earned"
  | "no-viable-seeded-site"
  | "no-prepared-site"
  | "l2-not-earned"
  | "insufficient-resets"
  | "insufficient-diversity"
  | "not-affordable"
  | "already-selected"
  | "requires-allocation"
  | "requires-active-host"
  | "draft-unavailable"
  | "draft-consumed";

export type TextRelation = Readonly<{ benefit: string; liability: string }>;
export type MetastasisPresentation = Readonly<{
  available: boolean;
  reason: PrestigeReason;
  sourceEventSequence: number;
  gainedPotential: number;
  potential: string;
  formulaInputs: readonly string[];
  clearedFields: readonly string[];
  preparedSites: readonly Readonly<{
    siteId: OrganSiteId;
    title: string;
    rank: number;
    programTitle: string;
  }>[];
  activeNiche: Readonly<{
    siteTitle: string;
    rank: number;
    programTitle: string;
  }> | null;
}>;
export type OrganAllocationPresentation = Readonly<{
  siteId: OrganSiteId;
  title: string;
  rank: number;
  nextCost: number | null;
  affordable: boolean;
  available: boolean;
  reason: PrestigeReason;
  relation: TextRelation;
}>;
export type ColonizationProgramPresentation = Readonly<{
  siteId: OrganSiteId;
  programId: ColonizationProgramId;
  title: string;
  selected: boolean;
  available: boolean;
  reason: PrestigeReason;
  relation: TextRelation;
}>;
export type LineageBoonPresentation = Readonly<{
  boonId: LineageBoonId;
  title: string;
  cost: number;
  available: boolean;
  reason: PrestigeReason;
  relation: TextRelation;
}>;
export type ActiveHostTraitBoonPresentation = Readonly<{
  boonId: "reduced_trait_liability";
  targetTraitId: HostTraitId;
  traitTitle: string;
  liability: string;
  cost: number;
  available: boolean;
  reason: PrestigeReason;
}>;
export type HostTransferPresentation = Readonly<{
  available: boolean;
  reason: PrestigeReason;
  sourceEventSequence: number;
  gainedImprints: number;
  imprints: number;
  clearedFields: readonly string[];
}>;
export type HostDraftCardPresentation = Readonly<{
  cardId: HostCardId;
  revealed: boolean;
  title: string;
  traits: readonly TextRelation[];
}>;
export type HostDraftPresentation = Readonly<{
  draftId: HostDraftId | null;
  sourceEventSequence: number | null;
  revealPolicy: "standard" | "extra-card-reveal" | null;
  revealedCardIds: readonly HostCardId[];
  available: boolean;
  consumedCardId: HostCardId | null;
  consumedCardTitle: string | null;
  cards: readonly HostDraftCardPresentation[];
}>;
export type TransitPresentation = Readonly<{
  eventId: EventId;
  outcome: "arrived" | "lost";
  destinations: readonly Readonly<{ siteId: OrganSiteId; title: string }>[];
}>;

const RESET_CLEAR_LIST = Object.freeze([
  "cells, substrate, ATP, and producers",
  "stage, gates, regions, vessels, routes, and commitments",
  "pressures, offers, queues, cooldowns, and timers",
]);
const L2_CLEAR_LIST = Object.freeze([
  ...RESET_CLEAR_LIST,
  "hallmark levels and prior host choices",
]);

function title(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function atHostCollapse(state: GameState): boolean {
  return state.currentStage === "host_collapse";
}

function earned(state: GameState, id: "L1" | "L2"): boolean {
  return state.prestigeAvailability.some((item) => item.id === id && item.status === "earned");
}

function viableSeededSiteCount(state: GameState): number {
  return state.seededSites.filter((id) =>
    state.regions.some((region) => region.id === id && region.viability > 0),
  ).length;
}

function relation(benefit: string, liability: string): TextRelation {
  return Object.freeze({ benefit: title(benefit), liability: title(liability) });
}

function preparedSites(state: GameState): MetastasisPresentation["preparedSites"] {
  return Object.freeze(
    state.metastasis.allocations.flatMap((allocation) => {
      const program = state.metastasis.programs.find((entry) => entry.siteId === allocation.siteId);
      if (!program) return [];
      return [
        Object.freeze({
          siteId: allocation.siteId,
          title: title(allocation.siteId),
          rank: allocation.rank,
          programTitle: title(program.programId),
        }),
      ];
    }),
  );
}

function activeNichePresentation(state: GameState): MetastasisPresentation["activeNiche"] {
  const context = state.metastasis.activeNicheContext;
  if (context === null) return null;
  return Object.freeze({
    siteTitle: title(context.siteId),
    rank: context.allocationRank,
    programTitle: title(context.programId),
  });
}

export function metastasisPresentation(state: GameState): MetastasisPresentation {
  const sourceEventSequence = state.eventSequence;
  const potential = formatBigNum(state.metastasis.metastaticPotential, state.numberFormat, 2);
  if (!atHostCollapse(state))
    return {
      available: false,
      reason: "not-host-collapse",
      sourceEventSequence,
      gainedPotential: 0,
      potential,
      formulaInputs: [],
      clearedFields: RESET_CLEAR_LIST,
      preparedSites: [],
      activeNiche: activeNichePresentation(state),
    };
  if (!earned(state, "L1"))
    return {
      available: false,
      reason: "l1-not-earned",
      sourceEventSequence,
      gainedPotential: 0,
      potential,
      formulaInputs: [],
      clearedFields: RESET_CLEAR_LIST,
      preparedSites: [],
      activeNiche: activeNichePresentation(state),
    };
  const quote = metastasisResetQuoteV1(state);
  const sites = preparedSites(state);
  const available = viableSeededSiteCount(state) > 0 && sites.length > 0;
  return Object.freeze({
    available,
    reason:
      viableSeededSiteCount(state) === 0
        ? "no-viable-seeded-site"
        : sites.length === 0
          ? "no-prepared-site"
          : "available",
    sourceEventSequence: quote.sourceEventSequence,
    gainedPotential: quote.gainedPotential,
    potential,
    formulaInputs: Object.freeze([
      `Viable seeded sites: ${quote.survivingSeededSiteCount}`,
      `Distinct organ tags: ${quote.distinctOrganTagCount}`,
      `Successful transit: ${state.lineageLedger.successfulTransitCount}`,
    ]),
    clearedFields: RESET_CLEAR_LIST,
    preparedSites: sites,
    activeNiche: activeNichePresentation(state),
  });
}

export function organAllocationPresentation(
  state: GameState,
  siteId: OrganSiteId,
): OrganAllocationPresentation {
  const site = ORGAN_SITE_CATALOG.find((item) => item.id === siteId);
  if (!site) throw new Error("Organ-site presentation requires a catalog site.");
  const rank = state.metastasis.allocations.find((item) => item.siteId === siteId)?.rank ?? 0;
  const nextCost = site.allocationCosts[rank] ?? null;
  const potential = state.metastasis.metastaticPotential;
  const affordable =
    nextCost !== null && (potential.exponent > 0 || potential.mantissa >= nextCost);
  const available = nextCost !== null && affordable;
  return Object.freeze({
    siteId,
    title: title(siteId),
    rank,
    nextCost,
    affordable,
    available,
    reason: nextCost === null ? "already-selected" : affordable ? "available" : "not-affordable",
    relation: relation(
      `substrate ${site.substrateDirection}`,
      `detection ${site.detectionDirection}`,
    ),
  });
}

export function colonizationProgramPresentation(
  state: GameState,
  siteId: OrganSiteId,
  programId: ColonizationProgramId,
): ColonizationProgramPresentation {
  const program = COLONIZATION_PROGRAM_CATALOG.find((item) => item.id === programId);
  if (!program) throw new Error("Program presentation requires a catalog program.");
  const allocation = state.metastasis.allocations.find((item) => item.siteId === siteId);
  const selected = state.metastasis.programs.some(
    (item) => item.siteId === siteId && item.programId === programId,
  );
  const available =
    allocation !== undefined &&
    !selected &&
    !state.metastasis.programs.some((item) => item.siteId === siteId);
  return Object.freeze({
    siteId,
    programId,
    title: title(programId),
    selected,
    available,
    reason: selected
      ? "already-selected"
      : allocation === undefined
        ? "requires-allocation"
        : available
          ? "available"
          : "already-selected",
    relation: relation(
      program.relationId,
      `${program.capacityDirection} capacity; ${program.detectionDirection} detection`,
    ),
  });
}

export function lineageBoonPresentation(
  state: GameState,
  boonId: LineageBoonId,
): LineageBoonPresentation {
  const boon = LINEAGE_BOON_CATALOG.find((item) => item.id === boonId);
  if (!boon) throw new Error("Lineage-boon presentation requires a catalog boon.");
  const selected =
    state.hostTransfer.purchasedBoons.some((boon) => boon.boonId === boonId) ||
    state.lineageLedger.usedLineageBoonIds.includes(boonId);
  const available = !selected && state.hostTransfer.hostImprints >= boon.cost;
  return Object.freeze({
    boonId,
    title: title(boonId),
    cost: boon.cost,
    available,
    reason: selected ? "already-selected" : available ? "available" : "not-affordable",
    relation: relation(boon.relationId, boon.liabilityRelationId),
  });
}

/** Presents a targeted active-host boon only against a trait saved on the selected host card. */
export function activeHostTraitBoonPresentation(
  state: GameState,
  targetTraitId: HostTraitId,
): ActiveHostTraitBoonPresentation {
  const boon = LINEAGE_BOON_CATALOG.find((item) => item.id === "reduced_trait_liability");
  if (!boon) throw new Error("Reduced-liability boon is absent from the catalog.");
  const trait = HOST_TRAIT_CATALOG.find((item) => item.id === targetTraitId);
  if (!trait) throw new Error("Targeted host trait is absent from the catalog.");
  const activeHost = state.hostTransfer.activeHost;
  const ownsTrait =
    activeHost !== null &&
    [
      activeHost.card.immuneRegime,
      activeHost.card.tissueEcology,
      activeHost.card.hostHorizon,
    ].includes(targetTraitId);
  const used = state.lineageLedger.usedLineageBoonIds.includes(boon.id);
  const available = ownsTrait && !used && state.hostTransfer.hostImprints >= boon.cost;
  return Object.freeze({
    boonId: "reduced_trait_liability",
    targetTraitId,
    traitTitle: title(targetTraitId),
    liability: title(trait.liabilityRelationId),
    cost: boon.cost,
    available,
    reason: !ownsTrait
      ? "requires-active-host"
      : used
        ? "already-selected"
        : available
          ? "available"
          : "not-affordable",
  });
}

export function hostTransferPresentation(state: GameState): HostTransferPresentation {
  const sourceEventSequence = state.eventSequence;
  if (!atHostCollapse(state))
    return {
      available: false,
      reason: "not-host-collapse",
      sourceEventSequence,
      gainedImprints: 0,
      imprints: state.hostTransfer.hostImprints,
      clearedFields: L2_CLEAR_LIST,
    };
  if (!earned(state, "L2"))
    return {
      available: false,
      reason: "l2-not-earned",
      sourceEventSequence,
      gainedImprints: 0,
      imprints: state.hostTransfer.hostImprints,
      clearedFields: L2_CLEAR_LIST,
    };
  const quote = hostTransferResetQuoteV1(state);
  return Object.freeze({
    available: quote.available,
    reason: quote.reason,
    sourceEventSequence: quote.sourceEventSequence,
    gainedImprints: quote.gainedImprints,
    imprints: state.hostTransfer.hostImprints,
    clearedFields: L2_CLEAR_LIST,
  });
}

export function hostDraftPresentation(state: GameState): HostDraftPresentation {
  const draft = state.hostTransfer.pendingDraft;
  if (!draft)
    return Object.freeze({
      draftId: null,
      sourceEventSequence: null,
      revealPolicy: null,
      revealedCardIds: Object.freeze([]),
      available: false,
      consumedCardId: null,
      consumedCardTitle: null,
      cards: Object.freeze([]),
    });
  const cards = draft.cards.map((card) => {
    const revealed = draft.revealedCardIds.includes(card.id);
    const traits = revealed
      ? [card.immuneRegime, card.tissueEcology, card.hostHorizon].map((traitId) => {
          const trait = HOST_TRAIT_CATALOG.find((item) => item.id === traitId);
          if (!trait) throw new Error("Saved host draft trait is absent from the catalog.");
          return relation(trait.relationId, trait.liabilityRelationId);
        })
      : [];
    const cardParts = String(card.id).split(":");
    const ordinal = cardParts[cardParts.length - 1];
    return Object.freeze({
      cardId: card.id,
      revealed,
      title: revealed ? `Host card ${ordinal}` : "Locked host card",
      traits: Object.freeze(traits),
    });
  });
  return Object.freeze({
    draftId: draft.id,
    sourceEventSequence: draft.sourceEventSequence,
    revealPolicy: draft.revealPolicy,
    revealedCardIds: Object.freeze([...draft.revealedCardIds]),
    available: draft.available && draft.consumedCardId === null,
    consumedCardId: draft.consumedCardId,
    consumedCardTitle:
      draft.consumedCardId === null
        ? null
        : (cards.find((card) => card.cardId === draft.consumedCardId)?.title ?? null),
    cards: Object.freeze(cards),
  });
}

export function transitPresentation(state: GameState): readonly TransitPresentation[] {
  return Object.freeze(
    state.pendingTransitEvents.map((event) => {
      const route = ROUTE_COMPATIBILITY_CATALOG.find((item) => item.routeId === event.routeId);
      return Object.freeze({
        eventId: event.id,
        outcome: event.outcome,
        destinations: Object.freeze(
          (route?.destinationSiteIds ?? []).map((siteId) =>
            Object.freeze({ siteId, title: title(siteId) }),
          ),
        ),
      });
    }),
  );
}
