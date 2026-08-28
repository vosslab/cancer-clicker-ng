import { colonizationProgramId, organSiteId, organTagId, regionId, routeId } from "../brands.js";
import type { RegionId, RouteId } from "../types/ids.js";
import type { ColonizationProgramId, OrganSiteId, OrganTagId } from "../types/ids.js";

export type OrganSiteDefinition = Readonly<{
  id: OrganSiteId;
  tags: readonly OrganTagId[];
  initialCapacity: number;
  substrateDirection: "high" | "low";
  detectionDirection: "high" | "low";
  routeAffinityTags: readonly string[];
  morphologyTags: readonly string[];
  allocationCosts: readonly [number, number, number];
  effects: Readonly<{
    substrateConversionMultiplier: number;
    routeRiskDelta: number;
    baseVesselCapacityBonus: number;
  }>;
}>;

export type ColonizationProgramDefinition = Readonly<{
  id: ColonizationProgramId;
  relationId: string;
  substrateDirection: "higher" | "lower" | "steady";
  detectionDirection: "higher" | "lower" | "steady";
  capacityDirection: "higher" | "lower" | "steady";
  effects: Readonly<{
    substrateConversionMultiplier: number;
    routeRiskDelta: number;
    vesselMaintenanceMultiplier: number;
    vesselCapacityBonus: number;
  }>;
}>;

export const ORGAN_TAG_CATALOG = Object.freeze([
  organTagId("hematopoietic"),
  organTagId("hepatic"),
  organTagId("pulmonary"),
  organTagId("neural"),
  organTagId("endocrine"),
  organTagId("serosal"),
] as const);

export const ORGAN_SITE_CATALOG: readonly OrganSiteDefinition[] = Object.freeze([
  Object.freeze({
    id: organSiteId("bone_marrow"),
    tags: Object.freeze([organTagId("hematopoietic")]),
    initialCapacity: 4,
    substrateDirection: "low",
    detectionDirection: "low",
    routeAffinityTags: Object.freeze(["marrow"]),
    morphologyTags: Object.freeze(["trabecular", "sinusoidal"]),
    allocationCosts: Object.freeze([2, 4, 7] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 0.92,
      routeRiskDelta: -0.04,
      baseVesselCapacityBonus: 1,
    }),
  }),
  Object.freeze({
    id: organSiteId("liver"),
    tags: Object.freeze([organTagId("hepatic")]),
    initialCapacity: 6,
    substrateDirection: "high",
    detectionDirection: "high",
    routeAffinityTags: Object.freeze(["portal"]),
    morphologyTags: Object.freeze(["lobular", "sinusoidal"]),
    allocationCosts: Object.freeze([2, 5, 8] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 1.12,
      routeRiskDelta: 0.06,
      baseVesselCapacityBonus: 1,
    }),
  }),
  Object.freeze({
    id: organSiteId("lung"),
    tags: Object.freeze([organTagId("pulmonary")]),
    initialCapacity: 6,
    substrateDirection: "high",
    detectionDirection: "high",
    routeAffinityTags: Object.freeze(["venous"]),
    morphologyTags: Object.freeze(["alveolar", "capillary"]),
    allocationCosts: Object.freeze([2, 5, 8] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 1.1,
      routeRiskDelta: 0.05,
      baseVesselCapacityBonus: 1,
    }),
  }),
  Object.freeze({
    id: organSiteId("brain"),
    tags: Object.freeze([organTagId("neural")]),
    initialCapacity: 3,
    substrateDirection: "low",
    detectionDirection: "low",
    routeAffinityTags: Object.freeze(["arterial"]),
    morphologyTags: Object.freeze(["neural", "perivascular"]),
    allocationCosts: Object.freeze([3, 6, 10] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 0.88,
      routeRiskDelta: -0.08,
      baseVesselCapacityBonus: 0,
    }),
  }),
  Object.freeze({
    id: organSiteId("adrenal"),
    tags: Object.freeze([organTagId("endocrine")]),
    initialCapacity: 3,
    substrateDirection: "low",
    detectionDirection: "low",
    routeAffinityTags: Object.freeze(["arterial"]),
    morphologyTags: Object.freeze(["endocrine", "vascular"]),
    allocationCosts: Object.freeze([3, 6, 10] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 0.9,
      routeRiskDelta: -0.06,
      baseVesselCapacityBonus: 0,
    }),
  }),
  Object.freeze({
    id: organSiteId("peritoneum"),
    tags: Object.freeze([organTagId("serosal")]),
    initialCapacity: 5,
    substrateDirection: "low",
    detectionDirection: "low",
    routeAffinityTags: Object.freeze(["serosal"]),
    morphologyTags: Object.freeze(["serosal", "fibrotic"]),
    allocationCosts: Object.freeze([2, 4, 7] as [number, number, number]),
    effects: Object.freeze({
      substrateConversionMultiplier: 0.96,
      routeRiskDelta: -0.03,
      baseVesselCapacityBonus: 1,
    }),
  }),
]);

