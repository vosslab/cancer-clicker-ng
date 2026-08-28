import { createSignal } from "solid-js";
import type { Accessor } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

import { advanceLiveTick } from "../economy/tick.js";
import { producerDefinition } from "../economy/producers.js";
import { eligibleNextStage } from "../stages/gates.js";
import { assertStageTransition } from "../stages/transitions.js";
import { recordEvent } from "../state/events.js";
import { saveToStorage } from "../state/save_load.js";
import { parsePositiveCanonicalBigNumDto } from "../hallmarks/m11_types.js";
import type { StorageLike } from "../state/save_load.js";
import type { PurchaseQuantity } from "../economy/costs.js";
import type {
  EventId,
  HallmarkId,
  MutationId,
  OfferId,
  ProducerId,
  RegionId,
  RouteId,
} from "../types/ids.js";
import type { AtpSinkId, CanonicalBigNumDto } from "../hallmarks/m11_types.js";
import type { SaveNotice } from "../types/save.js";
import type {
  CheckpointId,
  GameState,
  RuntimeState,
  SignalingAllocation,
  TriageAction,
} from "../types/state.js";

export type ActiveClock = Readonly<{ now: () => number }>;
export type SaveClock = Readonly<{ now: () => number }>;
export type RecoveryBlockReason = "retained-unreadable" | "storage-read-failed";
export type PersistResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; notices: readonly SaveNotice[] }>;
export type PersistSnapshot = (state: GameState, savedAtMs: number) => PersistResult;
export type ApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      kind: "persistence" | "recovery-blocked";
      notices: readonly SaveNotice[];
    }>;
export type SpendTelomeraseCommand =
  | Readonly<{
      target: "refill-region";
      regionId: RegionId;
      charges: number;
    }>
  | Readonly<{
      target: "bank-reserve-floor";
      charges: number;
    }>;
export type GameController = Readonly<{
  game: GameState;
  saveError: Accessor<string | undefined>;
  recoveryBlocked: Accessor<boolean>;
  recoveryReason: Accessor<RecoveryBlockReason | undefined>;
  divide: () => ApplyResult;
  purchase: (producerId: ProducerId, quantity: PurchaseQuantity) => ApplyResult;
  purchaseHallmark: (hallmarkId: HallmarkId) => ApplyResult;
  setSignalingAllocation: (allocation: SignalingAllocation) => ApplyResult;
  selectCheckpoint: (checkpoint: CheckpointId) => ApplyResult;
  resolveTriage: (eventId: EventId, action: TriageAction) => ApplyResult;
  spendTelomerase: (command: SpendTelomeraseCommand) => ApplyResult;
  setVesselLink: (regionId: RegionId, linked: boolean) => ApplyResult;
  commitRoute: (routeId: RouteId, cells: number) => ApplyResult;
  setAtpBudget: (sink: AtpSinkId, amount: number) => ApplyResult;
  convertSubstrate: (amount: CanonicalBigNumDto) => ApplyResult;
  setRegionMask: (regionId: RegionId, masked: boolean) => ApplyResult;
  activateInflammation: (regionId: RegionId) => ApplyResult;
  selectMutation: (offerId: OfferId, mutationId: MutationId) => ApplyResult;
  advanceStage: () => ApplyResult;
  toggleNumberFormat: () => ApplyResult;
  tick: (runtime: RuntimeState) => RuntimeState;
  debugOrImportedEvent: (raw: unknown) => ApplyResult;
  persistSnapshot: (next: GameState) => ApplyResult;
  replaceUnreadableSave: () => ApplyResult;
}>;

const UNSAVED_MESSAGE = "Progress is not saved. Keep this tab open and try the action again.";
function recoveryBlockedMessage(reason: RecoveryBlockReason): string {
  return reason === "retained-unreadable"
    ? "Unreadable saved progress is protected until you confirm replacement."
    : "Saved progress could not be read, so this session is protected until you confirm replacement.";
}

/** Makes framework-free event and save calls from a fully isolated data tree. */
export function plainGameSnapshot(game: GameState): GameState {
  const snapshot = structuredClone(unwrap(game));
  return snapshot;
}

/** ASVS 14.3.3: the controller persists only local game progress through this adapter. */
export function persistWithStorage(storage: StorageLike): PersistSnapshot {
  function persist(state: GameState, savedAtMs: number): PersistResult {
    const notices = saveToStorage(storage, state, savedAtMs);
    const result: PersistResult = notices.length === 0 ? { ok: true } : { ok: false, notices };
    return result;
  }
  return persist;
}

