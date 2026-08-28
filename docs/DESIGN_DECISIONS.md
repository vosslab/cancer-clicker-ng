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

### Deterministic balance evidence

**Decision.** The balance laboratory consumes the canonical visible decision surface, current-save
snapshots, parser/reducer funnel, and shared offline economy adapter to write versioned JSON evidence.

**Why.** Calibration needs reproducible action traces and honest counterexamples without creating a
second action catalog, hidden-state bot, browser dependency, or a permanent tuned-winner test.

**Consequence.** `tools/balance_sim.mjs` keeps policies restricted to displayed actions and values.
The `greedy-payback` policy divides the displayed producer cost by the authoritative marginal
production quote that the Store also renders. Scenario JSON stays versioned under
`tools/balance_scenarios/`; the default five-by-five suite writes an aggregate format-3 report
under ignored `output_balance/`. Scenario conclusions remain calibration observations, not
performance or rank gates.

**Owner.** `tools/balance_sim.mjs` and `tools/balance_scenarios/`

### Prestige reset persistence boundary

**Decision.** Before the first accepted L1 reset, `host_collapse` may persist a populated
Metastasis planning portfolio with a null `activeNicheContext`. Once L1 has run, selected-run
effects require the exact active context; populated null-context data rejects outside that bounded
planning phase. Reset projections own their target stage, timestamp, and transition together: L1
and L2 reset to `transformed_cell`, L3 resets to `immortalized_culture`, and same-stage L4 clears
unrelated transition history.

**Why.** The portfolio records a player-ready L1 plan before a biological destination is selected;
it is not selected-run evidence. A complete projection keeps the canonical event and save
round-trip boundary coherent. Executable balance witnesses exposed both ownership requirements.

**Consequence.** Save parsing accepts the populated null-context shape only at pre-L1
`host_collapse` and rejects it everywhere else. Each accepted reset has one durable stage
observation with its event time, while L4 retains no stale stage-transition record. This is a
current pre-production contract correction, not a legacy migration.

**Owner.** `src/prestige/reset.ts`, `src/state/save_parse/prestige_ending.ts`, and
`docs/PRESTIGE_DESIGN.md`

### Canonical visible decision surface

**Decision.** The state layer projects a frozen, ordered visible-action surface from current
durable state. Each action is a closed `GameEvent` with canonical numeric balances and costs.

**Why.** Replay, future UI readouts, and the headless balance laboratory need one truthful player
choice contract instead of independently reconstructing catalog and gate logic.

**Consequence.** Candidate builders retain catalog and saved-choice order; parser and reducer
acceptance decide legality. The projection excludes offline accrual and number-format preferences.

**Owner.** `src/state/decision_surface.ts`

### Replayable scale culmination

**Decision.** The Chicago culmination is a saved `SoftEndingState` reached only by an explicit
`reach-soft-ending` event after the global laboratory stage, one completed dissemination tier, and
the catalog-owned cell-scale reference. It changes presentation and scale vocabulary only.

**Why.** A boolean cannot preserve evidence, reject stale input, or replay the player decision.
The existing economy, direct cell clicking, and prestige network continue to provide the next
meaningful actions after the scale report opens.

**Consequence.** Current saves use exact format-2/schema-8 ending records. The strict parser
requires the complete current shape, so reached evidence always comes from the accepted event rather
than inferred storage. The formatter remains the one BigNum number grammar for cell counts, volume,
and scale ratio.

**Owner.** `src/ending/trigger.ts`, `src/ending/sequence.ts`, and `src/state/save_parse/ending.ts`

### Persisted Chicago-report interaction

**Decision.** The Chicago scale report is a compact Solid leaf above the live board only once the
global-laboratory scale boundary makes it relevant. An available native button sends one typed
controller intent; a reached report keeps the live cell count, modeled volume, Chicago high-rise
ratio, and next network action in an optional drawer aligned to the upgrade-rack lane beside a
silent, editable lakefront-scale graphic.

