# Plan: Cancer Clicker NG, an endless incremental game

## Context

`cancer-clicker-ng` is a bare `typescript` starter repo: toolchain, lint gate, Playwright
harness, and GitHub Pages build are wired, but no `src/` exists. There is no game yet.

The goal is an endless incremental (idle) game in the Cookie Clicker / Egg, Inc. /
Universal Paperclips lineage where the player is a single transformed cell. The player clicks
to divide, unlocks the 14 Hanahan hallmarks of cancer as the upgrade tree, escalates through
real oncology staging, kills the host, and keeps going: immortalized cell line, global lab
contamination, and finally enough biomass to fill every skyscraper in Chicago (the real HeLa
thought experiment). Tone is dark satire, science-accurate, deadpan. No lesson panels, no
quizzes; the player learns by playing.

Three properties are load-bearing and settled by the user:

- **Endless.** Walking away and coming back with more to spend is the genre's core promise.
  Offline accrual and stacked prestige layers are day-one requirements, not polish.
- **Egg, Inc.-style number names.** The player should meet "septenvigintillion" (10^84) and
  learn it. This forces a custom big-number type and a Conway-Wechsler illion name generator.
- **No human in the execution path.** Manager and subagents must carry this plan from empty repo
  to a validated release candidate while the human sleeps. Every gate is an automated check, a
  captured artifact, or an agent review with written criteria.

This revision incorporates two rounds of external LLM plan review and two user directives:
remove all human-dependent gates, and prefer many small milestones over few large ones. The
milestone count went from 6 to 22 for those reasons.

The organizing bet of the plan: **the biology drives the mechanics, the visuals, and the
pacing.** Four design artifacts are written before their implementing code, so the late game is
biology expressed as systems rather than larger numbers layered onto a good opening.

## Objectives

- Ship a playable, savable, offline-accruing incremental game from milestone 7 onward, growing
  in depth rather than arriving all at once.
- Model the 14 hallmarks as 14 mechanically distinct branches, where "distinct" means each
  changes a player decision, specified in writing before implementation.
- Provide four prestige layers that are four different strategic systems, proven by showing that
  no single purchasing strategy is optimal across all four.
- Represent arbitrarily large quantities with correct short suffixes and full Latin illion names,
  with arithmetic proven against the operations the economy actually performs.
- Make every stage-dependent visual change traceable to a documented biological rationale.
- Reach a fully validated release candidate, summarized in one compact evidence package, with no
  human action required at any milestone.

## Design philosophy

The plan trades a longer design-artifact phase for cheaper implementation, and a larger milestone
count for recoverability. Twenty-two small milestones each reach green on their own; a stall in
one does not hide unresolved design decisions inside an oversized blob.

Four design documents gate their implementing milestones:
`docs/PROGRESSION_DESIGN.md` (hallmark mechanics), `docs/PRESTIGE_DESIGN.md` (layer identities),
`docs/MORPHOLOGY_REFERENCE.md` (biology to visual abstraction), and the offline-semantics section
of `docs/GAME_DESIGN.md`. Dispatching an implementing milestone without its artifact is a process
failure, not a shortcut. This is the plan's answer to the review's central point: the hollow
version of this game is one where "distinct" and "biologically grounded" are claims rather than
specifications.

Contracts are written early but frozen **late**. Freezing `src/types/*` at M1, before hallmarks,
prestige, stage transitions, and offline accrual have exercised them, would invite either
immediate amendments or implementations bent around inadequate types. M1 writes contracts and
proves them against five compile-only vertical slices; the freeze is its own milestone (M8) after
M3 through M7 have used them for real.

Rejected alternative: `break_infinity.js` as a dependency. It would save the numbers lane, but
the repo has no runtime math dependency, and the Egg, Inc. naming requirement means a custom
formatter has to be written regardless. Owning a small `{mantissa, exponent}` type keeps math
dependency-free and puts the naming table beside the arithmetic. SolidJS is separately approved
as the sole UI runtime in `docs/SOLID_MODEL.md`. Cites **Long-term over short-term**
and **Design for adaptability** from `docs/REPO_STYLE.md`.

Second deliberate trade: hallmark effects and prestige layers are **data plus typed handlers**,
never hardcoded branches in the tick loop. Adding hallmark 15 is a table entry plus one handler.
Cites **Design for adaptability** and **Atomic task decomposition**.

- Evidence strategy for uncertain methods: six design questions are genuinely open (hallmark
  distinctness, prestige identity, offline semantics, morphology mapping, cost-curve shape,
  pacing). Each gets a named artifact before dispatch and a measurement afterward. The strategy
  laboratory (M21) measures pacing against five declared player models, so no curve is adopted on
  one hidden purchasing heuristic. Deterministic replay (M20) makes any balance or save finding
  reproducible exactly.

## Scope

- Author all game source under `src/`, entry `src/main.tsx` from M7, styles in `src/style.css`, markup in
  `src/index.html` (the three paths `build_github_pages.sh` requires).
- Build a custom `BigNum` whose operation set is derived from the economy's actual needs, plus an
  Egg, Inc.-style formatter with Conway-Wechsler illion names and a display toggle.
- Build the tick loop, click handler, producer economy, and versioned save/load with one
  documented offline-accrual semantics.
- Implement 12 progression stages and 14 hallmark branches as data-driven tables, each hallmark
  specified in `docs/PROGRESSION_DESIGN.md` before implementation.
- Implement four prestige layers, each with a distinct strategic mechanic specified in
  `docs/PRESTIGE_DESIGN.md`.
- Split colony art into a layout subsystem (macro composition) and a rendering subsystem (local
  morphology), driven by `docs/MORPHOLOGY_REFERENCE.md`.
- Build the soft ending as a full progression artifact: trigger, presentation, number formatting,
  visual transformation, prestige interaction, and post-ending continuation.
- Build a deterministic replay format and a five-strategy balance laboratory.
- Write the satirical copy pass with an automated tone and safety guard.
- Add Node unit tests, Playwright smoke and playthrough tests, and a computed visual-metrics
  battery.
- Produce `docs/RELEASE_EVIDENCE.md`: one compact package a human can approve from, plus the full
  durable documentation set.

## Non-goals

- Add runtime npm dependencies other than the approved client-only `solid-js` UI runtime and its
  required build integration. Dev dependencies otherwise stay as shipped.
- Build a backend, accounts, cloud saves, leaderboards, or analytics.
- Build monetization of any kind: no ads, no microtransactions, no timers-for-money.
- Add quizzes, graded assessment, or explicit teaching panels. This is not a trainer;
  `docs/PLAYFUL_TRAINING_GAME_STYLE.md` does not govern this project.
- Produce the single-file HTML export. GitHub Pages `dist/` is the release target.
- Use canvas rendering in the first release. The colony view is SVG plus CSS.
- Depict identifiable real patients, or frame the satire at people who have cancer. The target of
  the joke is the cell's relentless optimization.
- Run `git commit` or `git push`. Repo rule reserves those for the human. The plan's terminal
  state is a staged, validated candidate with a drafted commit message, reached without waiting
  on anyone.
- Add breadth during implementation. Achievements, audio, a fifth prestige layer, a fifteenth
  hallmark, a thirteenth stage, a backend, or a second renderer are all excluded from this
  release. This is a scope **freeze**, not a scope ceiling: the plan already carries enough
  independent systems for a substantial game, and the remaining value is in how they reach into
  each other. The productive form of ambition from here is depth (hallmarks interacting with
  hallmarks, prestige changing which hallmarks are attractive, stages changing play, morphology
  reflecting mechanics, L4 renewing its decisions forever), not feature count. Post-release
  additions are named under `## Open questions and decisions needed` and are cheap because the
  event funnel and replay format already exist.

## Current state summary

- Repo contains toolchain and docs only. No `src/`, no `tests/test_*.mjs`, no Playwright specs
  beyond `tests/playwright/repo_root.mjs`.
- `build_github_pages.sh` requires exactly `src/main.ts`, `src/index.html`, `src/style.css` and
  copies **only** `index.html` and `style.css` into `dist/`. It copies no asset directory.
  Consequence: all SVG is generated by TypeScript, and all CSS lives in one file. Hard
  constraint, not a preference.
- `check_codebase.sh` runs typecheck, `tsconfig.lint.json` typecheck (fails TS18003 unless at
  least one `.ts` exists under `tests/` or `tools/`), eslint at zero warnings, prettier check,
  and `node --import tsx --test tests/test_*.mjs`.
- `docs/REPO_STYLE.md` requires generated output directories at the **repo root** with a
  root-scoped `/output*/` ignore rule. A nested `tests/e2e/output/` would be tracked and would
  violate that rule, so the balance laboratory writes to `output_balance/` at the root.
- Binding repo rules: files under 1000 physical lines, ASCII-only source, tabs for indentation,
  `git mv` for renames, agents update `docs/CHANGELOG.md` and never commit.
- `svg-creator-expert` carries a local book corpus used by the art lane. Its
  `LOCAL_SERVIER_SVG_FILE_PATHS.txt` asset inventory is **not present on this machine**; the plan
  assumes none of it.

## Architecture boundaries and ownership

