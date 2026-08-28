/** Identifiers remain distinct even though each is stored as a string. */
export type ProducerId = string & Readonly<{ readonly __brand: "ProducerId" }>;

export type HallmarkId = string & Readonly<{ readonly __brand: "HallmarkId" }>;

export type StageId = string & Readonly<{ readonly __brand: "StageId" }>;

export type PrestigeId = string & Readonly<{ readonly __brand: "PrestigeId" }>;

export type RegionId = string & Readonly<{ readonly __brand: "RegionId" }>;
export type OfferId = string & Readonly<{ readonly __brand: "OfferId" }>;
export type EventId = string & Readonly<{ readonly __brand: "EventId" }>;
export type RouteId = string & Readonly<{ readonly __brand: "RouteId" }>;
export type MutationId = string & Readonly<{ readonly __brand: "MutationId" }>;
export type ProgramOptionId = string & Readonly<{ readonly __brand: "ProgramOptionId" }>;
export type MicrobiomePoolId = string & Readonly<{ readonly __brand: "MicrobiomePoolId" }>;
export type LateProgramOptionId = string & Readonly<{ readonly __brand: "LateProgramOptionId" }>;
export type MicrobiomeCommunityId = string &
  Readonly<{ readonly __brand: "MicrobiomeCommunityId" }>;
export type MicrobiomeCompositionId = string &
  Readonly<{ readonly __brand: "MicrobiomeCompositionId" }>;
export type MicrobiomeNicheId = string & Readonly<{ readonly __brand: "MicrobiomeNicheId" }>;
export type MicrobiomeOfferId = string & Readonly<{ readonly __brand: "MicrobiomeOfferId" }>;
export type OrganSiteId = string & Readonly<{ readonly __brand: "OrganSiteId" }>;
export type OrganTagId = string & Readonly<{ readonly __brand: "OrganTagId" }>;
export type ColonizationProgramId = string &
  Readonly<{ readonly __brand: "ColonizationProgramId" }>;
export type LineageBoonId = string & Readonly<{ readonly __brand: "LineageBoonId" }>;
export type HostDraftId = string & Readonly<{ readonly __brand: "HostDraftId" }>;
export type HostCardId = string & Readonly<{ readonly __brand: "HostCardId" }>;
export type HostTraitId = string & Readonly<{ readonly __brand: "HostTraitId" }>;
export type HostRunId = string & Readonly<{ readonly __brand: "HostRunId" }>;
export type PassageUpgradeId = string & Readonly<{ readonly __brand: "PassageUpgradeId" }>;
export type CryobankProgramId = string & Readonly<{ readonly __brand: "CryobankProgramId" }>;
export type NetworkNodeId = string & Readonly<{ readonly __brand: "NetworkNodeId" }>;
export type NetworkEdgeId = string & Readonly<{ readonly __brand: "NetworkEdgeId" }>;
export type NetworkFrontierId = string & Readonly<{ readonly __brand: "NetworkFrontierId" }>;
export type DisseminationMandateId = string &
  Readonly<{ readonly __brand: "DisseminationMandateId" }>;
export type NetworkCampaignId = string & Readonly<{ readonly __brand: "NetworkCampaignId" }>;
