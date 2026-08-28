# Game design

## Player loop

Cancer Clicker NG is an incremental cancer-biology game. The player directly activates visible
cancer-cell geometry to divide cells, then spends earned resources on producers, hallmarks, stage
progression, and the L1-L4 prestige systems. The 1280 x 800 board keeps the colony action at left,
the living tumor and progression world in the middle, and the always-upgradable Store at right.

The game makes biological state legible: growing colonies form tumors, acquire blood supply, show
hallmark-linked morphology, and eventually disseminate through a saved network. The interface keeps
future content visible with its biological unlock condition and lets player choices remain meaningful
after every new layer opens.

## Chicago scale culmination

The optional Chicago-scale presentation becomes available at `global_lab_contamination` after one
completed dissemination tier and `2.5e25` cells. Its catalog model declares `5.0e10 m3` of
high-rise volume at `2.0e-15 m3` per cell. This is a transparent scale model, not a measurement
claim about every building.

Opening the presentation is an explicit durable event. It records evidence, restores after reload,
and places `EndingView` above the live board. Cells, producer economics, offline accrual, direct
cell action, and network decisions continue unchanged. Before it opens, the board identifies the
remaining stage, dissemination, or modeled-cell-scale condition. Reduced-motion players receive the
same readable completed state without requiring an animation.

## Offline replay

### Player promise

On return, the game reports what the colony earned while away, whether the grant was capped, and
which progression decisions await an explicit player action. It never spends resources, chooses an
upgrade, advances a stage, or performs prestige on the player's behalf.

### Bounded economy

`src/state/offline.ts` owns absence orchestration and `src/economy/tick.ts` owns the shared live
and offline economy formula. Offline work uses 60,000 ms macro-steps, one positive remainder when
needed, and a seven-day maximum applied duration. It is not a `rate * elapsed` shortcut and never
iterates per millisecond.

| Constant            | Value            | Rule                                      |
| ------------------- | ---------------- | ----------------------------------------- |
| `OFFLINE_STEP_MS`   | `60_000` ms      | One minute per full macro-step.           |
| `MAX_OFFLINE_MS`    | `604_800_000` ms | Seven-day maximum economic absence grant. |
| `MAX_OFFLINE_STEPS` | `10_080`         | Exact maximum full-step count.            |

The controller validates these safe integral relations. It makes one call per full step, at most one
positive remainder call, and no calls for zero applied duration. A request above the cap runs the
bounded maximum and reports the cap visibly.

### Two clocks

The save envelope's `savedAtMs` is an injected wall-clock sample used only to measure absence. The
persisted `GameState.activeTimeMs` is the safe, nonnegative simulation clock for event timestamps,
stage transitions, cooldowns, and deadlines. Offline economics changes resources and eligibility
observations without advancing simulation time. Live ticking advances simulation time and evaluates
ordinary deadlines.

`deriveOfflineElapsed()` accepts safe wall-clock samples, returns a visible zero-duration
clock-skew result for future samples, and rejects invalid samples before adapter work. The
controller resaves valid completed handling with the sampled wall-clock value and preserves the
prior save for invalid clock input.

### Progression persistence

Gameplay writes V2/p8 saves. [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) is the authoritative
current migration contract. P7 Culture/Network input migrates its legacy `endingReached` field to
an unreached ending; migration never fabricates a reached Chicago-scale presentation.

Current writer revalidation gives a zero-notice reload and stable canonical serialization. This is
a persistence invariant, not a requirement that offline or development replay match serialized
bytes.

### Progression queue

The economy observes only identity-level stage and prestige eligibility. The state owner stamps
accepted observations at the current simulation time and appends them to the ordered durable queue.
The queue never performs stage or prestige actions automatically. Stage and prestige modules
revalidate an entry when the player acts and can show that it is no longer available.

## Verification ownership

| Evidence           | Owner and semantic result                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline behavior   | Domain-named Node/tsx tests cover clock inputs, bounded steps, partitions, queues, projection boundaries, atomic failures, and BigNum extremes. |
| Persistence        | `src/state/save_load.ts` and its tests cover supported migration, hostile structural rejection, and current writer revalidation.                |
| Development replay | `src/state/replay.ts` compares normalized durable state and visible progression; it is distinct from offline economy replay.                    |
| Browser behavior   | Production-dist Playwright covers actual controls, storage lifecycle, accessibility, reduced motion, and responsive layout.                     |

`./check_codebase.sh` is the canonical aggregate TypeScript gate. A production build, browser
capture, and visual inspection are one-time acceptance evidence when a UI change needs rendered
review. Calibration reports may measure approximation behavior and policy tradeoffs, but they do
not introduce a fixed percentage, rank, pixel, byte, or machine-timing gate.

## Durable ownership

- `src/economy/tick.ts` owns the shared economy formula.
- `src/state/offline.ts` owns bounded absence orchestration and return reporting data.
- `src/state/save_load.ts` owns current save lifecycle and migrations.
- `src/state/events.ts` owns accepted durable mutations.
- `src/render/game_controller.ts` owns storage-aware player intents and visible return handling.
- Stage and prestige modules own explicit progression action and revalidation.

Dated implementation history belongs in [CHANGELOG.md](CHANGELOG.md). Active follow-on work belongs
in `docs/active_plans/`.