**Why.** The early transformed-cell board needs a clear direct-cell and Store loop. The city-scale
analogy earns its space only after the relevant global-laboratory boundary, then provides a fast
visual scale cue without competing with the report's numbers or the live colony.

**Consequence.** `EndingView` consumes the pure presentation and eligibility helpers. It leaves no
report surface in the unavailable early state, exposes the compact available state at the boundary,
and mounts `ChicagoScaleGraphic` only in the reached report. The inline SVG has a stable 260 by 132
viewBox, grouped lake, shoreline, grid, skyline, and signal geometry, no embedded text, and is
`aria-hidden` because the adjacent report contains the semantic scale information. The
controller routes `reachSoftEnding()` through parse/reduce/persist/reconcile; it exposes no UI
state or DOM work. The presentation honors shared reduced motion and uses intrinsic responsive
layout at 1280 x 800 and narrow widths. At the desktop target the drawer stays clear of the complete
central tumor action surface, preserving direct-cell play while the report is open. A newly accepted
source sequence focuses the report heading once, then is consumed so later ticks preserve the
player's chosen focus. Hiding the
reached report is local presentation state only; its mounted reopen control receives focus and
the saved `SoftEndingState` stays unchanged. `NumberDisplay.unitPresentation` owns alternate
scientific unit vocabulary without importing ending state.

**Owner.** `src/render/ending_view.tsx`, `src/render/chicago_scale_graphic.tsx`,
`src/render/app.tsx`, `src/render/game_controller.ts`, `src/content/ending_copy.ts`, and
`src/ending.css`

### Headless semantic replay boundary

**Decision.** Development replay records a validated current durable snapshot, deterministic seed,
accepted event, semantic post-state, and pure visible-progression projection. It replays every
entry through `parseRuntimeEvent()` and `recordEvent()` and compares data structures structurally.

**Why.** A loaded late-game state must be reproducible without coupling diagnostics to JSON key
order, browser storage, Solid, timers, or a duplicate reducer.

**Consequence.** Replay traces reject stale behavior/source revisions and untrusted malformed
records with typed results. The controller parses each interactive raw event once, reduces its
canonical event, captures one save timestamp, persists and reconciles the durable post-state, then
offers that exact event, cloned post-state, and timestamp to an optional development observer.
Observer failure is isolated from the completed player transaction. Snapshot writes, ticks,
recovery replacement, rejected input, and failed persistence emit nothing. The replay format
remains development-only until a separate published wire contract deliberately names a
compatibility policy.

**Owner.** `src/types/replay.ts`, `src/state/replay.ts`, `src/state/decision_surface.ts`, and
`src/render/game_controller.ts`

### Client-only SolidJS UI boundary

**Decision.** SolidJS is the sole deliberate client UI runtime while keeping
the engine framework-free and the static GitHub Pages deployment contract intact.

**Why.** Solid's fine-grained reactivity fits a long-lived incremental-game display without
duplicating durable state in components. A single controller store and event funnel preserve the
auditable state, persistence, and replay boundaries established by the framework-free engine.

**Consequence.** `src/render/game_controller.ts` is the named no-JSX, DOM-free one-store boundary;
`src/render/**/*.tsx` and `src/main.tsx` consume it for DOM composition. `src/state/`, economy,
BigNum, persistence, and SVG factories do not import Solid. Components receive typed intents, not
a store setter; the controller isolates store snapshots, records through the raw event funnel, and
persists an isolated accepted next snapshot before reconciling the visible store. It injects a
safe nonnegative active clock for event `atMs`, a separate safe nonnegative save clock for envelope
`savedAtMs`, and treats the real `saveToStorage` notice result or an adapter exception as an
unchanged-store, visible-unsaved outcome. SolidStart, routing, resources, server functions, and
network behavior require a new design decision. `docs/SOLID_MODEL.md` is the implementation
contract for the client boundary.

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

