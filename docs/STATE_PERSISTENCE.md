# State persistence

## Purpose and owner

M4 persists anonymous, local game progress through one versioned boundary. The authoritative
state owner is `src/state/`: [game_state.ts](../src/state/game_state.ts) creates defaults,
[save_load.ts](../src/state/save_load.ts) owns serialization and storage, and
[events.ts](../src/state/events.ts) owns durable mutations. UI and later simulation code consume
this boundary; they do not reconstruct saved state or mutate it directly.

This is a browser-local progress feature. It stores no account, credential, payment, personal, or
clinical data. Browser storage is untrusted input even though the game produced it previously.

## Versions and outcomes

| Input                                          | Result                                                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Valid V2/p4 envelope and state                 | Reconstruct a canonical `GameState` and preserve V2/p4 metadata exactly.                                           |
| Valid V1, V2/p1, V2/p2, or V2/p3 fixture       | Migrate once to V2/p4; preserve valid progress and canonicalize the M6 producer catalog.                           |
| Unknown version or invalid envelope/state core | Reject, return no usable state, retain the exact raw text, and return one generic `save-rejected` notice.          |
| Recoverable V2 leaf                            | Preserve all independent siblings, use the documented safe default, and return one typed `field-defaulted` notice. |

V2 is the envelope version and V2/p4 is the current write format. `CURRENT_PROGRESSION_VERSION`
is 4. V1 is read-only compatibility for the captured legacy fixture; V2/p1, the pre-M5 V2/p2
fixture, and pre-M6 V2/p3 saves are read-only compatibility shapes. The serializer always produces
V2/p4. `savedAtMs` and `progressionVersion` are nonnegative safe integers; only p1 through p4
are accepted.

The p4 writer and reader are deliberately closed as one boundary. Before serialization, the writer
reconstructs its own encoded state through the same strict p4 parser and refuses it if parsing
would reject or emit any recovery notice. Therefore a successful write is a zero-notice load with
stable reserialization; malformed clocks, queues, BigNums, catalog entries, optional transitions,
deadlines, collections, graph relations, and a complete envelope above the 250,000-character raw
limit fail before browser storage is called. The raw-size check is part of that writer validation,
not a reader-only guard, so a valid-looking dense graph cannot create an unreadable stored save.

## Reconstruction policy

`parseSave` first validates the versioned envelope. It migrates allowlisted valid p1/p2 state to
p4 by adding `activeTimeMs: stageStartedAtMs` and `pendingProgression: []`; it migrates valid p3
state to p4 without changing those M5 fields. Every legacy route normalizes known safe producer
levels into the exact eight-entry M6 catalog order, preserving existing known levels and filling
only absent known IDs with zero. Current p4 reads require that exact order and reject every sparse,
extra, reordered, unknown, duplicate, or unsafe producer array. It then explicitly reconstructs
fresh values from allowlisted own properties. It never spreads an
untrusted record into state. `STATE_KEYS` is bidirectionally checked against `keyof GameState`, so
a new durable state field requires parser and serializer attention at TypeScript compile time.

P4 requires a nonnegative safe `activeTimeMs` and a structurally valid ordered
`pendingProgression` queue. Each exact-key stage/prestige record has a catalog-branded identity, a
safe first-seen simulation timestamp no later than `activeTimeMs`, and a unique `(kind, id)`
identity. These fields are structural, not recoverable leaves. P4 also requires exactly eight
known, unique, safe producer levels in catalog order; missing, sparse, extra, reordered, unknown,
duplicate, or unsafe levels reject rather than defaulting. Unknown future progression versions and
malformed legacy cores reject the whole save rather than manufacturing a simulation history.

Recoverable leaves are local data that can safely return to their initial-state value, including
missing or malformed scalar, BigNum, collection, and selected nested leaves. Each recovery is
visible through `field-defaulted`; recovery never silently replaces unrelated state.

Reject the entire save when a structural core cannot be trusted: malformed envelopes, unknown or
reserved keys, oversized input or collections, unsafe structural counters, invalid canonical
BigNums, duplicate durable identities, or broken graph relations. Rejection is intentional: a
partial state would make later reducer and replay behavior ambiguous.

`lastStageTransition` is optional. If it is malformed, non-adjacent, backward, duplicate,
terminal, points away from `currentStage`, or has an `atMs` different from `stageStartedAtMs`, omit
only that transition and emit one recovery notice. A malformed optional
`regions[*].senescenceEventId` is similarly omitted; only its dependent clearance edge is removed.

## Data integrity rules

The parser accepts only ordinary JSON records with exact enumerable keys. It rejects inherited,
accessor, symbol, and reserved-key data; bounds raw input at 250,000 characters and collections at
the exported `MAX_COLLECTION` limit. Numeric values are finite nonnegative safe integers where the
state contract requires counters or timestamps. Persisted BigNums must use their canonical
serialized form before trusted rehydration.

The persisted graph has these required relations:

- Durable `EventId` values are globally unique across damage, transit, inflammation, and
  senescence records.
- Region-keyed maps, seeded/masked/senescent sets, damage and inflammation events must point to a
  surviving region.
- Region route references, route-risk entries, commitments, and transit events must point to a
  surviving route.
