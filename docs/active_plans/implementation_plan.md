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
- **Manager-complete execution path.** Manager and subagents carry this plan from empty repo to a
  validated release candidate while the owner is away. Every gate is an automated check, a captured
  artifact, or an agent review with written criteria.

This revision incorporates two rounds of external LLM plan review and two user directives: use
manager-complete gates, and prefer many small milestones over few large ones. The
milestone count went from 6 to 22 for those reasons.

The organizing bet of the plan: **the biology drives the mechanics, the visuals, and the
pacing.** Four design artifacts are written before their implementing code, so the late game is
biology expressed as systems rather than larger numbers layered onto a good opening.

## Objectives

- Ship a playable, savable, offline-accruing incremental game from milestone 7 onward, growing
  in depth rather than arriving all at once.
- Model the 14 hallmarks as 14 mechanically distinct branches, where "distinct" means each
  changes a player decision, specified in writing before implementation.
- Provide four prestige layers that are four different strategic systems, each with a reachable
  decision witness and a balance review that checks its tradeoff remains meaningful.
- Represent arbitrarily large quantities with correct short suffixes and full Latin illion names,
  with arithmetic proven against the operations the economy actually performs.
- Make every stage-dependent visual change traceable to a documented biological rationale.
- Reach a fully validated release candidate, summarized in one compact evidence package, through
  manager-and-subagent evidence at every milestone.

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
  reproducible as an equivalent normalized durable state and visible progression.

## Scope

- Author all game source under `src/`, entry `src/main.tsx` from M7, base styles in `src/style.css`,
  explicitly allowlisted domain stylesheets where ownership warrants them, and markup in
  `src/index.html`.
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
- Add permanent Node and Playwright behavior tests, plus one-time visual, balance, and performance
  calibration artifacts.
- Produce `docs/RELEASE_EVIDENCE.md`: the autonomous closeout record that maps every
  release-candidate claim to reproducible commands, captured artifacts, and an independent agent
  audit, plus the full durable documentation set.

## Non-goals

- Keep runtime npm dependencies limited to the approved client-only `solid-js` UI runtime and its
  required build integration. Development tooling includes the explicit `PyYAML` dependency solely
  for offline parsing of the checked-in GitHub Pages workflow contract in
  `devel/verify_pages_workflow.py`; it adds no network service or runtime dependency.
- Build a backend, accounts, cloud saves, leaderboards, or analytics.
- Build monetization of any kind: no ads, no microtransactions, no timers-for-money.
- Add quizzes, graded assessment, or explicit teaching panels. This is not a trainer;
  `docs/PLAYFUL_TRAINING_GAME_STYLE.md` does not govern this project.
- Produce the single-file HTML export. GitHub Pages `dist/` is the release target.
- Use canvas rendering in the first release. The colony view is SVG plus CSS.
- Depict identifiable real patients, or frame the satire at people who have cancer. The target of
  the joke is the cell's relentless optimization.
- Complete repository-history and remote-distribution operations. The plan completes at a validated
  **working-tree release candidate** with `dist/`, captured artifacts, a read-only candidate
  manifest, a workflow-contract result, and an independent agent audit verdict. A later
  repository-maintainer workflow can add history and hosting evidence under the repository's Git
  ownership rules; those operations do not alter milestone completion.
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
- `build_github_pages.sh` requires an entry point, `src/index.html`, and `src/style.css`; it copies
  `index.html`, the base stylesheet, and only explicitly allowlisted domain stylesheet assets into
  `dist/`. It copies no general asset directory. Consequence: SVG remains generated by TypeScript,
  and every stylesheet has a named source, HTML link, preflight/copy allowlist, and browser proof.
- `check_codebase.sh` runs typecheck, `tsconfig.lint.json` typecheck (fails TS18003 unless at
  least one `.ts` exists under `tests/` or `tools/`), eslint at zero warnings, prettier check,
  and `node --import tsx --test tests/test_*.mjs`.
- `docs/REPO_STYLE.md` requires generated output directories at the **repo root** with a
  root-scoped `/output*/` ignore rule. A nested `tests/e2e/output/` would be tracked and would
  violate that rule, so the balance laboratory writes to `output_balance/` and visual calibration
  writes to `output_visual/` at the root.
- Binding repo rules: files under 1000 physical lines, ASCII-only source, tabs for indentation,
  `git mv` for renames, agents update `docs/CHANGELOG.md`, and the repository-maintainer workflow
  owns commits.
- `svg-creator-expert` carries a local book corpus used by the art lane. Its
  `LOCAL_SERVIER_SVG_FILE_PATHS.txt` asset inventory is **not present on this machine**; the plan
  assumes none of it.

## Architecture boundaries and ownership

```
src/
  main.ts                  entry: bootstrap, wire loop, mount UI
  index.html               shell markup
  style.css                base stylesheet copied by the build
  prestige.css             optional explicitly allowlisted prestige surface
  types/
    bignum.ts              BigNum shape and brand
    ids.ts                 branded ProducerId, HallmarkId, StageId, PrestigeId
    state.ts               GameState, RuntimeState
    save.ts                CurrentSaveFile exact envelope and recovery notice types
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
    save_load.ts           serialize, strict current parse, validate, protected recovery
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
    describe.ts            stage-aware `#colony-a11y-description` content
    icons.ts               hallmark and producer glyphs
  content/
    copy.ts                stage, hallmark, milestone strings
    ending_copy.ts         ending text