```
src/
  main.ts                  entry: bootstrap, wire loop, mount UI
  index.html               shell markup
  style.css                the only stylesheet the build copies
  types/
    bignum.ts              BigNum shape and brand
    ids.ts                 branded ProducerId, HallmarkId, StageId, PrestigeId
    state.ts               GameState, RuntimeState
    save.ts                SaveFileV1, version union, migration signature
    events.ts              GameEvent discriminated union
    effects.ts             HallmarkEffect handler interface
    morphology.ts          MorphologyParams: the state -> art contract
    replay.ts              ReplayLog record shape
  bignum/
    bignum.ts              {m, e} arithmetic over the derived operation set
    solve.ts               bulk-buy series sum and max-affordable solver
    illion.ts              Conway-Wechsler name generator, short suffix table
    format.ts              display: short/long toggle, precision, plurals
  state/
    game_state.ts          canonical state object and reducers
    events.ts              record_event dispatch funnel
    save_load.ts           serialize, parse, validate, migrate
    offline.ts             bounded coarse-step offline simulation
    replay.ts              dev-only record and replay over the event funnel
  economy/
    producers.ts           producer table (as const satisfies)
    costs.ts               cost curves, bulk-buy math
    tick.ts                per-frame production integration, injectable clock
  hallmarks/
    catalog.ts             14 branches, levels, gates, mechanic class
    effects.ts             typed effect handlers, one per hallmark
  stages/
    catalog.ts             12 stages, gates, UI mode
    transitions.ts         stage advance logic
  prestige/
    layers.ts              4 layer definitions, reset scopes, currencies
    reset.ts               what each layer wipes and preserves
    seeding.ts             L1 organ-site allocation
    hosts.ts               L2 host draft and traits
    culture.ts             L3 passage tree
    network.ts             L4 contamination graph
  ending/
    trigger.ts             soft-ending condition and post-ending continuation
    sequence.ts            presentation sequence and scale reframing
  render/
    shell.ts               layout, panel mounting
    producers_panel.ts     buy buttons, bulk toggles
    hallmark_tree.ts       branch tree UI
    stage_panel.ts         stage banner, progress
    prestige_panel.ts      per-layer panels and confirm modals
    offline_report.ts      return-from-away summary
    ending_view.ts         ending presentation
    log.ts                 scrolling deadpan event log
    number_display.ts      shared BigNum text rendering
  svg/
    noise.ts               seeded correlated noise field
    morphology.ts          MorphologyParams -> per-cell trait resolution
    blob.ts                radial contour sampled through the noise field
    cell.ts                one cell as a volume (local morphology)
    colony_layout.ts       macro: silhouette, regions, density, negative space,
                           depth strata, invasive fronts, focal regions
    colony.ts              renders a layout into SVG (no layout decisions)
    defs.ts                shared <defs>: gradients, filters, masks, motifs
    describe.ts            stage-aware <title>/<desc>
    icons.ts               hallmark and producer glyphs
  content/
    copy.ts                stage, hallmark, milestone strings
    ending_copy.ts         ending text
```

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream  | Component                                                             | Review boundary                                       |
| ----------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- |
| A0 Contracts            | `src/types/*`                                                         | `typescript-engineer` designs; frozen at M8, not M1   |
| A Numbers               | `src/bignum/*`                                                        | unit-tested in isolation; imports nothing from `src/` |
| B State and persistence | `src/state/*`                                                         | sole owner of `localStorage`                          |
| C Economy               | `src/economy/*`                                                       | pure functions over state; no DOM                     |
| D Hallmarks and stages  | `src/hallmarks/*`, `src/stages/*`                                     | data plus handlers; no DOM                            |
| E Prestige and ending   | `src/prestige/*`, `src/ending/*`                                      | only module allowed to wipe state                     |
| F UI shell and render   | `src/main.tsx`, `src/render/*.tsx`, `src/index.html`, `src/style.css` | only DOM owner                                        |
| G Art                   | `src/svg/*`                                                           | pure producers; no state reads                        |
| H Content and tone      | `src/content/*`                                                       | strings only; guarded by an automated lint            |
| I Test and balance      | `tests/**`, `output_balance/`                                         | never edits `src/`                                    |
| J Design artifacts      | `docs/*`                                                              | writes the four gating documents                      |

Ownership rule on every dispatch: an agent edits only its own column. A cross-module type need
pauses the agent, routes to `typescript-engineer`, and resumes after the stub lands.

## Milestone plan

Twenty-two milestones. Each reaches green independently. No milestone waits on a human.

| M   | Title                           | Summary                                                  | Goal                                                     |
| --- | ------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| M1  | Contracts and slice probe       | Types plus five compile-only vertical slices             | Contracts exist and are provisionally sufficient         |
| M2  | Progression design              | `docs/PROGRESSION_DESIGN.md` for all 14 hallmarks        | Distinctness specified before anything depends on it     |
| M3  | Numbers                         | BigNum over a derived operation set, illion names        | Economy math proven, not just formatting                 |
| M4  | State and persistence           | Canonical state, event funnel, versioned save            | Save round-trips and migrates                            |
| M5  | Offline semantics               | One documented model, implemented and tested             | Away time matches live time within tolerance             |
| M6  | Economy and tick                | Producers, costs, bulk buy, frame integration            | Numbers go up correctly                                  |
| M7  | Minimal playable                | Click, buy, idle, reload, offline report                 | Genre-complete idle game, one stage                      |
| M8  | Contract freeze                 | Evidence review of `src/types/*` after real use          | Contracts frozen on evidence                             |
| M9  | Stage ladder                    | 12 stages, gates, transitions, UI modes                  | Full arc traversable in simulation                       |
| M10 | Hallmarks, core six             | Six 2000-era branches                                    | Six distinct mechanics live                              |
| M11 | Hallmarks, 2011 four            | Metabolism, immune evasion, inflammation, instability    | ATP resource live                                        |
| M12 | Hallmarks, 2022 four            | Plasticity, epigenetics, microbiome, senescence          | Tree complete at 14                                      |
| M13 | Prestige and interaction design | `docs/PRESTIGE_DESIGN.md`, `docs/SYSTEM_INTERACTIONS.md` | Four systems that reach into each other, not four resets |
| M14 | Prestige layers 1 and 2         | Metastasis seeding, host draft                           | Reset scopes verified by unit test                       |
| M15 | Prestige layers 3 and 4         | Immortalization tree, contamination network              | Endless scaling confirmed                                |
| M16 | Morphology reference            | `docs/MORPHOLOGY_REFERENCE.md` plus noise and grammar    | Biology mapped before drawing                            |
| M17 | Colony layout subsystem         | `colony_layout.ts`: macro composition                    | Stage reads correctly with cell detail suppressed        |
| M18 | Cell rendering and defs         | `cell.ts`, `blob.ts`, `defs.ts`, `describe.ts`, icons    | Cells unique, same-stage family recognizable             |
| M19 | Soft ending                     | Trigger, sequence, scale reframing, continuation         | The payoff is a system, not a text screen                |
| M20 | Deterministic replay            | Record and replay over the event funnel                  | Any bug or balance finding reproduces exactly            |
| M21 | Balance laboratory              | Five strategy bots, machine-readable report, tuning      | Pacing decided on evidence across play styles            |
| M22 | Release evidence package        | `docs/RELEASE_EVIDENCE.md`, staged candidate             | One compact artifact a human approves from               |

### Milestone: M1 contracts and slice probe

- Depends on: none.
- Deliverables: `src/types/*`; a stub `.ts` under `tools/` so `check_codebase.sh` step 2 does not
  hit TS18003; minimal `src/main.ts`, `src/index.html`, `src/style.css`; compile-only slices.
- Workstreams: A0 with `typescript-engineer`.
- Entry criteria: `npm install` clean; `./check_codebase.sh` passes on the empty repo.
- Exit criteria: five compile-only vertical slices typecheck without an `as` cast outside brand
  constructors and save guards. The five: one hallmark effect handler, one stage transition, one
  prestige reset, one offline accrual call, one UI event round trip.
  `./build_github_pages.sh` succeeds; the page loads with zero console errors.
- Parallel-plan ready: no. Contract authorship is one owner by design.

### Milestone: M2 progression design

- Depends on: M1. Runs in parallel with M3.
- Deliverables: `docs/PROGRESSION_DESIGN.md`.
- Workstreams: J writes; D owns; E and I review.
- Entry criteria: contracts drafted.
- Exit criteria, three parts.
  - **Distinctness.** A written mechanic-class taxonomy (for example: rate multiplier, new
    resource, unlock or gate, resource conversion, risk and tradeoff toggle, automation, offline
    behavior, cost-curve reshaping, scaling-exponent change, morphology and synergy), and for
    each of the 14 hallmarks a record of: player-facing mechanic, resource interaction, unlock
    condition, visible consequence, and why it is distinct from every other branch. Rules: at
    most two branches may share a mechanic class; each branch carries a sentence of the form
    "before this branch the player did X; after it the player decides Y." A branch whose sentence
    reduces to "the same decision with bigger numbers" is redesigned before dispatch.
  - **Synergy and tension.** Fourteen individually good mechanics can still be a menu rather than
    a tree. The document names a small set of deliberate combinations where one branch enables,
    amplifies, changes, or competes with another. Cancer biology supplies the fertile pairs
    already: metabolism with proliferation, angiogenesis with hypoxia and necrosis, genome
    instability with immune evasion (more neoantigens, more visibility), senescence with
    replicative immortality, plasticity with everything. Success condition: the player sometimes
    picks branch A **because** branch B is developed, rather than ranking all 14 independently.
    Tensions matter as much as synergies; at least three pairs must pull against each other.
  - **Stage gameplay identity.** For each of the 12 stages, the new pressure, opportunity,
    resource relationship, or constraint that appears. The bar is "I play differently because I
    entered this stage," not "the UI and the tumor changed." A stage with no gameplay identity is
    merged into its neighbor rather than shipped as a reskin. Recorded here because M9 implements
    stages and must not be dispatched against a visual-only specification.
