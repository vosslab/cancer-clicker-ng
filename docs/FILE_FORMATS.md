# File formats

This reference describes the JSON contracts that cross the browser-storage, development-replay,
and balance-laboratory boundaries. It is for maintainers who create a fixture, inspect a recovery
result, or review generated calibration evidence. The source parser remains authoritative for all
field-level validation.

## Browser save files

The browser stores one JSON document at the `cancer-clicker-ng.save.v2` key. Current writers emit
exactly this V2/p8 envelope:

```json
{
  "version": 2,
  "savedAtMs": 1724889600000,
  "progressionVersion": 8,
  "state": { "...": "current durable game state" }
}
```

| Field                | Contract                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`            | Envelope version. Current writers use the literal integer `2`.                                                                                 |
| `savedAtMs`          | Nonnegative safe integer timestamp supplied by the storage boundary.                                                                           |
| `progressionVersion` | Current durable-state schema. Writers use the literal integer `8`.                                                                             |
| `state`              | Exact current durable `GameState` DTO; its required keys, IDs, collections, and cross-field invariants are parsed in `src/state/save_load.ts`. |

`serializeGameState()` writes the envelope only after its encoded DTO round-trips through the same
strict parser without recovery notices. `parseSave()` treats storage as untrusted input, limits a
save to 250,000 bytes, copies only allowlisted own properties, and reports one of these outcomes:

- `absent` when the storage key has no value.
- `loaded` with the reconstructed current state and zero or more `field-defaulted` notices.
- `rejected` with a `save-rejected` notice and, for parsed raw input, the retained raw text.
- A storage read or write failure uses a `storage-error` notice.

The parser currently reads its defined V1 and V2/p1 through V2/p7 historical inputs only to migrate
them into V2/p8, then validates the result as a current state. Unknown or future versions reject.
Those reads are bounded migration behavior, not a promise of open-ended legacy compatibility. New
code should create and consume V2/p8 only. See [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) for
recovery behavior and the current state owner.

## Development replay logs

A replay log is a development diagnostic, not a player save or an offline-economy record. It
captures accepted reducer events and semantic outcomes under named executable revisions:

```json
{
  "source": {
    "formatVersion": 1,
    "progressionVersion": 8,
    "semanticRevision": "replay-semantics-v1",
    "sourceRevision": "local-build"
  },
  "startedAtMs": 1724889600000,
  "seed": 42,
  "initialDurableState": { "...": "normalized current state" },
  "entries": [
    {
      "recordedOffsetMs": 0,
      "event": { "type": "manual-division" },
      "outcome": {
        "eventSequence": 1,
        "normalizedDurableState": { "...": "state after the event" },
        "visibleProgression": { "...": "small DOM-free progression projection" }
      }
    }
  ]
}
```

`formatVersion` is currently `1`. `source` identifies the replay format, durable progression
version, semantic revision, and source revision. The parser requires exact plain-data records,
monotonic nonnegative offsets, an initial state's seed equal to the top-level `seed`, and at most
10,000 entries. Every event must pass the normal runtime-event parser.

The `outcome` records an event sequence, a normalized current durable state, and a deliberately
small visible-progression projection. The latter contains current stage and ending phase, pending
stage/prestige choices, earned prestige IDs, host-draft state, culture selections, and network
tiers/frontier/campaign/node/edge status. It deliberately excludes formatting and layout.

`replayLog()` re-enters the normal event parser and reducer for every entry. It compares semantic
state and visible progression structurally, not serialized bytes. A stale source, mismatched seed,
invalid event, rejected event, malformed state, or differing recorded outcome returns a typed
rejection code. The replay API does not persist logs or execute browser storage.

## Balance scenarios

Tracked balance inputs live under `tools/balance_scenarios/`. The development runner accepts one
scenario at a time and accepts only a `.json` path contained in that directory:

```json
{
  "formatVersion": 1,
  "id": "l1_route_tradeoffs_v1",
  "semanticRevision": "p8-visible-surface-v1",
  "curveRevision": "catalog-2026-08-28",
  "seeds": [0],
  "actionBudget": 12,
  "elapsedScheduleMs": [1000, 5000, 10000],
  "allowedKinds": ["divide", "producer", "hallmark", "stage", "prestige", "network", "allocation"],
  "initial": { "kind": "new-game" },
  "decisionWitness": {
    "system": "L1",
    "question": "Which visible route posture produces the better local outcome?",
    "alternatives": ["local growth", "stealth seeding"]
  }
}
```

| Field                                     | Contract                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `formatVersion`                           | Literal integer `1`.                                                                                                           |
| `id`, `semanticRevision`, `curveRevision` | Nonempty scenario provenance strings.                                                                                          |
| `seeds`                                   | Nonempty array of nonnegative safe integers.                                                                                   |
| `actionBudget`                            | Positive safe integer.                                                                                                         |
| `elapsedScheduleMs`                       | Array of nonnegative safe integers, cycled after each accepted action.                                                         |
| `allowedKinds`                            | Nonempty array drawn from the visible action kinds in the example.                                                             |
| `initial`                                 | `{ "kind": "new-game" }` or `{ "kind": "durable-snapshot", "state": ... }`; a snapshot must pass the current p8 save boundary. |
| `decisionWitness`                         | A bounded `L1`, `L2`, `L3`, `L4`, or `ending` question with an alternatives array.                                             |

The simulator selects from `projectVisibleDecisionSurface()`, parses each selected event, sends it
through the reducer, and advances time through the shared offline-economy adapter. It is a
deterministic review tool, not a player command, in-game bot, benchmark, or a substitute for human
balance judgment.

## Balance reports and generated outputs

The runner writes a machine-readable report below `output_balance/`; that directory is ignored by
Git. The default command is:

```bash
node --import tsx tools/balance_sim.mjs \
  --scenario tools/balance_scenarios/l1_route_tradeoffs_v1.json \
  --output output_balance/balance_report.json
```

The current report has `formatVersion: 1`, plus:

- `generatedBy`: tool path, Node version, input scenario ID, and semantic/curve revisions.
- `assumptions`: seeds, action budget, elapsed schedule, and visible-surface revision.
- `scenarios`: one result for the supplied scenario in the current command shape.
- `falsification`: named observations derived from that result, including whether selected
  decision witnesses were observed.

Each scenario result includes its `id`, `decisionWitness`, ranked per-profile/per-seed traces,
winner and runner-up profile IDs, and findings. A profile trace records its score dimensions and
aggregate, rank, selected visible action IDs/kinds/reasons, milestone timestamps, and terminal
visible progression. Findings flag observed dead action kinds, ties, unreachable gates, retained
network surface, and post-ending continuation. They are evidence to inspect, not pass/fail release
criteria or an instruction to tune toward a bot.

Generated reports are one-time calibration evidence. Keep the scenario input, command, and accepted
review together when making a tuning claim; permanent tests should continue to cover durable parser,
reducer, and replay behavior. [USAGE.md](USAGE.md) provides the maintained command entry point.

## Validation boundaries

- Run `./check_codebase.sh` for the canonical TypeScript, formatting, lint, and deterministic
  behavior gate.
- Run a balance scenario when reviewing its specific curve question; it creates an ignored report
  and does not belong in the permanent test suite.
- Use `parseSave()`, `parseNormalizedGameState()`, and `parseReplayLog()` rather than hand-rolling
  an import path for untrusted JSON. Their source contracts are the final authority when this page
  and implementation differ.
