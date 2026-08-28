import { HOST_TRAIT_CATALOG } from "./hosts.js";
import { findColonizationProgram, findOrganSite, ROUTE_COMPATIBILITY_CATALOG } from "./seeding.js";
import type { HostTraitDefinition } from "./hosts.js";
import type { GameState } from "../types/state.js";
import type { RegionId, RouteId } from "../types/ids.js";

export type PrestigeEffects = Readonly<{
  substrateConversionMultiplier: number;
  vesselMaintenanceMultiplier: number;
  vesselCapacityBonus: number;
  routeRiskDelta: number;
  immuneVisibilityDelta: number;
  pressureDelta: number;
  hostRunwayReserveFloor: number;
  protectedRouteIds: readonly RouteId[];
}>;

const NEUTRAL_EFFECTS: PrestigeEffects = Object.freeze({
  substrateConversionMultiplier: 1,
  vesselMaintenanceMultiplier: 1,
  vesselCapacityBonus: 0,
  routeRiskDelta: 0,
  immuneVisibilityDelta: 0,
  pressureDelta: 0,
  hostRunwayReserveFloor: 0,
  protectedRouteIds: Object.freeze([]),
});

const REDUCED_LIABILITY_SHARE = 0.5;

function requireFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`);
  return value;
}

function clamp(value: number, minimum: number, maximum: number, label: string): number {
  return Math.min(maximum, Math.max(minimum, requireFinite(value, label)));
}

function activeNiche(state: GameState): Readonly<{
  context: NonNullable<GameState["metastasis"]["activeNicheContext"]>;
  site: NonNullable<ReturnType<typeof findOrganSite>>;
  program: NonNullable<ReturnType<typeof findColonizationProgram>>;
}> | null {
  const context = state.metastasis.activeNicheContext;
  if (context === null) return null;
  const site = findOrganSite(context.siteId);
  const program = findColonizationProgram(context.programId);
  if (!site || !program) return null;
  return Object.freeze({ context, site, program });
}

function activeHost(state: GameState): Readonly<{
  host: NonNullable<GameState["hostTransfer"]["activeHost"]>;
  draftId: NonNullable<GameState["hostTransfer"]["pendingDraft"]>["id"];
  traits: readonly [HostTraitDefinition, HostTraitDefinition, HostTraitDefinition];
}> | null {
  const host = state.hostTransfer.activeHost;
  const draft = state.hostTransfer.pendingDraft;
  if (
    host === null ||
    draft === null ||
    state.lineageLedger.currentHostRunId !== host.hostRunId ||
    draft.consumedCardId !== host.card.id
  )
    return null;
  const immuneTrait = traitFor(host.card.immuneRegime);
  const ecologyTrait = traitFor(host.card.tissueEcology);
  const horizonTrait = traitFor(host.card.hostHorizon);
  if (!immuneTrait || !ecologyTrait || !horizonTrait) return null;
  return Object.freeze({
    host,
    draftId: draft.id,
    traits: Object.freeze([immuneTrait, ecologyTrait, horizonTrait] as const),
  });
}

function traitFor(id: HostTraitDefinition["id"]): HostTraitDefinition | undefined {
  return HOST_TRAIT_CATALOG.find((trait) => trait.id === id);
}

function hasReducedLiability(
  state: GameState,
  host: NonNullable<ReturnType<typeof activeHost>>,
  trait: HostTraitDefinition,
): boolean {
  return state.lineageLedger.lineageBoonApplications.some(
    (application) =>
      application.kind === "targeted-active-host" &&
      application.boonId === "reduced_trait_liability" &&
      application.draftId === host.draftId &&
      application.hostRunId === host.host.hostRunId &&
      application.cardId === host.host.card.id &&
      application.targetTraitId === trait.id,
  );
}

/**
 * The targeted boon moves only declared adverse numeric contributions toward neutral.
 * Positive capacity/conversion and negative risk/pressure remain the selected trait's benefit.
 */
function traitEffects(
  trait: HostTraitDefinition,
  reducedLiability: boolean,
): HostTraitDefinition["effects"] {
  if (!reducedLiability) return trait.effects;
  const effects = trait.effects;
  return Object.freeze({
    immuneVisibilityDelta:
      effects.immuneVisibilityDelta > 0
        ? effects.immuneVisibilityDelta * REDUCED_LIABILITY_SHARE
        : effects.immuneVisibilityDelta,
    pressureDelta:
      effects.pressureDelta > 0
        ? effects.pressureDelta * REDUCED_LIABILITY_SHARE
        : effects.pressureDelta,
    vesselCapacityBonus:
      effects.vesselCapacityBonus < 0
        ? effects.vesselCapacityBonus * REDUCED_LIABILITY_SHARE
        : effects.vesselCapacityBonus,
    vesselMaintenanceMultiplier:
      effects.vesselMaintenanceMultiplier > 1
        ? 1 + (effects.vesselMaintenanceMultiplier - 1) * REDUCED_LIABILITY_SHARE
        : effects.vesselMaintenanceMultiplier,
    substrateConversionMultiplier:
      effects.substrateConversionMultiplier < 1
        ? 1 - (1 - effects.substrateConversionMultiplier) * REDUCED_LIABILITY_SHARE
        : effects.substrateConversionMultiplier,
    routeRiskDelta:
      effects.routeRiskDelta > 0
        ? effects.routeRiskDelta * REDUCED_LIABILITY_SHARE
        : effects.routeRiskDelta,
    hostRunwayReserveFloor: effects.hostRunwayReserveFloor,
  });
}

function protectedRouteIds(
  state: GameState,
  niche: NonNullable<ReturnType<typeof activeNiche>> | null,
  host: NonNullable<ReturnType<typeof activeHost>> | null,
): readonly RouteId[] {
  if (niche === null || host === null) return NEUTRAL_EFFECTS.protectedRouteIds;
  const applicable = state.lineageLedger.lineageBoonApplications.some(
    (application) =>
      application.kind === "pre-draft" &&
      application.boonId === "protected_route_affinity" &&
      application.draftId === host.draftId,
  );
  if (!applicable) return NEUTRAL_EFFECTS.protectedRouteIds;
  return Object.freeze(
    ROUTE_COMPATIBILITY_CATALOG.filter((route) =>
      route.destinationSiteIds.includes(niche.context.siteId),
    ).map((route) => route.routeId),
  );
}

/** Returns a frozen, current-run-only prestige contribution for mechanics callers. */
export function prestigeEffects(state: GameState): PrestigeEffects {
  const niche = activeNiche(state);
  const host = activeHost(state);
  if (niche === null && host === null) return NEUTRAL_EFFECTS;
  const resolvedEffects =
    host?.traits.map((trait) => traitEffects(trait, hasReducedLiability(state, host, trait))) ?? [];
  const product = (
    field: "substrateConversionMultiplier" | "vesselMaintenanceMultiplier",
  ): number =>
    resolvedEffects.reduce(
      (value, effects) => value * effects[field],
      field === "substrateConversionMultiplier"
        ? (niche?.site.effects.substrateConversionMultiplier ?? 1) *
            (niche?.program.effects.substrateConversionMultiplier ?? 1)
        : (niche?.program.effects.vesselMaintenanceMultiplier ?? 1),
    );
  const sum = (
    field:
      | "vesselCapacityBonus"
      | "routeRiskDelta"
      | "immuneVisibilityDelta"
      | "pressureDelta"
      | "hostRunwayReserveFloor",
    initial: number,
  ): number => resolvedEffects.reduce((value, effects) => value + effects[field], initial);
  return Object.freeze({
    substrateConversionMultiplier: clamp(
      product("substrateConversionMultiplier"),
      0.5,
      1.5,
      "Prestige conversion",
    ),
    vesselMaintenanceMultiplier: clamp(
      product("vesselMaintenanceMultiplier"),
      0.75,
      1.75,
      "Prestige vessel maintenance",
    ),
    vesselCapacityBonus: clamp(
      sum(
        "vesselCapacityBonus",
        (niche?.site.effects.baseVesselCapacityBonus ?? 0) +
          (niche?.program.effects.vesselCapacityBonus ?? 0),
      ),
      -1,
      3,
      "Prestige vessel capacity",
    ),
    routeRiskDelta: requireFinite(
      sum(
        "routeRiskDelta",
        (niche?.site.effects.routeRiskDelta ?? 0) + (niche?.program.effects.routeRiskDelta ?? 0),
      ),
      "Prestige route risk",
    ),
    immuneVisibilityDelta: requireFinite(
      sum("immuneVisibilityDelta", 0),
      "Prestige immune visibility",
    ),
    pressureDelta: requireFinite(sum("pressureDelta", 0), "Prestige pressure"),
    hostRunwayReserveFloor: clamp(sum("hostRunwayReserveFloor", 0), 0, 2, "Prestige reserve floor"),
    protectedRouteIds: protectedRouteIds(state, niche, host),
  });
}

/** Composes the existing conversion multiplier with the bounded selected-run contribution. */
export function prestigeSubstrateConversion(state: GameState, baseMultiplier: number): number {
  return clamp(
    requireFinite(baseMultiplier, "Base substrate conversion") *
      prestigeEffects(state).substrateConversionMultiplier,
    0.5,
    1.5,
    "Prestige substrate conversion",
  );
}

/** Composes the existing vessel-upkeep multiplier before the caller calculates its ATP debit. */
export function prestigeVesselMaintenance(state: GameState, baseMultiplier: number): number {
  return clamp(
    requireFinite(baseMultiplier, "Base vessel maintenance") *
      prestigeEffects(state).vesselMaintenanceMultiplier,
    0.75,
    1.75,
    "Prestige vessel maintenance",
  );
}

/** Exposes only the current draft's site-compatible protected routes. */
export function prestigeProtectedRouteIds(state: GameState): readonly RouteId[] {
  return prestigeEffects(state).protectedRouteIds;
}

/** Applies the current-run route contribution as the final [0, 1] risk boundary. */
export function prestigeRouteRisk(state: GameState, routeId: RouteId, rawRisk: number): number {
  const effects = prestigeEffects(state);
  const adjusted = requireFinite(rawRisk, "Raw route risk") + effects.routeRiskDelta;
  const protectedAdjustment = effects.protectedRouteIds.includes(routeId) ? -0.1 : 0;
  return clamp(adjusted + protectedAdjustment, 0, 1, "Prestige route risk");
}

/** Region identity preserves the consumer boundary; prestige currently supplies a run-wide delta. */
export function prestigeImmuneVisibility(
  state: GameState,
  _regionId: RegionId,
  base: number,
): number {
  return clamp(
    requireFinite(base, "Base immune visibility") + prestigeEffects(state).immuneVisibilityDelta,
    0,
    3,
    "Prestige immune visibility",
  );
}

export function prestigeVesselQuote(
  state: GameState,
  _regionId: RegionId,
): Readonly<{ capacityBonus: number; maintenanceMultiplier: number }> {
  const effects = prestigeEffects(state);
  return Object.freeze({
    capacityBonus: effects.vesselCapacityBonus,
    maintenanceMultiplier: effects.vesselMaintenanceMultiplier,
  });
}

export function prestigeEffectivePressure(state: GameState, base: number): number {
  return clamp(
    requireFinite(base, "Base pressure") + prestigeEffects(state).pressureDelta,
    0,
    Number.MAX_SAFE_INTEGER,
    "Prestige pressure",
  );
}

export function prestigeReplicativeReserveFloor(state: GameState, baseFloor: number): number {
  const validatedBaseFloor = requireFinite(baseFloor, "Base reserve floor");
  if (validatedBaseFloor < 0) throw new Error("Base reserve floor must not be negative.");
  return Math.max(validatedBaseFloor, prestigeEffects(state).hostRunwayReserveFloor);
}