- Why this early: the save schema and the state shape depend on what fields hallmarks need.
  Writing this after M4 would mean migrating a schema that was designed blind.
- Parallel-plan ready: no.

### Milestone: M3 numbers

- Depends on: M1.
- Deliverables: `src/bignum/*`, `docs/BIGNUM_OPS.md`, `tests/test_bignum.mjs`,
  `tests/test_bignum_solve.mjs`.
- Workstreams: A.
- Entry criteria: M1 exit met.
- Exit criteria: the operation inventory is written **first** from what the economy and prestige
  formulas need, then implemented and tested. Tests protect game invariants, not a generic math
  library: bulk-buy cost equals the sum of individual costs; the max-affordable solver never
  overspends by one unit; comparison is a total order across extreme exponent gaps; prestige-gain
  formulas are monotonic; fractional `pow` stays within tolerance; illion names are correct at
  10^33, 10^84 (septenvigintillion), 10^303, 10^3000.
- Parallel-plan ready: yes. Arithmetic, solver, and naming are independent.

### Milestone: M4 state and persistence

- Depends on: M2, M3.
- Deliverables: `src/state/game_state.ts`, `events.ts`, `save_load.ts`,
  `tests/test_save_migration.mjs`, fixture saves under `tests/fixtures/`.
- Workstreams: B.
- Entry criteria: progression design written, so the schema knows what it must hold.
- Exit criteria: save round-trips exactly; an old fixture save migrates forward; an unresolvable
  field restores a safe default and logs visibly rather than discarding the save; `record_event`
  is the single funnel and the compiler enforces a handler for every event variant.
- Parallel-plan ready: no. One state owner.

### Milestone: M5 offline semantics

- Depends on: M4.
- Deliverables: the offline section of `docs/GAME_DESIGN.md`; `src/state/offline.ts`;
  `tests/test_offline_equivalence.mjs`; `src/render/offline_report.ts`.
- Workstreams: J decides with B and C; B implements; I verifies.
- Entry criteria: M4 exit met.
- Exit criteria: exactly one documented model, chosen before implementation, stating explicitly
  whether stage transitions, hallmark effects, prestige availability, temporary effects, and
  nonlinear production are simulated or approximated. The plan's recommended model, to be
  confirmed or replaced: **bounded coarse-step simulation**. Away time replays through the real
  tick in fixed macro-steps (default 60 seconds, capped at the dormancy limit), so nonlinear
  effects behave the same offline as online. Hallmark effects and nonlinear production are
  simulated. No purchases are made automatically. Stage transitions and prestige availability
  crossed while away are queued as pending advances and resolved on return through the offline
  report. Temporary effects do not tick down while away. Verification: an offline replay of N
  hours and a live tick loop over the same simulated N hours agree within 2 percent on every
  tracked resource. This invariant is what stops offline from silently diverging once hallmarks
  add nonlinearity.
- Parallel-plan ready: no.

### Milestone: M6 economy and tick

- Depends on: M5.
- Deliverables: `src/economy/*`, `tests/test_costs.mjs`.
- Workstreams: C.
- Entry criteria: M5 exit met.
- Exit criteria: eight stage-1 producers; cost curves as data; bulk buy of 1, 10, 100, and max
  agree with hand-computed values; tick integration is delta-time correct under an irregular
  injected clock. Tests never sleep.
- Parallel-plan ready: yes.

### Milestone: M7 minimal playable

- Depends on: M6.
- Deliverables: `docs/SOLID_MODEL.md`; `src/main.tsx`; no-JSX DOM-free
  `src/render/game_controller.ts`; `src/render/app.tsx`, `shell.tsx`, `producers_panel.tsx`, and
  `number_display.tsx`; `tools/build_solid.mjs` using
  `esbuild-plugin-solid`; `tests/test_solid_controller.mjs`; committed production-dist Playwright
  smoke, first captured screenshot, and debug fast-forward hooks behind a URL flag. F owns the
  Solid/controller/render/toolchain package, and I owns the Node and Playwright proof. The
  `build_github_pages.sh` front door and `dist/` contract remain intact.
- Toolchain: add production `solid-js` and development `esbuild-plugin-solid`, changing package
  and lockfile together only during M7. `tsconfig.json` preserves JSX with `solid-js` import source
  and includes TSX; the lint project and ESLint test glob include TSX without dropping Node types.
  The existing Node/tsx discovery in `check_codebase.sh` runs pure controller/store atomicity and
  signal-isolation tests requiring no DOM. `tools/build_solid.mjs` is the sole esbuild JavaScript-API/plugin
  production bundle; `build_github_pages.sh` resolves `main.tsx` first, invokes only that bundle,
  and preserves existing `dist/`, assets, `.nojekyll`, and assertions. TSX DOM behavior is proven
  only in committed production-dist Playwright through `run_playwright_tests.sh`.
- Workstreams: F owns the no-JSX controller, render, build, and toolchain. Its controller uses
  separate safe-nonnegative-integer `ActiveClock` event timestamps and `SaveClock` envelope
  samples, and a result-aware `PersistSnapshot(state, savedAtMs)` adapter over
  `saveToStorage` notices. I owns Node controller tests and production Playwright proof.
- Entry criteria: M6 exit met.
- Exit criteria: a player can click, buy, idle, reload, and see offline gains. Playwright asserts
  page load with zero console errors, first click increments, save survives reload, and an offline
  grant appears after a clock-skewed reload. The controller clones `unwrap` snapshots before every
  `recordEvent`, persists an isolated accepted next snapshot before reconciling the store, and
  keeps parser/reducer/storage failures visibly honest. A nonempty `saveToStorage` notice or a
  thrown save-clock/adapter call retains the old visible store and sets unsaved status; only an
  intentional reissue after recovery retries the action. Node/tsx tests import only
  `game_controller.ts` and prove clone/BigNum integrity, hostile-raw no-persist, one event funnel,
  UI-signal isolation, and dual-clock persistence atomicity. Production-dist Playwright alone
  proves granular JSX/effect instrumentation, `<For>` identity/focus, `onCleanup`, accessibility,
  reload, and browser-error behavior. The debug hooks ship here because every later automated
  milestone depends on them.
- Parallel-plan ready: yes.

### Milestone: M8 contract freeze

- Depends on: M7.
- Deliverables: `docs/active_plans/reports/contract_freeze.md`; amendments applied before freeze.
- Workstreams: A0 amends; `reviewer` class audits.
- Entry criteria: M3 through M7 have used every contract in real code.
- Exit criteria: the audit answers, per contract, whether real use required a workaround, a local
  redeclaration, or a cast; every finding is fixed or recorded as accepted with reasoning. After
  this milestone a contract change is an announced amendment that re-runs the full gate. This
  milestone exists because freezing at M1 would have been a claim, not evidence.
- Parallel-plan ready: no.

### Milestone: M9 stage ladder

- Depends on: M8.
- Deliverables: `src/stages/*`, `src/render/stage_panel.tsx`, twelve stages.
- Workstreams: D, F.
- Entry criteria: contracts frozen.
- Exit criteria: all twelve stages reachable in a fast-forwarded run; each stage declares its
  gate, its UI mode, what it retires from the previous stage, and the gameplay identity assigned
  in `docs/PROGRESSION_DESIGN.md`. A stage that changes only the UI fails review; the balance
  laboratory must show that the optimal purchase ordering differs across stage boundaries, which
  is the automated proxy for "I play differently now."
- Parallel-plan ready: yes.

### Milestone: M10 hallmarks, core six

- Depends on: M2, M9.
- Deliverables: sustaining proliferative signaling, evading growth suppressors, resisting cell
  death, enabling replicative immortality, inducing angiogenesis, activating invasion and
  metastasis; `src/render/hallmark_tree.tsx`.
- Workstreams: D, F.
- Entry criteria: `docs/PROGRESSION_DESIGN.md` complete.
- Frozen-contract amendment: before source implementation, activate `HallmarkEffect` and add
  exactly one closed `spend-telomerase` `GameEvent`. The D3 owner inventories parser, reducer,
  save, controller, UI, test, and M20 replay consumers; hostile requests must leave debit, effect,
  event queue, persistence, and protected recovery untouched. Full static, Node, build, and
  production-dist Playwright reruns are required before dependent work resumes.
- Exit criteria: each branch implements its assigned mechanic class as specified; the balance
  laboratory shows that acquiring each branch measurably changes the optimal purchase order,
  which is the automated proxy for "it changed a decision."
- Parallel-plan ready: yes. Six branches, one class each.

### Milestone: M11 hallmarks, 2011 four

- Depends on: M10.
- Deliverables: deregulating cellular metabolism (introduces ATP), avoiding immune destruction,
  tumor-promoting inflammation, genome instability and mutation.
- Workstreams: D, F.
- Entry criteria: M10 exit met.
- Exit criteria: ATP is a real second resource with its own sink, not a display; the
  purchase-order test passes for all four.
- Parallel-plan ready: yes.

### Milestone: M12 hallmarks, 2022 four

- Depends on: M11, M16.
- Deliverables: unlocking phenotypic plasticity, nonmutational epigenetic reprogramming,
  polymorphic microbiomes, senescent cells. These four also write `MorphologyParams`.