```

### Mapping (milestones / workstreams -> components / patches)

| Milestone / Workstream  | Component                                                                         | Review boundary                                       |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| A0 Contracts            | `src/types/*`                                                                     | `typescript-engineer` designs; frozen at M8, not M1   |
| A Numbers               | `src/bignum/*`                                                                    | unit-tested in isolation; imports nothing from `src/` |
| B State and persistence | `src/state/*`                                                                     | sole owner of `localStorage`                          |
| C Economy               | `src/economy/*`                                                                   | pure functions over state; no DOM                     |
| D Hallmarks and stages  | `src/hallmarks/*`, `src/stages/*`                                                 | data plus handlers; no DOM                            |
| E Prestige and ending   | `src/prestige/*`, `src/ending/*`                                                  | only module allowed to wipe state                     |
| F UI shell and render   | `src/main.tsx`, `src/render/*.tsx`, `src/index.html`, `src/style.css`, domain CSS | only DOM owner                                        |
| G Art                   | `src/svg/*`                                                                       | pure producers; no state reads                        |
| H Content and tone      | `src/content/*`                                                                   | strings only; guarded by an automated lint            |
| I Test and balance      | `tests/**`, `output_balance/`                                                     | never edits `src/`                                    |
| J Design artifacts      | `docs/*`                                                                          | writes the four gating documents                      |

Ownership rule on every dispatch: an agent edits only its own column. A cross-module type need
pauses the agent, routes to `typescript-engineer`, and resumes after the stub lands.

## Milestone plan

Twenty-two milestones. Each reaches green independently through manager-complete evidence.

| M   | Title                              | Summary                                                  | Goal                                                     |
| --- | ---------------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| M1  | Contracts and slice probe          | Types plus five compile-only vertical slices             | Contracts exist and are provisionally sufficient         |
| M2  | Progression design                 | `docs/PROGRESSION_DESIGN.md` for all 14 hallmarks        | Distinctness specified before anything depends on it     |
| M3  | Numbers                            | BigNum over a derived operation set, illion names        | Economy math proven, not just formatting                 |
| M4  | State and persistence              | Canonical state, event funnel, versioned save            | Save round-trips and migrates                            |
| M5  | Offline semantics                  | One documented model, implemented and tested             | Away time matches live time within tolerance             |
| M6  | Economy and tick                   | Producers, costs, bulk buy, frame integration            | Numbers go up correctly                                  |
| M7  | Minimal playable                   | Click, buy, idle, reload, offline report                 | Genre-complete idle game, one stage                      |
| M8  | Contract freeze                    | Evidence review of `src/types/*` after real use          | Contracts frozen on evidence                             |
| M9  | Stage ladder                       | 12 stages, gates, transitions, UI modes                  | Full arc traversable in simulation                       |
| M10 | Hallmarks, core six                | Six 2000-era branches                                    | Six distinct mechanics live                              |
| M11 | Hallmarks, 2011 four               | Metabolism, immune evasion, inflammation, instability    | ATP resource live                                        |
| M12 | Hallmarks, 2022 four               | Plasticity, epigenetics, microbiome, senescence          | Tree complete at 14                                      |
| M13 | Prestige and interaction design    | `docs/PRESTIGE_DESIGN.md`, `docs/SYSTEM_INTERACTIONS.md` | Four systems that reach into each other, not four resets |
| M14 | Prestige layers 1 and 2            | Metastasis seeding, host draft                           | Reset scopes verified by unit test                       |
| M15 | Prestige layers 3 and 4            | Immortalization tree, contamination network              | Endless scaling confirmed                                |
| M16 | Morphology reference               | `docs/MORPHOLOGY_REFERENCE.md` plus noise and grammar    | Biology mapped before drawing                            |
| M17 | Colony layout subsystem            | `colony_layout.ts`: macro composition                    | Stage reads correctly with cell detail suppressed        |
| M18 | Cell rendering and defs            | `cell.ts`, `blob.ts`, `defs.ts`, `describe.ts`, icons    | Cells unique, same-stage family recognizable             |
| M19 | Soft ending                        | Trigger, sequence, scale reframing, continuation         | The payoff is a system, not a text screen                |
| M20 | Deterministic replay               | Record and replay over the event funnel                  | Any bug or balance finding reproduces exactly            |
| M21 | Balance laboratory                 | Five strategy bots, machine-readable report, tuning      | Pacing decided on evidence across play styles            |
| M22 | Autonomous release-evidence record | `docs/RELEASE_EVIDENCE.md`, validated candidate          | Every claim is reproducible and independently reviewed   |

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
    condition, visible consequence, and why it is distinct from every other branch. Each branch
    carries a sentence of the form
    "before this branch the player did X; after it the player decides Y." A branch whose sentence
    reduces to "the same decision with bigger numbers" is redesigned before dispatch.
  - **Synergy and tension.** Fourteen individually good mechanics can still be a menu rather than
    a tree. The document names a small set of deliberate combinations where one branch enables,
    amplifies, changes, or competes with another. Cancer biology supplies the fertile pairs
    already: metabolism with proliferation, angiogenesis with hypoxia and necrosis, genome
    instability with immune evasion (more neoantigens, more visibility), senescence with
    replicative immortality, plasticity with everything. Success condition: the player sometimes
    picks branch A **because** branch B is developed, rather than ranking all 14 independently.
    Every named tension identifies the affected resource or constraint and a reachable example.
  - **Stage gameplay identity.** For each of the 12 stages, the new pressure, opportunity,
    resource relationship, or constraint that appears. The bar is "I play differently because I
    entered this stage," not "the UI and the tumor changed." A stage with no gameplay identity is
    merged into its neighbor rather than shipped as a reskin. Recorded here because M9 implements
    stages and must not be dispatched against a visual-only specification.
- Why this early: the save schema and the state shape depend on what fields hallmarks need.
  Writing this after M4 would mean revising a schema that was designed blind.
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
- Deliverables: `src/state/game_state.ts`, `events.ts`, `save_load.ts`, and focused current-save
  boundary tests using inline records and a test-local legal-state builder.
- Workstreams: B.
- Entry criteria: progression design written, so the schema knows what it must hold.
- Exit criteria: the current writer round-trips through the current parser to an equivalent
  normalized durable state; format `2` / schema `8` is the only accepted shape; incompatible data
  enters protected recovery without automatic overwrite; and the event registry owns parse schema,
  reducer handler, save rule, and replay applicability for every registered event while rejecting
  unknown types. A committed fixture is added only for a shipped compatibility artifact or approved
  shared infrastructure.
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
  report. Temporary effects do not tick down while away. Equal scheduled boundaries produce
  equivalent normalized durable projections. When an intentional macro-step approximation affects
  display values, `docs/GAME_DESIGN.md` defines a calibrated display-level error envelope against
  a fine-step reference at nonlinear changes, resource exhaustion, stage boundaries, and temporary
  deadlines. This protects the player promise without treating one universal percentage as a law
  of every future economy.
- Parallel-plan ready: no.

### Milestone: M6 economy and tick

- Depends on: M5.
- Deliverables: `src/economy/*`, `tests/test_costs.mjs`.
- Workstreams: C.
- Entry criteria: M5 exit met.
- Exit criteria: eight stage-1 producers; cost curves as data; bulk buy of 1, 10, 100, and max
  agree with hand-computed values; tick integration is delta-time correct under an irregular
  injected clock. Tests advance that clock deterministically.
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
  grant appears after a clock-skewed reload. The controller applies an accepted command once
  through the event funnel, persists an isolated accepted next snapshot before reconciling the
  store, and keeps parser/reducer/storage failures visibly honest. A rejected command leaves
  durable and visible state unchanged and communicates recoverable status. A nonempty
  `saveToStorage` notice or a
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
  in `docs/PROGRESSION_DESIGN.md`. A stage that changes only the UI fails review; its decision
  witness identifies the reachable alternatives and changed tradeoff that make play different.
- Parallel-plan ready: yes.

### Milestone: M10 hallmarks, core six

- Depends on: M2, M9.
- Deliverables: sustaining proliferative signaling, evading growth suppressors, resisting cell
  death, enabling replicative immortality, inducing angiogenesis, activating invasion and
  metastasis; `src/render/hallmark_tree.tsx`.
- Workstreams: D, F.
- Entry criteria: `docs/PROGRESSION_DESIGN.md` complete.
- Frozen-contract amendment: before source implementation, activate `HallmarkEffect` and register
  the `spend-telomerase` `GameEvent` through parser, reducer, save, and replay rules. The D3 owner
  inventories parser, reducer,
  save, controller, UI, test, and M20 replay consumers; hostile requests must leave debit, effect,
  event queue, persistence, and protected recovery untouched. Full static, Node, build, and
  production-dist Playwright reruns are required before dependent work resumes.
- Exit criteria: each branch implements its assigned mechanic class as specified and has a
  documented decision witness: a reachable state, two or more legal alternatives, and an observed
  tradeoff or changed action through the real event, quote, debit, tick, or gate path. A control
  state with absent preconditions verifies the same action remains unavailable or unchanged.
- Parallel-plan ready: yes. Six branches, one class each.

### Milestone: M11 hallmarks, 2011 four

- Depends on: M10.
- Deliverables: deregulating cellular metabolism (introduces ATP), avoiding immune destruction,
  tumor-promoting inflammation, genome instability and mutation.
- Workstreams: D, F.
- Entry criteria: M10 exit met.
- Exit criteria: ATP is a real second resource with its own sink, not a display, and each
  2011 hallmark changes a direct authoritative outcome through the closed event funnel:
  - `convert-substrate` debits substrate, credits ATP, and leaves cells unchanged.
  - `set-region-mask` changes the selected region's durable visibility contribution to the
    authoritative weighted global producer quote while an unaffected region retains its prior
    contribution; the public quote remains global rather than becoming a region-parameterized API.
  - `activate-inflammation` changes a real route, tick, or host-gate outcome, and expiry reverses
    the temporary effect.
  - Selecting a valid saved mutation changes that descriptor's named quote, conversion, pressure,
    or route effect; malformed or invalid selection preserves state atomically.
  - Permanent domain tests bind these named outcomes.
  - A bounded multi-card or rank exploration and broad balance experiment provide one-time
    acceptance evidence outside the permanent suite; they inform tuning without prescribing a
    synthetic purchase-ranking implementation.
- Parallel-plan ready: yes.

### Milestone: M12 hallmarks, 2022 four

- Depends on: M11, M16.
- Deliverables: the closed current late-hallmark state and strict current-save validation; unlocking phenotypic
  plasticity, nonmutational epigenetic reprogramming, polymorphic microbiomes, and senescent
  cells; typed catalog/effect/tick projections; four player intents; and biology-backed morphology
  contributions where a hallmark has a visible consequence.
- Workstreams: D, G.
- Entry criteria: M11 exit met, the morphology contract is in use, and the current aggregate
  contract plus accepted late-hallmark catalog are written before event, UI, or SVG implementation.
- State contract: `GameState.lateHallmarks` is the one required aggregate for this domain. It owns
  plasticity switch cooldowns by region; epigenetic program assignments and cooldown; microbiome
  active composition, pending offer, rotation deadline, and rotation sequence; and senescence
  pending decisions plus retained records. `RegionState.phenotype` remains canonical local state.
  The aggregate replaces provisional phenotype-cooldown, regional-modifier, program, microbiome,
  senescent-region, secretory-effect, and clearance records; `RegionState.senescenceEventId` is
  removed because each pending or retained senescence record owns its region relation. Catalog-owned
  functions derive effects rather than storing opaque modifier keys.
- Catalog and identity contract: use distinct branded `LateProgramOptionId`,
  `MicrobiomeCommunityId`, `MicrobiomeCompositionId`, `MicrobiomeNicheId`, and
  `MicrobiomeOfferId`; retain `MicrobiomePoolId` and reserve `OfferId` for the mutation draft. The
  catalog closes the four branches, three phenotype choices, six allowed programs, one
  `global-contamination` pool, four communities, four composition IDs, and senescence causes and
  actions. A saved microbiome offer is one three-composition decision: every candidate saves its
  two named niche/community/effect rows and explicit compatibility result, plus offer ID, pool,
  source seed/sequence/stage, and expiry. An installed composition retains its exact selected
  snapshot. Reload and replay therefore retain the displayed choice without redrawing or
  recomputing it.
- Event and ownership contract: replace provisional late-hallmark variants with exactly these
  four `GameEvent` rows: `assign-region-phenotype`, `reconfigure-hallmark-program`,
  `install-microbiome-composition`, and `resolve-senescence-decision`. Each contains only player
  intent and authoritative `atMs`; exact parsing admits known branded IDs, natural timestamps, and
  no extra keys. `reduceGameEvent` advances `eventSequence` once after accepted dispatch.
  Dedicated handlers are the single writers for phenotype/deadline, program assignment/cooldown,
  microbiome installation, and senescence resolution respectively. The rotation projection is the
  sole writer of pending microbiome offer, rotation deadline, and sequence; a senescence factory
  creates pending decisions, while resolution retains one record or removes the region projection.
  Controller methods provide the four named intents with `simulationNow(game)` supplying `atMs`.
- Clock, economy, and prestige seam: one pure late-hallmark tick projection uses
  `activeTimeMs + totalOfflineMs`. It crosses every offer-expiry boundary deterministically with
  seed plus rotation sequence plus pool identity; it preserves a pre-expiry offer and an installed
  composition. Cooldowns remain deadline comparisons and senescence has no deadline. Live tick
  overlays this projection, and offline replay independently verifies its normalized durable
  result after existing core-six and M11 elapsed projections. Named effect functions feed only
  documented production, route, pressure, ATP, inflammation, immune-visibility, and stage-gate
  relations. M12 imports the L3 immortalization activation predicate through one small adapter;
  M15 replaces that adapter implementation with its ledger-owned activation while retaining the
  M12 state, event, save, and UI contract.
- Historical implementation record: the late-hallmark aggregate replaced provisional scaffolding
  during pre-production. The settled current parser validates bounded, canonical, and unique
  catalog relations, exact saved composition cards, timestamps, region links, ownership, and offer
  deadlines in the format-2/schema-8 state. It accepts no historical schema or compatibility shim.
- Living-tumor contract: after the state model is accepted, the frozen visual adapter adds
  `phenotype-variance`, `chromatin-program`, `microbiome-surface`, and `senescent-region`, each
  with a named hallmark and morphology provenance row. It can overlay an existing stylized region;
  it does not claim literal microbiome topology, chromatin distribution, clone proportion,
  secretome concentration, or cell count. The renderer consumes frozen visual effects, never
  `GameState` or mechanics maps.
- Dispatch order: D.6 closes types, brands, catalogs, activation adapter, and pure effects; D.7
  adds events, parser, reducer, and senescence factory; B/C.6 added the current aggregate parser and the shared
  live/offline tick projection; C/D.8 connect named operation and gate effects; F.12 adds the four
  controller/UI intents and visible composition, compatibility, cooldown, and status; G.11 follows
  the catalog API with frozen provenance effects; I.11 adds durable event/save/offline/browser
  evidence. Each lane imports the prior public seam and keeps its ownership boundary.
- Exit criteria: the tree is complete at 14 and the four late branches gate behind prestige
  layers. Every event has an eligible operation relation and invalid, missing, stale, or expired
  input is atomic; a real phenotype/program changes its named behavior; a saved microbiome offer
  reloads with its three exact candidates and accepts only one; keep and clear have distinct real
  senescence outcomes; the current schema requires the canonical aggregate; and normalized
  live/offline durable state agrees across an offer rotation. A visible branch traces its
  biology-backed morphology contribution from catalog through frozen scene provenance, while a
  branch without a visible consequence records the rationale in the design document. Production
  browser evidence covers pointer/keyboard intent, disabled/persistence states, and visible
  composition/cooldown status. Small semantic, save, atomicity, normalized replay, and frozen
  provenance tests are permanent; candidate distributions, compatibility weights, price/duration
  tuning, long fuzzing, contact sheets, and 1280 x 800 visual inspection are dated calibration or
  acceptance evidence.
- Parallel-plan ready: yes, in the declared dispatch order.

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
- **Cross-system interactions.** `docs/SYSTEM_INTERACTIONS.md` names the high-value
  interactions where hallmarks, stages, organ sites, host traits, passage upgrades, and
  dissemination routes change each other's value. Not an exhaustive matrix. The success condition
  is that prestige choices change which hallmark strategies are attractive, rather than prestige
  sitting on top of an unchanged hallmark economy. This is the single largest remaining
  opportunity in the design: every system is individually specified, and the emergent game lives
  in how they reach into each other.

- Validation, deferred to M21: each layer has a decision witness showing a reachable state,
  alternatives, and a changed tradeoff. The balance laboratory supports design review by exposing
  permanently dominant actions or a non-renewing L4 decision surface.
- Parallel-plan ready: no.

### Milestone: M14 prestige layers 1 and 2

- Depends on: M11, M12 completion, M13.
- Deliverables: exact-key current `LineageLedger`, separate authoritative `MetastasisState` and
  `HostTransferState`, organ/host/boon catalogs, deterministic random derivation, complete reset
  projections, six prestige intents, selected-run prestige effects, strict current-save parser
  support, and a confirmed Solid prestige surface. The implementation owns `src/prestige/layers.ts`,
  `reset.ts`, `seeding.ts`, `hosts.ts`, `effects.ts`, `src/state/deterministic_random.ts`,
  `src/state/save_parse/prestige.ts`, and
  `src/render/prestige_panel.tsx`; domain-named Node and production-browser behavior tests follow
  their owning APIs.
- Transit and history foundation: after M12 completion and before reset handlers, M14 introduces
  `OrganSiteId` and `OrganTagId`, the organ-site catalog, the route-to-site compatibility mapping,
  and the centralized lineage-ledger writer. The exact-key `resolve-transit` event accepts one
  pending `EventId`, compatible destination site, and authoritative `atMs` once; it creates or
  marks the current-run seeded region, and an arrived outcome appends that site's canonical-order
  tags and increments `successfulTransitCount`, while a lost outcome records neither. A `RegionId`
  remains a local stage projection, never organ history. M14 owns this whole seam because organ
  identity and the ledger are prestige contracts; M12 supplies the completed progression state it
  consumes. This avoids circular cross-milestone ownership.
- State and history contract: `LineageLedger` is the sole reset-surviving history record. It stores
  a nonzero `lineageSeed`, safe `hostRunSequence`, explicit `currentHostRunId`, completed-reset and
  transit counters, unique canonical-order organ tags/hallmarks/boons, terminal preparation, host
  draft sequence, and reserved L3/L4 identity fields. It holds no duplicate currency, active card,
  or renderer-derived trait. `MetastasisState` solely owns L1 Potential, allocation, and program
  choices; `HostTransferState` solely owns L2 Imprints, purchased boons, active host, and saved
  draft. Catalog order and uniqueness govern every saved keyed list.
- Quote and revision contract: `captureTerminalSnapshotV1(state)` is a pure, trusted,
  `host_collapse`-only snapshot of current cells/viable seeded regions and ledger facts. Derived
  L1/L2 quotes are transient read models, never saved or accepted from the UI. Their
  `sourceEventSequence` is the quote revision; every reset, allocation, program, boon, and draft
  selection confirms the current trusted revision before mutation. A rejected stale or unavailable
  action preserves the original state reference.
- Deterministic draft contract: `deriveSeedV1` is the sole deterministic seed derivation API. It
  owns versioned ASCII-domain plus ordered-unsigned-integer serialization, FNV-1a uint32 hashing,
  and zero-to-one mapping without time, locale, DOM, or random dependencies. `generateHostDraftV1`
  exclusively turns its host-draft seed into one frozen saved `HostDraft`: an ordered four-card
  tuple with unique three-axis trait combinations, persisted IDs, trusted source revision, saved
  three- or four-card reveal order, availability, and consumption. The fourth card always exists;
  an extra reveal boon changes the saved reveal list during generation. Selection accepts only a
  saved revealed card and creates the new `HostRunId`, updating both active host and
  `lineageLedger.currentHostRunId`.
- Event, reset, and UI contract: the closed additions are `perform-metastasis-reset`,
  `allocate-organ-site`, `select-colonization-program`, `purchase-lineage-boon`,
  `perform-host-transfer`, and `select-host-card`. Exact-key parsing brands and bounds each
  payload. `recordEvent()` remains the exclusive durable-mutation and sequence owner: helpers
  project complete next states, never call the event funnel, read clocks, persist, mutate a store,
  or advance sequence. `projectL1Reset` and `projectL2Reset` each construct the complete
  post-reset state from validated state, parsed time, and trusted snapshot/quote; they do not
  rebuild an initial state and patch retained fields. The controller supplies simulation `atMs` and
  current revision. The Solid surface displays derived quote/draft and requires an explicit
  confirmation that sends stable IDs plus revision only; persist-before-reconcile keeps failed-save
  state visibly unchanged.
- Historical implementation record: prestige aggregates were introduced during pre-production.
  The settled exact current parser/writer covers ledger, L1, and L2 records and rejects
  unknown/missing keys, noncanonical/reordered lists, unsafe counters/seeds, foreign IDs, malformed
  drafts, invalid BigNums, and inconsistent active host/ledger run identity. The format-2/schema-8
  writer-reader closure round-trips with no notices; it does not accept earlier schema shapes.
- Selected-run effects contract: `MetastasisState.activeNicheContext` is null before a selected L1
  run or an exact catalog-consistent `{ siteId, allocationRank, programId }` record. An accepted
  `perform-metastasis-reset` names `siteId`, validates a positive allocation and exactly one
  selected program, and writes this context through the complete reset projection. L2 preserves it
  for the selected host run; L3 clears it. `src/prestige/effects.ts` is pure: niche-only and
  host-only effects compose independently, and only the absence of both is fully neutral. Protected
  route affinity requires both active-niche site compatibility and active-host draft/card
  provenance. Named mechanics consumers compose bounded conversion, vessel-capacity/upkeep,
  route-risk, visibility, pressure, and reserve-floor effects; historic portfolios never become a
  global producer multiplier or infer a current region. Live and offline paths remain parity
  consumers of the same mechanics functions.
- Boon provenance contract: saved `PurchasedLineageBoon` records retain application provenance.
  `extra_card_reveal` changes only the persisted host-draft reveal list. `protected_route_affinity`
  applies only with current selected-host/draft provenance and route compatibility. A discriminated
  `reduced_trait_liability` purchase is offered after `select-host-card`, names a trait on that
  selected card, and reduces only the target liability. Controller and Solid confirmation send
  stable IDs and revision; they never choose a trait or derive an effect locally.
- Dispatch order: E.1 settles brands, organ/route catalog, ledger writer, `resolve-transit`, L1/L2
  state, quotes, deterministic seed, and draft interfaces; E.2 adds reset/event projections after
  that seam; B.7 adds current aggregate parsing; F.13 adds controller/panel confirmation after
  command signatures settle; I.12 adds domain behavior proof. Each projection and later L3/L4 reset
  lives in `reset.ts`, so later layers extend its complete-state contract rather than creating a
  second reset path.
- Exit criteria: an M14 compatible transit records arrival tags and count while lost or invalid
  transit is atomic; exact-key current saved state
  round-trips; each accepted L1/L2 cycle begins at `host_collapse`, uses a transient
  current revision, applies its declared complete projection, and records through `recordEvent()`;
  an L2 draft remains identical across reload until selection; and the production build exposes
  deliberate keyboard-accessible confirmation with honest persistence failure behavior. Permanent
  tests prove representative reset preservation/clearance, formula and seed validity, one accepted
  sequence advance, stale/foreign/hidden/reused/invalid input atomicity, saved-draft/reload
  semantics, strict current parsing, and browser confirmation/focus. Readable draft dumps, portfolio and
  card-rank comparison, and balance tuning are one-time review evidence rather than brittle test
  fixtures, count locks, or timing limits.
- Parallel-plan ready: yes, after the declared state/catalog seam.

### Milestone: M15 prestige layers 3 and 4

- Depends on: M12, M14.
- Deliverables: `culture.ts`, `network.ts`, their panels, extended simulation coverage.
- Workstreams: E, F, I.
- Entry criteria: M14 exit met.
- Exit criteria: a reachable L4 scenario exposes a renewable decision surface after authored
  nodes stabilize. The evidence names open alternatives and the tradeoff they change; the balance
  laboratory records longer-run observations for later curve review.
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
  drawing. Its public request/result boundary is data-only and immutable; internal passes may
  evolve while preserving finite geometry, declared containment, clearance, and occlusion. The
  decisive one-time acceptance evidence is a deterministic suppressed-detail contact sheet at
  `output_visual/colony-contact-sheet/`. Its
  manifest records declared stages, seeds, viewports, themes, panel and figure fit,
  `#colony-a11y-description` presence, finite boxes, and overflow; a fresh independent agent
  applies the written rubric to determine stage distinction. The contact-sheet reproduction command
  is `node --import tsx tools/colony_contact_sheet.mjs`; it clears only that exact subdirectory
  before regeneration. `node --import tsx tools/verify_colony_rendering.mjs` similarly owns
  `output_visual/colony-rendering-verification/report.json` and clears only its exact
  subdirectory. A dated optional renderer calibration may
  record node, path, and performance observations for art tuning; it carries no release threshold.
  If the stages only differ once cells are drawn, the layout layer is not carrying its weight.
- Permanent geometry evidence proves finite values, immutable inputs/outputs, declared
  containment and clearance, deterministic result for the same request, meaningful seed
  variation, and no renderer-owned layout decision. A one-time calibration sweep records
  candidate allocation, slot/detail sampling, macro-separation, and corpus measurements in dated
  evidence; those tunable values guide art revisions without becoming public layout contracts.
- M18 handoff: M17 delivers slot geometry and a suppressed-detail serialization only. M18 consumes
  it at 320x224, 560x392, and 1000x700, owns actual inline SVG/DOM rendering and accessibility,
  and validates figure fit, accessibility, and readable composition. Neither milestone uses pixel
  equivalence as an acceptance substitute. The dated M17 review records source revision, exact
  commands and capture inputs, the fixed rubric, per-criterion verdicts, evidence paths,
  remediation status, and a final verdict; geometry and determinism remain permanent behavior
  checks while this visual calibration remains one-time evidence.
- Parallel-plan ready: no. This is the shared upstream for M18.

### Milestone: M18 cell rendering and defs

- Depends on: M17.
- Deliverables: `blob.ts`, `cell.ts`, `colony.ts`, `defs.ts`, `describe.ts`, `icons.ts`, and
  `src/render/colony_panel.tsx`; the cell-click board and its durable browser interaction proof.
- Workstreams: F, G, I.
- Entry criteria: M17 exit met.
- `src/render/colony_panel.tsx` is the dedicated M18 UI integration owner: it consumes accepted
  layout and cell contracts, supplies one named native colony button, authoritative count/rate,
  instruction, visible stage caption, feedback, and consumer-size presentation, and does not
  redefine morphology, layout, or shared `<defs>` semantics. `App` supplies its existing typed
  `onDivide` intent and disabled/recovery state; it supplies no store setter.
- Frozen-contract amendment: visible cell geometry delegates pointer/touch input through
  `colony.ts` to one typed action; the native colony button owns Enter/Space and the sole keyboard
  focus target. Both paths call the established controller divide intent once. Local cell keys
  never become event, save, reducer, or game-state data.
- Board contract: target one shared 1280 x 800 (16:10) first view whose visual hierarchy is a game
  canvas rather than a set of explanatory panels. A shallow scoreboard HUD shows cells, cells per
  second, stage, save state, and compact utilities. The living tumor is the largest visual and
  interaction region; the center shows one active evolution family and next goal; the right rail is
  an illustrated, always-available upgrade rack. A compact reward strip closes the loop below.
  Players click rendered cells directly and receive immediate division feedback. Producer rows use
  distinctive editable SVG machinery and retain owned count, next cost, affordability, and
  production contribution. Hallmarks, stages, prestige systems, and utilities use a coherent
  icon-first language. Persistent copy is limited to essential labels, numbers, states, and the
  immediate goal; biological rationale, tradeoffs, exact prerequisites, and richer statistics live
  in keyboard- and pointer-accessible tooltips or an optional specimen drawer. Wider boards scale;
  compact widths retain arena, active evolution, then upgrade rack with no horizontal document
  overflow.
- Exit criteria: cells render as volumes (silhouette, irregular nucleus offset from center,
  cytoplasmic value variation, restrained cross-contour marks following the local membrane,
  overlap, directional light). Cells vary deterministically with a seed while retaining recognizable
  stage-family cues. Shared gradients, masks, and motifs live in `<defs>`; repeated styling goes
  through CSS classes rather than per-node attributes; representative sampling keeps the figure
  visibly usable at supported consumer sizes. Production
  Playwright proves visible-cell pointer activation, Enter/Space, one focus target, count/rate and
  status feedback, discoverable right-rail producer data, locked-content explanation,
  save-failure/recovery state, reduced-motion feedback, caption, responsive order, and zero page
  errors through the built output. The 1280 x 800 task walkthrough also proves that its primary
  elements are discoverable together. Screenshot matrices, heuristic walkthroughs,
  and contact sheets are one-time acceptance evidence; no pixel, byte, or arbitrary timing
  threshold is a release gate.
- Dispatch order: F.10 defines the typed panel handoff and 16:10 shell; G.10 adds local visible-
  cell delegation and data-derived living-tumor layers; F.11 adds focus, feedback, and responsive
  styling; G.11 supplies the tumor focal-response SVG, producer-machine illustrations, stage
  emblems, and hallmark sigils; F.12 composes the compact HUD, evolution dock, upgrade rack,
  accessible tooltips, and specimen drawer; I.10 adds the durable
  `tests/playwright/test_colony_interaction.mjs` player journey. The image-evaluation lane records
  initial, perfused, late-game, and compact reduced-motion evidence after the production build is
  available. A fresh agent applies the captured-state visual rubric to the production-built
  screenshots: arena dominance, direct-cell affordance, visible progression, icon-first utility
  language, copy contained in tooltips or the specimen drawer, absence of a document-panel layout,
  and reduced-motion legibility. The review records its deterministic routes, fixed seeds,
  1280x800 and compact frames, criterion verdicts, and remediation status. It is dated one-time
  acceptance evidence, while the durable Playwright interaction and accessibility contracts remain
  permanent tests.
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
- Deliverables: `src/types/replay.ts`, `src/state/replay.ts`, and `tests/test_replay.mjs` with
  inline traces or a legal-state builder.
- Workstreams: B and I jointly.
- Entry criteria: the event funnel carries every gameplay action.
- Exit criteria: a development-only replay format records seed, purchases, stage transitions,
  prestige actions, and timestamps. One test replays a recorded sequence to an equivalent
  normalized durable state, equivalent event outcomes, and equivalent visible progression. Canonical
  JSON bytes become an assertion only when the serialized replay is explicitly published as a wire
  contract. The funnel already exists, which makes every later balance or save finding reproducible
  without coupling it to object-key or serializer implementation detail.
- Parallel-plan ready: no.

### Milestone: M21 balance laboratory

- Depends on: M19, M20.
- Deliverables: `tools/balance_sim.mjs`; a machine-readable report under `output_balance/`;
  `docs/BALANCE.md`; tuned curve tables as data edits.
- Workstreams: I leads; C, D, E apply tuning.
- Entry criteria: M19 and M20 exit met.
- Exit criteria: five declared strategy bots run headless with no DOM (see
  `## Simulator player-strategy model`); the report is machine-readable JSON at
  `output_balance/balance_report.json` plus a human-readable summary in `docs/BALANCE.md`; the
  report publishes assumptions, curve version, observed pacing, dead actions, dominant actions,
  reachable gates, and L4 decision-surface observations. Each stage, hallmark, and prestige review
  links its reachable decision witness. The report records an explicit candidate-selection result:
  inputs, the current shipped candidate, observed flags, demonstrated blocking findings, selection,
  rationale, and remediation status. A bounded policy nonselection, an aggregate tie, or a later
  tier absent from an earlier witness remains a calibration observation. A finding becomes blocking
  when its trace demonstrates degeneracy inside that witness's named decision surface, or when the
  scenario never reaches the surface named by its question. The manager selects a candidate only
  when its report has no demonstrated blocking findings; when several candidates qualify, select
  the candidate with the greatest count of still-divergent declared strategies, then the
  lexicographically first curve identifier. A withheld selection dispatches one bounded redesign of
  the implicated curve or scenario input and a fresh report before the next selection. Bot ranks
  and elapsed observations inform calibration rather than becoming CI pass/fail targets.
  `output_balance/` is root-scoped per `docs/REPO_STYLE.md` and covered by the `/output*/` ignore
  rule.
- Parallel-plan ready: no. Tuning is one measurement loop; parallel curve edits conflict.

### Milestone: M22 autonomous release-evidence record

- Depends on: M21, and M18 for the art artifacts.
- Deliverables: `docs/RELEASE_EVIDENCE.md`; `.github/workflows/deploy-pages.yml` and the local
  workflow-contract result from `devel/verify_pages_workflow.py`; a read-only candidate manifest;
  `dist/`; captured artifacts; and `docs/active_plans/reports/release_audit.md`.
- Workstreams: an evidence integrator assembles the closeout record and candidate manifest; a fresh
  independent audit agent verifies it against the captured evidence and writes the final verdict.
- Entry criteria: every prior milestone green.
- Exit criteria: `docs/RELEASE_EVIDENCE.md` contains, in one place: every gate result with its
  command, exit status, relevant tool version, concise behavior summary, and artifact link;
  balance observations for all five bots; screenshots and the art
  contact sheet; current-save boundary evidence; accessibility output (contrast measurements,
  `#colony-a11y-description` coverage, geometry and horizontal-overflow results, and reduced-motion
  evidence); the copy-guard and copy-review verdicts; the read-only candidate manifest; the local
  workflow-contract result; and a written known-limitations section. A dated optional one-time
  renderer calibration may record node, path, and performance observations with its source revision,
  capture inputs, and conclusion; those observations guide renderer evolution and set no M22 release
  threshold.
  It also opens with a **progression narrative**, because this project is design-heavy and gate
  evidence alone cannot show whether the intended experience exists:
  `single transformed cell -> early tumor -> carcinoma in situ -> invasion -> first metastasis ->
host death -> immortalized culture -> global contamination -> Chicago ending -> continued play`.
  Each transition links its captured screenshot, its dominant mechanic, and the automated result
  that proves it is reachable. The document demonstrates the game as well as repository
  correctness. M22 closes when its exact command results are green and the fresh independent audit
  has a `PASS` final verdict with every required criterion resolved; the manager can regenerate the
  record while the owner is away.
