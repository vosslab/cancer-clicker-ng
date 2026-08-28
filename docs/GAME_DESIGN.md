# Game design

## Offline replay

### Player promise

When you return, the game shows what your colony earned while you were away, whether the
return was capped, and each progression decision waiting for you. It never spends resources,
chooses an upgrade, advances a stage, or resets prestige without an explicit player action.

### Bounded replay decision

M5 replays absence through one bounded, pure economy-tick seam. It is not a `rate * elapsed`
shortcut. The generic replay controller in `src/state/offline.ts` applies `60_000` ms macro-steps
and, when needed, one final positive remainder. It owns loop control, validation, durable
observation aggregation, final accounting, and report construction. It owns no economy formula.
The concrete production entry in `src/economy/offline.ts` binds that generic controller to
`applyEconomyTick` and `recordEvent`; normal economy offline replay therefore has the same formula
as live ticking and cannot substitute an independent production formula.

| Constant            | Value            | Rule                                        |
| ------------------- | ---------------- | ------------------------------------------- |
| `OFFLINE_STEP_MS`   | `60_000` ms      | One minute per full macro-step.             |
| `MAX_OFFLINE_MS`    | `604_800_000` ms | Seven-day maximum economic absence grant.   |
| `MAX_OFFLINE_STEPS` | `10_080`         | Exactly `MAX_OFFLINE_MS / OFFLINE_STEP_MS`. |

The controller validates all three constants as safe, integral values and proves their exact
relationship before replay. It makes exactly one adapter call per full step, at most one positive
remainder call, and no calls for an applied duration of zero. A request above the cap runs exactly
`10_080` full calls; it never iterates per millisecond.

### Two-clock contract

The save envelope's `savedAtMs` is an injected wall-clock sample used only to measure absence.
It is not simulation time and must never become an event timestamp or a deadline value. M5 adds
persisted `GameState.activeTimeMs`, a nonnegative safe integer simulation clock. All event
`atMs` values, `stageStartedAtMs`, cooldown and rotation deadlines, temporary-effect deadlines,
and future live-tick time comparisons use `activeTimeMs` only.

Offline economics advances resources and eligibility observations but never advances
`activeTimeMs`. Therefore every offline accounting event has
`accountedAtMs === inputState.activeTimeMs`, and dormant absolute-time fields remain exactly
unchanged. M6 live ticks advance `activeTimeMs` and evaluate deadlines in that single domain.

### Progression-schema migration

The envelope remains `version: 2`, but M6 defines `CURRENT_PROGRESSION_VERSION = 4` as the
only writer target. This deliberately does **not** redefine the already-accepted V2/p2 fixture:
that fixture predates the two M5 durable fields, while V2/p3 predates M6's complete producer
catalog. The parser accepts p1 through p4. It first validates the exact allowlisted legacy
envelope and structural core, then migrates p1/p2/p3 to p4 before strict current `STATE_KEYS`
parsing. P1/p2 add exactly `activeTimeMs: stageStartedAtMs` and `pendingProgression: []`; p3
preserves those M5 fields. Every legacy route canonicalizes known safe producer levels into the
exact eight-entry M6 catalog order, preserving known levels and filling only absent known IDs with
zero. If a valid `lastStageTransition` is present, its `atMs` is already equal to
`stageStartedAtMs`; using that same canonical stage time makes the new simulation clock monotonic
instead of silently rewinding old progress to zero.

V1 first takes the established initializer-based V1-to-p1 path, then the same bounded p1-to-p4
transform. P4 requires both `activeTimeMs` and `pendingProgression` structurally, plus exactly the
eight known unique safe producer levels in catalog order: these are not recoverable leaves.
Missing, malformed, non-safe `activeTimeMs`, malformed queue records, a sparse/extra/reordered or
unknown/duplicate/unsafe current producer array, an unknown future progression version, or a
malformed p1/p2/p3 structural core rejects the whole save. Every writer emits p4. The migration
oracle proves existing p2-to-p4, p1-to-p4, p3-to-p4, and V1-to-p4 outcomes, then an exact
canonical p4 round trip; hostile variants prove no future or malformed progression schema is
accepted.