- Workstreams: D, G.
- Entry criteria: M11 exit met and the morphology contract in use.
- Exit criteria: the tree is complete at 14; the four late branches gate behind prestige layers;
  each writes at least one morphology parameter, so the upgrade is visible in the colony rather
  than only in a tooltip.
- Parallel-plan ready: yes.

### Milestone: M13 prestige design

- Depends on: M2.
- Deliverables: `docs/PRESTIGE_DESIGN.md` and `docs/SYSTEM_INTERACTIONS.md`.
- Workstreams: J writes; E owns; D and I review.
- Entry criteria: progression design written, since prestige upgrades interact with hallmarks.
- Exit criteria: for each of the four layers, a record of strategic purpose, reset scope, currency
  source, meta-upgrade character, and expected change in play style, plus the three cross-cutting
  questions below. The plan's recommended identities, to be confirmed or replaced:
  - **L1 Metastasis** -- allocation. Reset the colony, keep hallmark levels partially, earn
    Metastatic Potential, distribute it across organ sites with different multipliers, capacities,
    and detection risk. The decision is where to seed.
  - **L2 Host Transfer** -- a draft. The host dies; reset stages and hallmarks; choose the next
    host from a drawn set with traits (immune strength, lifespan, tissue type) acting as run
    modifiers. The decision is which run to play next.
  - **L3 Immortalization** -- persistence. The HeLa moment. Reset L1 and L2 currencies, earn
    Passages, spend them on a permanent tree that converts run knowledge into automation and
    unlocks the 2022 hallmarks. The decision is what never to do again.
  - **L4 Dissemination** -- a network. Spread across a graph of labs and cities; each contaminated
    node raises global scaling and opens adjacent nodes. The decision is breadth versus depth.
    This layer is the endless engine.
    Three cross-cutting questions this milestone must answer in writing, because each one is a place
    where "endless" quietly degrades into "bigger numbers":

- **Early run-to-run variation.** The L2 host draft supplies excellent variety, but it arrives
  deep. Does L1 organ-site allocation already make consecutive early runs feel different? If yes,
  the document states why. If no, organ sites gain a second axis, for example modifying resource
  availability, hallmark effectiveness, stage behavior, or morphology. This deepens a system
  already in scope rather than adding one.
- **L4's renewable decision surface.** L4 is the endless engine, so a static authored graph of
  labs and cities is a trap: once solved, "endless" means only rising currency. The document
  specifies what happens after the authored network is substantially conquered, from options such
  as graph expansion, harder generated regions, procedural branches, or repeating global tiers.
  The success condition is that **L4 keeps producing decisions forever**, not just currency. This
  matters more than a fifth prestige layer would.
- **Cross-system interactions.** `docs/SYSTEM_INTERACTIONS.md` names 10 to 20 high-value
  interactions where hallmarks, stages, organ sites, host traits, passage upgrades, and
  dissemination routes change each other's value. Not an exhaustive matrix. The success condition
  is that prestige choices change which hallmark strategies are attractive, rather than prestige
  sitting on top of an unchanged hallmark economy. This is the single largest remaining
  opportunity in the design: every system is individually specified, and the emergent game lives
  in how they reach into each other.

- Validation, deferred to M21: the strategy laboratory runs the same purchasing strategy against
  all four layers and demonstrates it is **not** optimal in all four. If one strategy wins
  everywhere, the layers are four resets wearing different names and the design is revised.
- Parallel-plan ready: no.

### Milestone: M14 prestige layers 1 and 2

- Depends on: M11, M13.
- Deliverables: `src/prestige/layers.ts`, `reset.ts`, `seeding.ts`, `hosts.ts`;
  `src/render/prestige_panel.tsx`; `tests/test_prestige_reset.mjs`.
- Workstreams: E, F.
- Entry criteria: `docs/PRESTIGE_DESIGN.md` complete.
- Exit criteria: each reset function is unit-tested for exactly what it clears and preserves; a
  simulated run completes three L1 cycles and one L2 cycle; the confirm modal cannot fire
  accidentally.
- Parallel-plan ready: yes.

### Milestone: M15 prestige layers 3 and 4

- Depends on: M12, M14.
- Deliverables: `culture.ts`, `network.ts`, their panels, extended simulation coverage.
- Workstreams: E, F, I.
- Entry criteria: M14 exit met.
- Exit criteria: simulation reaches L4 and shows post-L4 progression still accelerating. Flat
  post-L4 progression fails the milestone, because it means the game is not endless.
- Parallel-plan ready: yes.

### Milestone: M16 morphology reference

- Depends on: M1 for `src/types/morphology.ts`; otherwise independent, so it runs in parallel from
  M9 onward.
- Deliverables: `docs/MORPHOLOGY_REFERENCE.md`, `docs/ART_DIRECTION.md`, `src/svg/noise.ts`,
  `src/svg/morphology.ts`, `tests/test_morphology_grammar.mjs`.
- Workstreams: G, invoking `svg-creator-expert`.
- Entry criteria: morphology contract exists.
- Exit criteria: `docs/MORPHOLOGY_REFERENCE.md` maps biological features to permitted visual
  abstractions, covering at minimum polarity loss, pleomorphism, nuclear irregularity, elevated
  nuclear-to-cytoplasmic ratio, abnormal mitoses, tissue disorganization, invasion, necrosis, and
  metastatic dissemination. Every stage-dependent visual change in the game must be traceable to a
  row in this table; generic "more mutated" styling has no row and therefore cannot ship.
  The document also fixes **morphology composition semantics**, because many systems write into
  `MorphologyParams` (stage, hallmarks, region, depth stratum, prestige progression, possibly host
  traits) and without stated combination rules the contract becomes a dumping ground where later
  features silently overwrite earlier ones. The resolution chain is named and ordered:
  `baseline -> stage -> hallmark -> prestige -> regional -> individual variation`. Each parameter
  declares how contributions combine (additive, multiplicative, categorical, prioritized) and its
  clamp range, and every contribution carries its contributor name so a rendered cell can be
  traced back to what produced it. A parameter without declared semantics fails the milestone.
  `docs/ART_DIRECTION.md` records the illustration-technique survey (see
  `## Art reference routing`) and the deliberate omissions. The grammar exposes named axes:
  elongation, asymmetry, nuclear-to-cytoplasmic ratio, nuclear eccentricity, membrane waviness,
  polarity, mitotic state, heterogeneity, and depth stratum. Discrete seeded randomness selects
  traits; correlated noise shapes continuous form. No drawing code ships before this is green.
- Parallel-plan ready: yes. Two surveys plus two modules.

### Milestone: M17 colony layout subsystem

- Depends on: M16.
- Deliverables: `src/svg/colony_layout.ts`, `tests/test_colony_layout.mjs`, and the negative-space
  and depth metrics. The public request and output are readonly data; the module creates no JSX,
  SVG path, CSS class, or DOM node.
- Workstreams: G.
- Entry criteria: M16 exit met.
- Exit criteria: layout owns macro-silhouette, regional density, negative-space topology, depth
  strata, invasive fronts, and focal regions, and produces a data structure that carries no
  drawing. Generation order is silhouette, then regions, then clusters, then cell slots, and the
  module makes any other order impossible. The decisive test: contact sheets rendered with all
  internal cell detail suppressed remain stage-distinguishable. If the stages only differ once
  cells are drawn, the layout layer is not carrying its weight.
- Binding construction and budgets: private opaque phase brands make the only construction order
  `silhouette -> regions -> clusters -> cell slots`; the convenient entry point calls all four
  phases. Deterministic, bounded jittered-lattice allocation uses at most 24 candidates per slot,
  caps representative/inspection scenes at 180/240 slots, and reports valid partial layouts as
  `underfilled` rather than clipping, overlap, or unbounded retry. M17 measures finite occupancy,
  components, voids, gaps, asymmetry, depth, collision/clearance, and normalized macro
  fingerprints. Its Node oracle proves all twelve fixtures, fixed seeds, independent O(n^2)
  collision agreement, stage-family coherence (mean >= 0.88; individual >= 0.78), and stage
  separation (adjacent >= 0.18; nonadjacent >= 0.28 except the declared void-fraction pair).
- M18 handoff: M17 delivers slot geometry and a suppressed-detail serialization only. M18 consumes
  it at 320x224, 560x392, and 1000x700, owns actual inline SVG/DOM rendering and accessibility,
  and records the initial 1,050-elements-per-colony ceiling. Neither milestone uses pixel
  equivalence as an acceptance substitute.
- Parallel-plan ready: no. This is the shared upstream for M18.

### Milestone: M18 cell rendering and defs

- Depends on: M17.
- Deliverables: `blob.ts`, `cell.ts`, `colony.ts`, `defs.ts`, `describe.ts`, `icons.ts`, and
  `src/render/colony_panel.tsx`; the full visual-metrics battery.
- Workstreams: G.
- Entry criteria: M17 exit met.
- `src/render/colony_panel.tsx` is the dedicated M18 UI integration owner: it consumes accepted
  layout and cell contracts, supplies accessible SVG naming and consumer-size presentation, and
  does not redefine morphology, layout, or shared `<defs>` semantics.