- Parallel-plan ready: yes. Artifact capture parallelizes by artifact.

## Workstream breakdown

### Workstream: A0 contracts

- Goal: cross-module shapes that survive real use.
- Owner: one agent with `typescript-engineer`.
- Work packages: WP-A0.1 branded ids and `BigNum` shape; WP-A0.2 `GameState`, `CurrentSaveFile`,
  exact envelope, and recovery notice types; WP-A0.3 `GameEvent` union and `HallmarkEffect` interface;
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
  `save_load.ts`; WP-B.4 `offline.ts`; WP-B.5 legal-state builder and inline records; WP-B.6
  `replay.ts`.
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
- Review boundary: pure functions, no DOM, and an injected clock that tests advance deterministically.

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

- Goal: every panel with one base stylesheet and explicit domain stylesheet assets where ownership
  warrants them.
- Owner: two agents across milestones, invoking `css-creative-expert` and `ui-ux-engineer`.
- Work packages: WP-F.1 shell and `index.html`; WP-F.2 producers panel; WP-F.3 hallmark tree;
  WP-F.4 stage panel; WP-F.5 prestige panels and confirm modals; WP-F.6 offline report;
  WP-F.7 event log; WP-F.8 theme CSS and motion; WP-F.9 ending view; WP-F.10 colony action
  handoff and 1280 x 800 board; WP-F.11 colony focus, feedback, and responsive fallbacks;
  WP-F.12 compact scoreboard HUD and game-canvas composition; WP-F.13 icon-led evolution dock and
  illustrated upgrade rack; WP-F.14 focusable tooltips, specimen drawer, and transient reward
  feedback.
