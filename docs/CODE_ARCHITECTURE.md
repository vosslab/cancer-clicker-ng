# Code architecture

## Overview

Cancer Clicker NG is a static SolidJS browser game. The browser renders a local game session;
the framework-free TypeScript domain owns all durable rules, arithmetic, event validation,
serialization, and replay semantics. The build emits a GitHub Pages-shaped `dist/`
artifact and does not introduce a server, account, or network-data boundary.

The central ownership rule is simple: a player intent becomes a typed event, the domain accepts or
rejects that event, the controller persists an accepted next state, and Solid reconciles only after
the save succeeds. This keeps the board, the direct cell action, and every prestige panel aligned
with one durable game state.

## Major components

### Domain state and events

- [src/types/state.ts](../src/types/state.ts) defines the serializable `GameState`, including
  resources, stage progression, hallmark choices, lineage, culture, network, and the optional
  soft-ending evidence.
- [src/types/events.ts](../src/types/events.ts) defines the discriminated event vocabulary. Event
  payloads carry simulation time and, where needed, the source event sequence that proves a
  dependent choice is current.
- [src/state/event_parse.ts](../src/state/event_parse.ts) converts untrusted event-shaped input
  into exact runtime event records. [src/state/events.ts](../src/state/events.ts) is the reducer
  and sole writer for durable game-state changes.
- [src/state/game_state.ts](../src/state/game_state.ts) creates the initial state. Domain catalogs
  under [src/economy/](../src/economy/), [src/hallmarks/](../src/hallmarks/),
  [src/stages/](../src/stages/), [src/prestige/](../src/prestige/), and [src/ending/](../src/ending/)
  define legal choices and their effects.
- [src/bignum/](../src/bignum/) implements large-number arithmetic and formatting. Consumers use
  its values and operations rather than native-number approximations for game resources.

### Time and economy

- [src/economy/tick.ts](../src/economy/tick.ts) advances active simulation time and production.
  [src/economy/offline.ts](../src/economy/offline.ts) applies the same economy semantics to a
  bounded absence interval.
- [src/state/offline.ts](../src/state/offline.ts) defines the offline report and clock-skew policy.
  The reducer records offline accrual through the same event boundary as direct play.
- [src/economy/producers.ts](../src/economy/producers.ts),
  [src/economy/costs.ts](../src/economy/costs.ts), and
  [src/economy/production.ts](../src/economy/production.ts) own producer definitions, purchase
  quotes, and production calculations.

### Progression and prestige

- [src/stages/](../src/stages/) holds the stage catalog, gates, effects, and legal transitions.
  Stage advancement remains an explicit event rather than an implicit side effect of a threshold.
- [src/hallmarks/](../src/hallmarks/) groups the biology-inspired choice catalogs, effect
  projections, and focused handlers. A handler changes its owned domain through the reducer; it
  does not alter browser components directly.
- [src/prestige/](../src/prestige/) separates lineage, metastatic seeding, host transfer,
  immortalized culture, dissemination network topology, reset projections, and cross-domain effect
  quotes. Each aggregate has a narrow responsibility in `GameState`.
- [src/ending/trigger.ts](../src/ending/trigger.ts) evaluates the earned soft-ending condition.
  [src/ending/sequence.ts](../src/ending/sequence.ts) projects its player-facing wording without
  making it an economic or persistence side effect.

### Persistence and semantic replay

- [src/state/save_load.ts](../src/state/save_load.ts) owns the current format-2/schema-8 envelope,
  canonical serialization, strict parsing, and browser-storage reads and writes.
  Focused parser modules live under [src/state/save_parse/](../src/state/save_parse/).
- [src/types/save.ts](../src/types/save.ts) declares the serialized form. The writer validates the
  data it creates with the current reader, forming a writer-reader closure without requiring
  byte-for-byte equality as a gameplay requirement.
- [src/state/replay.ts](../src/state/replay.ts) and
  [src/types/replay.ts](../src/types/replay.ts) own a development semantic replay log. It records
  already accepted, persisted events and replays them through the normal parser and reducer.
- [src/state/decision_surface.ts](../src/state/decision_surface.ts) projects legal, visible
  actions from catalogs, gates, and quotes. It is presentation-independent and validates each
  projected candidate against the reducer, making it a shared seam for replay and balance work.

### SolidJS controller and surfaces

- [src/main.tsx](../src/main.tsx) mounts [src/render/app.tsx](../src/render/app.tsx) into the
  static page. `App` assembles the 16:10 game canvas: shallow scoreboard HUD, dominant tumor arena,
  one active evolution family, illustrated upgrade rack, compact reward dock, and optional
  specimen drawer.
- [src/render/game_ui_state.ts](../src/render/game_ui_state.ts) owns only ephemeral selection,
  inspector, focus-restoration, and feedback state. Durable biology and economy state remains in
  `GameState`.
- [src/render/game_controller.ts](../src/render/game_controller.ts) is the UI mutation boundary.
  It parses and reduces an intent, persists the accepted snapshot, reconciles the Solid store, and
  then optionally notifies a development observer. A failed persistence attempt leaves the
  rendered durable state unchanged.
- [src/render/](../src/render/) contains the board composition, read-oriented domain surfaces,
  focusable tooltips, and typed callbacks for the tumor, stage, hallmarks, upgrade rack, transit,
  prestige, culture, network, offline report, and soft ending. New interactions belong in the
  nearest domain surface and call a controller method rather than editing the store.