export const COLONIZATION_PROGRAM_CATALOG: readonly ColonizationProgramDefinition[] = Object.freeze(
  [
    Object.freeze({
      id: colonizationProgramId("exploit_niche"),
      relationId: "substrate-yield-detection",
      substrateDirection: "higher",
      detectionDirection: "higher",
      capacityDirection: "higher",
      effects: Object.freeze({
        substrateConversionMultiplier: 1.2,
        routeRiskDelta: 0.08,
        vesselMaintenanceMultiplier: 1,
        vesselCapacityBonus: 1,
      }),
    }),
    Object.freeze({
      id: colonizationProgramId("occult_niche"),
      relationId: "immune-evasion-transit",
      substrateDirection: "lower",
      detectionDirection: "lower",
      capacityDirection: "lower",
      effects: Object.freeze({
        substrateConversionMultiplier: 0.86,
        routeRiskDelta: -0.1,
        vesselMaintenanceMultiplier: 1,
        vesselCapacityBonus: -1,
      }),
    }),
    Object.freeze({
      id: colonizationProgramId("remodel_niche"),
      relationId: "perfusion-capacity-upkeep",
      substrateDirection: "steady",
      detectionDirection: "steady",
      capacityDirection: "higher",
      effects: Object.freeze({
        substrateConversionMultiplier: 1,
        routeRiskDelta: 0,
        vesselMaintenanceMultiplier: 1.25,
        vesselCapacityBonus: 2,
      }),
    }),
  ],
);

export type RouteCompatibility = Readonly<{
  routeId: RouteId;
  destinationSiteIds: readonly OrganSiteId[];
}>;

/** Stable route compatibility; the reducer verifies this relation before resolving transit. */
export const ROUTE_COMPATIBILITY_CATALOG: readonly RouteCompatibility[] = Object.freeze([
  Object.freeze({
    routeId: routeId("venous-exit"),
    destinationSiteIds: Object.freeze([
      organSiteId("lung"),
      organSiteId("liver"),
      organSiteId("bone_marrow"),
    ]),
  }),
  Object.freeze({
    routeId: routeId("arterial-exit"),
    destinationSiteIds: Object.freeze([organSiteId("brain"), organSiteId("adrenal")]),
  }),
  Object.freeze({
    routeId: routeId("serosal-exit"),
    destinationSiteIds: Object.freeze([organSiteId("peritoneum")]),
  }),
]);

export function findOrganSite(siteId: OrganSiteId): OrganSiteDefinition | undefined {
  return ORGAN_SITE_CATALOG.find((site) => site.id === siteId);
}

export function findColonizationProgram(
  programId: ColonizationProgramId,
): ColonizationProgramDefinition | undefined {
  return COLONIZATION_PROGRAM_CATALOG.find((program) => program.id === programId);
}

export function isRouteCompatibleWithSite(route: RouteId, site: OrganSiteId): boolean {
  const compatibility = ROUTE_COMPATIBILITY_CATALOG.find(
    (candidate) => candidate.routeId === route,
  );
  return compatibility?.destinationSiteIds.includes(site) ?? false;
}

/** A local stage projection, deliberately distinct from durable organ history. */
export function seededRegionIdForTransit(transitEventId: string): RegionId {
  return regionId(`seeded-region-v1:${transitEventId}`);
}

export function canonicalOrganTags(tags: readonly OrganTagId[]): readonly OrganTagId[] {
  const selected = new Set(tags);
  return ORGAN_TAG_CATALOG.filter((tag) => selected.has(tag));
}