P4 write and read behavior is intentionally symmetric. The serializer validates its encoded state
through the nonrecovering current parser, so it refuses anything that would later reject or need a
safe default. A successful write is consequently a zero-notice p4 reload and stable
reserialization, while malformed clocks, queue identities, BigNums, catalog arrays, optional
transition history, deadlines, and graph relations fail before storage.
That complete-envelope check includes the raw save-size limit, so even an otherwise valid dense
region-and-route graph cannot be written if the reader would reject it for exceeding 250,000
characters.

`src/state/offline.ts` exports this pure boundary; it reads no `Date.now`, DOM, timer, or storage:

```ts
export type OfflineElapsed =
  | Readonly<{ kind: "ready"; requestedElapsedMs: number }>
  | Readonly<{
      kind: "clock-skew";
      requestedElapsedMs: 0;
      notice: Readonly<{ code: "clock-skew"; savedAtMs: number; nowMs: number }>;
    }>
  | Readonly<{
      kind: "rejected";
      code: "invalid-saved-at" | "invalid-now-at";
    }>;

export function deriveOfflineElapsed(savedAtMs: number, nowMs: number): OfflineElapsed;
```

The helper accepts only nonnegative safe-integer samples. A valid future sample returns
`clock-skew`, zero requested duration, and its visible notice; it is not an error. Invalid,
fractional, non-finite, negative, or unsafe samples return `rejected` before subtraction or any
adapter call. A ready duration is the checked `nowMs - savedAtMs` and is itself a safe integer.

M7 owns lifecycle persistence: after every completed skew, zero, positive, or capped handling
path it resaves the resulting state with the sampled valid `nowMs` as envelope `savedAtMs`.
This consumes a future or excess wall interval once without granting it repeatedly. An invalid
`nowMs` preserves the prior save and renders the rejection visibly; it is never serialized.

### Shared tick seam

M5 defines these closed contracts. The implementation copies them into `src/state/offline.ts` or
one named M5-only type module without widening them. `Readonly` is the static consumer boundary;
the controller builds new arrays and records and never exposes a mutable accumulator. The trusted
tick implementation returns a resource projection and does not mutate its input.

```ts
import type { ApplyOfflineAccrualEvent } from "../types/events.js";
import type { BigNum } from "../types/bignum.js";
import type {
  GameState,
  PendingPrestigeEligibility,
  PendingProgression,
  PendingStageEligibility,
  TrackedResourceKey,
  TrackedResourceSnapshot,
} from "../types/state.js";

export type TickMode = "live" | "offline";
export type OfflineStepResult = Readonly<{
  resourceSnapshot: TrackedResourceSnapshot;
  stageEligibility: readonly PendingStageEligibility[];
  prestigeEligibility: readonly PendingPrestigeEligibility[];
}>;
export type EconomyTick = (
  state: GameState,
  elapsedMs: number,
  mode: TickMode,
) => OfflineStepResult;
```

M5 places these exact shared types in `src/types/state.ts`, before or alongside `GameState` and
without importing events, so `types/events.ts` can consume them without a cycle:

```ts
export type PendingStageEligibility = Readonly<{ kind: "stage"; id: StageId }>;
export type PendingPrestigeEligibility = Readonly<{ kind: "prestige"; id: PrestigeId }>;
export type PendingProgression =
  | Readonly<{ kind: "stage"; id: StageId; firstObservedAtActiveMs: number }>
  | Readonly<{ kind: "prestige"; id: PrestigeId; firstObservedAtActiveMs: number }>;
```

The tick returns identity-only observations. The controller, as the sole timestamp owner, turns
each accepted observation into its durable `PendingProgression` record at the unchanged input
`activeTimeMs`. `PendingProgression`, `BigNumGameStateKey`, `TRACKED_RESOURCE_KEYS`,
`TrackedResourceKey`, the exhaustive `ALL_BIG_NUM_RESOURCES_TRACKED` assertion, and the exact
`TrackedResourceSnapshot = Readonly<Record<TrackedResourceKey, BigNum>>` also live in
`src/types/state.ts`. The tuple is exhaustive, so a new BigNum-valued `GameState` field fails
compilation until the tuple changes. This static contract deliberately complements, but does not
replace, the runtime projection boundary below.

### Shared resource inventory

