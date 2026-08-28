# Design decisions

<!-- VENDORED HEADER: START -->

Record each durable decision about how this code and repository are shaped, once it is settled, with
the reasoning a later reader needs. Guidance Neil Voss states belongs in
[HUMAN_GUIDANCE.md](HUMAN_GUIDANCE.md), dated history in `docs/CHANGELOG.md`, open discussion in
`docs/active_plans/decisions/`. [PROPAGATED HEADER - ENTRIES BELOW ARE YOURS]
<!-- VENDORED HEADER: END -->

Write each decision as a level-three heading with these four fields. `Owner` names the
authoritative code or contract document, rather than a person.

```markdown
### <decision title>

**Decision.** <the durable direction>

**Why.** <the reason it was chosen>

**Consequence.** <the constraint a future change preserves>

**Owner.** <the authoritative code or contract doc>
```

## Software design

### Client-only SolidJS UI boundary

**Decision.** Starting in M7, use SolidJS as the sole deliberate client UI runtime while keeping
the engine framework-free and the static GitHub Pages deployment contract intact.

**Why.** Solid's fine-grained reactivity fits a long-lived incremental-game display without
duplicating durable state in components. A single controller store and event funnel preserve the
auditable state, persistence, and replay boundaries already established by M4.

**Consequence.** `src/render/game_controller.ts` is the named no-JSX, DOM-free one-store boundary;
`src/render/**/*.tsx` and `src/main.tsx` consume it for DOM composition. `src/state/`, economy,
BigNum, persistence, and SVG factories do not import Solid. Components receive typed intents, not
a store setter; the controller isolates store snapshots, records through the raw event funnel, and
persists an isolated accepted next snapshot before reconciling the visible store. It injects a
safe nonnegative active clock for event `atMs`, a separate safe nonnegative save clock for envelope
`savedAtMs`, and treats the real `saveToStorage` notice result or an adapter exception as an
unchanged-store, visible-unsaved outcome. SolidStart, routing, resources, server functions, and
network behavior require a new design decision. `docs/SOLID_MODEL.md` is the implementation
contract for M7 and later UI.

**Owner.** `docs/SOLID_MODEL.md`

### Colony is the division control

**Decision.** Cancer Clicker NG uses one native colony button as the primary `Divide cell` control.
Visible cell geometry delegates pointer and touch activation to the same typed intent; Enter and
Space activate it through the one keyboard focus target. The normal board is a responsive 1280 x
800 (16:10) landscape composition with colony action, living tumor/progression world, and store
in that order.

**Why.** Division is the game's frequent direct action, so the living colony should communicate
and receive that action. One native control supplies truthful keyboard, touch, focus, disabled,
and assistive-technology behavior without making a dense specimen field into hundreds of focus
targets. The Cookie Clicker reference contributes the large-object, center-progression,
right-store spatial grammar while the clinical scientific SVG retains Cancer Clicker NG's identity.

**Consequence.** `App` passes only the existing `onDivide` intent and disabled/recovery state to
`ColonyPanel`; the controller remains the event, persistence, and reconciliation owner. The panel
groups authoritative count/rate, instruction, immediate restrained feedback, save state,
reduced-motion feedback, and stage caption with the action. Its first 1280 x 800 view also exposes
active stage/hallmark progression, producer quantity controls, and save/status without discovery
scrolling. The right rail exposes each producer's owned count, next cost, affordability, and
production contribution; hover/focus reveals richer derived statistics. Locked future content
states its biological unlock condition and becomes actionable when its real requirements are met.
`colony.tsx` and `cell.tsx` retain local UI cell keys only. Morphology and layout
provenance own the biological state shown by the living tumor world; animation supplements that
state and CSS presents it. Production-dist Playwright protects the player interaction; screenshot
matrices and heuristic/contact evidence remain one-time acceptance artifacts rather than pixel-,
byte-, or arbitrary-timing regressions.

**Owner.** [SOLID_MODEL.md](SOLID_MODEL.md) and [ART_DIRECTION.md](ART_DIRECTION.md)

### Versioned local persistence boundary

**Decision.** Persist anonymous game progress only through the versioned, bounded,
explicit-reconstruction state boundary and route every durable game mutation through the exhaustive
event funnel.

