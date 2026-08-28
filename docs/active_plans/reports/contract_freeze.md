# M8 Contract Freeze

Date: 2026-08-27

## Freeze decision

The contracts exercised by M1 through M7 are frozen with the dispositions below. This is an
evidence freeze, not a claim that later milestone contracts have already been exercised. The
canonical Node front door is `./check_codebase.sh`; production-dist Playwright owns browser and
storage behavior.

## Exercised contracts

| Contract                          | Owner and consumers                                                                                                                                          | Finding and disposition                                                                                                                                                                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BigNum`                          | `src/types/bignum.ts`; arithmetic, formatting, save parser, reducer, economy, controller, render                                                             | Accepted. Construction casts stay isolated in brand constructors; tracked-resource snapshots have exhaustive probes and isolated adapter reconstruction.                                                                                                                                                       |
| Branded IDs                       | `src/types/ids.ts`; catalog, parser, reducer, save migration, producer UI                                                                                    | Accepted. Parser constructors follow identifier and catalog validation; no raw branded ID reaches a DOM attribute.                                                                                                                                                                                             |
| `GameState` and tracked resources | `src/types/state.ts`; initial state, reducer, parser/writer, economy, offline replay, controller                                                             | Amended. Removed unused duplicate `PendingStageEligibility` and `PendingPrestigeEligibility`; the economy owns private `Extract<PendingProgression, ...>` slices. Exhaustiveness guards remain in the state and persistence boundaries.                                                                        |
| `RuntimeState`                    | `src/types/state.ts`; live tick and controller                                                                                                               | Accepted. It remains the explicit durable/ephemeral boundary. The controller blocks a recovery-protected session before a tick can advance or persist it.                                                                                                                                                      |
| `GameEvent`                       | `src/types/events.ts`; exact parser, reducer, offline recorder, controller                                                                                   | Accepted. It is a closed union with an event-inventory check. `PurchaseQuantity` deliberately remains economy-owned (`src/economy/costs.ts`) and is imported as a type only by the event and render contracts; this has no emitted cycle and keeps quote, debit, reducer, and UI request vocabulary identical. |
| Save envelope and migration       | `src/types/save.ts` owns the current writer envelope; `src/state/save_load.ts` owns parser, migration, and `LoadResult`; storage and controller consume both | Amended. Removed obsolete V1-to-V2-only `SaveMigration` and dead speculative legacy save aliases; the live parser owns p1/p2/p3-to-p4 migration from `unknown`. `LoadResult` is a discriminated union and a successful loaded result has literal progression version `4`.                                      |
| Save notices and storage results  | `src/types/save.ts`; parser leaves, storage boundary, controller                                                                                             | Amended. `SaveNotice` is the single canonical vocabulary; the former `ParseNotice`, broad `FieldNotice`, and duplicate `RecoveryNotice` shapes no longer diverge. Both retained unreadable bytes and a storage read failure start protected recovery; their discriminated reasons keep the copy truthful.      |
| Offline contracts                 | `src/state/offline.ts`, `src/economy/offline.ts`; generic replay, economy wrapper, event funnel, report render                                               | Accepted. The state-to-economy seam is type-only; the named production wrapper value-binds the actual economy formula.                                                                                                                                                                                         |

## Deferred contracts

`ReplayLog` is deferred to M20, where byte-identical final-state replay is required. `HallmarkEffect`
is activated by the M10 amendment below, and `MorphologyParams` is accepted by the M16 amendment
below. These contracts are intentionally not represented as real-use-proven by the original freeze
unless their named amendment says otherwise.

## M16 morphology activation amendment (accepted, 2026-08-27)

`MorphologyParams` moves from a deferred placeholder to a real, exercised M16 contract without
changing its readonly field shape. The M16 morphology grammar owner owns
`src/svg/morphology.ts`; its immediate consumers are M17 layout requests, the M18 renderer, and
future M12 hallmark writers. This is an activation for the typed grammar boundary, not acceptance
of a rendered colony.

The resolver accepts declared contributions and remains independent of `GameState`, DOM, JSX,
layout, storage, clocks, and drawing. It resolves `baseline -> stage -> hallmark -> prestige ->
regional -> individual variation`, with stable regional ordering, finite-input rejection,
field-specific combination rules, final clamping, and immutable output. Each accepted contribution
must carry one or more stable morphology-ledger `rowId` values at the source boundary; resolver
provenance retains those row IDs with the contributor instead of relying on a fixture-wide list.
M12 will write only typed, declared hallmark contributions through that same boundary.

M16 also owns deterministic discrete trait resolution from durable scene identity (seed, stage,
stable region or slot, and cell index), plus bounded continuous variation. It returns descriptors
and provenance only: M17 consumes resolved axes for macro layout requests, while M18 alone maps
those traits and resolved parameters to actual SVG. The resolver neither chooses layout nor draws
cells, and no consumer may infer biology from an undeclared rate or label.

Required activation evidence is an exact ledger-to-contribution oracle for all twelve stage rows,
hostile missing or unknown `rowId` rejection, fixed deterministic seed/trait vectors, ordered
provenance and clamp retention, and bounded variation proof. Before dependent milestone work
resumes, rerun TypeScript/static checks, the complete Node front door (`./check_codebase.sh`), the
production build, production-dist Playwright, documentation ASCII/Prettier/link gates, and
`git diff --check`.

Independent acceptance confirms the unchanged readonly `MorphologyParams` shape is exercised by
the resolver and fixtures; the typed resolver, finite and deterministic seed path, closed row-ID
provenance, and discrete traits are accepted. This closes the M16 activation amendment without
retrospectively expanding the original M8 claim.

SVG output, rendered visual distinction, accessible SVG semantics, contact sheets, reduced-motion
behavior, and frame/node performance evidence remain explicitly deferred to M18. M17 may now
consume the accepted resolver only as data for macro layout; it may not draw cells or redefine
morphology semantics.

## M17 colony-layout activation amendment (accepted, 2026-08-27)

M17 activates the colony-layout handoff as readonly, drawing-free data with four opaque,
module-private phases: silhouette, regions, planned clusters, and completed slots. Raw values from
an earlier phase cannot enter a later public builder; the completed layout exposes truthful
underfilled and per-cluster accepted counts rather than speculative allocation results. Construction
uses at most 24 deterministic candidates per requested slot, retains the representative/inspection
caps of 180/240 slots, and keeps every owned source module below 800 lines.

`MorphologyParams` remains immutable M16 input. Each slot retains its `layoutOrigin` provenance;
M17 maps tissue disorganization, necrosis, invasion, and dissemination only to controlled physical
composition effects. Necrosis reserves the physical void, invasion can create an opening
transformed slot, and dissemination controls separated topology. The M18 handoff is physical
suppressed-detail geometry only: silhouette, regions, voids, and conservative slot footprints;
it excludes stage labels, seeds, traits, cell internals, and drawing instructions.

The terminal geometry contract uses a 1000 x 700 frame with strict full-footprint containment and
clearance. Same-depth footprints never touch; cross-depth overlap is permitted only for a
surface-occluding foreground slot under the documented tolerance policy. M17 owns deterministic
layout and geometry measurement only. M18 is now dispatchable to consume immutable slots and must
own SVG, DOM, accessibility, target-size visual, and browser-performance evidence.

Terminal acceptance evidence: focused layout tests pass 9/9; both TypeScript configurations pass;
the canonical `./check_codebase.sh` passes 5/5 with 195 Node/tsx tests; Prettier and
`git diff --check` pass. Independent geometry acceptance measured 840 layouts, 72,224 slots,
9,244,672 actual-ellipse perimeter samples, and 3,682,739 pairs with zero forbidden violations.
The final quantitative minima are 0.98886 mean within-family coherence, 0.91629 individual
coherence, 0.19371 adjacent separation, 0.28298 nonadjacent separation, and 0.12449
avascular/hypoxic void-fraction delta.

## M10 hallmark event amendment (accepted, 2026-08-27)

`HallmarkEffect` moves from deferred placeholder to the M10 typed-handler contract. The initial
closed-event activation adds exactly one `GameEvent` discriminant: `spend-telomerase`. Its owner is
`/root/m10_core_contracts_catalog` under the D3 hallmark catalog workstream; no other hallmark,
prestige, replay, or compatibility event is implied by this amendment.

The affected-consumer inventory is fixed before implementation: `src/types/effects.ts` and the
hallmark catalog define the closed effect vocabulary; `src/types/events.ts`, the raw-event parser,
and reducer own allowlisted event validation and atomic projection; save writer/parser and
migrations own durable event compatibility; the controller and hallmark UI issue only typed intent;
focused Node tests and production-dist Playwright test the complete interaction; M20 consumes the
final event inventory for `ReplayLog` transport and byte-identical replay. The owner records every
actual file when the implementation selects the existing module seams.

`spend-telomerase` must be atomic: an eligible request validates its closed target and finite
amount, debits telomerase exactly once, applies its declared hallmark effect exactly once, and
records one accepted event; any rejection leaves state, event queue, and saved representation
unchanged. The hostile cases are malformed or unknown discriminants, extra or missing fields,
unknown target IDs, non-finite/non-integer/zero/negative amounts, insufficient balance, locked or
already-spent targets, stale prerequisite state, and a persistence failure after a proposed event.
Each case needs an exact parser, reducer, controller, or storage oracle proving no partial debit,
effect, queue append, or replacement of protected recovery data.

Before M10-dependent work can resume, rerun both TypeScript/static gates, the complete canonical
Node front door (`./check_codebase.sh`), the production build, the full production-dist Playwright
suite, documentation ASCII/Prettier/local-link gates, and `git diff --check`. This amendment
preserves the repository rule: no Vitest, Vite test harness, jsdom, or Testing Library substitutes
for Node/tsx and real production-browser evidence.

### Terminal acceptance disposition

M10 is accepted. The implementation adds exactly one new `GameEvent` discriminant,
`spend-telomerase`; no parallel hallmark, prestige, replay, or compatibility event was added.
The closed effect catalog, raw parser, reducer, p4 save/load graph, controller intent funnel,
SolidJS controls, and production-dist browser suite now exercise that event boundary. Hostile
requests reject atomically with no partial debit, effect, queue append, or protected-storage
replacement.

The accepted elapsed seam trusts only the exact four-field durable projection reconstructed by the
offline boundary. Six real mechanic classes now alter actual quote, debit, and production behavior:
division allocation, checkpoint routing, damage triage, replicative reserve, perfusion layout, and
route commitment. M20 remains the sole owner of replay inventory transport and byte-identical
replay proof. This amendment permits M11 implementation to begin; its new event needs remain a
separate announced amendment before code.

## M11 2011 hallmark event amendment (announced, 2026-08-27)

M10 is accepted. M11 source work begins only after this announcement. The M11 owner is
`/root/m11_contract_amendment` until its typed catalog owner replaces this documentation-only
amendment with the landed implementation evidence. The closed `GameEvent` union gains exactly
these three discriminants and no mutation-selection replacement:

| Event | Exact fields after `type` | Purpose |
| --- | --- | --- |
| `convert-substrate` | `amount`, `atMs` | Convert acquired-metabolism substrate to ATP. |
| `set-region-mask` | `regionId`, `masked`, `atMs` | Set one eligible live region's immune visibility. |
| `activate-inflammation` | `regionId`, `atMs` | Start one eligible regional inflammatory episode. |

`select-mutation` remains the sole mutation-offer selection event. It consumes a deterministic
saved offer; M11 adds no parallel mutation event. The M11 type owner decides the canonical
representation of `convert-substrate.amount` as either a branded whole-unit value or the existing
canonical BigNum DTO. That choice must reject direct DOM strings, unchecked casts, and floating
point amounts at the parser boundary.

The affected-consumer inventory is closed before implementation: the `GameEvent` union; exact raw
parser; reducer and accepted-event sequence; p4 save/load and cross-field invariants; controller
persist/reconcile funnel; SolidJS controls; production-dist browser tests; focused Node/tsx tests;
and M20 `ReplayLog` inventory transport and byte-identical replay. The M11 catalogs close ATP
sinks and mutation offers. Mutation drafting stores deterministic episode deadlines and offer
snapshots, including canonical ordering and one permitted outstanding offer, rather than rerolling
in JSX or the reducer.

Every request follows an all-or-nothing boundary. A malformed, extra-field, accessor-backed, or
prototype-backed record; locked, stale, duplicate, or no-op request; insufficient resource or
token; invalid or dangling region; expired episode or offer; impossible saved relation; or
persistence failure leaves durable state, event sequence, pending queue, raw storage, and
recovery protection unchanged. Parser, reducer, save/load, controller, and browser tests each own
an exact hostile atomicity oracle at their boundary.

M11 implementation must prove one real ATP sink and deterministic conversion, region-local masking,
one bounded inflammation episode per eligible region, and deterministic three-card mutation offers
through the named event funnel. It reruns `./check_codebase.sh`, the production build, serial
production-dist Playwright, documentation ASCII/local-link gates, and `git diff --check`; Vitest is
not a substitute for this repository's Node/tsx and production-browser evidence.

## Recovery-protected storage policy

`loadFromStorage()` retains exact raw bytes only for parser-rejected data. Both that condition and
a storage read exception start `App` with a discriminated recovery block: divide, purchase, format
change, imported event, live tick, offline processing, and reload cannot write or advance state.
The retained-raw alert says **Replace unreadable save and start fresh**; the read-failure alert says
**Start fresh and replace saved progress**, without claiming that exact bytes were retained. Each
operation uses the same validated `saveToStorage()` boundary as normal persistence; write failure
keeps the block and shows the generic unsaved status.

This implements ASVS 1.5.2 and 2.2.1 with allowlisted parsing and a trusted storage boundary, and
ASVS 2.3.1 and 2.3.3 with a sequential, all-or-nothing recovery replacement flow.

## Post-freeze amendment rule

Any change to a frozen contract must be announced as an amendment in the active plan, name its
owner and affected consumers, add an exact boundary/oracle test, and re-run the complete static,
Node, build, and production-dist Playwright gates before dependent milestone work resumes.
