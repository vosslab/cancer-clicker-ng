import type { BigNum } from "./types/bignum.js";
import type {
  EventId,
  HallmarkId,
  LateProgramOptionId,
  MicrobiomeCommunityId,
  MicrobiomeCompositionId,
  MicrobiomeNicheId,
  MicrobiomeOfferId,
  MicrobiomePoolId,
  MutationId,
  OrganSiteId,
  OrganTagId,
  OfferId,
  PrestigeId,
  ProducerId,
  ProgramOptionId,
  RegionId,
  RouteId,
  StageId,
  ColonizationProgramId,
  LineageBoonId,
  HostDraftId,
  HostCardId,
  HostTraitId,
  HostRunId,
  PassageUpgradeId,
  CryobankProgramId,
  NetworkNodeId,
  NetworkEdgeId,
  NetworkFrontierId,
  DisseminationMandateId,
  NetworkCampaignId,
} from "./types/ids.js";

function requireIdentifier(value: string, label: string): string {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  return trimmedValue;
}

export function producerId(value: string): ProducerId {
  return requireIdentifier(value, "ProducerId") as ProducerId;
}

export function hallmarkId(value: string): HallmarkId {
  return requireIdentifier(value, "HallmarkId") as HallmarkId;
}

export function stageId(value: string): StageId {
  return requireIdentifier(value, "StageId") as StageId;
}

export function prestigeId(value: string): PrestigeId {
  return requireIdentifier(value, "PrestigeId") as PrestigeId;
}

export function regionId(value: string): RegionId {
  return requireIdentifier(value, "RegionId") as RegionId;
}
export function offerId(value: string): OfferId {
  return requireIdentifier(value, "OfferId") as OfferId;
}
export function eventId(value: string): EventId {
  return requireIdentifier(value, "EventId") as EventId;
}
export function routeId(value: string): RouteId {
  return requireIdentifier(value, "RouteId") as RouteId;
}
export function mutationId(value: string): MutationId {
  return requireIdentifier(value, "MutationId") as MutationId;
}
export function programOptionId(value: string): ProgramOptionId {
  return requireIdentifier(value, "ProgramOptionId") as ProgramOptionId;
}
export function microbiomePoolId(value: string): MicrobiomePoolId {
  return requireIdentifier(value, "MicrobiomePoolId") as MicrobiomePoolId;
}
export function lateProgramOptionId(value: string): LateProgramOptionId {
  return requireIdentifier(value, "LateProgramOptionId") as LateProgramOptionId;
}
export function microbiomeCommunityId(value: string): MicrobiomeCommunityId {
  return requireIdentifier(value, "MicrobiomeCommunityId") as MicrobiomeCommunityId;
}
export function microbiomeCompositionId(value: string): MicrobiomeCompositionId {
  return requireIdentifier(value, "MicrobiomeCompositionId") as MicrobiomeCompositionId;
}
export function microbiomeNicheId(value: string): MicrobiomeNicheId {
  return requireIdentifier(value, "MicrobiomeNicheId") as MicrobiomeNicheId;
}
export function microbiomeOfferId(value: string): MicrobiomeOfferId {
  return requireIdentifier(value, "MicrobiomeOfferId") as MicrobiomeOfferId;
}
export function organSiteId(value: string): OrganSiteId {
  return requireIdentifier(value, "OrganSiteId") as OrganSiteId;
}
export function organTagId(value: string): OrganTagId {
  return requireIdentifier(value, "OrganTagId") as OrganTagId;
}
export function colonizationProgramId(value: string): ColonizationProgramId {
  return requireIdentifier(value, "ColonizationProgramId") as ColonizationProgramId;
}
export function lineageBoonId(value: string): LineageBoonId {
  return requireIdentifier(value, "LineageBoonId") as LineageBoonId;
}
export function hostDraftId(value: string): HostDraftId {
  return requireIdentifier(value, "HostDraftId") as HostDraftId;
}
export function hostCardId(value: string): HostCardId {
  return requireIdentifier(value, "HostCardId") as HostCardId;
}
export function hostTraitId(value: string): HostTraitId {
  return requireIdentifier(value, "HostTraitId") as HostTraitId;
}
export function hostRunId(value: string): HostRunId {
  return requireIdentifier(value, "HostRunId") as HostRunId;
}
export function passageUpgradeId(value: string): PassageUpgradeId {
  return requireIdentifier(value, "PassageUpgradeId") as PassageUpgradeId;
}
export function cryobankProgramId(value: string): CryobankProgramId {
  return requireIdentifier(value, "CryobankProgramId") as CryobankProgramId;
}
export function networkNodeId(value: string): NetworkNodeId {
  return requireIdentifier(value, "NetworkNodeId") as NetworkNodeId;
}
export function networkEdgeId(value: string): NetworkEdgeId {
  return requireIdentifier(value, "NetworkEdgeId") as NetworkEdgeId;
}
export function networkFrontierId(value: string): NetworkFrontierId {
  return requireIdentifier(value, "NetworkFrontierId") as NetworkFrontierId;
}
export function disseminationMandateId(value: string): DisseminationMandateId {
  return requireIdentifier(value, "DisseminationMandateId") as DisseminationMandateId;
}
export function networkCampaignId(value: string): NetworkCampaignId {
  return requireIdentifier(value, "NetworkCampaignId") as NetworkCampaignId;
}

export function bigNum(mantissa: number, exponent: number): BigNum {
  if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)) {
    throw new Error("BigNum values must be finite.");
  }
  if (!Number.isSafeInteger(exponent)) {
    throw new Error("BigNum exponent must be a safe integer.");
  }
  if (mantissa === 0) {
    return { mantissa: 0, exponent: 0 } as BigNum;
  }

  const [normalizedMantissaText, exponentAdjustmentText] = mantissa.toExponential().split("e");
  if (normalizedMantissaText === undefined || exponentAdjustmentText === undefined) {
    throw new Error("BigNum normalization failed to produce scientific notation.");
  }

  const normalizedMantissa = Number(normalizedMantissaText);
  const exponentAdjustment = Number(exponentAdjustmentText);
  const normalizedExponent = exponent + exponentAdjustment;
  if (!Number.isSafeInteger(normalizedExponent)) {
    throw new Error("BigNum normalized exponent must be a safe integer.");
  }
  return {
    mantissa: normalizedMantissa,
    exponent: normalizedExponent,
  } as BigNum;
}
