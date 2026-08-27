# Cancer Clicker NG

An educational browser strategy game in development for learners who want to explore how one transformed cell grows, adapts, and confronts tradeoffs through a scientific incremental-game model.

**Pre-production status:** the current browser experience is an accessible M1 contract probe,
not the planned full cancer strategy game. M1-M3 foundations are complete; M4 state and
persistence work remains under active validation.

<!-- screenshots:begin (managed by screenshot-docs) -->
<!-- screenshots:end -->

## Grow under pressure

This project aims to turn cancer-biology concepts into consequential systems rather than a
memorization exercise. You guide an optimizing transformed cell through resource pressure,
tradeoffs, and adaptation; the roadmap treats the science with care and does not present gameplay
as clinical advice.

The implemented foundation already provides:

- A clinical-dark, keyboard-operable browser shell with visible focus treatment and a narrow
  viewport layout.
- Typed event contracts and a live probe that records division and number-format actions.
- Deterministic BigNum arithmetic, bulk-cost solving, and short/full illion formatting for the
  scales an incremental game needs.
- A progression-design contract that maps 14 cancer-biology branches and a 12-stage dramatic arc
  into distinct future player decisions.
- A strict local save, migration, and runtime-event boundary with fixtures and hostile-input tests;
  it is not yet connected to the browser shell.

## Try the current probe

Prerequisites: a current Node.js and npm installation. The setup command installs the repository's
development dependencies; the server command builds the production-shaped `dist/` artifact and
serves it locally.

```bash
./devel/setup_typescript.sh
./run_web_server.sh
```

Open the local URL printed by Python's server. The current shell shows **Contract probe online**.
Select **Divide once** to increment the visible division count, then select **Toggle format** to
change the event message between short and full number formatting. Both controls also work by
keyboard. Stop the foreground server with `Ctrl-C`.

If dependencies are already installed, `./build_github_pages.sh` is the shortest way to produce
the same browser artifact in `dist/`.

## A small, real interaction

The present UI is deliberately small so its typed boundary is easy to inspect. Its status line
shows the event the interface sent:

```text
M1 contract probe: 1 divisions; division signal received.
M1 contract probe: 1 divisions; number format set to full.
```

That interaction is current browser evidence, not a claim that producers, stages, prestige, or the
full hallmark tree are playable. Those systems remain roadmap work in the canonical plan.

## Status and limits

The project is in active pre-production. The interactive page currently proves the initial typed
event-to-interface slice only; it does not yet simulate idle growth, purchases, offline accrual,
save/reload behavior, the planned 14-branch system, 12 stages, prestige, or colony visuals. There
is no confirmed hosted deployment URL.

M7 is the first milestone that will make the game minimally playable and add committed
production-browser proof for click, buy, idle, reload, and offline behavior. Until then, use this
repository to follow and validate the foundation rather than to play a completed game.

## Documentation

- [docs/active_plans/implementation_plan.md](docs/active_plans/implementation_plan.md) - the
  canonical roadmap, milestone criteria, and scope boundaries.
- [docs/active_plans/active/cancer_clicker_build_plan.md](docs/active_plans/active/cancer_clicker_build_plan.md)
  - the concise live execution ledger and accepted evidence status.
- [docs/PROGRESSION_DESIGN.md](docs/PROGRESSION_DESIGN.md) - the player-decision design for the
  biology-inspired progression arc.
- [docs/BIGNUM_OPS.md](docs/BIGNUM_OPS.md) - the numeric contract for costs, scale, and display.
- [docs/E2E_TESTS.md](docs/E2E_TESTS.md) - how fast tests, browser tests, and full-system tests
  are separated in this repository.
- [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md) - the browser-automation guidance used by
  later real-stack UI validation.

## Next proof artifact

Outcome: let a new visitor see the current interactive shell before deciding whether to run it.

- Owner: `screenshot-docs`
- Target files: `README.md`, `docs/screenshots/cancer_clicker_contract_probe.png`
- Evidence: the production `dist/` page and its verified desktop/mobile interaction smoke
- Work: capture the contract probe after one division and a format toggle, then populate the
  managed screenshot block above with descriptive alt text and a concise caption.
- Success criteria: the dark clinical shell, both controls, and changed status are readable at a
  useful size; the image documents current M1 behavior without implying unbuilt gameplay.
- Verification: inspect the rendered README and image at repository viewing size, then run
  `source source_me.sh && python3 -m pytest tests/test_markdown_links.py`.

## License

Source code is available under the [LICENSE.MIT](LICENSE.MIT).
