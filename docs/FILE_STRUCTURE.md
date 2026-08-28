# File structure

## Top-level layout

```text
AGENTS.md                     Local working rules
README.md                     Project landing page
package.json                  Node, SolidJS, and tooling manifest
src/                          Authored application source
tests/                        Node, browser, and cross-ecosystem checks
tools/                        Focused build, capture, and calibration tools
docs/                         Durable project documentation and active plans
build_github_pages.sh         Canonical static production build
check_codebase.sh             Canonical TypeScript and Node quality gate
run_playwright_tests.sh       Production-browser test runner
run_web_server.sh             Local production-artifact preview
dist/                         Generated static deployment artifact
output_balance/               Generated calibration reports
graphify-out/                 Generated repository-navigation map
```

## Application source

### Entry and presentation

- [src/main.tsx](../src/main.tsx) mounts the SolidJS application.
- [src/index.html](../src/index.html) is the static page shell and stylesheet entry point.
- [src/render/app.tsx](../src/render/app.tsx) composes the visual-first game board and startup
  lifecycle.
- [src/render/game_hud.tsx](../src/render/game_hud.tsx),
  [src/render/game_board.tsx](../src/render/game_board.tsx), and
  [src/render/game_reward_dock.tsx](../src/render/game_reward_dock.tsx) own the scoreboard, main
  16:10 composition, and compact feedback strip.
- [src/render/tumor_arena.tsx](../src/render/tumor_arena.tsx),
  [src/render/evolution_dock.tsx](../src/render/evolution_dock.tsx), and
  [src/render/producers_panel.tsx](../src/render/producers_panel.tsx) own the direct-cell board,
  single active decision family, and illustrated upgrade rack.
- [src/render/action_tooltip.tsx](../src/render/action_tooltip.tsx) and
  [src/render/inspector_drawer.tsx](../src/render/inspector_drawer.tsx) own progressive disclosure
  and focus restoration; [src/render/game_ui_state.ts](../src/render/game_ui_state.ts) owns their
  ephemeral UI state.
- [src/render/game_controller.ts](../src/render/game_controller.ts) adapts UI intent to the
  framework-free state domain and browser persistence.
- [src/render/](../src/render/) holds focused view components. Add a panel here when it owns a
  visible region of the board and expresses typed intent through the controller.
- [src/style.css](../src/style.css) owns shared tokens and controls. Focused CSS files own the game
  canvas, tumor arena, evolution dock, upgrade rack, culture/network, prestige/route, and ending
  presentation layers.
- [src/content/](../src/content/) holds reusable player-facing content that is independent of a
  particular component layout.

### Domain and state

- [src/types/](../src/types/) defines durable state, events, IDs, save records, replay records,
  effects, morphology, and BigNum interfaces.
- [src/brands.ts](../src/brands.ts) creates domain-specific identifier and value brands.
- [src/state/](../src/state/) owns initial state, event parsing and reduction, save handling,
  offline policy, replay, deterministic random derivation, and decision-surface projection.
- [src/state/save_parse/](../src/state/save_parse/) contains narrow parsers for durable aggregates.
  Add a parser here when a new persisted aggregate deserves its own structural validation.
- [src/bignum/](../src/bignum/) contains arbitrary-scale resource arithmetic and display formatting.
- [src/economy/](../src/economy/) contains producer catalogs, cost quotes, production ticks, and
  offline economy replay.
- [src/stages/](../src/stages/) contains stage definitions, gates, effects, and transitions.
- [src/hallmarks/](../src/hallmarks/) contains hallmark catalogs, effects, and specialized
  decision handlers.
- [src/prestige/](../src/prestige/) contains reset layers, lineage, seeding, host transfer,
  culture, network topology, and their cross-domain quotes.
- [src/ending/](../src/ending/) contains the soft-ending trigger and presentation sequence.

### SVG scene system

- [src/svg/colony_visual_state.ts](../src/svg/colony_visual_state.ts) projects durable game state
  into the accepted visual-state record.
- [src/svg/colony_layout.ts](../src/svg/colony_layout.ts) and
  [src/svg/morphology.ts](../src/svg/morphology.ts) generate deterministic tissue layout and
  organic geometry inputs.
- [src/svg/render_types.ts](../src/svg/render_types.ts) owns the validated scene request and cell
  render models.
- [src/svg/colony.tsx](../src/svg/colony.tsx) assembles the inline SVG from named layers.
  [src/svg/cell.tsx](../src/svg/cell.tsx), [src/svg/colony_overlays.tsx](../src/svg/colony_overlays.tsx),
  and [src/svg/ending_overlay.tsx](../src/svg/ending_overlay.tsx) own focused visual layers.
- [src/svg/defs.ts](../src/svg/defs.ts) holds reusable definitions; [src/svg/icons.ts](../src/svg/icons.ts)
  is the source location for small action and status icons.