- Needs: all logic workstreams; G for art.
- Provides: the playable surface.
- Review boundary: only DOM owner, owner of `src/style.css`, and owner of explicitly linked,
  build-allowlisted domain stylesheet assets such as `src/prestige.css`. Build preflight/copy,
  source-line limits, owning-doc references, and browser proof keep each asset visible. Never sets
  `innerHTML` from unescaped content; branded ids never leak into DOM attributes as raw brands.

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
  - WP-G.10 visible-cell geometry markers, typed pointer/touch delegation, and data-derived
    vessel/route layer integration after their contracts are accepted.
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
  WP-I.6 replay traces; WP-I.7 `docs/RELEASE_EVIDENCE.md` assembly.
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

Copy review closes through three agent-executable layers.

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

The automated guard and independent checklist close the copy boundary for this plan. A later
repository-maintainer workflow may read completed copy as optional distribution orientation; that
reading does not change the milestone state.

## Acceptance criteria and gates

- Per-patch gate: the coding agent runs the relevant canonical command and reports command, exit
  status, relevant tool version when useful, concise behavior summary, and artifact link when the
  command creates one.
- Integration gate: after every milestone, the orchestrator runs `./check_codebase.sh`, then
  `./build_github_pages.sh`, then that milestone's Playwright check. A failing gate triggers a fix
  agent, not a retry.
