import { For, createEffect, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import type { GameUiState } from "./game_ui_state.js";

export type FeedbackTimer = Readonly<{
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  cancel: (timer: ReturnType<typeof setTimeout>) => void;
}>;

type GameRewardDockProps = Readonly<{
  ui: GameUiState;
  timer?: FeedbackTimer;
}>;

function browserFeedbackTimer(): FeedbackTimer {
  return {
    now: () => Date.now(),
    schedule(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
      return globalThis.setTimeout(callback, delayMs);
    },
    cancel(timer: ReturnType<typeof setTimeout>): void {
      globalThis.clearTimeout(timer);
    },
  };
}

/** Schedules only the closest expiry; the owning Solid effect reschedules after every state update. */
export function scheduleTransientFeedbackExpiry(
  ui: GameUiState,
  timer: FeedbackTimer,
): (() => void) | undefined {
  const expiresAtMs = ui.nextTransientFeedbackExpiry();
  if (expiresAtMs === undefined) return undefined;
  const delayMs = Math.max(0, expiresAtMs - timer.now());
  const handle = timer.schedule(ui.expireTransientFeedback, delayMs);
  return function cancelTransientFeedbackExpiry(): void {
    timer.cancel(handle);
  };
}

/** Installs the disposable Solid lifecycle that removes expired presentation-only feedback. */
export function installTransientFeedbackExpiryLifecycle(
  ui: GameUiState,
  timer: FeedbackTimer,
): void {
  createEffect(() => {
    const cancel = scheduleTransientFeedbackExpiry(ui, timer);
    if (cancel !== undefined) onCleanup(cancel);
  });
}

/** Ephemeral visual confirmation; durable rewards remain exclusively in GameState. */
export function GameRewardDock(props: GameRewardDockProps): JSX.Element {
  const timer = props.timer ?? browserFeedbackTimer();
  installTransientFeedbackExpiryLifecycle(props.ui, timer);
  return (
    <div class="game-reward-dock" role="log" aria-live="polite" aria-label="Recent rewards">
      <For each={props.ui.transientFeedback()}>
        {(feedback) => (
          <output class={`game-reward-dock__item is-${feedback.tone}`}>{feedback.message}</output>
        )}
      </For>
    </div>
  );
}
