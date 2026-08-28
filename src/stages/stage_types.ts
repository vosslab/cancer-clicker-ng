import type { ProducerId, StageId } from "../types/ids.js";

/** The visible interaction model changes with a stage; it is never a CSS-only label. */
export type StageUiMode =
  | "cell-focus"
  | "colony-grid"
  | "resource-budget"
  | "region-map"
  | "vascular-overlay"
  | "route-board"
  | "transit-panel"
  | "site-switcher"
  | "burden-dashboard"
  | "collapse-summary"
  | "culture-bench"
  | "contamination-network";

export type StageGateCode =
  | "manual-division"
  | "local-cluster"
  | "diffusion-demand"
  | "persistent-hypoxia"
  | "viable-vessel"
  | "perfused-invasion"
  | "committed-transit"
  | "seeded-destination"
  | "multisite-burden"
  | "host-tolerance"
  | "earned-immortalization"
  | "culture-dissemination";

export type StageGate = Readonly<{
  code: StageGateCode;
  label: string;
  threshold: number;
}>;

/** A durable capability name that later mechanic owners consume instead of comparing stage IDs. */
export type StageActionId =
  | "manual-burst"
  | "producer-checkpoint"
  | "atp-budget"
  | "regional-perfusion"
  | "vessel-upkeep-concealment"
  | "route-commitment"
  | "transit-fit"
  | "site-allocation"
  | "phenotype-allocation"
  | "host-conversion-preparation"
  | "culture-program-space"
  | "contamination-node-community";

export type StageOperationalChange = Readonly<{
  actionId: StageActionId;
  availability: "available" | "deferred";
  summary: string;
  feasibilityRule: string;
  economy: Readonly<{
    productionMultiplier: number;
    favoredProducerId: ProducerId;
    favoredProducerCostMultiplier: number;
    favoredProducerRateMultiplier: number;
  }>;
}>;

export type StageDefinition = Readonly<{
  id: StageId;
  title: string;
  gate: StageGate;
  uiMode: StageUiMode;
  retires: string;
  gameplayIdentity: string;
  pressure: string;
  opportunity: string;
  operationalChange: StageOperationalChange;
}>;

export type StageGateResult = Readonly<{
  eligible: boolean;
  current: number;
  required: number;
  label: string;
}>;

export type StageTransitionProjection = Readonly<{
  currentStage: StageId;
  activeTimeMs: number;
  stageStartedAtMs: number;
  stageProgress: number;
  stageGateProgress: Readonly<Record<string, number>>;
  lastStageTransition: Readonly<{ from: StageId; to: StageId; atMs: number }>;
}>;
