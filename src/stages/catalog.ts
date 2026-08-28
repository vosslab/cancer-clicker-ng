import { producerId, stageId } from "../brands.js";
import { STAGE_IDS } from "../state/catalog.js";
import type { StageId } from "../types/ids.js";
import type { StageDefinition } from "./stage_types.js";

const DEFINITIONS = [
  {
    id: stageId("transformed_cell"),
    title: "Transformed cell",
    gate: { code: "manual-division", label: "Manual divisions", threshold: 1 },
    uiMode: "cell-focus",
    retires: "One cell is enough for every action.",
    gameplayIdentity: "Manual burst and cycle timing establish the first biomass loop.",
    pressure: "Manual-only scarcity.",
    opportunity: "Clicks create biomass and reveal signaling allocation.",
    operationalChange: {
      actionId: "manual-burst",
      availability: "available",
      summary: "Manual burst is the constrained source of early biomass.",
      feasibilityRule: "Manual division charge must reach one before colony growth is eligible.",
      economy: {
        productionMultiplier: 1,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 1,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("microcolony"),
    title: "Microcolony",
    gate: { code: "local-cluster", label: "Local cluster cells", threshold: 10 },
    uiMode: "colony-grid",
    retires: "All biomass comes from clicks.",
    gameplayIdentity: "Producer lanes and checkpoint choices compete for the first local cluster.",
    pressure: "Contact and nutrient pressure.",
    opportunity: "Producers occupy lanes and checkpoint routing opens a constrained lane.",
    operationalChange: {
      actionId: "producer-checkpoint",
      availability: "available",
      summary: "Producer lanes and checkpoint routing become feasible.",
      feasibilityRule: "At least one producer level is required to satisfy diffusion demand.",
      economy: {
        productionMultiplier: 1.05,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
  {
    id: stageId("avascular_lesion"),
    title: "Avascular lesion",
    gate: { code: "diffusion-demand", label: "Diffusion demand cells", threshold: 100 },
    uiMode: "resource-budget",
    retires: "One currency can buy every useful action.",
    gameplayIdentity: "Resource budgets make substrate and ATP feasibility compete.",
    pressure: "Oxygen deficit and damage events.",
    opportunity: "Substrate converts to ATP with competing sinks.",
    operationalChange: {
      actionId: "atp-budget",
      availability: "deferred",
      summary: "ATP budgeting is declared now and implemented with metabolism.",
      feasibilityRule: "ATP budget actions stay unavailable until their M11 owner lands.",
      economy: {
        productionMultiplier: 1.1,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("hypoxic_lesion"),
    title: "Hypoxic lesion",
    gate: { code: "persistent-hypoxia", label: "Oxygen pressure", threshold: 5 },
    uiMode: "region-map",
    retires: "Regions are interchangeable.",
    gameplayIdentity: "Regional viability makes perfusion and reserve targeted decisions.",
    pressure: "Hypoxia, necrosis risk, and division-limit warnings.",
    opportunity: "Vessel links and telomere reserve target individual regions.",
    operationalChange: {
      actionId: "regional-perfusion",
      availability: "available",
      summary: "Perfusion targets a region rather than a global scalar.",
      feasibilityRule: "A viable low-oxygen region is required for targeted perfusion.",
      economy: {
        productionMultiplier: 1.15,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
  {
    id: stageId("angiogenic_primary"),
    title: "Angiogenic primary",
    gate: { code: "viable-vessel", label: "Viable vessel links", threshold: 1 },
    uiMode: "vascular-overlay",
    retires: "Vessels are only survival repairs.",
    gameplayIdentity: "Vessel upkeep competes with concealment and route preparation.",
    pressure: "Immune recruitment and vessel upkeep.",
    opportunity: "Perfusion enables high-capacity regions and route discovery.",
    operationalChange: {
      actionId: "vessel-upkeep-concealment",
      availability: "deferred",
      summary: "Vessel upkeep versus concealment is reserved for its handler owner.",
      feasibilityRule: "A linked vessel makes upkeep versus concealment a declared future choice.",
      economy: {
        productionMultiplier: 1.2,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("invasive_carcinoma"),
    title: "Invasive carcinoma",
    gate: { code: "perfused-invasion", label: "Route discovery", threshold: 10 },
    uiMode: "route-board",
    retires: "More local mass is always best.",
    gameplayIdentity: "Deployable mass is committed between primary growth and invasive fronts.",
    pressure: "Transit loss and reduced primary biomass.",
    opportunity: "Commit parcels to local growth or invasive fronts.",
    operationalChange: {
      actionId: "route-commitment",
      availability: "available",
      summary: "Route commitment makes deployable mass a constrained choice.",
      feasibilityRule:
        "A perfused edge and route discovery are required before committing a route parcel.",
      economy: {
        productionMultiplier: 1.25,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
  {
    id: stageId("intravasation"),
    title: "Intravasation",
    gate: { code: "committed-transit", label: "Committed route cells", threshold: 1 },
    uiMode: "transit-panel",
    retires: "A route is a one-click payout.",
    gameplayIdentity:
      "Route fit, detection, and attrition become explicit feasibility constraints.",
    pressure: "Route-specific detection and attrition.",
    opportunity: "Select transit preparation by route.",
    operationalChange: {
      actionId: "transit-fit",
      availability: "deferred",
      summary: "Transit fit is declared before its route handler is implemented.",
      feasibilityRule:
        "Committed viable route parcels are required before transit preparation is offered.",
      economy: {
        productionMultiplier: 1.3,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("micrometastatic_seeding"),
    title: "Disseminated micrometastases",
    gate: { code: "seeded-destination", label: "Seeded destinations", threshold: 1 },
    uiMode: "site-switcher",
    retires: "One colony has one optimal phenotype.",
    gameplayIdentity: "Small sites compete for ATP and attention.",
    pressure: "Multiple small sites compete for ATP and attention.",
    opportunity: "Site-specific regions create future allocation choices.",
    operationalChange: {
      actionId: "site-allocation",
      availability: "deferred",
      summary: "Site allocation is declared before its allocation handler is implemented.",
      feasibilityRule: "At least one seeded site is required before site allocation is offered.",
      economy: {
        productionMultiplier: 1.35,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.8,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
  {
    id: stageId("metastatic_burden"),
    title: "Metastatic burden",
    gate: { code: "multisite-burden", label: "Multi-site burden", threshold: 2 },
    uiMode: "burden-dashboard",
    retires: "Every region should use the same upgrade posture.",
    gameplayIdentity: "Diverse site roles make phenotype allocation strategically relevant.",
    pressure: "System-wide immune and resource coupling.",
    opportunity: "Phenotypic plasticity can specialize sites.",
    operationalChange: {
      actionId: "phenotype-allocation",
      availability: "deferred",
      summary: "Phenotype allocation is declared before plasticity implements it.",
      feasibilityRule:
        "Two viable seeded sites are required before phenotype allocation is offered.",
      economy: {
        productionMultiplier: 1.4,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 0.7,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("host_collapse"),
    title: "Host collapse",
    gate: { code: "host-tolerance", label: "Host burden", threshold: 1_000 },
    uiMode: "collapse-summary",
    retires: "The host is an infinite substrate container.",
    gameplayIdentity:
      "Slow-payback host purchases lose feasibility as conversion preparation begins.",
    pressure: "Run termination is imminent.",
    opportunity: "Prepare the future L1 conversion without granting it.",
    operationalChange: {
      actionId: "host-conversion-preparation",
      availability: "deferred",
      summary: "Host purchases lose feasibility while future conversion is prepared.",
      feasibilityRule: "Host-only purchases are no longer feasible after collapse.",
      economy: {
        productionMultiplier: 1.45,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.7,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
  {
    id: stageId("immortalized_culture"),
    title: "Immortalized culture",
    gate: { code: "earned-immortalization", label: "Earned L3", threshold: 1 },
    uiMode: "culture-bench",
    retires: "Ending a host ends meaningful play.",
    gameplayIdentity: "Culture space, programs, and senescence replace host-stage pressure.",
    pressure: "Passage maintenance, culture space, and cooldowns.",
    opportunity: "Epigenetic and senescent management becomes available to its owners.",
    operationalChange: {
      actionId: "culture-program-space",
      availability: "deferred",
      summary: "Culture program and space decisions replace host-stage pressure.",
      feasibilityRule:
        "Earned L3 is required before culture program and space actions are offered.",
      economy: {
        productionMultiplier: 1.5,
        favoredProducerId: producerId("producer"),
        favoredProducerCostMultiplier: 0.7,
        favoredProducerRateMultiplier: 1,
      },
    },
  },
  {
    id: stageId("global_lab_contamination"),
    title: "Global lab contamination",
    gate: { code: "culture-dissemination", label: "Culture dissemination", threshold: 100 },
    uiMode: "contamination-network",
    retires: "A culture is a single isolated environment.",
    gameplayIdentity: "Node and community choices couple distant colonies.",
    pressure: "Network compatibility, node scaling, and community tradeoffs.",
    opportunity: "Microbiome niches and contamination nodes couple distant colonies.",
    operationalChange: {
      actionId: "contamination-node-community",
      availability: "deferred",
      summary: "Network node and community choices replace isolated culture play.",
      feasibilityRule:
        "Culture dissemination must reach the network threshold before node choices are offered.",
      economy: {
        productionMultiplier: 1.55,
        favoredProducerId: producerId("cdk4"),
        favoredProducerCostMultiplier: 0.7,
        favoredProducerRateMultiplier: 5,
      },
    },
  },
] as const satisfies readonly StageDefinition[];

export const STAGE_DEFINITIONS: readonly StageDefinition[] = DEFINITIONS;

/** M21 may tune inside these conservative provisional envelopes, never to non-finite economics. */
export const STAGE_ECONOMY_ENVELOPE = {
  productionMultiplier: { minimum: 1, maximum: 2 },
  favoredProducerCostMultiplier: { minimum: 0.5, maximum: 1 },
  favoredProducerRateMultiplier: { minimum: 1, maximum: 8 },
} as const;

function boundedFinite(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

/** Reject malformed or unbounded M9 economy data before either tick or quote code can consume it. */
export function assertStageEconomyCatalog(
  definitions: readonly StageDefinition[] = STAGE_DEFINITIONS,
): void {
  for (const definition of definitions) {
    const economy = definition.operationalChange.economy;
    if (
      !boundedFinite(
        economy.productionMultiplier,
        STAGE_ECONOMY_ENVELOPE.productionMultiplier.minimum,
        STAGE_ECONOMY_ENVELOPE.productionMultiplier.maximum,
      ) ||
      !boundedFinite(
        economy.favoredProducerCostMultiplier,
        STAGE_ECONOMY_ENVELOPE.favoredProducerCostMultiplier.minimum,
        STAGE_ECONOMY_ENVELOPE.favoredProducerCostMultiplier.maximum,
      ) ||
      !boundedFinite(
        economy.favoredProducerRateMultiplier,
        STAGE_ECONOMY_ENVELOPE.favoredProducerRateMultiplier.minimum,
        STAGE_ECONOMY_ENVELOPE.favoredProducerRateMultiplier.maximum,
      )
    )
      throw new Error(
        "Stage economy values must be finite and inside the M9 provisional envelope.",
      );
  }
  const transformed = definitions[0];
  if (
    !transformed ||
    transformed.id !== stageId("transformed_cell") ||
    transformed.operationalChange.economy.productionMultiplier !== 1 ||
    transformed.operationalChange.economy.favoredProducerCostMultiplier !== 1 ||
    transformed.operationalChange.economy.favoredProducerRateMultiplier !== 1
  )
    throw new Error("Transformed-cell M6 economy must remain neutral.");
}

function sameStageOrder(): boolean {
  return STAGE_DEFINITIONS.every((definition, index) => definition.id === STAGE_IDS[index]);
}

if (STAGE_DEFINITIONS.length !== STAGE_IDS.length || !sameStageOrder())
  throw new Error("Stage definitions must match the canonical stage registry exactly.");
assertStageEconomyCatalog();

export function stageDefinition(id: StageId): StageDefinition {
  const definition = STAGE_DEFINITIONS.find((candidate) => candidate.id === id);
  if (!definition) throw new Error("Unknown stage definition.");
  return definition;
}

export function stageDefinitionsInOrder(): readonly StageDefinition[] {
  return STAGE_DEFINITIONS;
}