- Program, mutation-offer, microbiome, and clearance selections must remain internally consistent
  with their saved pools and queues.
- Every senescence event is represented by its region and exactly one clearance-queue edge.

These checks ensure an accepted save is a complete durable graph, not merely parseable JSON.

## Event funnel

Every durable mutation enters [recordEvent](../src/state/events.ts) with `unknown` input.
[event_parse.ts](../src/state/event_parse.ts) rebuilds an exact, plain discriminated event record
before [reduceGameEvent](../src/state/events.ts) applies it immutably. Unknown discriminants,
unknown keys, inherited data, accessors, invalid enum or boolean payloads, unsafe timestamps, and
invalid identifiers throw before state or `eventSequence` changes.

`EVENT_TYPES` is bidirectionally tied to `GameEvent`, and the reducer ends in a `never` assertion.
A new event variant therefore requires both parser/reducer handling and a TypeScript compile pass.
Each accepted event increments `eventSequence` exactly once; rejected events are atomic.

M5 extends `apply-offline-accrual` as the single recorded offline mutation. Its exact payload
contains elapsed duration, the current simulation timestamp, a canonical snapshot of every
tracked BigNum resource, and only newly observed queue additions. The parser validates exact
plain-own data keys, snapshot completeness/canonical values, catalog identities, safe timestamps,
and uniqueness. A new queue addition must have `firstObservedAtActiveMs === state.activeTimeMs`.
The reducer requires the current simulation timestamp and appends valid additions to the existing
queue; it does not accept a queue replacement. It atomically applies the snapshot, queue
additions, elapsed total, and one sequence increment. The controller constructs only a
resource-only offline projection, so no non-resource tick write can bypass this event boundary.
The reducer guards the trusted event boundary; offline-controller and M6 tick tests establish the
economy calculation.

Stage advancement uses the ordered M2 catalog. It accepts only the immediate successor, records
the matching transition timestamp, and requires an earned L3 before
`host_collapse -> immortalized_culture`. Pre-M13 prestige reset intentionally rejects atomically.
The shared region-removal cascade deletes only orphaned dependent records while preserving routes
still referenced by another region.

## Browser storage flow

`SAVE_KEY` is `cancer-clicker-ng.save.v2`. `loadFromStorage` returns `absent` with no notice when
the key is missing; it returns the parser result for present raw text; and it returns a generic
`storage-error` notice for a read exception. `saveToStorage` is the only write boundary and returns
an empty notice list on success or a generic `storage-error` notice on write failure.

Rejected parser input retains its raw text so a later recovery flow can preserve it. M4 does not
yet connect that retention to boot UI, and it must not automatically overwrite a retained corrupt
save. M8 owns that overwrite-prevention contract; M7 owns the first real UI reload and recovery
proof.

## Required regression evidence

[test_save_migration.mjs](../tests/test_save_migration.mjs) proves that the existing populated p2
fixture, p1 fixture, V1 fixture, and sparse/empty p3 fixtures each migrate to an explicit
canonical p4 state, then populated p4 round-trips exactly. Hostile legacy levels, hostile current
catalog matrices, future schemas, and invalid writer inputs reject without fallback or overwrite.
It also proves
recovery changes only the affected leaf and storage outcomes retain the expected raw/value.
[test_state_events.mjs](../tests/test_state_events.mjs) proves all event variants, including the
exact hostile offline-accrual snapshot/additions boundary, exact queue variants and timestamp
relations, atomic invalid input, stage rules, graph cascades, and exact save/reload results. The
required gates are:

```text
node --import tsx --test tests/test_save_migration.mjs tests/test_state_events.mjs
npx tsc --noEmit
npx tsc -p tsconfig.lint.json --noEmit
./check_codebase.sh
./build_github_pages.sh
git diff --check
```

M5 acceptance ran 32 focused migration, event, and offline-replay tests and 52 repository Node
tests through `./check_codebase.sh` (five completed checks), both TypeScript configurations, the
production build, and `git diff --check`. M6 extends that evidence with p4 catalog migration,
complete-envelope writer/reader closure, the concrete economy offline entry, and independent
economy/oracle/type review. Final M6 acceptance passed 68/68 Node/tsx tests, both TypeScript
checks, `./check_codebase.sh` (5/5), the production build, and `git diff --check`; it uses no
Vitest. Python repository hygiene remains supporting evidence rather than M5 acceptance proof.

## Deliberate follow-ons

- M6 owns the shared live economy tick, producer purchasing, and simulation-time advancement while
  preserving M5's accepted resource-only offline seam.
- M7 owns storage-consuming UI integration and committed production-browser reload/recovery proof.
- M8 owns rejected-raw overwrite prevention and the evidence-led contract-freeze audit.
- M9-M12 own complete live stage, producer, route, mutation, program, and microbiome catalogs and
  mechanics; M4 validates only stable bounded identities and durable relations.
- M13 owns prestige currencies, rewards, and reset semantics; M4 preserves the atomic pre-M13
  rejection seam.

Future durable state changes update this document, the fixture corpus, `STATE_KEYS`/`EVENT_TYPES`
drift guards, focused tests, and both TypeScript checks before the change is accepted.