**Why.** An idle game must preserve progress across ordinary upgrades while treating browser
storage as untrusted input; exact state and event contracts make recovery and later replay
auditable.

**Consequence.** Schema or event changes update the forward migration, fixture corpus, drift
guards, [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md), and focused acceptance gates. Rejected raw
saves remain untrusted, and M8 owns boot-level overwrite prevention.

**Owner.** [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md)

### Evidence-frozen save recovery contracts

**Decision.** M8 freezes one canonical `SaveNotice` vocabulary and a discriminated `LoadResult`:
an absent first-run save proceeds normally, while parser-retained unreadable bytes and storage-read
failure enter distinct fail-closed recovery states until an explicit validated replacement succeeds.

**Why.** M1-M7 real use exposed duplicate notice shapes and a route by which ordinary activity could
silently replace progress after a failed load. The recovery state must be truthful about whether raw
bytes were retained and must protect either uncertainty from automatic mutation.

**Consequence.** The parser, storage boundary, controller, and UI consume the closed result rather
than widening or redeclaring it. Ordinary actions, ticks, offline initialization, reload, and
imported events cannot advance or write protected sessions. A frozen-contract amendment names
affected consumers, adds an exact boundary or oracle test, and re-runs static, Node, build, and
production-dist Playwright gates before dependent work resumes.

**Owner.** [contract_freeze.md](active_plans/reports/contract_freeze.md)

### Four distinct prestige systems

**Decision.** Prestige remains four mechanically different systems: L1 Metastasis is allocation,
L2 Host Transfer is a deterministic host draft, L3 Immortalization is a permanent Passage tree,
and L4 Dissemination is a renewable graph frontier.

**Why.** The game needs compounding strategic depth rather than four reskinned resets. The accepted
design proves L1 supplies early-run variation, L2 choices are reload-stable, L3 preserves a narrow
automation decision, and L4 continues supplying decisions after authored nodes are stabilized.

**Consequence.** `LineageLedger` is the sole reset-surviving history record, including explicit
`currentHostRunId`, canonical-order organ-tag history, and future L3/L4 seams. Separate
authoritative L1 `MetastasisState` and L2 `HostTransferState` own their currencies and visible
choices; history never duplicates either. Terminal rewards are transient trusted quotes whose
`sourceEventSequence` is a required revision, never UI-supplied reward state. `deriveSeedV1` is
the sole versioned seed derivation API, and `generateHostDraftV1` saves one complete ordered
four-card draft before display, including its reveal list and source revision. One complete-state
projection module owns all L1/L2 and future L3/L4 resets; helpers return projections while
`recordEvent()` remains the exclusive durable-mutation and sequence owner. M14 advances the save
schema through its single p5-to-p6 forward projection after M12 has established p5. M20 owns
`ReplayLog` transport, recording lifecycle, and normalized durable-state replay proof. UI confirmation sends stable IDs
and revision only, then preserves the controller's persist-before-reconcile rule. M21 reviews
decision witnesses and tuning observations rather than accepting cosmetic layer variation.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md)

### Prestige-owned catalog-backed transit history

**Decision.** M14 resolves an arrived transit through a catalog-backed `OrganSiteId`, then records
the destination's canonical `OrganTagId` values and transit count in the lineage ledger. Current
`RegionId` values remain local stage projections rather than organ-history identities.

**Why.** A region's layout identity cannot truthfully establish its biological destination. The
ledger needs reset-surviving, catalog-owned route evidence for Metastasis and later portfolio
decisions.

**Consequence.** M12 completes the progression state before M14 begins, while M14 owns the full
organ-site, ledger, and transit contract rather than splitting their writers across milestones.
`resolve-transit` validates a pending transit and compatible destination once,
creates or marks its local seeded region, and records ledger tags only for arrival. Lost and invalid
transits are atomic. M14 computes viable current regions from the run but consumes persisted ledger
organ tags for eligibility and diversity; it never infers an organ from a `RegionId`.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) and `src/prestige/seeding.ts`

### Stages and morphology are data contracts

**Decision.** M9 stages transition only through semantic gates and explicit adjacent events, and
their real producer-specific rate and quote relations must create a documented decision witness.
M16 resolves immutable morphology from declared, row-ID-provenanced contributions and
durable seed identity; it does not render, place, or infer biology from ambient state.