- Exit criteria: cells render as volumes (silhouette, irregular nucleus offset from center,
  cytoplasmic value variation, restrained cross-contour marks following the local membrane,
  overlap, directional light). One thousand generated cells are unique by path hash, while cells
  from the same stage remain a recognizable visual family, measured as within-stage parameter
  variance below a threshold and between-stage separation above one. Shared gradients, filters,
  masks, and motifs live in `<defs>`; repeated styling goes through CSS classes rather than
  per-node attributes; node count stays under budget by representative sampling.
- Parallel-plan ready: yes, after `colony.ts` lands.

### Milestone: M19 soft ending

- Depends on: M15, M18.
- Deliverables: `docs/GAME_DESIGN.md` ending section; `src/ending/trigger.ts`, `sequence.ts`;
  `src/render/ending_view.tsx`; `src/content/ending_copy.ts`.
- Workstreams: J specifies with E and H; E and F implement.
- Entry criteria: M15 and M18 exit met.
- Exit criteria: the ending is specified as a system before it is written, covering trigger
  condition, presentation sequence, number formatting at ending scale, visual transformation,
  prestige interaction, and post-ending continuation. The Chicago-skyscraper figure is the
  culmination, so the scale reframing is a mechanic: the display switches from cell counts to
  volumetric units, and the illion formatter is what makes the moment land. Validation: reaching
  the ending changes presentation and does **not** create an economic wall. The balance laboratory
  confirms post-ending progression still accelerates. This is the conceptual payoff of the whole
  game and gets design weight comparable to the opening loop.
- Parallel-plan ready: yes.

### Milestone: M20 deterministic replay

- Depends on: M15.
- Deliverables: `src/types/replay.ts`, `src/state/replay.ts`, `tests/test_replay.mjs`, recorded
  fixture logs.
- Workstreams: B and I jointly.
- Entry criteria: the event funnel carries every gameplay action.
- Exit criteria: a development-only replay format records seed, purchases, stage transitions,
  prestige actions, and timestamps. One test replays a recorded sequence and reaches the same
  canonical final state, byte-identical after serialization. The funnel already exists, which is
  what makes this cheap; the payoff is that every later balance or save finding is reproducible
  exactly rather than described approximately.
- Parallel-plan ready: no.

### Milestone: M21 balance laboratory

- Depends on: M19, M20.
- Deliverables: `tests/e2e/e2e_balance_sim.mjs`; machine-readable report under `output_balance/`;
  `docs/BALANCE.md`; tuned curve tables as data edits.
- Workstreams: I leads; C, D, E apply tuning.
- Entry criteria: M19 and M20 exit met.
- Exit criteria: five declared strategy bots run headless with no DOM (see
  `## Simulator player-strategy model`); the report is machine-readable JSON at
  `output_balance/balance_report.json` plus a human-readable summary in `docs/BALANCE.md`; pacing
  lands inside the target bands for the primary bot; the M13 prestige-distinctness validation
  passes, meaning no single strategy is optimal across all four layers; the check-in bot's return
  is never empty. `output_balance/` is root-scoped per `docs/REPO_STYLE.md` and covered by the
  `/output*/` ignore rule.
- Parallel-plan ready: no. Tuning is one measurement loop; parallel curve edits conflict.

### Milestone: M22 release evidence package

- Depends on: M21, and M18 for the art artifacts.
- Deliverables: `docs/RELEASE_EVIDENCE.md`; `.github/workflows/deploy-pages.yml` installed;
  captured artifacts; drafted changelog and commit message; staged working tree.