**Consequence.** Schema or event changes update the current parser/writer pair, fixture corpus,
drift guards, [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md), and focused acceptance gates. Rejected
raw saves remain untrusted, and boot-level recovery protection prevents automatic overwrite.

**Owner.** [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md)

### Evidence-frozen save recovery contracts

**Decision.** One canonical `SaveNotice` vocabulary and a discriminated `LoadResult` define
recovery behavior:
an absent first-run save proceeds normally, while parser-retained unreadable bytes and storage-read
failure enter distinct fail-closed recovery states until an explicit validated replacement succeeds.

**Why.** Earlier incompatible notice shapes exposed a route by which ordinary activity could
silently replace progress after a failed load. The recovery state must be truthful about whether raw
bytes were retained and must protect either uncertainty from automatic mutation.

**Consequence.** The parser, storage boundary, controller, and UI consume the closed result rather
than widening or redeclaring it. Ordinary actions, ticks, offline initialization, reload, and
imported events cannot advance or write protected sessions. A frozen-contract amendment names
affected consumers, adds an exact boundary or oracle test, and re-runs static, Node, build, and
production-dist Playwright gates before dependent work resumes.

**Owner.** `src/state/save_load.ts`, `src/types/save.ts`, and
`src/render/game_controller.ts`

### Four distinct prestige systems

**Decision.** Prestige remains four mechanically different systems: L1 Metastasis is allocation,
L2 Host Transfer is a deterministic host draft, L3 Immortalization is a permanent Passage tree,
and L4 Dissemination is a renewable graph frontier.

**Why.** The game needs compounding strategic depth rather than four reskinned resets. The accepted
design proves L1 supplies early-run variation, L2 choices are reload-stable, L3 preserves a narrow
automation decision, and L4 continues supplying decisions after authored nodes are stabilized.

**Consequence.** `LineageLedger` is the sole reset-surviving history record, including explicit
`currentHostRunId` and canonical-order organ-tag history. Separate
authoritative L1 `MetastasisState` and L2 `HostTransferState` own their currencies and visible
choices; history never duplicates either. Terminal rewards are transient trusted quotes whose
`sourceEventSequence` is a required revision, never UI-supplied reward state. `deriveSeedV1` is
the sole versioned seed derivation API, and `generateHostDraftV1` saves one complete ordered
four-card draft before display, including its reveal list and source revision. One complete-state
projection module owns all L1/L2/L3/L4 resets; helpers return projections while
`recordEvent()` remains the exclusive durable-mutation and sequence owner. The current
format-2/schema-8 state requires culture, network, and ending aggregates together. `ReplayLog`
records accepted events and proves normalized durable state plus visible progression through the
same parser and reducer.
UI confirmation sends stable IDs and revision only, then preserves the controller's
persist-before-reconcile rule. Balance work reviews decision witnesses and tuning observations
rather than accepting cosmetic layer variation.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md)

### Culture and campaign boundaries

**Decision.** L3 owns a compact CultureState with Passages, purchased upgrades, one selected
cryobank program, and one exact-affordable queued producer action. L4 owns NetworkState with a
complete selected active campaign, sourceFrontier tuple, saved planned edge records, canonical
completed-campaign archive, renewable frontier progression, and one selected containment node.

**Why.** A queue needs durable revision and execution provenance to automate exactly one producer
purchase without converting strategic actions into automatic behavior. A campaign needs its full
selected plan and its source frontier after the pending frontier is cleared so completion,
rendering, save validation, and replay use the same immutable topology. A completed-campaign
archive keeps durable history without loose retired IDs. Containment is a meaningful tradeoff only
when it names one node rather than changing the whole network.

**Consequence.** `queue-assay-producer-action` saves a producer plus its event revision, and only a
matching `purchase-producer` event with `execution: "assay"` consumes it; manual purchases retain
manual provenance. `activeCampaign` stores the selected mandate plan, its sourceFrontier tuple,
and selection time. Completion appends the same retained topology to completedCampaigns, increments
globalTier, and creates the next saved deepen/widen/reroute frontier. Each planned edge stores its
ID and endpoints. `containedNodeId` applies lower detection and reduced throughput only at the
selected established or stable node. The current parser validates the closed culture, network, and
ending aggregates exactly.