Immediately after the complete `GameState` declaration, `src/types/state.ts` defines the entire
M5 resource surface with this compile-shaped contract. The tuple is deliberately finite and its
current order is `cells`, `substrate`, then `atp`; replay, reports, and test fixtures iterate this
single canonical list.

```ts
export type BigNumKeys<T> = {
  [K in keyof T]: T[K] extends BigNum ? K : never;
}[keyof T];
export type BigNumGameStateKey = BigNumKeys<GameState>;

export const TRACKED_RESOURCE_KEYS = [
  "cells",
  "substrate",
  "atp",
] as const satisfies readonly BigNumGameStateKey[];
export type TrackedResourceKey = (typeof TRACKED_RESOURCE_KEYS)[number];
export type TrackedResourceSnapshot = Readonly<Record<TrackedResourceKey, BigNum>>;

type AllBigNumResourcesTrackedFor<T, Keys extends readonly PropertyKey[]> =
  Exclude<BigNumKeys<T>, Keys[number]> extends never
    ? Exclude<Keys[number], BigNumKeys<T>> extends never
      ? true
      : never
    : never;
type AllBigNumResourcesTracked = AllBigNumResourcesTrackedFor<
  GameState,
  typeof TRACKED_RESOURCE_KEYS
>;

export const ALL_BIG_NUM_RESOURCES_TRACKED: AllBigNumResourcesTracked = true;

type SyntheticLactateState = GameState & Readonly<{ lactate: BigNum }>;
// @ts-expect-error A new BigNum field must join TRACKED_RESOURCE_KEYS.
const SYNTHETIC_LACTATE_COVERAGE: AllBigNumResourcesTrackedFor<
  SyntheticLactateState,
  typeof TRACKED_RESOURCE_KEYS
> = true;
```

M5 adds compile-only negative probes that prove an object literal checked with `satisfies
TrackedResourceSnapshot` cannot omit `atp` or add `oxygenPressure`. Those are excess-property
checks on literals only: TypeScript structurally accepts a variable with every required key plus
an extra property. The generic synthetic-lactate `@ts-expect-error` probe proves the exhaustive
assertion fails if a new `BigNum`-valued state field lacks a tuple update. These probes enforce an
owned resource boundary; they do not assert a brittle resource count or exact runtime keys.

An `EconomyTick` receives the complete immutable `GameState`, duration, and mode, but can return
only the complete tracked-resource snapshot and observations. Before every overlay or final
event, the controller passes the adapter result through the named runtime
`projectExactTrackedResourceSnapshot`. It accepts only an ordinary own-data object with exactly
the `TRACKED_RESOURCE_KEYS` own string keys: no missing or extra keys, symbols, accessors,
prototype surprises, or reserved keys. For every tuple key, it verifies a canonical `BigNum` by
round-tripping its own data fields through the canonical constructor and requiring the same
canonical fields. The projector reconstructs a fresh `TrackedResourceSnapshot` by iterating and
copying `TRACKED_RESOURCE_KEYS`; it never spreads or otherwise carries an adapter object.

After every accepted macro-step, the controller overlays only that fresh projected snapshot onto
the prior working state. It never accepts, carries forward, or persists another tick write. The
final accrual event uses that same fresh snapshot and its queue additions on the original state.
An invalid, extra-key, accessor-backed, or missing-key adapter snapshot is `step-failed`: replay
returns the exact original state and calls no recorder. This shape makes the offline durable write
set a construction rule rather than a silent-discard convention.

M5's deterministic fixture implements `EconomyTick` only inside its test. M6 exports one
production `applyEconomyTick(state, elapsedMs, mode): OfflineStepResult` formula from
`src/economy/tick.ts`; both the live loop and `offline.ts` import that one formula. M6 owns the
audited live-tick boundary that applies its resource projection and advances `activeTimeMs`.
`offline.ts` contains no resource formula and never advances the clock.

`types/events.ts` gives the final event its compile-shaped, shared-type payload:

```ts
export type ApplyOfflineAccrualEvent = Readonly<{
  type: "apply-offline-accrual";
  elapsedMs: number;
  atMs: number;
  resourceSnapshot: TrackedResourceSnapshot;
  newlyObservedProgression: readonly PendingProgression[];
}>;
```