- Workstreams: I assembles; the orchestrator stages.
- Entry criteria: every prior milestone green.
- Exit criteria: `docs/RELEASE_EVIDENCE.md` contains, in one place: every gate result with its
  exact command and output line; balance checkpoints for all five bots; screenshots and the art
  contact sheet; save-migration evidence; accessibility output (contrast measurements, reduced
  motion, the colony's `<title>`/`<desc>` text); SVG node-count and framerate measurements; the
  copy-guard and copy-review verdicts; and a written known-limitations section.
  It also opens with a **progression narrative**, because this project is design-heavy and gate
  evidence alone cannot show whether the intended experience exists:
  `single transformed cell -> early tumor -> carcinoma in situ -> invasion -> first metastasis ->
host death -> immortalized culture -> global contamination -> Chicago ending -> continued play`.
  Each transition links its captured screenshot, its dominant mechanic, and the automated result
  that proves it is reachable. The document should demonstrate the game, not only the correctness
  of the repository. The human approves a finished candidate from this one document rather than
  reconstructing confidence from scattered logs.
- Parallel-plan ready: yes. Artifact capture parallelizes by artifact.

## Workstream breakdown

### Workstream: A0 contracts

- Goal: cross-module shapes that survive real use.
- Owner: one agent with `typescript-engineer`.
- Work packages: WP-A0.1 branded ids and `BigNum` shape; WP-A0.2 `GameState`, `SaveFileV1`,
  version union, migration signature; WP-A0.3 `GameEvent` union and `HallmarkEffect` interface;
  WP-A0.4 `MorphologyParams`; WP-A0.5 `ReplayLog`; WP-A0.6 the five slice probes; WP-A0.7 the M8
  freeze audit.
- Needs: nothing.
- Provides: `src/types/*` to everyone.
- Review boundary: amendable until M8, frozen after; amendments re-run the full gate.

### Workstream: A numbers

- Goal: correct arithmetic for the operations the game performs.
- Owner: one agent.
- Work packages: WP-A.1 operation inventory (`docs/BIGNUM_OPS.md`, written before code from the
  economy and prestige formulas); WP-A.2 `bignum.ts`; WP-A.3 `solve.ts`; WP-A.4 `illion.ts`;
  WP-A.5 `format.ts`.
- Needs: `src/types/bignum.ts`.
- Provides: the number type everything uses.
- Review boundary: imports nothing from other `src/` directories.

### Workstream: B state and persistence

- Goal: one canonical state, one event funnel, trustworthy saves, one offline model, exact replay.
- Owner: one agent.
- Work packages: WP-B.1 `game_state.ts`; WP-B.2 `record_event` funnel; WP-B.3 versioned
  `save_load.ts`; WP-B.4 `offline.ts`; WP-B.5 fixture saves; WP-B.6 `replay.ts`.
- Needs: A0, A, and `docs/PROGRESSION_DESIGN.md`.
- Provides: state and persistence to C, D, E, F, I.
- Review boundary: sole owner of `localStorage`.

### Workstream: C economy

- Goal: the production math.
- Owner: one agent.
- Work packages: WP-C.1 producer catalog; WP-C.2 cost curves and solver integration; WP-C.3
  `tick.ts` with injectable clock; WP-C.4 M21 curve tuning as data edits.
- Needs: A, B.
- Provides: rates to D, E, F, I.
- Review boundary: pure functions, no DOM, clock as a parameter so tests never sleep.

### Workstream: D hallmarks and stages

- Goal: the content spine as data plus typed handlers.
- Owner: two agents in parallel once `docs/PROGRESSION_DESIGN.md` exists.
- Work packages: WP-D.1 stage catalog; WP-D.2 transitions and UI modes; WP-D.3 hallmark catalog
  with mechanic-class column; WP-D.4 the 14 handlers, grouped by milestone; WP-D.5 morphology
  writes for the visual hallmarks.
- Needs: A, B, C, `src/types/effects.ts`, `src/types/morphology.ts`, `docs/PROGRESSION_DESIGN.md`.
- Provides: progression to E, F, G.
- Review boundary: no DOM. A new hallmark is one table entry plus one handler.

### Workstream: E prestige and ending

- Goal: four different strategic systems, plus a payoff that is a system.
- Owner: two agents (L1+L2, then L3+L4), one for the ending.
- Work packages: WP-E.1 layer definitions and currencies; WP-E.2 reset scope functions; WP-E.3
  seeding allocation; WP-E.4 host draft; WP-E.5 passage tree; WP-E.6 contamination network;
  WP-E.7 ending trigger and continuation; WP-E.8 ending sequence and scale reframing.
- Needs: B, C, D, `docs/PRESTIGE_DESIGN.md`.
- Provides: endless scaling to F and I.
- Review boundary: the only module permitted to wipe state; every reset unit-tested for its exact
  clear-and-preserve set.

### Workstream: F UI shell and render

- Goal: every panel, one stylesheet.
- Owner: two agents across milestones, invoking `css-creative-expert` and `ui-ux-engineer`.
- Work packages: WP-F.1 shell and `index.html`; WP-F.2 producers panel; WP-F.3 hallmark tree;
  WP-F.4 stage panel; WP-F.5 prestige panels and confirm modals; WP-F.6 offline report;
  WP-F.7 event log; WP-F.8 theme CSS and motion; WP-F.9 ending view.
- Needs: all logic workstreams; G for art.
- Provides: the playable surface.
- Review boundary: only DOM owner, only owner of `src/style.css`. Never sets `innerHTML` from
  unescaped content; branded ids never leak into DOM attributes as raw brands.

### Workstream: G art

- Goal: one designed tumor composition per stage, built out of cells. Not 300 independently
  interesting cells hoping a tumor emerges.
- Owner: one agent invoking `svg-creator-expert`, which carries the local book corpus governing
  this lane.
- Work packages:
  - WP-G.0A illustration-principles survey -> `docs/ART_DIRECTION.md`.
  - WP-G.0B biological morphology survey -> `docs/MORPHOLOGY_REFERENCE.md`. Books determine **how
    to draw**; biological evidence determines **what changes**. Gates every later G package.
  - WP-G.1 noise field; WP-G.2 morphology grammar with named biological axes.
  - WP-G.3 `colony_layout.ts`: macro composition as data, no drawing.
  - WP-G.4 `blob.ts` radial contour through the noise field.
  - WP-G.5 `cell.ts`: the cell as a volume.
  - WP-G.6 `colony.ts`: renders a layout, makes no layout decisions.
  - WP-G.7 `defs.ts` and the SVG performance budget.
  - WP-G.8 `describe.ts` accessible description.
  - WP-G.9 glyph set.
- Needs: `src/types/morphology.ts` and a seed. Nothing else from game logic.
- Provides: SVG nodes to F; the consumer side of the morphology contract D writes into.
- Review boundary: pure producers, no state reads, no `localStorage`, no timers.

Governing rules, each traceable to a routed passage:

- **Noise, not jitter.** Independent random values per vertex produce a staccato, synthetic edge.
  Correlated noise produces smoothly varying organic form. Randomness selects discrete traits;
  noise shapes continuous morphology. Different tools, different modules.
- **Layout before rendering.** Silhouette, then regions, then clusters, then cell slots, then
  drawing. This is what buys controllable invasive borders, lobulation, necrotic centers,
  heterogeneous zones, and density gradients, and it makes the node budget tractable. The split
  into `colony_layout.ts` and `colony.ts` makes the order structural rather than conventional.
- **Negative space is structure.** Gaps between cells are composed, not left over. Early stages
  keep recognizable extracellular spacing; later stages compress, fragment, and distort it. This
  makes progression legible to a player who cannot read nuclear atypia.
- **Depth grammar, three strata.** Foreground: larger, heaviest stroke, strongest contrast, most
  detail. Middle: normal. Background: smaller, thinner, lower contrast, fewer marks. Overlap does
  most of the work. Not perspective, just enough hierarchy that a crowded field is not 300 equally
  loud blobs.
- **Information budget.** Every visible feature must communicate morphology, stage, hallmark
  state, depth, or interaction. Anything else is omitted and the omission is recorded. This is the
  guard against biologically flavored squiggles that convey nothing.
- **Focal hierarchy, never uniform interest.** A few points of interest: one mitosis near the
  visual focus, a few atypical nuclei, one invasive edge, one hypoxic region, quieter cells around
  them. Regional motifs generate first; cells populate inside them.
- **Accentuate, do not distort.** Hallmark signals are stylized but anatomically defensible, and
  every one points to a row in `docs/MORPHOLOGY_REFERENCE.md`. No glowing sci-fi cells because SVG
  filters can do it.
- **Structure the SVG, do not emit path soup.** Shared gradients, filters, masks, and motifs live
  in `<defs>` and are reused. Repeated styling goes through CSS classes rather than per-node
  attributes. Cells get unique geometry and shared treatments. Filters are reserved for subtle
  membrane and colony texture, stage-dependent displacement, and restrained lighting.

### Hallmark visual consequences

Some hallmarks change morphology, not only rates. This is what makes the tree readable without a
teaching panel. D's handlers write `MorphologyParams`; G renders it. Each row cites
`docs/MORPHOLOGY_REFERENCE.md`.

| Hallmark                           | Visual consequence                                                       |
| ---------------------------------- | ------------------------------------------------------------------------ |
| Genome instability and mutation    | Rising nuclear irregularity; occasional multinucleation                  |
| Unlocking phenotypic plasticity    | Rising variance between neighboring cells                                |
| Sustaining proliferative signaling | Mitotic figures appear more often                                        |
| Enabling replicative immortality   | Older visual cohorts persist instead of senescing out                    |
| Inducing angiogenesis              | Vascular motifs infiltrate the colony margin                             |
| Activating invasion and metastasis | Margin shifts from coherent mass to protrusive fronts and detached cells |

### Visual baseline

The player's starting cell is the game's reference normal: roughly round, regular nucleus,
consistent polarity, restrained mitotic activity, clean extracellular spacing. Every later
abnormality reads against it. This is why the late game lands as grotesque without the game ever
showing a labeled normal-cell diagram, and why the opening must not already look deranged.

### Workstream: H content and tone

- Goal: the satire lands, stays accurate, passes an automated guard.
- Owner: one agent.
- Work packages: WP-H.1 stage transition copy; WP-H.2 one deadpan, scientifically correct line per
  hallmark; WP-H.3 milestone log lines; WP-H.4 ending copy; WP-H.5 the copy guard and its word
  lists.
- Needs: D catalogs for naming; the M19 ending specification.
- Provides: all player-visible strings.
- Review boundary: strings only, ASCII only.

### Workstream: I test and balance

- Goal: independent evidence.
- Owner: `tester` class agents.
- Work packages: WP-I.1 unit suites per milestone; WP-I.2 Playwright smoke per milestone; WP-I.3
  full playthrough; WP-I.4 the five-bot strategy laboratory; WP-I.5 the visual-metrics battery;
  WP-I.6 replay fixtures; WP-I.7 `docs/RELEASE_EVIDENCE.md` assembly.
- Needs: whatever exists at each gate.
- Provides: the measurements that tune C, D, E.
- Review boundary: never edits `src/`; writes only under `tests/`, `output_balance/`, and `docs/`.

### Workstream: J design artifacts

- Goal: turn open design questions into written specifications before implementation.
- Owner: `planner` class agent, audited by `reviewer`.
- Work packages: WP-J.1 `docs/PROGRESSION_DESIGN.md` (M2); WP-J.2 offline semantics section (M5);
  WP-J.3 `docs/PRESTIGE_DESIGN.md` (M13); WP-J.4 ending specification (M19); WP-J.5 cost-curve
  experiment design (M21); WP-J.6 the strategy model (M21).
- Needs: the plan's recommendations as starting positions.
- Provides: the documents that gate dispatch.
- Review boundary: documentation only; never edits `src/`.

## Art reference routing

The art plan comes from the `svg-creator-expert` local corpus. WP-G.0A reads these and records
what each changed in `docs/ART_DIRECTION.md`. Routing follows that skill's
`references/local_books.md`.

| Need                                                                           | Source                                                                                                                                   | Search route                                                                   |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Programmatic construction, seeded randomness, noise, reuse, animation, filters | `svg_authoring/Generative_Art_with_JavaScript_and_SVG-2024.md`                                                                           | `Grouping and Reusing Elements`; randomness and noise chapters                 |
| Coordinate system, `viewBox`, paths, transforms, masks, accessibility          | `svg_authoring/Mastering_SVG-2018.md`                                                                                                    | `viewBox and viewport in SVG`                                                  |
| Depth and line hierarchy so a crowded colony still reads                       | `scientific_illustration/A_Handbook_of_Biological_Illustration-1988.md`                                                                  | `heaviest lines are used to draw the closest parts`; `CLARITY`                 |
| Simplification discipline: what to omit                                        | `scientific_illustration/Preparing_Scientific_Illustrations_a_Guide_to_Better_Posters_Presentations-1996.md`                             | simplification and figure-purpose chapters                                     |
| Normal-reference comprehension, visual storytelling of the abnormal            | `scientific_illustration/Medical_Illustration_in_the_Courtroom_Proving_Injury_Causation_and_Damages-2024.md`                             | normal-reference and visual-explanation sections                               |
| Organic form, grouping, focal points, negative space                           | `drawing_fundamentals/The_Everything_Drawing_Book-2005.md`; `scientific_illustration/Botanical_Art_with_Scientific_Illustration-2018.md` | `Thumbnail Sketches and Working Drawings`; contour and negative-space chapters |
| Foreground silhouette strength, value falloff with distance                    | `object_construction/How_to_Draw_Drawing_and_Sketching_Objects_and_Environments_from_Your_Imagination-2013.md`                           | volume construction and depth-contrast sections                                |
| Bezier and anchor control, Boolean construction                                | `vector_tools/Quick_and_Easy_Vector_Graphics-2020.md`                                                                                    | primitives, Boolean operations, Bezier curves                                  |

The corpus also lists `local-only/LOCAL_SERVIER_SVG_FILE_PATHS.txt`, a Servier-derived asset
inventory. It is **not present on this machine**, so the plan assumes none of it. If it appears,
treat it as subject reference only: verify license and attribution, and prefer generated art
regardless, since the build copies no asset directory.

## Automated tone and safety guard

Copy review was the plan's last human gate. It is replaced by three automated layers.

- `tests/test_copy_guard.mjs`: ASCII-only; a banned-phrase list covering slurs, mockery of
  patients, and treatment misinformation; a required-framing check that second-person address in
  stage and hallmark copy refers to the cell or colony, never to a person with a disease; a
  duplicate-line check so affirmations and log lines never repeat consecutively.
- A `reviewer` class agent pass with written criteria: every hallmark line must be scientifically
  defensible, deadpan rather than jokey, and target the cell's optimization rather than the
  disease's victims. Output is a per-line checklist at
  `docs/active_plans/reports/copy_review.md`.
- A boundary statement in `docs/DESIGN_DECISIONS.md` that both layers cite, so the criteria are
  versioned rather than remembered.

The human still reads the copy before release, as an approver of a finished candidate rather than
a gate the build waits on.

## Acceptance criteria and gates

- Per-patch gate: the coding agent runs `npx tsc --noEmit -p tsconfig.json` on its own change and
  quotes the exact command and exact success line (`exit 0`, no diagnostic output). A `DONE`
  without that evidence is a false-green claim and is re-dispatched.
- Integration gate: after every milestone, the orchestrator runs `./check_codebase.sh`, then
  `./build_github_pages.sh`, then that milestone's Playwright check. A failing gate triggers a fix
  agent, not a retry.
- Design gate: M2, M5, M13, M16, and M19 produce a written artifact before their implementing
  milestone is dispatched. Dispatching M10 without `docs/PROGRESSION_DESIGN.md`, or any drawing
  code without `docs/MORPHOLOGY_REFERENCE.md`, is a process failure.
- Independent review gate: `reviewer` for the M8 contract freeze and the copy pass;
  `image_evaluator` for the M18 contact sheet; `audit-code-reviewer` before M22.

## Test and verification strategy

Six layers, all automated, none requiring a human.

- **Node unit tests** (`tests/test_*.mjs`, run by `check_codebase.sh`): BigNum operations from the
  derived inventory; save round-trip and forward migration from captured fixtures; each prestige
  reset's exact clear-and-preserve set; morphology grammar determinism and family coherence; cost
  and bulk-buy math against hand-computed values; offline-versus-live equivalence within 2
  percent; replay determinism; the copy guard.
- **Playwright** (`tests/playwright/`, run by `./run_playwright_tests.sh`): per-milestone smoke;
  save round-trip across reload; offline grant after a clock-skewed reload driven by an injectable
  clock rather than real waiting; a full scripted playthrough at M22 reaching the soft ending via
  the debug fast-forward hooks. Authored per `docs/PLAYWRIGHT_TEST_STYLE.md`.
- **Balance laboratory** (`tests/e2e/e2e_balance_sim.mjs`, run directly, excluded from pytest):
  headless fast-forward with no DOM, five strategy bots, JSON report to `output_balance/`.
- **Deterministic replay**: recorded logs replay to a byte-identical canonical final state, so any
  finding is reproducible rather than described.
- **Visual metrics battery** (computed on generated SVG, no human eye required): silhouette
  distinctness across stages; squint test (after heavy blur, major masses and focal regions remain
  distinguishable); negative-space structure (fraction occupied, median gap area, gap
  fragmentation, perimeter-to-area ratio, radial asymmetry, all trending correctly); depth
  separation (stroke-weight and contrast distributions form three clusters); suppressed-detail
  test (stages remain distinguishable with internal cell detail removed, which is the M17 exit
  criterion); uniqueness and family coherence (1000 cells unique by path hash, within-stage
  variance below threshold, between-stage separation above it). `image_evaluator` reviews the
  rendered contact sheet as a second opinion on top of the metrics.
- **Repo gates** (`pytest tests/`): shipped Python checks for ASCII, indentation, line limit,
  markdown links, and vendored headers keep passing.

### Simulator player-strategy model

"Time to prestige" is meaningless without saying who is playing. Five declared bots, all reported:

- **Greedy payback** (primary): always buys the shortest payback time. Target bands are measured
  against this bot.
- **Naive cheapest**: always buys the cheapest affordable item. The lower bound on competent play.
- **Hallmark-first**: prioritizes hallmark branches over producers. Detects a tree that is too
  strong or too weak relative to raw production.
- **Prestige-rush**: resets at the earliest viable threshold. Detects prestige thresholds that are
  degenerate in either direction.
- **Check-in idle**: acts only every four simulated hours, then spends everything. Models the
  away-and-return player the genre is built around, and validates that offline accrual feels
  worthwhile.

Adoption rules: a curve is adopted only if it lands the primary bot inside the bands, keeps the
check-in bot's return non-empty (every return has at least one affordable purchase that changes
the rate), and no single bot dominates every prestige layer, which is the M13 distinctness
validation.