- Design gate: M2, M5, M13, M16, and M19 produce a written artifact before their implementing
  milestone is dispatched. Dispatching M10 without `docs/PROGRESSION_DESIGN.md`, or any drawing
  code without `docs/MORPHOLOGY_REFERENCE.md`, is a process failure.
- Independent review gate: `reviewer` for the M8 contract freeze and the copy pass;
  `image_evaluator` for the M18 contact sheet; `audit-code-reviewer` before M22.

### Standard agent-review artifact

Every independent review named by this plan writes a dated Markdown report under
`docs/active_plans/reports/`. The report uses this schema so an unattended manager has a decidable
closeout record:

| Field              | Required content                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| Scope and revision | Milestone or artifact scope and the source revision or working-tree manifest identity reviewed         |
| Exact inputs       | Commands, deterministic routes, fixture/state-builder inputs, fixed seeds, viewport, and tool versions |
| Criteria           | Written criterion checklist, including the relevant milestone exit criteria                            |
| Evidence paths     | Paths to command logs, JSON reports, screenshots, contact sheets, traces, and generated artifacts      |
| Criterion verdicts | `PASS`, `FAIL`, or `NOT_APPLICABLE` for every criterion, with concise evidence references              |
| Remediation status | Each finding's owner, bounded follow-up, and resolved or open state                                    |
| Final verdict      | `PASS` only when every required criterion passes and remediation is resolved; otherwise `FAIL`         |

