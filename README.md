# Cancer Clicker NG

An educational browser strategy game that lets biology learners steer a transformed cell through growth, scarcity, and adaptation, turning cancer concepts into observable tradeoffs rather than a memorization exercise.

## Next Gen, under pressure

NG means **Next Gen**: the energized, superified evolution of Cancer Clicker. Its signature
promise is an incremental game where biology changes the choices rather than just decorating
larger numbers. You guide one relentlessly optimizing transformed cell through resources, growth,
adaptation, and a deliberately dark science-informed escalation.

The game is for learners, educators, and curious builders who want to reason about systems rather
than memorize a list of cancer-biology terms. It is a stylized game abstraction, not clinical
advice and not a depiction of patients.

## What is playable now

Cancer Clicker NG is pre-production software under active construction. The current local build
already offers a durable incremental loop and the visual foundation for the full arc:

- Divide a cell, buy from eight data-defined producers in `1`, `10`, `100`, or maximum-affordable
  quantities, and watch production continue while the page is open.
- Reload locally saved progress and receive an honest offline-progress report when elapsed time
  produces a meaningful gain.
- Move through an explicit 12-stage ladder, inspect a stage-aware colony morphology panel, and
  follow the current specimen through one accessible inline SVG illustration.
- Explore a hallmark tree whose current branches connect ATP, metabolism, immune visibility,
  inflammation, and deterministic mutation choices to real game-state effects.
- Read enormous values using custom BigNum arithmetic and Conway-Wechsler illion names.

## See the Next Gen loop take shape

The strongest current proof is the production-built local game itself. Its primary screen places
the stage panel, `Colony morphology` figure, hallmark tree, producers, and save status in one
keyboard-operable flow. The checked-in browser suite exercises that real built surface, including
the four current M11 hallmark branches and the accessible colony renderer at narrow and desktop
sizes.

<!-- screenshots:begin (managed by screenshot-docs) -->
<!-- screenshots:end -->

## Play the first loop

Prerequisites: a current Node.js and npm installation. Install dependencies, then build and serve
the GitHub Pages-shaped `dist/` artifact locally:

```bash
npm install
npm run serve
```

Open the printed local URL. Select **Divide cell**, then spend cells in **Division apparatus** on
a producer. Its rate raises cells per second. Reload to confirm that progress persists locally;
after time away, **Offline progress** reports an applied gain when relevant. The stage and colony
panels make the expanding design visible from the first run. Stop the foreground server with
`Ctrl-C`.

Use `npm run build` to create `dist/` without starting a server.

## Verify a fresh checkout

Run the repository's canonical static and Node/tsx gate:

```bash
./check_codebase.sh
```

It type-checks source and test/tool surfaces, runs ESLint and Prettier, then runs the Node tests
under `tests/test_*.mjs` through the `tsx` loader. Exercise the production-built browser surface
with:

```bash
npm run test:playwright -- --build
```

That command rebuilds `dist/` and runs the committed Playwright suite against the served result.

## Build toward the full game

The active roadmap names the remaining work: the later hallmark branches, prestige systems,
ending, replay, balance laboratory, and release evidence. Each future feature is intended to
change a real player decision, preserve a clear ownership boundary, and earn observable evidence.

## Documentation

- [docs/SOLID_MODEL.md](docs/SOLID_MODEL.md) - the client-only SolidJS boundary and one-store UI
  model.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) - clock, offline replay, and shared economy-tick
  semantics.
- [docs/STATE_PERSISTENCE.md](docs/STATE_PERSISTENCE.md) - local save ownership, migration,
  recovery, and writer-reader closure.
- [docs/PROGRESSION_DESIGN.md](docs/PROGRESSION_DESIGN.md) - the 14 branch decisions and
  12-stage gameplay arc.
- [docs/MORPHOLOGY_REFERENCE.md](docs/MORPHOLOGY_REFERENCE.md) - provenance for the stylized
  morphology grammar and its interpretation limits.
- [docs/active_plans/implementation_plan.md](docs/active_plans/implementation_plan.md) - the
  canonical 22-milestone roadmap and acceptance criteria.
- [docs/active_plans/active/cancer_clicker_build_plan.md](docs/active_plans/active/cancer_clicker_build_plan.md)
  - the live execution ledger and accepted evidence.
- [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md) - production-browser validation and
  screenshot workflow guidance.

## Next proof artifact

Outcome: show a newcomer the real Next Gen stage-to-colony transition before they run the game.

- Owner: `screenshot-docs`
- Target files: `README.md`, `docs/screenshots/cancer_clicker_ng_stage_colony.gif`
- Evidence: the production `dist/` page and the committed M18 browser renderer test
- Work: capture one readable transition from the opening transformed-cell specimen to a later
  stage, including the stage label and colony caption.
- Success criteria: the figure, stage change, and caption are legible at repository viewing size;
  the artifact labels the image as a stylized game abstraction.
- Verification: replay the short loop, inspect alt text and surrounding prose, then run the local
  Markdown-link test.

## License

Source code is available under the [MIT License](LICENSE.MIT).