- [src/svg/producer_machines.tsx](../src/svg/producer_machines.tsx),
  [src/svg/evolution_sigils.tsx](../src/svg/evolution_sigils.tsx),
  [src/svg/culture_network_props.tsx](../src/svg/culture_network_props.tsx), and
  [src/svg/prestige_route_props.tsx](../src/svg/prestige_route_props.tsx) own the larger editable
  game-prop families. [src/svg/tumor_feedback.tsx](../src/svg/tumor_feedback.tsx) owns direct-cell
  action feedback geometry.

## Tests and tools

- [tests](../tests/) contains focused Node tests for domain behavior, persistence, replay,
  controller behavior, and SVG structure. Use a stable domain name for each new test file.
- [tests/playwright/](../tests/playwright/) contains production-browser journeys. Add browser
  behavior and visual interaction checks here when they require built SolidJS output.
- [tests/TESTS_README.md](../tests/TESTS_README.md) and
  [tests/TESTS_TYPESCRIPT_README.md](../tests/TESTS_TYPESCRIPT_README.md) explain test placement
  and execution.
- [tools/build_solid.mjs](../tools/build_solid.mjs) performs the Solid-aware browser bundle used
  by the canonical build.
- [tools/capture_readme_screenshots.mjs](../tools/capture_readme_screenshots.mjs) captures named
  documentation views through the production artifact.
- [tools/balance_sim.mjs](../tools/balance_sim.mjs) runs deterministic policy comparisons using
  the real visible-decision surface. Scenario inputs belong in
  [tools/balance_scenarios/](../tools/balance_scenarios/).
- [tools/verify_colony_rendering.mjs](../tools/verify_colony_rendering.mjs) and
  [tools/colony_contact_sheet.mjs](../tools/colony_contact_sheet.mjs) support rendered SVG review.

## Generated artifacts

- `dist/` is rebuilt by [build_github_pages.sh](../build_github_pages.sh). It contains
  `main.js`, copied authored CSS, `index.html`, source maps, and `.nojekyll`; edit [src/](../src/)
  rather than this directory.
- `output_balance/` receives calibration reports from
  [tools/balance_sim.mjs](../tools/balance_sim.mjs). Scenarios are source; reports are generated
  evidence and can be recreated.
- `graphify-out/` holds a generated navigation graph. Use it to narrow source
  investigation, then confirm conclusions in the current files and tests.
- `test-results/` and Playwright report directories are transient browser-test
  outputs.

## Documentation map

- [README.md](../README.md) introduces the game and first playable loop.
- [docs/CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) describes ownership boundaries and data flow.
- [docs/SOLID_MODEL.md](SOLID_MODEL.md) defines the client-only SolidJS model.
- [docs/STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) defines the current local-save, recovery, and
  replay contracts.
- [docs/GAME_DESIGN.md](GAME_DESIGN.md), [docs/PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md), and
  [docs/PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) describe player-facing systems.
- [docs/ART_DIRECTION.md](ART_DIRECTION.md) and
  [docs/MORPHOLOGY_REFERENCE.md](MORPHOLOGY_REFERENCE.md) document the living-tumor visual
  language and its interpretation limits.
- [docs/PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) documents production-browser verification.
- [docs/active_plans/](active_plans/) contains active planning, decision, report, and workstream
  records. Durable settled decisions belong in [docs/DESIGN_DECISIONS.md](DESIGN_DECISIONS.md),
  and human-provided direction belongs in [docs/HUMAN_GUIDANCE.md](HUMAN_GUIDANCE.md).

## Where to add new work

- Add a durable game rule under the owning domain folder and connect it through
  [src/types/events.ts](../src/types/events.ts), [src/state/event_parse.ts](../src/state/event_parse.ts),
  and [src/state/events.ts](../src/state/events.ts).
- Add a save aggregate under [src/state/save_parse/](../src/state/save_parse/) and maintain the
  current writer-reader contract in [src/state/save_load.ts](../src/state/save_load.ts).
- Add a player-facing board surface in [src/render/](../src/render/), with component-local UI
  state and a typed controller callback.
- Add an SVG motif in [src/svg/](../src/svg/) after defining the visual-state and scene-request
  facts it consumes. Add reusable small icons to [src/svg/icons.ts](../src/svg/icons.ts).
- Add deterministic domain evidence as a focused [tests](../tests/) file; add real
  browser behavior to [tests/playwright/](../tests/playwright/). Keep temporary visual inspection
  artifacts outside permanent tests.
- Add a calibration input to [tools/balance_scenarios/](../tools/balance_scenarios/) and retain
  generated output under `output_balance/`.
- Add durable reference documentation under [docs/](.), following
  [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md); put implementation-time material in the appropriate
  [docs/active_plans/](active_plans/) subdirectory.

## Known gaps

- Verify future generated artifacts only after running their owning command. The repository does
  not treat a pre-existing `dist/` or `output_balance/` directory as
  proof that it matches the current source.
