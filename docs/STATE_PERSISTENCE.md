# State persistence

## Purpose and owner

Cancer Clicker NG stores anonymous browser-local progress. `src/state/game_state.ts` creates a
fresh state, `src/state/save_load.ts` owns the exact save boundary and browser-storage calls, and
`src/state/events.ts` owns durable mutation. Rendered controls send typed intent through the game
controller; they neither reconstruct a save nor write browser storage themselves.

The game stores no account, credential, payment, personal, or clinical data. Every browser-storage
value is untrusted input, including data written by an earlier build.

## Accepted save contract

There is one accepted and produced save envelope in this pre-production project:

| Input                                                                           | Result                                                   |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Exact `version: 2`, `stateSchemaVersion: 8` envelope with a valid current state | Load the canonical `GameState`.                          |
| Missing storage key                                                             | Start a fresh in-memory state.                           |
| Any other envelope, schema, or invalid state                                    | Reject the input and protect the existing storage bytes. |

`CURRENT_STATE_SCHEMA_VERSION` is `8`. The envelope has exactly four own enumerable keys:
`version`, `savedAtMs`, `stateSchemaVersion`, and `state`. `version` is the literal integer `2`;
`savedAtMs` is a nonnegative safe integer; and `state` is the exact current durable DTO. Earlier
schema shapes are intentionally outside this contract. A changed durable schema is a deliberate
source change: update the current DTO, parser, writer, fixtures, and documentation together.

The writer and reader form a closed boundary. `serializeGameState()` encodes the current DTO, then
validates the bytes through `parseSave()` before browser storage receives them. This proves current
writer-reader compatibility. It does not impose byte equality on replay, rendering, or gameplay.

## Strict parsing

`parseSave()` limits input to 250,000 bytes, parses ordinary JSON only, requires the exact envelope
keys, and rebuilds allowlisted own data into a fresh `GameState`. It validates safe counters,
canonical BigNums, stable catalog IDs, collection bounds, unique durable identities, and
cross-domain relations such as regions, routes, culture, network, and ending evidence. Inherited,
accessor, symbol, reserved-key, malformed, oversized, or inconsistent data rejects as a whole.

The parser returns only these result shapes:

- `absent` for a missing storage key;
- `loaded` with a fully valid current state and no notices;
- `rejected` with a `save-rejected` notice and retained raw text when parsing received raw text;
- `rejected` with a `storage-error` notice when browser storage cannot be read.

Current-state parsing has no default-injection or partial-recovery path. A state is accepted in its
complete current form or is rejected. This keeps replay and later additions grounded in one truthful
schema instead of a mixture of inferred historical shapes.

## Protected recovery and fresh replacement

`SAVE_KEY` is `cancer-clicker-ng.save.v2`. `loadFromStorage()` distinguishes a missing key, an
unreadable stored value, and a storage-read failure. A rejected raw value is retained as evidence;
the controller enters recovery protection and disables ordinary mutations. The game never replaces
those bytes as a side effect of loading, ticking, or a rejected action.

The player can explicitly choose the recovery panel's fresh-start replacement action. That action
creates a new current state and writes it through the same validated save boundary. Only a
successful validated write clears recovery protection. A storage-write failure leaves the visible
durable state and protection state intact.

## Event and ending integrity

Every durable mutation enters `recordEvent()` in `src/state/events.ts`. `src/state/event_parse.ts`
first rebuilds exact runtime event records, then the reducer applies an accepted event immutably.
Rejected input leaves state and `eventSequence` unchanged; an accepted event increments the sequence
once.

`reach-soft-ending` is an explicit accepted event. It records the optional Chicago-scale
presentation only after the required current stage, dissemination tier, and modeled cell scale are
present. The event changes presentation evidence, not the producer economy or the player's ability
to continue direct cell action and progression.

## Development semantic replay

`src/state/replay.ts` and `src/types/replay.ts` own a development-only `ReplayLog`. Its recorder
observes an event only after the controller has parsed, reduced, persisted, and reconciled the
accepted state. The log stores schema-current source metadata, the deterministic seed, a normalized
current initial state, and semantic outcomes for accepted events.

Replay re-enters the normal event parser and reducer for each entry. It compares event sequence,
normalized durable state, and the small DOM-free visible-progression projection structurally. A
stale schema or semantics revision, source revision mismatch, malformed record, rejected event,
seed mismatch, or altered outcome returns a typed rejection. Replay is neither player-save format
nor browser-storage transport, and it makes no byte, pixel, or timing equivalence claim.

## Durable ownership

| Owner                                                | Responsibility                                                                     |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/types/save.ts`                                  | Exact current save-envelope types and notice vocabulary.                           |
| `src/state/save_load.ts` and `src/state/save_parse/` | Current DTO parsing, canonical serialization, and browser storage.                 |
| `src/types/state.ts`                                 | Current `GameState` and `SoftEndingState` shape.                                   |
| `src/state/event_parse.ts` and `src/state/events.ts` | Durable event acceptance and mutation.                                             |
| `src/types/replay.ts` and `src/state/replay.ts`      | Schema-current development semantic replay.                                        |
| `src/render/game_controller.ts`                      | Storage-aware player intents, protected recovery, and optional replay observation. |

Run `./check_codebase.sh` for the permanent TypeScript and deterministic behavior gate. A production
build, browser journey, or rendered visual review is separately named one-time evidence when a
change needs it. Dated implementation history belongs in [CHANGELOG.md](CHANGELOG.md); active work
belongs in `docs/active_plans/`.