- [src/style.css](../src/style.css) owns shared tokens and controls. The board and tumor geometry
  live in [src/game_ui.css](../src/game_ui.css) and
  [src/tumor_arena.css](../src/tumor_arena.css); evolution, rack, culture/network, prestige/route,
  and ending layers have focused companion stylesheets copied into the production artifact.

### Inline SVG visual system

- [src/svg/colony_visual_state.ts](../src/svg/colony_visual_state.ts) translates accepted
  `GameState` into a frozen visual state. It is the bridge from biology and progression facts to
  artwork; render components do not infer a second visual game state.
- [src/svg/colony_layout.ts](../src/svg/colony_layout.ts),
  [src/svg/morphology.ts](../src/svg/morphology.ts), and [src/svg/blob.ts](../src/svg/blob.ts)
  deterministically construct editable tissue geometry, cell placement, and organic contours.
- [src/svg/render_types.ts](../src/svg/render_types.ts) defines and validates the complete scene
  request. [src/svg/defs.ts](../src/svg/defs.ts), [src/svg/cell.tsx](../src/svg/cell.tsx),
  [src/svg/colony_overlays.tsx](../src/svg/colony_overlays.tsx), and
  [src/svg/colony.tsx](../src/svg/colony.tsx) render that request in layers.
- [src/svg/ending_overlay.tsx](../src/svg/ending_overlay.tsx) is an editable data-bound overlay
  for the earned Chicago-scale view. It remains part of the living colony scene, so active play
  and its accessibility description continue after the ending is reached.
- [src/svg/icons.ts](../src/svg/icons.ts) is the natural home for small semantic action icons.
  A new icon should have a stable name, readable silhouette, and a component-level accessible name
  when it conveys information rather than decorative texture.

## Primary data flow

```text
Direct cell click or panel command
  -> render callback
  -> GameController typed method
  -> event parser
  -> event reducer and domain catalogs
  -> accepted GameState
  -> save writer and browser storage
  -> Solid store reconciliation
  -> panels and frozen colony SVG scene
```

On reload, [src/render/app.tsx](../src/render/app.tsx) loads the local save through
[src/state/save_load.ts](../src/state/save_load.ts), derives bounded offline elapsed time, applies
the shared economy replay when appropriate, and persists that accepted result through the same
controller. A malformed retained save enters a visible recovery path; it is not silently replaced.

The optional replay observer runs after this durable transaction. It stores an initial normalized
state, accepted events, normalized outcomes, and the visible-progression projection. Replaying
therefore checks decision semantics rather than DOM structure, formatted strings, or timing.

## Calibration flow

[tools/balance_sim.mjs](../tools/balance_sim.mjs) is a deterministic, headless calibration tool.
It reads a tracked scenario from [tools/balance_scenarios/](../tools/balance_scenarios/), asks
[src/state/decision_surface.ts](../src/state/decision_surface.ts) for legal actions, feeds selected
events to the normal parser and reducer, and writes a report below `output_balance/`.
The tool compares named policy profiles as design evidence; it is neither an in-game automation
path nor a replacement for player-facing browser tests.

## Testing and verification

- [check_codebase.sh](../check_codebase.sh) is the canonical fast gate. It runs source and wider
  TypeScript checks, ESLint, Prettier, and focused Node tests under [tests/](../tests/).
- [tests](../tests/) contains pure domain, reducer, persistence, replay, controller, and
  SVG structural behavior. Keep permanent tests deterministic, offline, and tied to a stable
  contract.
- [tests/playwright/](../tests/playwright/) exercises the built browser surface, including
  pointer and keyboard interaction, storage lifecycle, responsive layout, reduced motion, and
  accessibility behavior. [run_playwright_tests.sh](../run_playwright_tests.sh) owns its browser
  setup and can build the artifact first.
- [tests/TESTS_TYPESCRIPT_README.md](../tests/TESTS_TYPESCRIPT_README.md) describes test tiers;
  [docs/PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) documents production-browser workflows.
- [build_github_pages.sh](../build_github_pages.sh) type-checks and bundles the production
  artifact. Rendered captures and human visual review are one-time evidence for visual changes,
  rather than brittle permanent pixel-equivalence tests.

## Extension points

- Add a player action by extending [src/types/events.ts](../src/types/events.ts), validating it in
  [src/state/event_parse.ts](../src/state/event_parse.ts), reducing it in
  [src/state/events.ts](../src/state/events.ts), and exposing it through the controller and owning
  panel.
- Add a durable field in [src/types/state.ts](../src/types/state.ts), then update its initial value,
  current save parser and writer shape, and focused semantic tests.
- Add biology content to its catalog and effect module under [src/hallmarks/](../src/hallmarks/),
  [src/stages/](../src/stages/), or [src/prestige/](../src/prestige/) according to the aggregate it
  changes. Keep UI copy in [src/render/](../src/render/) or [src/content/](../src/content/).
- Add an SVG motif by extending the accepted visual state and scene types first, then rendering it
  in a focused component under [src/svg/](../src/svg/). This preserves deterministic layout,
  semantic IDs, accessibility descriptions, and direct-cell hit testing.
- Add a balance investigation as a named scenario under
  [tools/balance_scenarios/](../tools/balance_scenarios/); keep generated reports in
  `output_balance/`.

## Known gaps

- Re-run [check_codebase.sh](../check_codebase.sh), the production browser suite, and visual
  capture after the active implementation work settles; their results are evidence for the current
  tree rather than a permanent performance or pixel gate.
- Review the development replay recorder's caller wiring after the controller integration lands,
  so the architecture documentation can name its concrete development entry point.