The mode preserves temporary-state freeze while retaining nonlinear production and acquired
effects. In offline mode, deadlines, cooldowns, rotation counters/deadlines, and temporary
effects do not tick. In live mode, M6 advances `activeTimeMs` and performs their ordinary
simulation-time behavior.

### Durable progression queue

M5 amends the V2 state schema with `GameState.pendingProgression: readonly PendingProgression[]`.
Its array order is the durable first-observed order. Identity is the closed `(kind, id)` pair:
two records deduplicate only when both members match. Each record retains its original
`firstObservedAtActiveMs`, which is exactly the current `activeTimeMs` when first observed.

The p4 parser accepts each variant only with exact own keys, its catalog-branded ID, and a safe
`firstObservedAtActiveMs` no later than the parsed state's `activeTimeMs`; it preserves queue
order while rejecting duplicate `(kind, id)` identities. A newly recorded addition must instead
have `firstObservedAtActiveMs === state.activeTimeMs`. The controller stamps that equality,
deduplicates by kind and ID, and preserves first-seen order; a stage and prestige record with the
same string spelling remain distinct.

For each successful macro-step, the controller first observes returned stage identities in array
order, then returned prestige identities in array order. It appends only identities absent from
the input queue and its current local additions. An observation remains queued even if it later
becomes ineligible; M9 or M13 revalidates it after the player's explicit action and presents a
visible no-longer-available outcome when appropriate. M5 never dispatches `advance-stage` or
`perform-prestige-reset`.

M5 schema ownership is explicit: amend `src/types/state.ts`, `src/state/game_state.ts`, and
`src/state/save_load.ts`, including strict parsing and serialization, V2 fixtures, and migration
tests. The exact M5 implementation files are `src/state/offline.ts`,
`src/render/offline_report.ts`, and `tests/test_offline_equivalence.mjs`. M9 and M13 own later
consumption/removal and revalidation after explicit player actions.

### Replay result and atomicity

`OfflineReplayResult` is a closed result rather than a throw-oriented public boundary. All
duration fields are safe nonnegative integers. `accountedAtMs` is validated as the input state's
`activeTimeMs`; it is never wall time.

```ts
export type OfflineNotice =
  | Readonly<{ code: "clock-skew"; savedAtMs: number; nowMs: number }>
  | Readonly<{ code: "offline-cap"; requestedElapsedMs: number; appliedElapsedMs: number }>;
export type OfflineErrorCode =
  | "invalid-saved-at"
  | "invalid-now-at"
  | "invalid-active-time"
  | "invalid-configuration"
  | "unsafe-total-offline"
  | "step-failed"
  | "delta-failed"
  | "accounting-failed";
export type OfflineResourceRecord = Readonly<{ before: BigNum; after: BigNum; delta: BigNum }>;
export type OfflineReplayReport = Readonly<{
  requestedElapsedMs: number;
  appliedElapsedMs: number;
  accountedAtMs: number;
  capped: boolean;
  executedSteps: number;
  notices: readonly OfflineNotice[];
  resources: Readonly<Record<TrackedResourceKey, OfflineResourceRecord>>;
  pendingProgression: readonly PendingProgression[];
  newlyObservedProgression: readonly PendingProgression[];
}>;
export type OfflineReplayResult =
  | Readonly<{
      kind: "applied";
      state: GameState;
      pendingProgression: readonly PendingProgression[];
      report: OfflineReplayReport;
    }>
  | Readonly<{
      kind: "rejected";
      state: GameState;
      code: OfflineErrorCode;
      appliedElapsedMs: 0;
      executedSteps: 0;
      pendingProgression: readonly [];
    }>;

export type OfflineAccrualRecorder = (
  state: GameState,
  event: ApplyOfflineAccrualEvent,
) => GameState;

export function replayOffline(
  state: GameState,
  elapsed: OfflineElapsed,
  tick: EconomyTick,
  recordAccrual: OfflineAccrualRecorder,
): OfflineReplayResult;
```