M8, M17, M18, the copy review, M21, and M22 use this schema. A reviewer may capture one-time
calibration evidence without converting its measured values into a permanent pixel, byte, or timing
test.

## Test and verification strategy

Three evidence classes keep durable contracts strong and calibration flexible. Each new test must
meet the permanence checklist in `docs/PYTEST_STYLE.md`: it protects a stable
semantic, mathematical, safety, or shipped user-visible behavior and survives a reasonable
refactor. Tests use inline inputs or a local builder; regular tests run offline.

- **Permanent regression** (`tests/test_*.mjs`, `tests/playwright/`): Node protects BigNum
  invariants, normalized save/replay semantics, registered-event coverage, reset-policy semantics,
  direct hallmark outcomes, atomicity, and declared geometry containment/clearance. Built-output
  Playwright protects visible cell activation, keyboard access, figure fit at 1280 x 800 and compact
  supported sizes, reduced motion, reload/offline behavior, and the `#colony-a11y-description`
  contract. Canonical
  commands are `./check_codebase.sh`, `./build_github_pages.sh`, and
  `./run_playwright_tests.sh` as the change requires.
- **One-time calibration** (`tools/`, `output_*/`, session evidence): `tools/balance_sim.mjs`,
  `tools/colony_contact_sheet.mjs`, visual corpus sweeps, and profiler captures record their input
  corpus, environment, measurements, conclusion, and reproduce command. They calibrate art detail,
  balance, and performance without turning path hashes, slot counts, pixels, byte counts, or timing
  samples into permanent limits.
- **Design review** (owning `docs/*.md` plus dated report): each hallmark, stage, and prestige
  system carries a decision witness with reachable state, alternatives, observed tradeoff, and its
  design rationale. Provenance is required where biology creates a visible consequence; a declared
  absence has a rationale. Independent review traces the claim to the actual behavior.
- **Candidate repo hygiene** (`source source_me.sh && python3 devel/verify_candidate.py`): the
  disposable candidate projection runs the full `pytest tests/` suite while preserving the real Git
  index, and keeps ASCII, indentation, source-size, Markdown-link, and vendored-header rules
  healthy.

### Evidence task dispatch

| Task                            | Owner                           | Target artifact                                                                   | Success criterion                                                                                                                                | Canonical command                                                                                                                                    |
| ------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline model calibration       | State owner with reviewer       | `docs/GAME_DESIGN.md` and dated offline report                                    | Exact segments preserve normalized durable outcomes; any display approximation has a named measured envelope                                     | `./check_codebase.sh` plus focused offline Node test and production-dist scenario                                                                    |
| Geometry and render calibration | SVG creator and image evaluator | `tools/colony_contact_sheet.mjs` and dated visual report                          | Contact sheet covers registered stages, representative seeds, supported sizes, themes, and reduced motion; review traces visible fit and biology | `./build_github_pages.sh`, `./run_playwright_tests.sh`, `node --import tsx tools/colony_contact_sheet.mjs`                                           |
| Balance design review           | Balance owner with planner      | `tools/balance_sim.mjs`, `output_balance/balance_report.json`, `docs/BALANCE.md`  | Report links strategies to decision witnesses and identifies dead actions, dominance, gates, and L4 renewal                                      | `node --import tsx tools/balance_sim.mjs --suite --output output_balance/balance_report.json`                                                        |
| Release evidence                | Integrator and docs owner       | `docs/RELEASE_EVIDENCE.md`                                                        | Each release claim has command, status, behavior summary, relevant version, and artifact link                                                    | `./check_codebase.sh`, `./build_github_pages.sh`, `./run_playwright_tests.sh`, `source source_me.sh && python3 devel/verify_candidate.py`            |
| Durable naming migration        | Maintainer with tester review   | domain-named `src/`, `tests/`, and `tools/` paths plus `docs/DESIGN_DECISIONS.md` | Implementation milestone labels leave durable paths; valid schema-version and scientific identifiers remain                                      | `./check_codebase.sh`, `./build_github_pages.sh`, applicable `./run_playwright_tests.sh`, `source source_me.sh && python3 devel/verify_candidate.py` |

### Simulator player-strategy model

"Time to prestige" is meaningful only with a declared player model. Five declared bots are all
reported as calibration evidence:

- **Greedy payback**: selects the producer with the shortest disclosed cell-cost-per-marginal-
  cells-per-second payback, using the same visible cost and benefit quote as the Store.
- **Naive cheapest**: always buys the cheapest affordable item. The lower bound on competent play.
- **Hallmark-first**: prioritizes hallmark branches over producers. Detects a tree that is too
  strong or too weak relative to raw production.