**Why.** A stage label or preference field without a measured decision consequence is a reskin.
Likewise, drawing before a deterministic morphology grammar would make biological claims
untraceable and prevent later layout and rendering owners from sharing a stable input.

**Consequence.** All twelve stage records retain gate, UI mode, retired assumption, gameplay
identity, and real observable strategy behavior. `MorphologyParams` keeps its accepted readonly
shape; M17 consumes it as data only, and M18 owns visual output, accessibility, and performance.
The M7 landmark selector is test-only maintenance and does not create product behavior.

**Owner.** [contract_freeze.md](active_plans/reports/contract_freeze.md)

### Core hallmark event activation

**Decision.** M10 activates `HallmarkEffect` by registering the `spend-telomerase` event before
any core-hallmark source changes, with atomic parser-to-storage behavior and named downstream
replay ownership.

**Why.** The evidence freeze requires an explicit amendment before changing a closed event union.
One narrow first event makes the durable mutation path testable without silently coupling M10 to
prestige or M20 replay implementation.

**Consequence.** Parser, reducer, save, controller, UI, focused Node, and production-browser
evidence reject hostile requests without partial mutation; M20 later transports the frozen event
inventory instead of inventing a parallel replay vocabulary. The canonical runner remains
`./check_codebase.sh`; production-dist Playwright owns browser proof.

**Owner.** [contract_freeze.md](active_plans/reports/contract_freeze.md)

### 2011 hallmark event boundary

**Decision.** M11 extends the frozen `GameEvent` union only with `convert-substrate`,
`set-region-mask`, and `activate-inflammation`, while retaining `select-mutation` as the single
deterministic-offer selection event.

**Why.** ATP conversion, region-local immune masking, and an explicit inflammatory episode are
distinct player choices that need truthful parser-to-storage identities. Reusing an unrelated
event or rerolling offers in the view would hide a durable choice and weaken replay evidence.

**Consequence.** The type owner selects a safe canonical amount representation without unchecked
casts or floats; closed ATP-sink and mutation-offer catalogs, deterministic deadlines and offers,
and exact save relations are shared by event, parser, reducer, save/load, controller, SolidJS,
browser, and M20 replay consumers. Rejections and persistence failure preserve state, sequence,
queue, storage, and recovery protection exactly.

**Owner.** [contract_freeze.md](active_plans/reports/contract_freeze.md)

### Authoritative hallmark outcomes define acceptance

**Decision.** The durable acceptance contract for the four 2011 hallmark operations is their
player-observable authoritative result: metabolism moves substrate into ATP without creating
cells; masking changes only the selected region's visibility contribution to the authoritative
weighted global producer quote; inflammation changes a real route, tick, or gate result until its
deadline; and a valid saved mutation selection changes its named effect while invalid selection is
atomic.

**Why.** These outcomes follow the real event, save, economy, tick, and gate boundaries that the
player uses. A synthetic purchase ranking can turn internal coefficients and a particular card
distribution into test-owned behavior, which would make routine balance work fragile without
describing the game contract. Direct outcomes apply **Fix the design, not the symptom** and
**Design for adaptability** from `docs/REPO_STYLE.md`.

**Consequence.** Permanent domain tests retain direct conversion, local-region, expiry, and
atomic-selection properties. Bounded multi-card/rank searches and broad balance experiments
remain one-time acceptance evidence in maintainer reports or tools, where they can guide tuning
without freezing arbitrary result order. Durable test paths name hallmark behavior rather than the
implementation milestone that introduced it.

**Owner.** `src/hallmarks/hallmark_effects.ts`, `src/economy/atp_allocation.ts`, and
`src/state/events.ts`

### Closed late-hallmark aggregate

**Decision.** M12 replaces provisional late-hallmark maps and the region senescence backlink with
one required `GameState.lateHallmarks` aggregate. It owns typed plasticity, epigenetic,
microbiome, and senescence records; `RegionState.phenotype` remains canonical local state. The
closed event inventory is `assign-region-phenotype`, `reconfigure-hallmark-program`,
`install-microbiome-composition`, and `resolve-senescence-decision`. A microbiome offer owns one
saved three-composition choice with a distinct `MicrobiomeOfferId`, all displayed niche/community
effects, compatibility result, provenance, and expiry.