The controller validates elapsed, configuration, `activeTimeMs`, and
`input.totalOfflineMs + appliedElapsedMs` before the first tick. It retains only local resource
snapshots, observations, working overlays, and report data. Every positive step must succeed
before it constructs one final `apply-offline-accrual` event at `activeTimeMs` and passes that
event through M4's normal event funnel. The controller independently derives the authoritative
post-state with `recordEvent`. It gives each untrusted tick and recorder callback isolated state
and event copies. The recorder's returned value must descriptor-safely equal that trusted
post-state; replay returns the independently derived trusted state, never a callback-owned
object. If a tick, resource-delta calculation, queue construction, recorder comparison, or final
accounting event fails, it returns `rejected` with the exact input `state` object, its original
queue unchanged, zero accepted duration/steps, no report, no gains, and no accounting event. The
adapter must be tested with frozen input; it may not mutate a supplied state as an escape from
this atomic contract.

After validated canonical snapshots exist, report assembly is a total projection and is not an
invented failure path. BigNum failure evidence belongs before recording: a throwing tick yields
`step-failed`. The executable public-path `delta-failed` fixture uses canonical input resource
`bigNum(-9.999, Number.MAX_SAFE_INTEGER)` and a tick snapshot of
`bigNum(9.999, Number.MAX_SAFE_INTEGER)`. `subtract(after, before)` then requires normalized
exponent `Number.MAX_SAFE_INTEGER + 1` and throws `BigNum normalized exponent must be a safe
integer.` The controller catches that error before the recorder and returns the exact input state,
zero accepted steps/duration, and no report. This hostile signed fixture is boundary evidence,
not normal economy behavior. Neither failure path calls the recorder. The public `replayOffline`
signature has no defaults or module mocks: production passes `recordEvent`, while tests pass a
counting or throwing recorder.

Only a completed positive replay emits exactly one event:

```ts
{
  type: "apply-offline-accrual",
  elapsedMs: appliedElapsedMs,
  atMs: input.activeTimeMs,
  resourceSnapshot: exactTrackedResourceSnapshot,
  newlyObservedProgression: localQueueAdditions,
}
```

The event contains every and only tracked resource snapshot key plus **only** queue additions;
it never replaces an arbitrary pending queue. The runtime parser requires exact own data keys,
canonical BigNums, known `StageId`/`PrestigeId`, safe timestamps, and unique `(kind, id)` values.
The reducer requires `atMs === state.activeTimeMs`, requires each addition to be observed at that
same time, rejects an identity already queued or repeated in the event, and appends additions to
the unchanged old queue. It atomically writes the resource snapshot, additions,
`totalOfflineMs`, and one sequence increment. It deliberately validates the event boundary rather
than reimplementing M6's economy formula; controller/tick oracle evidence establishes formula
correctness. Zero and clock-skew outcomes are applied results with no tick and no accounting
event. The report retains the complete durable queue plus its additions, both in stable order.

### Return-report boundary

Reports contain canonical `BigNum` values, never formatted strings or `number` conversions. Each
tracked resource has before, after, and delta records. `src/render/offline_report.ts` exports only
this narrow renderer seam:

```ts
export type OfflineReportDocument = Pick<Document, "createElement">;
export function renderOfflineReport(
  report: OfflineReplayReport,
  document: OfflineReportDocument,
): HTMLElement;
```

It accepts no `GameState`, storage, callback, or controller. It uses normal elements and
`textContent` for dynamic values, creates no event handlers, and makes no save or replay call.
M7 connects accepted/rejected results to real accessible UI and persistence.

### Verification contract

`tests/test_offline_equivalence.mjs` is the M5 numerical and boundary oracle. It uses the exact
resource tuple and checks every member. The comparison is total for every
`TRACKED_RESOURCE_KEYS` member: if either expected or actual is zero, it requires exact canonical
equality, so an exactly-one-zero pair fails. Otherwise it uses BigNum operations only:

```ts
abs(actual - expected) <= max(abs(actual), abs(expected)) * 0.02;
```

Runs using the same partition algorithm require exact canonical equality for every tuple resource.
No tolerance predicate calls `toNumber`.

