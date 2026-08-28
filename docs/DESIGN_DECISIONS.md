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

**Consequence.** `LineageLedger` stores reset-surviving identity and one-time claims; saved,
deterministic draft and frontier derivation own visible choice identity; `NetworkState` owns L4
tiers, pressure, graph, mandates, and campaigns. M14/M15 extend closed `GameEvent` and save
contracts now; M20 owns only `ReplayLog` transport, recording lifecycle, and byte-identical replay
proof. M21 falsifies universal strategies rather than accepting cosmetic layer variation.

**Owner.** [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md)

### Stages and morphology are data contracts

**Decision.** M9 stages transition only through semantic gates and explicit adjacent events, and
their real producer-specific rate and quote relations must cause a bounded observed purchase-order
shift. M16 resolves immutable morphology from declared, row-ID-provenanced contributions and
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

**Decision.** M10 activates `HallmarkEffect` through one closed `spend-telomerase` event before
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

## Dependencies

## Generated artifacts