**Why.** The provisional generic maps split one biological domain across parser branches and a
region backlink. A closed aggregate gives each durable relation one owner, preserves a visible
microbiome tradeoff across reload/replay, and gives the living-tumor adapter authoritative biology
without inventing measurements.

**Consequence.** Reducer dispatch advances sequence once after accepted handling. Catalog/state
handlers own their named mutation or deadline; a single elapsed projection owns microbiome offer
rotation for both live and offline simulation. p4 migrates forward to an empty p5 aggregate and
drops scaffold data, with no current-state compatibility field. M12 reads prestige activation
through one adapter; M15 replaces only that adapter implementation with its L3 ledger authority.
The frozen visual projection maps phenotype variance, chromatin program, microbiome surface, and
retained senescence to named provenance rows. Durable tests cover operation relations, atomicity,
saved offers, normalized live/offline equivalence, migration, and frozen provenance; tuning,
fuzzing, contact sheets, and 1280 x 800 inspection remain dated evidence.

**Owner.** `src/hallmarks/late_hallmark_types.ts`, `src/hallmarks/late_hallmark_tick.ts`, and
`docs/active_plans/implementation_plan.md`

### Offline durable projection boundary

**Decision.** Economy adapters expose M10 elapsed effects only as an exact four-field durable
projection: regional telomere reserves, regions, oxygen pressure, and vessel-maintenance count.
Offline replay independently reconstructs that projection from the prior state and step duration,
then descriptor-validates that an adapter's claimed projection exactly matches before it can affect
a later macro step.

**Why.** A generic `GameState` spread allowed an injected offline adapter to alter unrelated
durable fields. The bounded replay must preserve its one final accounting event and reject hostile
or relationally impossible intermediate state without partial mutation.

**Consequence.** The tick keeps tracked ATP in `resourceSnapshot`; the replay boundary rejects
extra keys, accessor/prototype data, malformed identifiers, unsafe values, or even valid-shaped
but semantically wrong reserve and vessel transitions as `step-failed` before calling the recorder.
New elapsed effects extend the named projection and its exact structural and two-step atomicity
oracles together.

**Owner.** `src/economy/tick.ts` and `src/state/offline.ts`

### Reality-grounded evidence classes

**Decision.** Permanent regression tests protect stable semantic contracts, mathematical
invariants, safety boundaries, and shipped user-visible behavior. Calibration tools record
representative art, balance, and performance measurements as dated evidence. Design reviews trace
biology and progression claims to their behavior and decision witnesses.

**Why.** A durable test must survive refactoring and ordinary tuning. Visual detail, bot rank,
serializer key order, and machine timing are useful measurements but make fragile public contracts
when asserted as universal constants.

**Consequence.** Replay compares normalized durable state, event outcomes, and visible progression
unless canonical JSON is an explicit public wire contract. Offline replay compares equal scheduled
boundaries exactly and documents any calibrated display approximation. Geometry and browser tests
retain containment, clearance, accessibility, fit, and reduced-motion behavior, while corpus
measurements remain dated reports. `tools/balance_sim.mjs` and visual tools publish their corpus,
environment, observations, and reproduce command for design review.

**Owner.** [implementation_plan.md](active_plans/implementation_plan.md)

### Durable domain naming

**Decision.** Repository paths under `src/`, `tests/`, and `tools/` name their enduring behavior
or responsibility. Milestone labels remain in plans, changelog entries, and dated implementation
evidence. A public schema version or scientific year remains when it communicates domain meaning.

**Why.** A durable path should teach a future maintainer what the module provides, independent of
the implementation schedule.

**Consequence.** Migration work classifies every milestone-looking identifier as history, public
compatibility, scientific nomenclature, or temporary leakage. It renames leakage to behavior
terms, updates imports, and favors inline setup or one shared legal-state builder over test-only
fixture files.

**Owner.** [REPO_STYLE.md](REPO_STYLE.md) and [implementation_plan.md](active_plans/implementation_plan.md)

## Dependencies

## Generated artifacts