- **Prestige-rush**: resets at the earliest viable threshold. Detects prestige thresholds that are
  degenerate in either direction.
- **Check-in idle**: advances through each scenario's declared elapsed schedule and acts only on
  every third decision window when a visible route, network, or prestige action exists. Models the
  away-and-return player without inventing an arbitrary universal hour threshold.

Adoption rule: the design owner compares the strategy observations with the declared decision
witnesses, records the curve version and tradeoffs in `docs/BALANCE.md`, and chooses the curve that
removes demonstrated dead actions, permanent dominance, unreachable gates, or an exhausted L4
surface. The review records unresolved questions as evidence to gather in the next calibration.

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

The review flags a constant decision surface for redesign. The requirement stays behavior-focused,
with no arbitrary play-duration ceiling; the question is whether the decision surface renews
itself, not how many hours it survives.

### Pacing calibration

M21 records elapsed observations at first producer, first hallmark, stage progression, prestige,
soft ending, and prolonged L4 for each declared strategy. These observations guide design review;
they are not universal time targets. The enduring success condition is a reachable next decision
with a documented tradeoff, including after the ending and through L4 renewal.

## Migration and compatibility policy

### Settled pre-production cutover

- The historical migration ladder was retired before public deployment. The only accepted and
  written save is the exact `version: 2`, `stateSchemaVersion: 8` envelope.
- `parseSave()` validates that current envelope and complete DTO without default injection or
  partial repair. Every other shape enters protected recovery; rejected raw bytes remain available
  until the player explicitly confirms a validated fresh replacement.
- The writer re-enters the same strict parser before storage, establishing current writer-reader
  closure. Development semantic replay is a diagnostic over schema-current snapshots and accepted
  events, not save compatibility.
- A future public compatibility policy requires a newly approved contract. This pre-production plan
  carries no live promise to accept retired p5, p6, or p7 shapes.

## Risk register

| Risk                                                | Impact                                                                   | Trigger                                                | Owner        | Mitigation                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Contracts frozen before evidence                    | Every lane rebases; parallelism advantage evaporates                     | A feature agent needs a shape that does not exist      | A0           | Freeze moved to M8; five compile-only slices at M1                                                                 |
| Save schema designed before mechanics are known     | Migration churn on a live schema                                         | Progression design written after M4                    | J            | `docs/PROGRESSION_DESIGN.md` is M2, before state                                                                   |
| Float drift in BigNum at extreme exponents          | Wrong numbers, broken late game                                          | Mantissa denormalizes past 10^300                      | A            | Normalize every operation; test the economy's real operations                                                      |
| Offline diverges from live once nonlinearity lands  | Player returns to wrong numbers; trust gone                              | A hallmark makes production non-constant               | B            | Document simulation/queue/pause boundaries; compare equal scheduled boundaries and calibrate display approximation |
| 14 hallmarks collapse into 14 multipliers           | The content spine is hollow                                              | Handlers all reduce to scaling a rate                  | D            | M2 specification gates dispatch; direct decision witness per branch                                                |
| Four prestige layers feel like one repeated reset   | The "endless depth" claim fails                                          | Layers differ only in cost                             | E            | M13 identity document; reset policy and decision witness per layer                                                 |
| Balance measured against an arbitrary bot           | Pacing numbers are misleading                                            | Simulator hardcodes one purchase rule                  | I            | Five declared bots; recorded assumptions and independent design review                                             |
| A balance or save bug cannot be reproduced          | Debugging becomes guesswork                                              | Nondeterministic run reports a symptom                 | B, I         | Deterministic replay at M20                                                                                        |
| Colony reads as uniform noise                       | Art effort produces an unreadable field                                  | Cells generated before composition                     | G            | `colony_layout.ts` split makes layout-first structural; suppressed-detail test                                     |
| Art invents plausible-looking but wrong biology     | Loses the science-accurate premise                                       | Generator tuned by eye alone                           | G            | `docs/MORPHOLOGY_REFERENCE.md` gates all drawing code; every visual change cites a row                             |
| Cells unique but visually unrelated                 | The colony looks like a sticker sheet                                    | Per-cell parameters drawn independently                | G            | Family-coherence metric: within-stage variance bounded, between-stage separation required                          |
| Renderer detail obscures the playable colony        | Late-game cells lose readable interaction                                | Cell detail outgrows the visible arena                 | G            | Representative sampling, `<defs>` reuse, CSS-class styling, and dated optional renderer calibration                |
| Systems are individually strong but do not interact | A pile of good subsystems, no emergent game                              | Each lane validated only against itself                | J, D, E      | `docs/SYSTEM_INTERACTIONS.md` at M13; M21 checks prestige changes which hallmarks are attractive                   |
| Hallmark tree is a menu, not a tree                 | Player ranks 14 branches independently and always buys in the same order | No specified synergies or tensions                     | D            | M2 requires named synergies, tensions, and direct decision witnesses                                               |
| Stages are reskins                                  | The clearest progression signal carries no gameplay                      | Stage spec is visual only                              | D, J         | M2 assigns each stage a gameplay identity and decision witness                                                     |
| L4 network gets solved                              | The endless engine stops producing decisions; only currency rises        | Authored graph fully conquered                         | E            | M13 specifies the renewal mechanism; M21 measures decision availability, not just acceleration                     |
| Early L1 runs feel repetitive                       | Player quits before the L2 draft supplies variety                        | Organ-site allocation is the only early variable       | E            | M13 must answer whether L1 supplies real variation, and deepen organ sites if not                                  |
| `MorphologyParams` becomes a dumping ground         | Later visual features silently overwrite earlier ones                    | Multiple systems write the same parameter              | A0, G, D     | Named resolution chain, per-parameter combination rule, clamps, contributor provenance                             |
| Tuning to the bots                                  | Mechanics optimized for the simulator, experimentation stripped out      | One correct build per situation is treated as the goal | I, J         | Bots report degeneracy; near-optimal ties are left alone                                                           |
| The ending is a text screen                         | The payoff undersells the whole game                                     | Ending treated as copy                                 | E, J         | M19 specifies it as a system with its own milestone and validation                                                 |
| Tone lands wrong                                    | Satire reads as mocking patients                                         | Copy drifts toward the disease rather than the cell    | H            | Automated copy guard plus `reviewer` checklist; versioned boundary statement                                       |
| Manager-complete evidence is incomplete             | The plan lacks an unattended completion path                             | A required claim lacks a command, artifact, or rubric  | Orchestrator | Every gate is a command, a metric, or an agent review with written criteria                                        |

## Rollout and release checklist

### Manager-complete candidate evidence

Every item is executable by the manager or a subagent and is required for M22 closure.

- [x] `./check_codebase.sh` passes with zero warnings.
- [x] `source source_me.sh && python3 devel/verify_candidate.py` runs the full `pytest tests/`
      suite through a disposable candidate projection, including ASCII, indentation, line-limit,
      and Markdown-link checks, while preserving the real Git index.
- [x] `./run_playwright_tests.sh --build --workers=1` passes, full playthrough included.
- [x] `./build_github_pages.sh` produces `dist/` with `index.html`, `main.js`, `.nojekyll`.
- [x] `source source_me.sh && python3 devel/verify_pages_workflow.py` validates the checked-in
      Pages workflow contract, matching `deploy-pages.yml`, its canonical build step, and its
      `dist/` upload projection.
- [x] `output_balance/balance_report.json` written; `docs/BALANCE.md` summarizes all five bots.
- [x] Prestige decision witnesses and balance review are recorded in `docs/BALANCE.md`.
- [x] Visual metrics battery green; contact sheet at `output_visual/colony-contact-sheet/`,
      renderer report at `output_visual/colony-rendering-verification/report.json`, and
      `image_evaluator` verdict captured.
- [x] Replay trace reaches an equivalent normalized durable state, equivalent event outcomes, and
      equivalent visible progression.
- [x] Copy guard green; `docs/active_plans/reports/copy_review.md` captured.
- [x] `node --import tsx tools/colony_contact_sheet.mjs` captures every registered stage across its
      declared seeds,
      viewports, and themes; the fixed-clock seven-frame capture covers opening,
      hypoxic/necrotic, perfused, invasive, culture, network, and Chicago-continuation states.
      Production Playwright owns transition behavior.
