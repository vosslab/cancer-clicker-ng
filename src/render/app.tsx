import { Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import type { JSX } from "solid-js";
import { browserStorage } from "../state/save_storage.js";
import { createInitialGameState } from "../state/game_state.js";
import { loadFromStorage } from "../state/save_load.js";
import type { StorageLike } from "../state/save_load.js";
import type { GameState, RuntimeState } from "../types/state.js";
import { ProducersPanel } from "./producers_panel.js";
import { HallmarkTree } from "./hallmark_tree.js";
import { ColonyPanel } from "./colony_panel.js";
import { StagePanel } from "./stage_panel.js";
import { TransitPanel } from "./transit_panel.js";
import { PrestigePanel } from "./prestige_panel.js";
import { CulturePanel } from "./culture_panel.js";
import { NetworkPanel } from "./network_panel.js";
import { EndingView } from "./ending_view.js";
import { GameShell } from "./shell.js";
import { createGameController, persistWithStorage } from "./game_controller.js";
import type {
  ActiveClock,
  PersistSnapshot,
  RecoveryBlockReason,
  SaveClock,
} from "./game_controller.js";
import { deriveOfflineElapsed } from "../state/offline.js";
import { replayEconomyOffline } from "../economy/offline.js";
import type { OfflineReplayReport } from "../state/offline.js";

type AppProps = Readonly<{
  activeClock?: ActiveClock;
  saveClock?: SaveClock;
  storage?: StorageLike;
  debug?: boolean;
}>;

function currentClock(): number {
  return Date.now();
}

type LoadedGame = Readonly<{
  game: GameState;
  savedAtMs?: number;
  recoveryReason?: RecoveryBlockReason;
}>;

function loadGame(storage: StorageLike | undefined): LoadedGame {
  if (!storage) return { game: createInitialGameState(), recoveryReason: "storage-read-failed" };
  const loaded = loadFromStorage(storage);
  if (loaded.status === "loaded")
    return {
      game: loaded.state,
      savedAtMs: loaded.savedAtMs,
      recoveryReason: undefined,
    };
  if (loaded.status === "absent")
    return { game: createInitialGameState(), recoveryReason: undefined };
  return {
    game: createInitialGameState(),
    recoveryReason:
      loaded.status === "rejected" && loaded.retainedRaw !== undefined
        ? "retained-unreadable"
        : "storage-read-failed",
  };
}

function storageAdapter(storage: StorageLike | undefined): PersistSnapshot {
  if (!storage) {
    return function unavailableStorage(): ReturnType<PersistSnapshot> {
      return { ok: false, notices: [] };
    };
  }
  return persistWithStorage(storage);
}

export function App(props: AppProps): JSX.Element {
  let debugOffsetMs = 0;
  let debugSavedAtMs: number | undefined;
  function offsetClock(): number {
    return currentClock() + debugOffsetMs;
  }
  const activeClock = props.activeClock ?? { now: offsetClock };
  const normalSaveClock = props.saveClock ?? { now: currentClock };
  function saveNow(): number {
    const savedAtMs = debugSavedAtMs ?? normalSaveClock.now();
    return savedAtMs;
  }
  const saveClock: SaveClock = { now: saveNow };
  const storage = props.storage ?? browserStorage();
  const loaded = loadGame(storage);
  const initial = loaded.game;
  let offlineState = initial;
  let offlineReport: OfflineReplayReport | undefined;
  if (loaded.recoveryReason === undefined && loaded.savedAtMs !== undefined) {
    const elapsed = deriveOfflineElapsed(loaded.savedAtMs, saveClock.now());
    const replay = replayEconomyOffline(offlineState, elapsed);
    if (replay.kind === "applied") {
      offlineState = replay.state;
      offlineReport = replay.report;
    }
  }
  const controller = createGameController(
    initial,
    activeClock,
    saveClock,
    storageAdapter(storage),
    loaded.recoveryReason,
  );
  if (offlineState !== initial) {
    const persistedOffline = controller.persistSnapshot(offlineState);
    if (!persistedOffline.ok) offlineReport = undefined;
  }
  const [showReversedProducers, setShowReversedProducers] = createSignal(false);
  const [showLifecycleProbe, setShowLifecycleProbe] = createSignal(true);
  const [cleanupCount, setCleanupCount] = createSignal(0);
  const [debugOutcome, setDebugOutcome] = createSignal("No debug event run.");
  const [endingFocusSourceEventSequence, setEndingFocusSourceEventSequence] = createSignal<
    number | undefined
  >(undefined);
  const saveStatus = createMemo(() =>
    controller.saveError() ? "Unsaved changes" : "Progress saved locally",
  );
  let runtime: RuntimeState = {
    game: controller.game,
    lastTickAtMs: activeClock.now(),
    pendingOfflineMs: 0,
    saveStatus: "idle",
  };
  let timer: ReturnType<typeof setInterval> | undefined;

  function divide(): void {
    controller.divide();
  }

  function replaceUnreadableSave(): void {
    controller.replaceUnreadableSave();
  }

  function replacementLabel(): string {
    return controller.recoveryReason() === "retained-unreadable"
      ? "Replace unreadable save and start fresh"
      : "Start fresh and replace saved progress";
  }

  function handlePurchase(
    id: Parameters<typeof controller.purchase>[0],
    quantity: Parameters<typeof controller.purchase>[1],
  ): void {
    controller.purchase(id, quantity);
  }

  function queueAssayPurchase(id: Parameters<typeof controller.queueAssayProducerAction>[0]): void {
    controller.queueAssayProducerAction(id);
  }

  function advanceStage(): void {
    controller.advanceStage();
  }

  function reachSoftEnding(): ReturnType<typeof controller.reachSoftEnding> {
    const result = controller.reachSoftEnding();
    if (result.ok && controller.game.ending.phase === "reached")
      setEndingFocusSourceEventSequence(controller.game.ending.sourceEventSequence);
    return result;
  }

  function advance(): void {
    runtime = { ...runtime, game: controller.game };
    runtime = controller.tick(runtime);
  }

  function fastForward(): void {
    debugOffsetMs += 60_000;
    advance();
  }

  /** Debug-only proof hook: persist through the controller with a known old save envelope. */
  function prepareOfflineReload(): void {
    try {
      const normalNow = normalSaveClock.now();
      if (!Number.isSafeInteger(normalNow) || normalNow < 120_000)
        throw new Error("Save clock cannot prepare an offline baseline.");
      debugSavedAtMs = normalNow - 120_000;
      const result = controller.persistSnapshot(controller.game);
      setDebugOutcome(
        result.ok
          ? "Prepared a 2-minute offline reload baseline."
          : "Could not prepare an offline reload baseline.",
      );
    } catch {
      setDebugOutcome("Could not prepare an offline reload baseline.");
    } finally {
      debugSavedAtMs = undefined;
    }
  }

  function visibleOfflineReport(): OfflineReplayReport | undefined {
    if (!offlineReport) return undefined;
    const meaningfulElapsed = offlineReport.appliedElapsedMs >= 1000;
    const hasSafetyNotice = offlineReport.notices.length > 0;
    return meaningfulElapsed || hasSafetyNotice ? offlineReport : undefined;
  }

  function runHostileDebugEvent(): void {
    try {
      controller.debugOrImportedEvent(Object.create(null));
      setDebugOutcome("Unexpectedly accepted hostile event.");
    } catch {
      setDebugOutcome("Hostile event rejected before storage.");
    }
  }

  /** Preserve the player-selected control while Solid moves keyed producer rows. */
  function reorderProducers(): void {
    const focused = document.activeElement;
    setShowReversedProducers((value) => !value);
    queueMicrotask(() => {
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
    });
  }

  function handleDebugKeydown(event: KeyboardEvent): void {
    if (props.debug && event.altKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      reorderProducers();
    }
  }

  onMount(() => {
    timer = setInterval(advance, 1000);
    if (props.debug) window.addEventListener("keydown", handleDebugKeydown);
    onCleanup(() => {
      if (timer !== undefined) clearInterval(timer);
      if (props.debug) window.removeEventListener("keydown", handleDebugKeydown);
    });
  });

  return (
    <GameShell>
      <header class="masthead">
        <p class="eyebrow">Clinical growth simulation</p>
        <h1 id="game-title">Cancer Clicker NG</h1>
        <p class="subtitle">One transformed cell. No exit interview.</p>
        <div class="status-strip">
          <p id="save-status" classList={{ "is-unsaved": Boolean(controller.saveError()) }}>
            {saveStatus()}
          </p>
          <button
            id="format-button"
            class="text-button"
            type="button"
            disabled={controller.recoveryBlocked()}
            onClick={() => controller.toggleNumberFormat()}
          >
            Use {controller.game.numberFormat === "short" ? "full" : "short"} names
          </button>
        </div>
      </header>
      <EndingView
        game={controller.game}
        disabled={controller.recoveryBlocked()}
        acceptedSourceEventSequence={endingFocusSourceEventSequence()}
        onAcceptedFocusHandled={() => setEndingFocusSourceEventSequence(undefined)}
        onReach={reachSoftEnding}
      />
      <section class="game-board" aria-label="Tumor growth board">
        <ColonyPanel
          game={controller.game}
          disabled={controller.recoveryBlocked()}
          onDivide={divide}
        />
        <section class="progression-rail" aria-label="Tumor progression">
          <StagePanel
            game={controller.game}
            disabled={controller.recoveryBlocked()}
            onAdvance={advanceStage}
          />
          <TransitPanel game={controller.game} controller={controller} />
          <HallmarkTree game={controller.game} controller={controller} />
          <PrestigePanel game={controller.game} controller={controller} />
          <CulturePanel game={controller.game} controller={controller} />
          <NetworkPanel game={controller.game} controller={controller} />
        </section>
        <aside class="store-rail" aria-label="Division apparatus store">
          <ProducersPanel
            game={controller.game}
            onPurchase={handlePurchase}
            onQueueAssay={queueAssayPurchase}
            reverse={showReversedProducers()}
            disabled={controller.recoveryBlocked()}
          />
        </aside>
      </section>
      <p id="game-status" class="sr-status" aria-live="polite">
        {controller.saveError() ?? "Ready to divide."}
      </p>
      <Show when={visibleOfflineReport()}>
        {(report) => (
          <section class="panel offline-panel" aria-labelledby="offline-title">
            <h2 id="offline-title">Offline progress</h2>
            <p>
              Applied {report().appliedElapsedMs} ms across {report().executedSteps} production
              steps.
            </p>
            <Show when={report().notices.length > 0}>
              <p>Clock skew or an offline cap was safely recorded.</p>
            </Show>
          </section>
        )}
      </Show>
      <Show when={controller.recoveryBlocked()}>
        <section id="recovery-notice" class="recovery-notice panel" role="alert">
          <h2>Saved progress needs your decision</h2>
          <p>
            {controller.recoveryReason() === "retained-unreadable"
              ? "The saved data could not be safely read. Its original bytes are protected, so this session cannot change or overwrite them automatically."
              : "Saved progress could not be read. This session cannot change or overwrite saved progress automatically."}
          </p>
          <button id="replace-unreadable-save" type="button" onClick={replaceUnreadableSave}>
            {replacementLabel()}
          </button>
        </section>
      </Show>
      <Show when={props.debug}>
        <section id="debug-controls" class="debug-panel" aria-label="Debug controls">
          <p>Debug clock controls are active for this local URL only.</p>
          <button id="debug-fast-forward" type="button" onClick={fastForward}>
            Fast-forward 60 seconds
          </button>
          <button id="debug-prepare-offline-reload" type="button" onClick={prepareOfflineReload}>
            Prepare 2-minute offline reload
          </button>
          <button id="debug-reverse-producers" type="button" onClick={reorderProducers}>
            Reverse producer order
          </button>
          <button
            id="debug-toggle-lifecycle"
            type="button"
            onClick={() => setShowLifecycleProbe((value) => !value)}
          >
            Toggle lifecycle probe
          </button>
          <button id="debug-hostile-event" type="button" onClick={runHostileDebugEvent}>
            Run hostile event check
          </button>
          <Show when={showLifecycleProbe()}>
            <LifecycleProbe onCleanup={() => setCleanupCount((value) => value + 1)} />
          </Show>
          <p id="debug-cleanup-count">Lifecycle cleanups: {cleanupCount()}</p>
          <p id="debug-outcome" role="status">
            {debugOutcome()}
          </p>
        </section>
      </Show>
    </GameShell>
  );
}

function LifecycleProbe(props: Readonly<{ onCleanup: () => void }>): JSX.Element {
  onCleanup(props.onCleanup);
  return <p id="debug-lifecycle-probe">Lifecycle probe mounted.</p>;
}
