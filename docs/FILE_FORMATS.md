# File formats

This reference covers the JSON contracts crossing browser storage, development semantic replay, and
the balance laboratory. Source parsers remain authoritative for exact field validation.

## Browser save files

The browser stores one JSON document at `cancer-clicker-ng.save.v2`. The only accepted envelope is
the current format:

```json
{
  "version": 2,
  "savedAtMs": 1724889600000,
  "stateSchemaVersion": 8,
  "state": { "...": "complete current durable game state" }
}
```

| Field                | Contract                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `version`            | Literal integer `2`.                                                                                                               |
| `savedAtMs`          | Nonnegative safe integer supplied by the storage boundary.                                                                         |
| `stateSchemaVersion` | Literal integer `8`.                                                                                                               |
| `state`              | Exact current `GameState` DTO. Required keys, IDs, collections, and cross-field invariants are parsed in `src/state/save_load.ts`. |

`serializeGameState()` writes only after its encoded state round-trips through the same strict
parser. `parseSave()` limits raw input to 250,000 bytes, requires exact own keys, and accepts a
complete current state or rejects it. It reports `absent`, `loaded`, or `rejected`; rejection uses a
`save-rejected` or `storage-error` notice. Parsed rejected text is retained for protected recovery.
No migration, default injection, or partial field repair participates in the current format.

## Protected storage recovery

A missing key starts fresh. A malformed value or failed storage read enters recovery protection and
leaves stored progress untouched. The recovery interface offers an explicit fresh replacement; it
writes a newly created format-2/schema-8 save through the validated writer. Normal game actions,
offline handling, and failed writes preserve the protected state. See
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) for the player-facing flow and owners.

## Development replay logs

A replay log is a development diagnostic, not a player save or offline-economy record. It records
accepted reducer events and semantic outcomes under the current executable schema:

```json
{
  "source": {
    "formatVersion": 1,
    "stateSchemaVersion": 8,
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
        "visibleProgression": { "...": "DOM-free progression projection" }
      }
    }
  ]
}
```

`formatVersion` is `1`. `source` names the trace format, current durable schema, semantic revision,
and source revision. The parser requires exact plain-data records, monotonic nonnegative offsets, a
seed matching the initial state, and at most 10,000 entries. The initial state and every event pass
the normal current-state and runtime-event boundaries.

Each outcome includes the event sequence, normalized current durable state, and visible progression:
current stage and ending phase; pending stage and prestige choices; earned prestige; host draft;
culture selections; and network tier, frontier, campaign, node, and edge status. Layout and number
formatting stay outside the log. `replayLog()` compares semantic data structurally and reports typed
rejections for stale traces, source mismatch, malformed input, event rejection, or altered outcomes.

## Balance scenarios

Tracked balance inputs live under `tools/balance_scenarios/`. A scenario declares one bounded
calibration question:

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

| Field                                     | Contract                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------- |
| `formatVersion`                           | Literal integer `1`.                                                             |
| `id`, `semanticRevision`, `curveRevision` | Nonempty provenance strings.                                                     |
| `seeds`                                   | Nonempty array of nonnegative safe integers.                                     |
| `actionBudget`                            | Positive safe integer.                                                           |
| `elapsedScheduleMs`                       | Nonnegative safe integers, cycled after accepted actions.                        |
| `allowedKinds`                            | Nonempty subset of visible action kinds.                                         |
| `initial`                                 | A new game or a durable snapshot passing the current format-2/schema-8 boundary. |
| `decisionWitness`                         | A bounded L1, L2, L3, L4, or ending question with alternatives.                  |

The runner projects `projectVisibleDecisionSurface()`, chooses only displayed actions, validates each
through the event parser and reducer, and advances time through the shared offline-economy adapter.
`greedy-payback` ranks a producer by its displayed cells cost divided by its authoritative displayed
marginal `+cells/s` benefit; the Store shows that same quote. It is deterministic development
evidence, never an in-game bot or a substitute for human balance judgment. `docs/BALANCE.md` owns
the policy contract and command guidance.

## Balance reports and validation

Reports are generated below ignored `output_balance/`. With no selector, the tool runs its default
suite: five tracked scenarios times five canonical policies. It writes one aggregate format-2
report; a `--scenario` command writes one focused format-2 report:

```bash
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

The report contains tool/input provenance, policy catalog, scenario assumptions and witnesses,
per-policy traces, completions, outliers, and falsification observations. Generated reports are
one-time calibration evidence. Keep the input scenario, command, accepted review, and a written
conclusion together when tuning. Permanent tests cover parser, reducer, and replay behavior rather
than a preferred bot rank or generated report.

Run `./check_codebase.sh` for the canonical TypeScript and deterministic behavior gate. Use
`parseSave()`, `parseNormalizedGameState()`, and `parseReplayLog()` rather than a hand-written
untrusted JSON importer.
