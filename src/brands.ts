import type { BigNum } from "./types/bignum.js";
import type {
  EventId,
  HallmarkId,
  MicrobiomePoolId,
  MutationId,
  OfferId,
  PrestigeId,
  ProducerId,
  ProgramOptionId,
  RegionId,
  RouteId,
  StageId,
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