| Evidence            | Required proof                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clock helper        | `deriveOfflineElapsed` rejects invalid samples, returns visible zero skew, and never calls the adapter for either.                                                                                                                                                                                                                                                                                                                        |
| Count and remainder | `61_000` ms is one 60-second and one 1-second step; cap plus one step makes exactly 10,080 calls, one or no positive remainder call, and never a millisecond loop.                                                                                                                                                                                                                                                                        |
| Partitions          | Compare one N-hour replay with fixed short live partitions, irregular positive live partitions with the same sum, and the 61-second direct reference for every tuple resource. A threshold/remainder fixture covers both zero-to-nonzero and nonzero-to-zero mismatch directions, proving an exactly-one-zero resource cannot be omitted.                                                                                                 |
| Nonlinear fixture   | A deterministic fixture has a producer baseline, selected-mutation or hallmark multiplier, and threshold/step effect. Changing the effect changes a tracked resource; live and offline agree for both cases; `rate * elapsed` diverges enough to fail the oracle.                                                                                                                                                                         |
| Queue               | Repeated two identities plus a later identity prove stage-then-prestige, first-seen ordering, kind-plus-ID deduplication, persisted save/parse/reload survival, and no stage/prestige reducer event. Old queue timestamps must be safe and `<= activeTimeMs`; newly recorded additions must equal it.                                                                                                                                     |
| Freeze              | A fixture proves all deadline, cooldown, rotation, and `activeTimeMs` fields are bit-identical while a resource changes.                                                                                                                                                                                                                                                                                                                  |
| Migration           | Existing p2, p1, p3, and V1 saves each migrate once to canonical p4; p4 then round-trips exactly. Future progression versions, malformed legacy structural cores, unsafe active time, malformed queues, and noncanonical p4 producer arrays reject.                                                                                                                                                                                       |
| Projection boundary | A malicious or errant tick cannot modify a non-resource field by type or result shape. The named runtime projector rejects hostile extra-key, accessor-backed, and missing-key snapshots before any overlay or recorder call, then rebuilds a fresh tuple-indexed snapshot. Exact own-key stage/prestige observation records are parsed, then only controller-stamped durable additions and that complete snapshot reach the final event. |
| Event payload       | Exact payload keys, canonical snapshot BigNums, every tuple key once, current `atMs`, known IDs, safe old-queue timestamps, equal new-observation timestamps, no duplicate additions, and no already-queued identity are accepted only when valid; every hostile variant rejects before mutation.                                                                                                                                         |
| Atomic failure      | An adapter that succeeds then throws, returns hostile extra-key/accessor/missing-key snapshots, the exact signed delta-overflow fixture, and a throwing final recorder each return the original state and queue with no partial report, gains, or accounting event.                                                                                                                                                                       |
| Extremes            | Zero, a small positive, `9.999e3000`, and an exponent near the safe-integer representability boundary remain canonical or return the named error with no partial result.                                                                                                                                                                                                                                                                  |
| Renderer            | A Node structural spy implementing `OfflineReportDocument` proves text-only dynamic nodes, a throwing `innerHTML` setter is never reached, recorded `textContent`/tree callbacks are correct, and frozen input is not mutated. M7 owns real-browser accessibility proof.                                                                                                                                                                  |

M6 repeats the partition, mutation-sensitive, exhaustive-resource, and 10,080-step tests using
the real `applyEconomyTick` in both modes. Its report records measured benchmark evidence and a
repository-appropriate budget; M5 has no invented machine-time limit. M7 adds a committed,
production-dist Playwright test using real saved state. It proves grant, cap, clock-skew,
persisted queue, accessible report, reload/recovery, resave-at-now policy, and zero page or
console errors. The UI replays all valid offline elapsed time but shows a progress card only when
at least 1,000 ms was applied, preventing immediate reload noise while retaining zero-time skew
and cap notices. Its exact `?debug=1` acceptance hook temporarily backdates only the injected
`SaveClock` for a two-minute reload proof, persists through the controller, and restores the
normal clock without direct storage writes or game-state mutation.

### Ownership and exclusions

| Owner             | Artifact and success criterion                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| M5 state owner    | Schema amendment plus `offline.ts`, report renderer, and focused oracle; pure bounded replay is accepted before UI wiring. |
| M6 economy owner  | One `src/economy/tick.ts` export used by both live and offline callers; no second offline formula.                         |
| M7 UI owner       | Real storage/UI lifecycle, valid-now resave policy, and committed browser reload/recovery proof.                           |
| M9 and M13 owners | Explicit player-action queue consumption, revalidation, and stage/prestige behavior.                                       |

M5 adds no production formula, producer/cost curve, automatic selection, stage/prestige
application, reset reward, UI/storage mutation, replay log, or SVG shell behavior. Those remain
later milestones with their own validation gates.
