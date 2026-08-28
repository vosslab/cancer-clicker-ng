import type { CanonicalBigNumDto } from "../../hallmarks/extended_hallmark_types.js";
import type { GameEvent } from "../../types/events.js";
import type { ReplayVisibleProgression } from "../../types/replay.js";

/** Stable, headless-safe projection contract for player-visible decisions. */
export type VisibleResource = "cells" | "substrate" | "atp" | "passages" | "pressure";
export type VisibleActionKind =
  "divide" | "producer" | "hallmark" | "stage" | "prestige" | "network" | "allocation";
export type VisibleBenefit = Readonly<{
  metric: "cells-per-second";
  value: CanonicalBigNumDto;
}>;
export type VisibleAction = Readonly<{
  id: string;
  kind: VisibleActionKind;
  event: GameEvent;
  displayedCost:
    Readonly<{ resource: VisibleResource; value: CanonicalBigNumDto | number }> | undefined;
  displayedBenefit: VisibleBenefit | undefined;
  summary: string;
  effectTags: readonly string[];
}>;
export type VisibleDecisionSurface = Readonly<{
  progression: ReplayVisibleProgression;
  displayedBalances: Readonly<Partial<Record<VisibleResource, CanonicalBigNumDto | number>>>;
  actions: readonly VisibleAction[];
}>;
