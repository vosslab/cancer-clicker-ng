# State persistence

## Purpose and owner

The browser-local save boundary preserves anonymous game progress. `src/state/game_state.ts`
creates defaults, `src/state/save_load.ts` owns serialization and storage, and
`src/state/events.ts` owns durable mutation. The UI supplies typed intent through the
controller; it neither reconstructs saved state nor writes it directly.

The feature stores no account, credential, payment, personal, or clinical data. Browser storage is
untrusted input, including when the game previously wrote it.

## Versions and outcomes

| Input                                      | Result                                                                                   |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Valid V2/p8 envelope and state             | Reconstruct the current canonical `GameState`.                                           |
| Valid supported legacy input               | Apply its bounded migration, then validate the resulting p8 state.                       |
| Unknown version or invalid structural core | Reject, retain raw text, and return one generic `save-rejected` notice.                  |
| Recoverable current leaf                   | Preserve independent siblings, use its documented default, and return `field-defaulted`. |

The envelope version remains V2. `CURRENT_PROGRESSION_VERSION` is 8, and V2/p8 is the only writer
shape. V1 and V2/p1 through p7 are read-and-migrate inputs only; each is accepted only where its
specific migration can establish the current structural contract. Unknown future versions reject.

P6 migration initializes the Culture and Network aggregates required by their later contracts. P7
is the strict legacy Culture/Network shape: it carries `endingReached: boolean`. P7-to-p8 creates
`ending: { phase: "unreached" }` for every accepted input. It never invents evidence that a player
reached the optional Chicago presentation. `endingReached` belongs solely to that bounded legacy
migration, never to a current `GameState`.

The writer and current reader form one closed boundary. Before storage, the writer validates its
encoded p8 data through the strict current parser. A successful write therefore reloads with no
recovery notices. This is a serialization invariant, not a replay or player-facing byte-equality
requirement. The writer also applies the raw-size limit, so an otherwise valid dense graph cannot
create an unreadable browser save.

## Reconstruction policy

`parseSave` validates the versioned envelope before it copies allowlisted own properties into a
fresh state. It never spreads an untrusted record. `STATE_KEYS` is checked against `keyof
GameState`, so a durable field change requires parser and writer ownership at TypeScript compile
time.

Current p8 reads require the structural core: safe progression and simulation counters, catalog
identities, canonical BigNums, ordered unique producer levels, complete Culture and Network
relations, and a valid `SoftEndingState`. A reached ending contains safe active-time and event
sequence evidence plus canonical cells and the reached network tier. An unreached ending contains
only its phase. Malformed structural data rejects instead of manufacturing simulation history.

Recoverable leaves are local data that can safely return to their initial-state value, including
documented scalar, BigNum, collection, and selected nested leaves. A recovery is visible through
`field-defaulted` and preserves unrelated state. Structural invalidity rejects: malformed
envelopes, unknown or reserved keys, unsafe counters, noncanonical BigNums, duplicate durable
identities, oversized input, or broken graph relations would otherwise make later reduction and
semantic replay ambiguous.

`lastStageTransition` is optional. A malformed transition is omitted with one recovery notice;
the current stage remains authoritative. A malformed optional region senescence reference removes
only its dependent clearance edge.

## Data integrity rules

The parser accepts ordinary JSON records with exact enumerable keys. It rejects inherited,
accessor, symbol, and reserved-key data; bounds raw input at 250,000 characters and collections at
`MAX_COLLECTION`; and accepts safe numeric counters and canonical serialized BigNums only.

The persisted graph maintains these relations:

- Durable `EventId` values remain globally unique.
- Region and route references point to surviving owned records.
- Program, mutation-offer, microbiome, clearance, Culture, and Network selections remain
  internally consistent with their saved pools, plans, and queues.
- Network frontier, active campaign, and completed campaigns retain source tuples and exact
  generated topology, so parser validation can reject dangling, duplicate, or forged relations.
- A reached ending remains evidence for the accepted reach event; it never changes economy,
  producer, or prestige balances.

## Event funnel

Every durable mutation enters `recordEvent` in `src/state/events.ts` as `unknown` input.
`src/state/event_parse.ts` rebuilds an exact plain discriminated record before
`src/state/events.ts` reduces it immutably. Unknown discriminants or keys, inherited
data, accessors, invalid payloads, unsafe timestamps, and invalid identifiers fail before state or
`eventSequence` changes. Accepted events increment the sequence once; rejected events are atomic.

`reach-soft-ending` is one parsed, reducer-recorded event. It records the optional Chicago-scale
presentation only after its stage, network-tier, and cell-scale conditions are true. The controller
routes its intent through persistence before reconciliation, so a reached presentation always has
the same durable event funnel as any other player action. Direct cancer-cell play, producer
economics, offline accrual, and network decisions continue afterward.

`apply-offline-accrual` remains the single recorded offline resource mutation. Its exact payload
holds bounded elapsed time, the current simulation timestamp, a canonical resource snapshot, and
new queue additions. The controller constructs a resource-only projection, and the reducer guards
the trusted event boundary.

## Browser storage flow

`SAVE_KEY` is `cancer-clicker-ng.save.v2`. `loadFromStorage` returns `absent` without a notice for
a missing key, parser output for present text, and a generic `storage-error` notice for read
failure. `saveToStorage` is the sole write boundary and returns no notices on success.

Rejected input retains raw text for an intentional recovery flow. A parse-rejected payload and a
storage read failure remain distinct visible conditions. The UI starts fresh only through the same
validated persistence boundary.

## Semantic replay and evidence

`src/state/replay.ts` and `src/types/replay.ts` own a development-only `ReplayLog`. Its recorder
observes only an event that the controller has already persisted and
reconciled. A diagnostic observer cannot turn that successful player action into a failure.

The hostile-log parser bounds and validates plain data, re-enters `parseRuntimeEvent()` and
`recordEvent()`, and compares normalized durable state plus visible progression. It is not a public
save, transport, or wire format. Replay therefore proves semantic behavior without requiring
serialized-byte equality, visual pixel equality, or a timing threshold.

Focused domain-named Node/tsx tests exercise migrations, hostile saves, event atomicity, soft-ending
evidence, prestige persistence, and semantic replay. `./check_codebase.sh` is the canonical
aggregate TypeScript gate. Production build/browser capture and visual inspection are separately
named one-time acceptance evidence when a UI change needs it.

## Durable ownership

- `src/state/save_load.ts` owns progression versions, parsing, migration, serialization, and
  browser storage.
- `src/types/state.ts` owns the current `GameState` and `SoftEndingState` shape.
- `src/state/events.ts` and `src/state/event_parse.ts` own durable event acceptance.
- `src/state/replay.ts` and `src/types/replay.ts` own development semantic replay.
- Future balance calibration owns dated policy-comparison evidence, not persistence or replay
  acceptance rules.

Future durable-state changes update these owners, their focused behavioral tests, and the TypeScript
checks before acceptance. Dated implementation history belongs in [CHANGELOG.md](CHANGELOG.md),
and in-flight work belongs in `docs/active_plans/`.