- [x] A schema-current legal save generated through the canonical state builder and serializer
      loads through the production build and proves its durable visible projection.
- [x] `README.md` first paragraph written as GitHub About text, under 250 characters, pure prose.
- [x] Zero-padded CalVer in `VERSION` and npm-compatible SemVer normalization in `package.json`
      represent the same `26.08.0` release (`26.08.0` and `26.8.0`, respectively).
- [x] `docs/CHANGELOG.md` updated; its candidate changes pass a read-only manifest and whitespace
      check while the repository-maintainer workflow retains Git index ownership.
- [x] `docs/RELEASE_EVIDENCE.md` and `docs/active_plans/reports/release_audit.md` use the standard
      review schema and record a `PASS` final verdict.

### Optional post-plan repository history and distribution

These later operations preserve repository history or publish a completed candidate. They have no
effect on milestone state, M22, or the autonomous release-evidence verdict.

- A later repository-maintainer workflow may review the working tree, create repository history,
  and publish the chosen candidate under the repository's Git ownership rules.
- A remote Pages workflow may run after publication, and a live-site inspection may be captured as
  supplemental distribution evidence.
- A changelog-derived commit message may be prepared for that later repository-history operation.

The manager records the working-tree candidate before these optional actions and reaches the same
terminal state with the same evidence package while the owner is away.

## Documentation close-out requirements

- Active plan / progress tracker: retain this authoritative plan at
  `docs/active_plans/implementation_plan.md`; the root `implementation_plan.md` symlink points to
  it. Update `docs/active_plans/active/cancer_clicker_build_plan.md` as milestones close and
  record terminal `Complete` when M22 closes. A later repository-maintainer workflow may archive
  the completed ledger as repository-history maintenance; archival does not alter the milestone
  state or autonomous closeout verdict.
- `docs/CHANGELOG.md`: one entry per milestone under the standard subsection headings, including
  `### Decisions and Failures` for approaches measured and rejected.
- New durable docs: `docs/GAME_DESIGN.md` (stages, currencies, offline model, ending),
  `docs/PROGRESSION_DESIGN.md` (the 14 hallmarks, their synergies and tensions, and the 12 stage
  gameplay identities), `docs/PRESTIGE_DESIGN.md` (the four layers),
  `docs/SYSTEM_INTERACTIONS.md` (high-value cross-system interactions),
  `docs/MORPHOLOGY_REFERENCE.md` (biology to visual abstraction), `docs/ART_DIRECTION.md`
  (illustration technique, palette, omissions), `docs/BIGNUM_OPS.md` (operation inventory),
  `docs/BALANCE.md` (measured curves, five bots, reasoning), `docs/RELEASE_EVIDENCE.md`.
- The named `arch-docs` agent skill route refreshes `docs/CODE_ARCHITECTURE.md` and
  `docs/FILE_STRUCTURE.md` at M22. The named `readme-docs` agent skill route refreshes `README.md`.
  `docs/RELEASE_EVIDENCE.md` records each route, its output paths, and the executable candidate-aware
  Markdown validation command `source source_me.sh && python3 devel/verify_candidate.py`; the
  independent audit verifies those records and outputs.
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
  draft, Immortalization is persistence, Dissemination is a network. Each layer has a reachable
  decision witness; the balance laboratory reviews whether tuning preserves those tradeoffs.
- **Depth over breadth after M13.** Scope is frozen at the current system set. The emergent game
  lives in cross-system interactions, not in a fifteenth hallmark. `docs/SYSTEM_INTERACTIONS.md`
  is where that value is captured.
- **Endless means endless decisions.** Rising production is necessary but not sufficient. L4 must
  keep generating choices after its authored network is conquered, and M21 measures decision
  availability directly rather than inferring it from acceleration.
- **Custom BigNum, no runtime math dependency; SolidJS is the sole deliberate UI runtime.**
  `{mantissa, exponent}` plus Conway-Wechsler illion names satisfy the stated full-name feature;
  `docs/SOLID_MODEL.md` keeps the UI runtime at the DOM boundary.
- **Offline is bounded coarse-step replay through the real tick.** It is selected so nonlinear
  hallmark effects share the live model. Equal scheduled boundaries use normalized durable-state
  equivalence; any intentional display approximation has a calibrated documented envelope.
- **Layout before rendering, structurally.** `colony_layout.ts` owns macro composition and
  produces data; `colony.ts` renders it and makes no layout decisions. Bottom-up cell scattering
  is rejected because it cannot express invasive fronts, necrotic centers, or structured negative
  space.
- **Books determine how to draw; biology determines what changes.** Every stage-dependent visual
  change cites a row in `docs/MORPHOLOGY_REFERENCE.md`.
- **Stylized SVG, clinical-dark.** Generated in TypeScript because `build_github_pages.sh` copies
  no asset directory. Canvas deferred, not adopted.
- **Base and explicit domain CSS.** `src/style.css` owns shared tokens and base rules. A cohesive
  domain may add an explicitly linked, documented, build-allowlisted stylesheet asset such as
  `src/prestige.css`; preflight/copy and production-browser proof keep it from silently dropping
  from `dist/`.
- **Generated output at the repo root.** `output_balance/` and `output_visual/` follow
  `docs/REPO_STYLE.md`; a nested `tests/e2e/output/` would be tracked and would violate the
  root-scoped `/output*/` rule. Each visual tool clears and recreates only its named
  `output_visual/` subdirectory.
- **Durable names describe domains.** Milestone IDs remain in plans, changelog entries, and dated
  implementation evidence. Durable `src/`, `tests/`, and `tools/` paths name their enduring
  behavior or responsibility; a public schema version or scientific year remains when it carries
  domain meaning.
- **Manager-complete execution path.** Every gate is a command, a metric, or an agent review with
  written criteria. `docs/RELEASE_EVIDENCE.md` is the autonomous closeout record: M22 ends at its
  audited working-tree candidate, and the repository-maintainer workflow may later add
  repository-history or distribution evidence.

## Open questions and decisions needed

None are execution-blocking. Each has an owner, an evidence rule, and a milestone.

- Cost-curve shape (pure exponential per Cookie Clicker versus tiered soft caps).
  - Decision owner: J designs the experiment; I measures; the orchestrator rules. Milestone M21.
  - Evidence and decision rule: build both as data tables, run all five bots against each, adopt
    whichever removes documented dead actions, permanent dominance, unreachable gates, or an
    exhausted decision surface while preserving the declared decision witnesses. Record the decision
    and its evidence under `### Decisions and Failures` in `docs/CHANGELOG.md`.
- Non-blocking follow-up: whether the colony view earns a canvas renderer after M22. A dated
  optional renderer calibration at high reachable cell count can record node and performance
  observations to inform that design decision; it establishes no release threshold.
- Non-blocking follow-up: achievements. The `record_event` funnel and the replay format make this
  a later addition rather than a retrofit.
- Non-blocking follow-up: audio. Out of scope; if added, muted by default with the preference
  persisted in the save file.

## Notes for the implementer

- Read `docs/REPO_STYLE.md` and `docs/TYPESCRIPT_STYLE.md` before the first patch. Tabs,
  ASCII-only source, files under 1000 lines, `git mv` for renames, and repository-maintainer
  ownership of the Git index and commits are the durable repository contract.
- The first patch must include a stub `.ts` under `tools/` or `tests/`, or `check_codebase.sh`
  step 2 fails with TS18003 on an empty include list.
- `src/index.html` must contain `<script type="module" src="main.js"></script>` exactly, or the
  build warns and the page loads dead.
- Every time-dependent system takes an injectable clock. Tests advance the injected clock, and the
  Playwright offline check uses a deterministic clock skew.
- Ship debug fast-forward hooks behind a URL flag from M7 onward. The playthrough test, the balance
  laboratory, and the replay harness all depend on them, and they are what make an overnight
  unattended run possible.
- Skills to invoke at the right moments: `parallel-plan` before each parallel milestone;
  `typescript-engineer` for every cross-module type; `delegate-manager-to-subagents` for each
  dispatch; `svg-creator-expert` for workstream G; `css-creative-expert` and `ui-ux-engineer` for
  workstream F; `color-accessibility-expert` for the palette gate; `audit-code-reviewer` before
  M22; `arch-docs` and `readme-docs` at close-out.