**Owner.** `src/prestige/culture.ts`, `src/prestige/network.ts`, and
`src/state/save_parse/prestige.ts`

### Node Pressure-credit authority

**Decision.** `networkNodeCreditQuote` is the sole reducer and UI authority for the one-time
Transmission Pressure credit of a stable network node. The culture assay queue has one durable slot;
an accepted queue action explicitly retargets that slot and records its new revision.

**Why.** Pressure needs the same explainable result at the button and at the durable event boundary.
Real cell production becomes strategically meaningful only when it is combined with the named
node/campaign-local throughput and detection tradeoff plus committed topology. A one-slot queue
keeps the automation boundary visible and prevents a silent backlog of producer purchases.

**Consequence.** The quote starts with `cellProductionRate`, applies the named local effects, and
uses bounded catalog tunables for production, committed directed depth, committed adjacency, tag
diversity, and final credit. `collect-transmission-pressure` recomputes it, writes the exact credit,
and appends the node to the lineage ledger in one event. Stabilization updates only status and
campaign completion. This mechanism introduces no separate tick or run-wide production multiplier. A
later `queue-assay-producer-action` replaces the sole queued target atomically; only its matching
`purchase-producer` with assay execution consumes it.

**Owner.** `src/prestige/network_effects.ts`, `src/state/events.ts`, and
`src/render/network_panel.tsx`

### Prestige effects use selected context

**Decision.** L1 writes one catalog-backed `MetastasisState.activeNicheContext`; L2 preserves it;
and L3 clears it. A pure prestige-effects adapter composes niche-only and host-only contributions
independently at named mechanics consumers.

**Why.** L1 clears local regions, so historic allocations cannot honestly identify a current
biological location. A universal portfolio multiplier would erase site/program/host tradeoffs.

**Consequence.** The current parser, writer, and reset projection own exact active-niche validity
and lifecycle. `src/prestige/effects.ts` is fully neutral only when both niche and active
host are absent; protected-route affinity additionally requires matching active-niche site and
active-host draft/card provenance. Metabolism, vessel upkeep/capacity, route risk, visibility,
pressure, and reserve consumers compose bounded named effects while renderer code remains
presentational. `reduced_trait_liability` uses a target-trait discriminant after host selection and
typed saved provenance. Permanent tests cover semantic effects, provenance, parser/reducer
atomicity, and live/offline parity; balance calibration keeps portfolio/card comparisons as dated
evidence.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md)

### Explicit stylesheet asset contract

**Decision.** `src/style.css` remains the base stylesheet. Cohesive domain surfaces may use an
explicitly linked and build-allowlisted stylesheet asset such as `src/prestige.css`.

**Why.** One base sheet preserves shared visual tokens, while prestige-scale UI needs a durable
ownership boundary. An explicit asset contract makes every shipped stylesheet visible to the build
and browser proof.

**Consequence.** Source HTML links each asset; build preflight and copying use an explicit
allowlist; the owning design document names the asset; source-line limits still apply; and a
production browser check proves the copied file is active. Domain assets never depend on incidental
build discovery.

**Owner.** [TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md) and [SOLID_MODEL.md](SOLID_MODEL.md)

### Prestige-owned catalog-backed transit history

**Decision.** The transit resolver handles an arrived transit through a catalog-backed
`OrganSiteId`, then records the destination's canonical `OrganTagId` values and transit count in
the lineage ledger. Current `RegionId` values remain local stage projections rather than
organ-history identities.

**Why.** A region's layout identity cannot truthfully establish its biological destination. The
ledger needs reset-surviving, catalog-owned route evidence for Metastasis and later portfolio
decisions.

