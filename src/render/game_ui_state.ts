import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import type { GameState } from "../types/state.js";

/** The six evolution tabs are UI navigation, never saved progression. */
export const EVOLUTION_TABS = [
  "stage",
  "hallmarks",
  "routes",
  "prestige",
  "culture",
  "network",
] as const;

export type EvolutionTab = (typeof EVOLUTION_TABS)[number];

function hasEarnedPrestige(game: GameState, id: "L1" | "L2" | "L3" | "L4"): boolean {
  return game.prestigeAvailability.some((entry) => entry.id === id && entry.status === "earned");
}

function ownsHallmark(game: GameState, id: string): boolean {
  return game.hallmarkLevels.some((level) => level.id === id && level.level > 0);
}

/** Shows a system only when the saved game contains a route into it; the opening stays teachable. */
export function visibleEvolutionTabs(game: GameState): readonly EvolutionTab[] {
  const tabs: EvolutionTab[] = ["stage", "hallmarks"];
  if (
    ownsHallmark(game, "invasion_metastasis") ||
    game.regions.some((region) => region.routeIds.length > 0) ||
    game.pendingTransitEvents.length > 0
  ) {
    tabs.push("routes");
  }
  if (game.prestigeAvailability.length > 0) tabs.push("prestige");
  if (hasEarnedPrestige(game, "L3") || game.culture.purchasedPassageUpgrades.length > 0) {
    tabs.push("culture");
  }
  if (hasEarnedPrestige(game, "L4") || game.lineageLedger.networkSeed !== null) {
    tabs.push("network");
  }
  return tabs;
}

/** A compact named fact displayed by the optional specimen inspector. */
export type InspectorDetail = Readonly<{
  label: string;
  value: string;
}>;

/**
 * Render-safe metadata for something the player can inspect. Domain modules own their own data;
 * callers adapt it to this deliberately small view contract.
 */
export type InspectableEntity = Readonly<{
  id: string;
  kind: string;
  title: string;
  summary: string;
  details?: readonly InspectorDetail[];
}>;

/** The narrow DOM capability needed to return keyboard focus after closing a drawer. */
export type FocusRestorationTarget = Readonly<{
  isConnected: boolean;
  focus: () => void;
}>;

export type InspectorDrawerState = Readonly<{
  isOpen: boolean;
  selectedEntity: InspectableEntity | undefined;
  invoker: FocusRestorationTarget | undefined;
}>;

export const TRANSIENT_FEEDBACK_TONES = ["neutral", "success", "warning"] as const;

export type TransientFeedbackTone = (typeof TRANSIENT_FEEDBACK_TONES)[number];

export type TransientFeedback = Readonly<{
  id: number;
  message: string;
  tone: TransientFeedbackTone;
  expiresAtMs: number;
}>;

export type TransientFeedbackDraft = Readonly<{
  message: string;
  tone?: TransientFeedbackTone;
  durationMs?: number;
}>;

export type UiClock = Readonly<{
  now: () => number;
}>;

export type GameUiStateOptions = Readonly<{
  initialEvolutionTab?: EvolutionTab;
  maxTransientFeedback?: number;
  defaultFeedbackDurationMs?: number;
  clock?: UiClock;
}>;

export type GameUiState = Readonly<{
  activeEvolutionTab: Accessor<EvolutionTab>;
  inspector: Accessor<InspectorDrawerState>;
  transientFeedback: Accessor<readonly TransientFeedback[]>;
  nextTransientFeedbackExpiry: Accessor<number | undefined>;
  setActiveEvolutionTab: (tab: EvolutionTab) => void;
  openInspector: (entity: InspectableEntity, invoker?: FocusRestorationTarget) => void;
  closeInspector: () => FocusRestorationTarget | undefined;
  pushTransientFeedback: (draft: TransientFeedbackDraft) => TransientFeedback;
  expireTransientFeedback: () => void;
}>;

const DEFAULT_MAX_TRANSIENT_FEEDBACK = 3;
const DEFAULT_FEEDBACK_DURATION_MS = 5_000;
const MAX_FEEDBACK_DURATION_MS = 30_000;
const MAX_FEEDBACK_MESSAGE_LENGTH = 160;