**Bots are evidence, not the definition of fun.** Tuning until the simulator shows one cleanly
correct build per situation would optimize the game for bot behavior and strip out the
experimentation that makes an incremental game worth replaying. The laboratory's job is to expose
degeneracy: a dominant strategy, a dead branch, a wall, a choice with no consequence. Where
several strategies land near-optimal, that is a good result and is left alone. The target is a
landscape with multiple defensible builds, not a solved one.

### Endlessness is measured in decisions, not production

Continued acceleration proves progression continues; it does not prove play continues. A game
whose only remaining action is "buy the one dominant thing again" is producing numbers, not
gameplay. M21 therefore reports decision-availability metrics across prolonged L4 runs:

- meaningful purchases available (affordable, and changing the rate by a non-trivial margin)
- distinct network or allocation choices still open
- whether the bots' strategies keep diverging over successive long runs, or converge to one line
- whether any single action becomes permanently dominant, and if so, when

Fail condition: any of these collapses to a constant. The requirement stays behavior-focused, with
no arbitrary play-duration ceiling; the question is whether the decision surface renews itself,
not how many hours it survives.

### Target pacing bands

Falsifiable claims, measured against the greedy-payback bot at M21.

| Checkpoint                      | Target elapsed active play      | Fail condition                                    |
| ------------------------------- | ------------------------------- | ------------------------------------------------- |
| First producer purchase         | under 15 seconds                | over 30 seconds; the opening feels dead           |
| First hallmark unlocked         | 2 to 5 minutes                  | over 10 minutes                                   |
| Stage 4, carcinoma in situ      | 20 to 40 minutes                | over 90 minutes                                   |
| First prestige, Metastasis      | 1.5 to 3 hours                  | over 6 hours; the reset arrives too late to teach |
| Second prestige layer reachable | within 3 runs of the first      | more than 6 runs                                  |
| Soft ending                     | reachable, presentation changes | an economic wall appears at the ending            |
| Post-ending and post-L4         | still accelerating              | flat, which means it is not endless               |

## Migration and compatibility policy

- The save file carries `version` from the first commit that writes one. Loading is a discriminated
  union over version plus a forward migration chain; the parser validates and migrates, never
  trusts, and uses no unchecked `as` cast outside the guarded boundary.
- Save shape may change freely before the first public deploy. After M22, every schema change ships
  with its migration step and a fixture save.
- Losing progress is the one unrecoverable failure in an idle game. A migration that cannot resolve
  a field restores a safe default and logs it visibly rather than discarding the save.

## Risk register

| Risk                                                | Impact                                                                   | Trigger                                                | Owner        | Mitigation                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------ |
| Contracts frozen before evidence                    | Every lane rebases; parallelism advantage evaporates                     | A feature agent needs a shape that does not exist      | A0           | Freeze moved to M8; five compile-only slices at M1                                               |
| Save schema designed before mechanics are known     | Migration churn on a live schema                                         | Progression design written after M4                    | J            | `docs/PROGRESSION_DESIGN.md` is M2, before state                                                 |
| Float drift in BigNum at extreme exponents          | Wrong numbers, broken late game                                          | Mantissa denormalizes past 10^300                      | A            | Normalize every operation; test the economy's real operations                                    |
| Offline diverges from live once nonlinearity lands  | Player returns to wrong numbers; trust gone                              | A hallmark makes production non-constant               | B            | Coarse-step replay through the real tick; 2 percent equivalence test from M5                     |
| 14 hallmarks collapse into 14 multipliers           | The content spine is hollow                                              | Handlers all reduce to scaling a rate                  | D            | M2 specification gates dispatch; purchase-order test per branch                                  |
| Four prestige layers feel like one repeated reset   | The "endless depth" claim fails                                          | Layers differ only in cost                             | E            | M13 identity document; M21 proves no single strategy wins all four                               |
| Balance measured against an arbitrary bot           | Pacing numbers are meaningless                                           | Simulator hardcodes one purchase rule                  | I            | Five declared bots; bands stated against the primary, cross-checked against the rest             |
| A balance or save bug cannot be reproduced          | Debugging becomes guesswork                                              | Nondeterministic run reports a symptom                 | B, I         | Deterministic replay at M20                                                                      |
| Colony reads as uniform noise                       | Art effort produces an unreadable field                                  | Cells generated before composition                     | G            | `colony_layout.ts` split makes layout-first structural; suppressed-detail test                   |
| Art invents plausible-looking but wrong biology     | Loses the science-accurate premise                                       | Generator tuned by eye alone                           | G            | `docs/MORPHOLOGY_REFERENCE.md` gates all drawing code; every visual change cites a row           |
| Cells unique but visually unrelated                 | The colony looks like a sticker sheet                                    | Per-cell parameters drawn independently                | G            | Family-coherence metric: within-stage variance bounded, between-stage separation required        |
| SVG node count tanks framerate                      | Colony stutters late game                                                | Cell count exceeds a few thousand nodes                | G            | Representative sampling, `<defs>` reuse, CSS-class styling, explicit node budget                 |
| Systems are individually strong but do not interact | A pile of good subsystems, no emergent game                              | Each lane validated only against itself                | J, D, E      | `docs/SYSTEM_INTERACTIONS.md` at M13; M21 checks prestige changes which hallmarks are attractive |
| Hallmark tree is a menu, not a tree                 | Player ranks 14 branches independently and always buys in the same order | No specified synergies or tensions                     | D            | M2 requires named synergies and at least three tensions; purchase-order divergence measured      |
| Stages are reskins                                  | The clearest progression signal carries no gameplay                      | Stage spec is visual only                              | D, J         | M2 assigns each stage a gameplay identity; M9 requires purchase-order change across boundaries   |
| L4 network gets solved                              | The endless engine stops producing decisions; only currency rises        | Authored graph fully conquered                         | E            | M13 specifies the renewal mechanism; M21 measures decision availability, not just acceleration   |
| Early L1 runs feel repetitive                       | Player quits before the L2 draft supplies variety                        | Organ-site allocation is the only early variable       | E            | M13 must answer whether L1 supplies real variation, and deepen organ sites if not                |
| `MorphologyParams` becomes a dumping ground         | Later visual features silently overwrite earlier ones                    | Multiple systems write the same parameter              | A0, G, D     | Named resolution chain, per-parameter combination rule, clamps, contributor provenance           |
| Tuning to the bots                                  | Mechanics optimized for the simulator, experimentation stripped out      | One correct build per situation is treated as the goal | I, J         | Bots report degeneracy; near-optimal ties are left alone                                         |
| The ending is a text screen                         | The payoff undersells the whole game                                     | Ending treated as copy                                 | E, J         | M19 specifies it as a system with its own milestone and validation                               |
| Tone lands wrong                                    | Satire reads as mocking patients                                         | Copy drifts toward the disease rather than the cell    | H            | Automated copy guard plus `reviewer` checklist; versioned boundary statement                     |
| A milestone stalls waiting on a person              | The plan cannot finish overnight                                         | Any gate phrased as human judgment                     | Orchestrator | Every gate is a command, a metric, or an agent review with written criteria                      |