**Consequence.** The closed progression state precedes the organ-site, ledger, and transit
contract, which has one authoritative writer. `resolve-transit` validates a pending transit and
compatible destination once, creates or marks its local seeded region, and records ledger tags
only for arrival. Lost and invalid transits are atomic. The resolver computes viable current
regions from the run but consumes persisted ledger organ tags for eligibility and diversity; it
never infers an organ from a `RegionId`.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) and `src/prestige/seeding.ts`

### Stages and morphology are data contracts

**Decision.** Stage transition proceeds only through semantic gates and explicit adjacent events,
and their real producer-specific rate and quote relations create a documented decision witness.
The morphology resolver produces immutable morphology from declared, row-ID-provenanced
contributions and durable seed identity; it does not render, place, or infer biology from ambient
state.

**Why.** A stage label or preference field without a measured decision consequence is a reskin.
Likewise, drawing before a deterministic morphology grammar would make biological claims
untraceable and prevent later layout and rendering owners from sharing a stable input.

**Consequence.** All twelve stage records retain gate, UI mode, retired assumption, gameplay
identity, and real observable strategy behavior. `MorphologyParams` has an accepted readonly
shape; layout consumes it as data only, and the SVG renderer owns visual output, accessibility, and
performance. The landmark selector is test-only maintenance and does not create product behavior.

**Owner.** `src/stages/gates.ts`, `src/svg/morphology.ts`,
`src/svg/colony_layout.ts`, and `src/svg/colony.tsx`

### Core hallmark event activation

**Decision.** `HallmarkEffect` activates through the `spend-telomerase` event before
any core-hallmark source changes, with atomic parser-to-storage behavior and named downstream
replay ownership.

**Why.** The evidence freeze requires an explicit amendment before changing a closed event union.
One narrow first event makes the durable mutation path testable without silently coupling hallmark
activation to prestige or replay implementation.

**Consequence.** Parser, reducer, save, controller, UI, focused Node, and production-browser
evidence reject hostile requests without partial mutation; semantic replay transports the frozen
event inventory instead of inventing a parallel vocabulary. The canonical runner remains
`./check_codebase.sh`; production-dist Playwright owns browser proof.

**Owner.** `src/types/events.ts`, `src/state/event_parse.ts`, and
`src/state/events.ts`

### 2011 hallmark event boundary

**Decision.** The frozen `GameEvent` union includes `convert-substrate`,
`set-region-mask`, and `activate-inflammation`, while retaining `select-mutation` as the single
deterministic-offer selection event.

**Why.** ATP conversion, region-local immune masking, and an explicit inflammatory episode are
distinct player choices that need truthful parser-to-storage identities. Reusing an unrelated
event or rerolling offers in the view would hide a durable choice and weaken replay evidence.

**Consequence.** The type owner selects a safe canonical amount representation without unchecked
casts or floats; closed ATP-sink and mutation-offer catalogs, deterministic deadlines and offers,
and exact save relations are shared by event, parser, reducer, save/load, controller, SolidJS,
browser, and replay consumers. Rejections and persistence failure preserve state, sequence,
queue, storage, and recovery protection exactly.

**Owner.** `src/types/events.ts`, `src/state/event_parse.ts`, and
`src/state/events.ts`

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

**Decision.** The late-hallmark model replaces provisional maps and the region senescence backlink with
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
rotation for both live and offline simulation. The current parser requires the complete aggregate.
Prestige activation passes through one adapter, whose L3 implementation reads the lineage ledger.
The frozen visual projection maps phenotype variance, chromatin program, microbiome surface, and
retained senescence to named provenance rows. Durable tests cover operation relations, atomicity,
saved offers, normalized live/offline equivalence, and frozen provenance; tuning, fuzzing, contact
sheets, and 1280 x 800 inspection remain dated evidence.

**Owner.** `src/hallmarks/late_hallmark_types.ts`, `src/hallmarks/late_hallmark_tick.ts`, and
`src/state/events.ts`

### Offline durable projection boundary

**Decision.** Economy adapters expose elapsed effects only as an exact four-field durable
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

