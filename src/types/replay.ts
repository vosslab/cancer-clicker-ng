import type { GameEvent } from "./events.js";
import type { SerializedGameState } from "./save.js";

export const REPLAY_FORMAT_VERSION = 1 as const;

/** Identifies the executable semantics that produced a development replay trace. */
export type ReplaySource = Readonly<{
  formatVersion: typeof REPLAY_FORMAT_VERSION;
  progressionVersion: number;
  semanticRevision: string;
  sourceRevision: string;
}>;

/**
 * A deliberately small, DOM-free read model for replay equivalence and later
 * headless strategy consumers. Numeric formatting and layout stay in render.
 */
export type ReplayVisibleProgression = Readonly<{
  currentStageId: string;
  endingPhase: "unreached" | "reached";
  pendingProgression: readonly Readonly<{ kind: "stage" | "prestige"; id: string }>[];
  earnedPrestigeIds: readonly string[];
  activeHost: Readonly<{ hostRunId: string; cardId: string }> | null;
  pendingHostDraft: Readonly<{
    draftId: string;
    revealedCardIds: readonly string[];
    consumedCardIds: readonly string[];
  }> | null;
  culture: Readonly<{
    passages: number;
    purchasedUpgrades: readonly Readonly<{ upgradeId: string; rank: number }>[];
    cryobankProgramId: string | null;
    queuedProducerId: string | null;
  }>;
  network: Readonly<{
    globalTier: number;
    transmissionPressure: Readonly<{ mantissa: number; exponent: number }>;
    pendingFrontierId: string | null;
    activeMandateId: string | null;
    activeCampaignId: string | null;
    nodeStatuses: readonly Readonly<{ nodeId: string; status: "established" | "stable" }>[];
    edgeStatuses: readonly Readonly<{ edgeId: string; status: "committed" | "retired" }>[];
  }>;
}>;

export type ReplayOutcome = Readonly<{
  eventSequence: number;
  normalizedDurableState: SerializedGameState;
  visibleProgression: ReplayVisibleProgression;
}>;

export type ReplayEntry = Readonly<{
  recordedOffsetMs: number;
  event: GameEvent;
  outcome: ReplayOutcome;
}>;

/** A development-only semantic event trace; it is not a player save format. */
export type ReplayLog = Readonly<{
  source: ReplaySource;
  startedAtMs: number;
  seed: number;
  initialDurableState: SerializedGameState;
  entries: readonly ReplayEntry[];
}>;

export type ReplayRejectionCode =
  | "invalid-log"
  | "oversized-log"
  | "stale-trace"
  | "source-mismatch"
  | "seed-mismatch"
  | "invalid-initial-state"
  | "invalid-event"
  | "event-rejected"
  | "outcome-mismatch";

export type ReplayParseResult =
  | Readonly<{ kind: "accepted"; log: ReplayLog }>
  | Readonly<{
      kind: "rejected";
      code: ReplayRejectionCode;
      entryIndex?: number;
    }>;

export type ReplayResult =
  | Readonly<{
      kind: "replayed";
      finalState: SerializedGameState;
      finalVisibleProgression: ReplayVisibleProgression;
    }>
  | Readonly<{
      kind: "rejected";
      code: ReplayRejectionCode;
      entryIndex?: number;
    }>;