function normalNow(clock: ActiveClock): number {
  const now = clock.now();
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Active clock is invalid.");
  return now;
}

/** M10 commands bind to durable simulation time, never a browser or wall-clock sample. */
function simulationNow(state: GameState): number {
  const now = state.activeTimeMs;
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("Simulation time is invalid.");
  return now;
}

/** ASVS 2.2.1: fail fast on impossible numeric control values; the parser stays authoritative. */
function positiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${label} is invalid.`);
}

function storageFailure(
  setSaveError: (value: string | undefined) => string | undefined,
  notices: readonly SaveNotice[],
): ApplyResult {
  setSaveError(UNSAVED_MESSAGE);
  const result: ApplyResult = { ok: false, kind: "persistence", notices };
  return result;
}

/** The only UI mutation boundary: parse/reduce, persist, then reconcile on success. */
export function createGameController(
  initial: GameState,
  activeClock: ActiveClock,
  saveClock: SaveClock,
  persist: PersistSnapshot,
  initialRecoveryReason?: RecoveryBlockReason,
): GameController {
  const [game, setGame] = createStore<GameState>(plainGameSnapshot(initial));
  const [saveError, setSaveError] = createSignal<string | undefined>(
    initialRecoveryReason === undefined ? undefined : recoveryBlockedMessage(initialRecoveryReason),
  );
  const [recoveryReason, setRecoveryReason] = createSignal<RecoveryBlockReason | undefined>(
    initialRecoveryReason,
  );
  const recoveryBlocked = (): boolean => recoveryReason() !== undefined;

  function recoveryBlock(): ApplyResult {
    const reason = recoveryReason();
    if (reason === undefined) throw new Error("Recovery protection is unavailable.");
    setSaveError(recoveryBlockedMessage(reason));
    return { ok: false, kind: "recovery-blocked", notices: [] };
  }

  function persistAccepted(next: GameState, allowRecoveryReplacement = false): ApplyResult {
    if (recoveryBlocked() && !allowRecoveryReplacement) return recoveryBlock();
    try {
      const write = persist(plainGameSnapshot(next), saveClock.now());
      if (!write.ok) return storageFailure(setSaveError, write.notices);
    } catch {
      return storageFailure(setSaveError, []);
    }
    setGame(reconcile(next));
    setSaveError(undefined);
    return { ok: true };
  }

  /** ASVS 2.2.1/15.3.5: untrusted events cross the exact runtime parser once. */
  function applyRawEvent(raw: unknown): ApplyResult {
    const next = recordEvent(plainGameSnapshot(game), raw);
    const result = persistAccepted(next);
    return result;
  }

  function divide(): ApplyResult {
    const result = applyRawEvent({ type: "click-divide", atMs: normalNow(activeClock) });
    return result;
  }

  function purchase(producerId: ProducerId, quantity: PurchaseQuantity): ApplyResult {
    producerDefinition(producerId);
    const result = applyRawEvent({
      type: "purchase-producer",
      producerId,
      quantity,
      atMs: normalNow(activeClock),
    });
    return result;
  }

  function purchaseHallmark(hallmarkId: HallmarkId): ApplyResult {
    const result = applyRawEvent({
      type: "purchase-hallmark",
      hallmarkId,
      atMs: simulationNow(game),
    });
    return result;
  }

  function setSignalingAllocation(allocation: SignalingAllocation): ApplyResult {
    const result = applyRawEvent({
      type: "set-signaling-allocation",
      allocation,
      atMs: simulationNow(game),
    });
    return result;
  }

  function selectCheckpoint(checkpoint: CheckpointId): ApplyResult {
    const result = applyRawEvent({
      type: "select-checkpoint",
      checkpoint,
      atMs: simulationNow(game),
    });
    return result;
  }

  function resolveTriage(eventId: EventId, action: TriageAction): ApplyResult {
    const result = applyRawEvent({
      type: "resolve-triage",
      eventId,
      action,
      atMs: simulationNow(game),
    });
    return result;
  }

  function spendTelomerase(command: SpendTelomeraseCommand): ApplyResult {
    positiveSafeInteger(command.charges, "Telomerase charges");
    const atMs = simulationNow(game);
    const raw =
      command.target === "refill-region"
        ? {
            type: "spend-telomerase" as const,
            target: command.target,
            regionId: command.regionId,
            charges: command.charges,
            atMs,
          }
        : {
            type: "spend-telomerase" as const,
            target: command.target,
            charges: command.charges,
            atMs,
          };
    const result = applyRawEvent(raw);
    return result;
  }

  function setVesselLink(regionId: RegionId, linked: boolean): ApplyResult {
    const result = applyRawEvent({
      type: "set-vessel-link",
      regionId,
      linked,
      atMs: simulationNow(game),
    });
    return result;
  }

  function commitRoute(routeId: RouteId, cells: number): ApplyResult {
    positiveSafeInteger(cells, "Route commitment");
    const result = applyRawEvent({
      type: "commit-route",
      routeId,
      cells,
      atMs: simulationNow(game),
    });
    return result;
  }

  function setAtpBudget(sink: AtpSinkId, amount: number): ApplyResult {
    if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("ATP budget is invalid.");
    return applyRawEvent({ type: "set-atp-budget", sink, amount, atMs: simulationNow(game) });
  }

  function convertSubstrate(amount: CanonicalBigNumDto): ApplyResult {
    const canonicalAmount = parsePositiveCanonicalBigNumDto(amount);
    return applyRawEvent({
      type: "convert-substrate",
      amount: canonicalAmount,
      atMs: simulationNow(game),
    });
  }

  function setRegionMask(regionId: RegionId, masked: boolean): ApplyResult {
    return applyRawEvent({ type: "set-region-mask", regionId, masked, atMs: simulationNow(game) });
  }

  function activateInflammation(regionId: RegionId): ApplyResult {
    return applyRawEvent({ type: "activate-inflammation", regionId, atMs: simulationNow(game) });
  }

  function selectMutation(offerId: OfferId, mutationId: MutationId): ApplyResult {
    return applyRawEvent({
      type: "select-mutation",
      offerId,
      mutationId,
      atMs: simulationNow(game),
    });
  }

  /** Stage advances remain explicit player events after the domain validates the semantic gate. */
  function advanceStage(): ApplyResult {
    const snapshot = plainGameSnapshot(game);
    const toStageId = eligibleNextStage(snapshot);
    if (toStageId === undefined) throw new Error("The next stage gate is not satisfied.");
    const atMs = normalNow(activeClock);
    assertStageTransition(snapshot, snapshot.currentStage, toStageId, atMs);
    const result = applyRawEvent({
      type: "advance-stage",
      fromStageId: snapshot.currentStage,
      toStageId,
      atMs,
    });
    return result;
  }

  function toggleNumberFormat(): ApplyResult {
    const numberFormat = game.numberFormat === "short" ? "full" : "short";
    const result = applyRawEvent({
      type: "set-number-format",
      numberFormat,
      atMs: normalNow(activeClock),
    });
    return result;
  }

  /** A live tick is persisted as a full accepted snapshot before the store changes. */
  function tick(runtime: RuntimeState): RuntimeState {
    if (recoveryBlocked()) {
      recoveryBlock();
      return runtime;
    }
    const advanced = advanceLiveTick(runtime, normalNow(activeClock));
    const result = persistAccepted(advanced.game);
    if (!result.ok) return runtime;
    return advanced;
  }

  function debugOrImportedEvent(raw: unknown): ApplyResult {
    const result = applyRawEvent(raw);
    return result;
  }

  /** Explicit recovery action: only a validated envelope may replace protected saved progress. */
  function replaceUnreadableSave(): ApplyResult {
    if (!recoveryBlocked()) return { ok: true };
    const result = persistAccepted(plainGameSnapshot(initial), true);
    if (!result.ok) return result;
    setRecoveryReason(undefined);
    return result;
  }

  return {
    game,
    saveError,
    recoveryBlocked,
    recoveryReason,
    divide,
    purchase,
    purchaseHallmark,
    setSignalingAllocation,
    selectCheckpoint,
    resolveTriage,
    spendTelomerase,
    setVesselLink,
    commitRoute,
    setAtpBudget,
    convertSubstrate,
    setRegionMask,
    activateInflammation,
    selectMutation,
    advanceStage,
    toggleNumberFormat,
    tick,
    debugOrImportedEvent,
    persistSnapshot: persistAccepted,
    replaceUnreadableSave,
  };
}