**Owner.** `tools/balance_sim.mjs`, `tools/balance_scenarios/`, and
`docs/REPO_STYLE.md`

### Autonomous release-candidate closure

**Decision.** Milestones close through reproducible manager-and-subagent evidence. External
publication is a separate distribution operation.

**Why.** The release-candidate plan needs a complete unattended path while preserving honest
evidence boundaries for a locally built static game.

**Consequence.** Each visual, state, and Pages-shaped claim names a fixture, synthetic transition,
debug or capture harness, browser behavior check, or static workflow contract. Permanent tests
protect lasting semantic behavior; captured reports remain dated artifacts. Git history and remote
distribution can add evidence without changing the completion status of the candidate.

**Owner.** `docs/active_plans/implementation_plan.md` and `docs/RELEASE_EVIDENCE.md`

### Offline Pages workflow contract parsing

**Decision.** Use local YAML 1.2-compatible parsing to verify the checked-in GitHub Pages workflow
contract and the semantic parity of the root template and published workflow copy.

**Why.** The release candidate needs reproducible evidence that its Pages workflow has the intended
triggers, permissions, build, artifact upload, and deployment shape without requiring a network
service or installed runtime package.

**Consequence.** `PyYAML` is an explicit development dependency used only by
`devel/verify_pages_workflow.py`. The verifier parses local files, preserves the YAML `on` key,
compares `deploy-pages.yml` with `.github/workflows/deploy-pages.yml` semantically, and reports a
focused contract result. The SolidJS client and its build integration remain the runtime boundary.

**Owner.** `devel/verify_pages_workflow.py` and `pip_requirements-dev.txt`

### Durable domain naming

**Decision.** Repository paths under `src/`, `tests/`, and `tools/` name their enduring behavior
or responsibility. Milestone labels remain in plans, changelog entries, and dated implementation
evidence. A public schema version or scientific year remains when it communicates domain meaning.

**Why.** A durable path should teach a future maintainer what the module provides, independent of
the implementation schedule.

**Consequence.** Schema and domain work classifies every milestone-looking identifier as history,
public compatibility, scientific nomenclature, or temporary leakage. It renames leakage to
behavior terms, updates imports, and favors inline setup or one shared legal-state builder over
test-only fixture files.

**Owner.** [REPO_STYLE.md](REPO_STYLE.md)

## Dependencies

### Living progression and bounded tumor motion

**Decision.** The center visual is one living progression scene. Desktop reading order is active
evolution, dominant tumor arena, then upgrade rack; task and compact layouts put the direct tumor
action first. The scene opens with one large transformed cell, grows through bounded non-regressive
biomass tiers, and layers stage-owned hypoxia, necrosis, vascular maturation, invasion, and
satellites on top. Local division feedback occurs only after an accepted durable action; newly
accepted stages receive one transient presentation emphasis.

**Why.** The incremental loop needs a biological object that visibly earns the player's attention
and changes with progression. A bounded source-owned tier model keeps growing extent, density,
lobulation, and negative space readable without treating arbitrary values as clinical measurement.
The direct click must confirm a real accepted division rather than rewarding inert background input.

**Consequence.** `src/svg/colony_visual_state.ts` owns the four magnitude tiers and
`src/svg/colony_layout.ts` owns their bounded composition response. `src/svg/morphology.ts` and
the visual catalog remain the authority for stage and hallmark grammar. `TumorArena` derives a
pointer location only from rendered membrane or nucleus geometry, then emits division feedback only
after the controller accepts the event. `StageTransitionEmphasis` is keyed presentation state, not
durable biology. Tissue breathing, cycling, perfusion, invasion, and feedback use synchronized,
bounded motion; generic full-arena scanner rings are retired. Reduced-motion rendering preserves
the same static morphology, division result, and arrival state.

**Owner.** `src/render/tumor_arena.tsx`, `src/svg/colony_visual_state.ts`,
`src/svg/colony_layout.ts`, `src/svg/tumor_feedback.tsx`,
`src/svg/stage_transition_emphasis.tsx`, `src/tumor_arena.css`,
`docs/ART_DIRECTION.md`, and `docs/MORPHOLOGY_REFERENCE.md`

