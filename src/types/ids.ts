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