## Rollout and release checklist

Every item is executable by the manager or a subagent.

- [ ] `./check_codebase.sh` passes with zero warnings.
- [ ] `pytest tests/` passes, including ASCII, indentation, line-limit, and markdown-link checks.
- [ ] `./run_playwright_tests.sh` passes, full playthrough included.
- [ ] `./build_github_pages.sh` produces `dist/` with `index.html`, `main.js`, `.nojekyll`.
- [ ] `.github/workflows/deploy-pages.yml` installed from the shipped `deploy-pages.yml`.
- [ ] `output_balance/balance_report.json` written; `docs/BALANCE.md` summarizes all five bots.
- [ ] Prestige distinctness validated: no single strategy optimal across all four layers.
- [ ] Visual metrics battery green; contact sheet and `image_evaluator` verdict captured.
- [ ] Replay fixture replays to a byte-identical canonical state.
- [ ] Copy guard green; `docs/active_plans/reports/copy_review.md` captured.
- [ ] Screenshots captured at every stage, both ending states, and each prestige transition.
- [ ] A pre-release fixture save loads under the release build.
- [ ] `README.md` first paragraph written as GitHub About text, under 250 characters, pure prose.
- [ ] `VERSION` and `package.json` version synchronized in CalVer.
- [ ] `docs/CHANGELOG.md` updated; commit message drafted via `devel/commit_changelog.py`; changes
      staged.
- [ ] `docs/RELEASE_EVIDENCE.md` assembled and complete, including known limitations.

The final `git commit` and the deploy trigger remain the human's, by repo rule. That is approval
of a finished candidate, not a gate the build waits on. If the human is asleep, the plan still
reaches its terminal state.

## Documentation close-out requirements

- Active plan / progress tracker: copy this plan to
  `docs/active_plans/active/cancer_clicker_build_plan.md` at execution start; update its milestone
  table as milestones close; `git mv` it to `docs/archive/` when M22 closes.
- `docs/CHANGELOG.md`: one entry per milestone under the standard subsection headings, including
  `### Decisions and Failures` for approaches measured and rejected.
- New durable docs: `docs/GAME_DESIGN.md` (stages, currencies, offline model, ending),
  `docs/PROGRESSION_DESIGN.md` (the 14 hallmarks, their synergies and tensions, and the 12 stage
  gameplay identities), `docs/PRESTIGE_DESIGN.md` (the four layers),
  `docs/SYSTEM_INTERACTIONS.md` (10 to 20 cross-system interactions),
  `docs/MORPHOLOGY_REFERENCE.md` (biology to visual abstraction), `docs/ART_DIRECTION.md`
  (illustration technique, palette, omissions), `docs/BIGNUM_OPS.md` (operation inventory),
  `docs/BALANCE.md` (measured curves, five bots, reasoning), `docs/RELEASE_EVIDENCE.md`.
- `docs/CODE_ARCHITECTURE.md` and `docs/FILE_STRUCTURE.md` generated by `arch-docs` at M22;
  `README.md` by `readme-docs`.
- `docs/DESIGN_DECISIONS.md` seeded with the resolved decisions below.

## Resolved decisions

Settled with the user; each becomes a `docs/DESIGN_DECISIONS.md` entry.

- **Genre framing is satire, not instruction.** Universal Paperclips shape: you play the tumor,
  the tone is unsettling-funny, the science is accurate, no teaching panels.
  `docs/PLAYFUL_TRAINING_GAME_STYLE.md` explicitly does not apply.
- **Endless with a soft ending.** The ending is reachable, changes presentation, and play
  continues past it without an economic wall. Offline accrual and stacked prestige are day-one
  requirements.
- **All 14 hallmarks (Hanahan 2022).** Six original, four from 2011, four from 2022. Later
  hallmarks gate behind later stages and prestige layers.
- **Design artifacts gate implementation.** Progression, prestige, morphology, offline, and ending
  are specified in writing before their code is dispatched. This is the difference between a game
  whose biology drives its mechanics and one where biology is a skin.
- **Four prestige layers, four different systems.** Metastasis is allocation, Host Transfer is a
  draft, Immortalization is persistence, Dissemination is a network. Proven by showing no single
  strategy is optimal across all four.
- **Depth over breadth after M13.** Scope is frozen at the current system set. The emergent game
  lives in cross-system interactions, not in a fifteenth hallmark. `docs/SYSTEM_INTERACTIONS.md`
  is where that value is captured.
- **Endless means endless decisions.** Rising production is necessary but not sufficient. L4 must
  keep generating choices after its authored network is conquered, and M21 measures decision
  availability directly rather than inferring it from acceleration.
- **Custom BigNum, no runtime math dependency; SolidJS is the sole deliberate UI runtime.**
  `{mantissa, exponent}` plus Conway-Wechsler illion names satisfy the stated full-name feature;
  `docs/SOLID_MODEL.md` keeps the UI runtime at the DOM boundary.
- **Offline is bounded coarse-step replay through the real tick.** Not `rate * elapsed`. Chosen so
  nonlinear hallmark effects behave identically online and offline; verified by a 2 percent
  equivalence test.
- **Layout before rendering, structurally.** `colony_layout.ts` owns macro composition and
  produces data; `colony.ts` renders it and makes no layout decisions. Bottom-up cell scattering
  is rejected because it cannot express invasive fronts, necrotic centers, or structured negative
  space.
- **Books determine how to draw; biology determines what changes.** Every stage-dependent visual
  change cites a row in `docs/MORPHOLOGY_REFERENCE.md`.
- **Stylized SVG, clinical-dark.** Generated in TypeScript because `build_github_pages.sh` copies
  no asset directory. Canvas deferred, not adopted.
- **All CSS in `src/style.css`.** The build copies exactly one stylesheet; splitting CSS would
  silently drop rules from `dist/`.
- **Generated output at the repo root.** `output_balance/` per `docs/REPO_STYLE.md`; a nested
  `tests/e2e/output/` would be tracked and would violate the root-scoped `/output*/` rule.
- **No human in the execution path.** Every gate is a command, a metric, or an agent review with
  written criteria. Human involvement is approval of a finished candidate via
  `docs/RELEASE_EVIDENCE.md`.

## Open questions and decisions needed

None are execution-blocking. Each has an owner, an evidence rule, and a milestone.

- Cost-curve shape (pure exponential per Cookie Clicker versus tiered soft caps).
  - Decision owner: J designs the experiment; I measures; the orchestrator rules. Milestone M21.
  - Evidence and decision rule: build both as data tables, run all five bots against each, adopt
    whichever lands more checkpoints inside the bands while keeping the check-in bot's return
    non-empty. Record the loser under `### Decisions and Failures` in `docs/CHANGELOG.md`.
- Non-blocking follow-up: whether the colony view earns a canvas renderer after M22. Decide on
  measured framerate with SVG at the highest reachable cell count, not in advance.
- Non-blocking follow-up: achievements. The `record_event` funnel and the replay format make this
  a later addition rather than a retrofit.
- Non-blocking follow-up: audio. Out of scope; if added, muted by default with the preference
  persisted in the save file.

## Notes for the implementer

- Read `docs/REPO_STYLE.md` and `docs/TYPESCRIPT_STYLE.md` before the first patch. Tabs, ASCII
  only, files under 1000 lines, `git mv` for renames, agents never run `git commit`.
- The first patch must include a stub `.ts` under `tools/` or `tests/`, or `check_codebase.sh`
  step 2 fails with TS18003 on an empty include list.
- `src/index.html` must contain `<script type="module" src="main.js"></script>` exactly, or the
  build warns and the page loads dead.
- Every time-dependent system takes an injectable clock. Tests never sleep; the Playwright offline
  check skews a fake clock rather than waiting.
- Ship debug fast-forward hooks behind a URL flag from M7 onward. The playthrough test, the balance
  laboratory, and the replay harness all depend on them, and they are what make an overnight
  unattended run possible.
- Skills to invoke at the right moments: `parallel-plan` before each parallel milestone;
  `typescript-engineer` for every cross-module type; `delegate-manager-to-subagents` for each
  dispatch; `svg-creator-expert` for workstream G; `css-creative-expert` and `ui-ux-engineer` for
  workstream F; `color-accessibility-expert` for the palette gate; `audit-code-reviewer` before
  M22; `arch-docs` and `readme-docs` at close-out.