### Decorative biological action icons

**Decision.** The first-view interface is an SVG-first game canvas. Action controls use a shared
inline SVG catalog and Solid renderers at micro, standard, feature, and spectacle sizes. Each glyph
is decorative, inherits the control's visual state, and sits inside a native named action. Essential
names, numbers, costs, and states may stay visible; deeper explanation belongs in focusable
tooltips or the optional specimen drawer.

**Why.** The living-tumor game needs quick recognition across producer, hallmark, progression,
lineage, culture, network, transit, and scale-report actions. A visually dominant tumor and
illustrated upgrade machinery create the immediate play invitation, while accessible names and
progressive disclosure preserve the complete biological model without turning the board into a
science poster.

**Consequence.** `src/svg/icons.ts` owns editable geometry, while `src/render/action_icon.tsx`
owns the common 24 by 24 rendering path; domain SVG modules own larger tumor, machine, stage,
culture, route, and reward illustrations. Components select a recognizable family mark for every
meaningful action or status group. SVG remains hidden from the accessibility tree, so native HTML
controls, accessible names, tooltip descriptions, focus restoration, and the specimen drawer own
the interaction contract. The 1280 x 800 first view renders one shallow scoreboard, one dominant
tumor arena, one active evolution family, one illustrated upgrade rack, and one compact reward
strip.

**Owner.** `src/svg/`, `src/render/action_icon.tsx`, `src/render/game_ui_state.ts`,
`src/render/action_tooltip.tsx`, `src/render/inspector_drawer.tsx`,
`docs/ART_DIRECTION.md`, and `docs/active_plans/reports/game_visual_redesign.md`

### Scoped neutral-light specimen treatment and full visual provenance

**Decision.** `src/tumor_arena_neutral_light.css` is a supported, explicitly served scoped
specimen treatment. The contact-sheet manifest v2 owns the complete identity of the served visual
asset set, and its tool has two intentional modes: no arguments rebuild and capture; `--verify-existing`
performs a read-only corpus and provenance verification.

**Why.** The alternate specimen surface needs a real visual treatment, rather than a capture label
that merely changes metadata. A contact review is meaningful only when it can identify every served
HTML, JavaScript, and stylesheet input. Separating capture from verification makes follow-up review
safe and repeatable.

**Consequence.** The build requires and copies the neutral-light stylesheet. The manifest records
sorted visual-asset paths, individual hashes, and their aggregate alongside frame records; review
can verify that identity without mutating output. These dated identities establish attribution for
one capture, not future byte, pixel, or performance requirements.

**Owner.** `src/tumor_arena_neutral_light.css`, `tools/build_solid.mjs`, and
`tools/colony_contact_sheet.mjs`

### Reachable cell-target layout

**Decision.** Canonical layout data keeps a real cell target at every reachable stage.

**Why.** The direct division loop is a player-visible contract, so a reachable scene cannot be
valid if its composition leaves only inert background.

**Consequence.** Bounded layout checks and real production-browser clicks are permanent evidence.
The sparse-void multiplier `0.97` is the largest simple two-decimal value green across seeds
`0..255`; `0.98` failed three avascular seeds. That sweep is one-time calibration evidence.

### Durable evidence and state boundary

**Decision.** Permanent tests retain semantic behavior only; arbitrary slow, calibration, and
source-token tests do not enter the permanent suite. Balance semantic provenance is
`canonical-decision-surface-v1`. Current saves are the exact schema 8 shape, and obsolete
migration helpers are removed.

**Why.** Stable behavior must remain testable through ordinary tuning and refactoring, while
calibration measurements and retired compatibility code would make the suite misleading.

**Consequence.** Candidate manifests publish only after byte-stable re-projection. Calibration
sweeps remain dated reports, and current save parsing rejects obsolete shapes rather than
migrating them.

## Generated artifacts
