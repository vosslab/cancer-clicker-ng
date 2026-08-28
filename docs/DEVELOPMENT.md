# Development workflow

This guide helps contributors change Cancer Clicker NG without bypassing its TypeScript game
contracts. The game is a static SolidJS application: source under `src/` builds to a GitHub
Pages-shaped `dist/` artifact, while the framework-free domain remains the authority for game
state, validation, persistence, and replay.

## First local run

Install the declared JavaScript dependencies, then use the repository front-door commands:

```bash
npm install
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build
```

`./check_codebase.sh` is the canonical TypeScript gate. It runs the source and wider TypeScript
checks, ESLint with zero warnings, Prettier, and the focused Node/tsx domain suite. Run it after
every coherent source change. `./build_github_pages.sh` creates the deployable artifact, and
`./run_playwright_tests.sh` exercises that built artifact in a browser. `npm run check`,
`npm run build`, and `npm run test:playwright` are optional mirrors of those commands.

Use `./run_web_server.sh` when a local visual check helps. It previews the built artifact rather
than a separate development runtime.

## Source ownership

Keep a change in the domain that owns its facts:

- `src/types/` defines durable contracts, IDs, events, effects, and state shapes.
- `src/state/` owns initial state, event parsing and reduction, save parsing and writing, offline
  progression, replay, and the visible-decision projection.
- `src/economy/`, `src/stages/`, `src/hallmarks/`, `src/prestige/`, and `src/ending/` own their
  respective catalogs and mechanics.
- `src/render/` owns SolidJS panels and typed controller callbacks. Components read state and
  express intent through `src/render/game_controller.ts`; they do not mutate durable state.
- `src/svg/` owns the deterministic colony scene, organic tissue motifs, visual-state projection,
  and reusable inline action icons.
- `src/style.css`, `src/prestige.css`, and `src/ending.css` are authored source styles copied by
  the production build.

For a new player action, extend the event contract, parser, reducer, and its owning controller
surface together. For a persisted field, update its state type, initial value, strict parser,
writer, and focused behavioral evidence as one closed change. The detailed boundaries live in
[CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md), [SOLID_MODEL.md](SOLID_MODEL.md), and
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md).

## Test and evidence lanes

Choose the lane that proves the change while keeping permanent checks durable:

- `tests/test_*.mjs` contains deterministic, DOM-free Node/tsx tests for rules, event atomicity,
  save behavior, replay, controller behavior, and SVG contracts. The canonical gate runs them.
- `tests/playwright/` contains browser journeys against the built production artifact. Use it for
  visible pointer or keyboard interaction, persistence lifecycle, responsive layout, reduced
  motion, and accessibility behavior.
- `source source_me.sh && python3 devel/verify_candidate.py` projects the complete nonignored
  working tree into disposable Git storage, writes `output_release/candidate_manifest.json`, runs
  the full repository-hygiene Python suite, and proves the real index unchanged.
- `tools/` and `output_*/` hold one-time calibration, rendering, and capture evidence. Keep the
  scenario or capture recipe as source and regenerate its output when needed. The visual tools
  own `output_visual/colony-contact-sheet/` and
  `output_visual/colony-rendering-verification/`; each clears only its exact subdirectory before
  recreating the artifact.

Permanent tests use fixed inputs and seeds, run offline, and assert stable player or domain
behavior. Rendered screenshots, balance reports, contact sheets, and independent agent image review
provide stronger one-time evidence for visual and tuning work than pixel-equivalence or arbitrary
timing requirements. See [PYTEST_STYLE.md](PYTEST_STYLE.md),
[TESTS_TYPESCRIPT_README.md](../tests/TESTS_TYPESCRIPT_README.md), and
[PLAYWRIGHT_TEST_STYLE.md](PLAYWRIGHT_TEST_STYLE.md).

## Generated output and navigation

Edit authored source, not generated artifacts:

- `dist/` is rebuilt by [build_github_pages.sh](../build_github_pages.sh) and is the GitHub Pages
  deployment artifact.
- `output_balance/` contains reproducible balance-laboratory reports; tracked scenarios belong in
  `tools/balance_scenarios/`. Run `node --import tsx tools/balance_sim.mjs --suite` to compare all
  tracked scenarios with the five canonical visible-state policy IDs; use `--scenario` for a
  focused format-3 report.
- `output_visual/` contains ignored, reproducible visual-calibration artifacts. Run
  `node --import tsx tools/colony_contact_sheet.mjs` for the 216-frame contact corpus under
  `output_visual/colony-contact-sheet/`, and `node --import tsx tools/verify_colony_rendering.mjs`
  for `output_visual/colony-rendering-verification/report.json`. Both tools clear only their
  exact output subdirectory.
- `docs/screenshots/` contains documentation proof generated by
  [capture_readme_screenshots.mjs](../tools/capture_readme_screenshots.mjs).
- `graphify-out/` is generated repository-navigation evidence. Use Graphify to narrow a question,
  then confirm the current source and tests before making an architectural conclusion.

The file layout is mapped in [FILE_STRUCTURE.md](FILE_STRUCTURE.md). The root-scoped `/output*/`
output policy and complete repository conventions live in [REPO_STYLE.md](REPO_STYLE.md).

## Autonomous candidate workflow

The release candidate closes through the canonical static, build, and production-browser routes;
`source source_me.sh && python3 devel/verify_candidate.py`; fixed-clock seven-frame capture;
independent agent original-resolution image report; and static Pages workflow contract. Run the
routes recorded in [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md), then record durable user-facing changes in
[CHANGELOG.md](CHANGELOG.md). Keep settled implementation decisions in
[DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) and owner-provided direction in
[HUMAN_GUIDANCE.md](HUMAN_GUIDANCE.md).

## Optional external distribution

Repository history, tags, GitHub Pages publication, and remote workflow execution can distribute
the already-complete candidate. They add administration and remote-availability evidence without
changing milestone status. See [RELEASE_HISTORY.md](RELEASE_HISTORY.md), [NEWS.md](NEWS.md), and
[devel/DEVEL_README.md](../devel/DEVEL_README.md) for release-tooling routes.