function clockNow(clock: UiClock): number {
  const now = clock.now();
  if (!Number.isSafeInteger(now) || now < 0)
    throw new Error("UI clock must return a safe timestamp.");
  return now;
}

function positiveInteger(value: number | undefined, fallback: number, label: string): number {
  const resolved = value ?? fallback;
  if (!Number.isSafeInteger(resolved) || resolved < 1)
    throw new Error(`${label} must be a positive safe integer.`);
  return resolved;
}

function feedbackMessage(value: string): string {
  const message = value.trim();
  if (message.length === 0) throw new Error("Transient feedback requires a message.");
  if (message.length > MAX_FEEDBACK_MESSAGE_LENGTH)
    throw new Error(
      `Transient feedback messages are limited to ${MAX_FEEDBACK_MESSAGE_LENGTH} characters.`,
    );
  return message;
}

function feedbackDuration(value: number | undefined, fallback: number): number {
  const duration = positiveInteger(value, fallback, "Transient feedback duration");
  if (duration > MAX_FEEDBACK_DURATION_MS)
    throw new Error(`Transient feedback duration cannot exceed ${MAX_FEEDBACK_DURATION_MS} ms.`);
  return duration;
}

function closedInspector(): InspectorDrawerState {
  return { isOpen: false, selectedEntity: undefined, invoker: undefined };
}

/**
 * Owns only short-lived client UI. GameController and GameState remain the durable game source.
 */
export function createGameUiState(options: GameUiStateOptions = {}): GameUiState {
  const maxTransientFeedback = positiveInteger(
    options.maxTransientFeedback,
    DEFAULT_MAX_TRANSIENT_FEEDBACK,
    "Maximum transient feedback",
  );
  const defaultFeedbackDurationMs = feedbackDuration(
    options.defaultFeedbackDurationMs,
    DEFAULT_FEEDBACK_DURATION_MS,
  );
  const clock = options.clock ?? { now: Date.now };
  const [activeEvolutionTab, setActiveEvolutionTab] = createSignal<EvolutionTab>(
    options.initialEvolutionTab ?? "stage",
  );
  const [inspector, setInspector] = createSignal<InspectorDrawerState>(closedInspector());
  const [transientFeedback, setTransientFeedback] = createSignal<readonly TransientFeedback[]>([]);
  function nextTransientFeedbackExpiry(): number | undefined {
    let earliest: number | undefined;
    for (const feedback of transientFeedback()) {
      if (earliest === undefined || feedback.expiresAtMs < earliest)
        earliest = feedback.expiresAtMs;
    }
    return earliest;
  }
  let nextFeedbackId = 1;

  function expireTransientFeedback(): void {
    const now = clockNow(clock);
    setTransientFeedback((current) => current.filter((feedback) => feedback.expiresAtMs > now));
  }

  function openInspector(entity: InspectableEntity, invoker?: FocusRestorationTarget): void {
    setInspector({ isOpen: true, selectedEntity: entity, invoker });
  }

  function closeInspector(): FocusRestorationTarget | undefined {
    const focusTarget = inspector().invoker;
    setInspector(closedInspector());
    return focusTarget;
  }

  function pushTransientFeedback(draft: TransientFeedbackDraft): TransientFeedback {
    const now = clockNow(clock);
    const durationMs = feedbackDuration(draft.durationMs, defaultFeedbackDurationMs);
    const feedback: TransientFeedback = {
      id: nextFeedbackId,
      message: feedbackMessage(draft.message),
      tone: draft.tone ?? "neutral",
      expiresAtMs: now + durationMs,
    };
    nextFeedbackId += 1;
    setTransientFeedback((current) => {
      const active = current.filter((item) => item.expiresAtMs > now);
      const bounded = [...active, feedback].slice(-maxTransientFeedback);
      return bounded;
    });
    return feedback;
  }

  return {
    activeEvolutionTab,
    inspector,
    transientFeedback,
    nextTransientFeedbackExpiry,
    setActiveEvolutionTab,
    openInspector,
    closeInspector,
    pushTransientFeedback,
    expireTransientFeedback,
  };
}
