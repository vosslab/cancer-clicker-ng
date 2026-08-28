# Cookbook

This cookbook gives contributors repeatable local workflows for Cancer Clicker NG. Run commands
from the repository root. The first group is permanent quality evidence; the remaining recipes
produce bounded development or visual-review evidence for a specific change.

## Start a local board

Install dependencies once, then build and serve the same static artifact that GitHub Pages uses:

```bash
npm install
npm run serve
```

- Open the loopback URL printed by the server.
- Click a visible cancer cell, then buy an affordable producer in the Store.
- Reload that same URL to inspect browser-local persistence.
- Use `?debug=1` on a local URL for the development-only inspection panel.

See [USAGE.md](USAGE.md) for the player loop and local-progress behavior.

## Build the Pages artifact

Create a fresh static deployment artifact:

```bash
./build_github_pages.sh
```

The build writes `dist/`, including `index.html`, `main.js`, owned stylesheets, and `.nojekyll`.
Use `npm run build` when the npm front door is more convenient. See [INSTALL.md](INSTALL.md) for
the local prerequisites.

## Run permanent checks

Run the canonical offline TypeScript and Node behavior gate before handing off a code change:

```bash
./check_codebase.sh
```

Run the production-browser suite when the change affects the rendered game, interaction, storage,
or responsive behavior:

```bash
./run_playwright_tests.sh --build
```

- `check_codebase.sh` covers type checking, ESLint, formatting, and deterministic Node/tsx tests.
- The Playwright lane builds and exercises the served `dist/` artifact.
- These gates establish repeatable regression evidence. A focused test belongs in the permanent
  suite when it protects stable behavior; scenario capture and calibration remain separate proof.

See [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) for browser-runner details and
[TYPESCRIPT_STYLE.md](TYPESCRIPT_STYLE.md) for the canonical TypeScript gate.

## Capture documentation screenshots

Capture the named 1280 x 800 documentation board states after a visual change:

```bash
./build_github_pages.sh
node --import tsx tools/capture_readme_screenshots.mjs
```

The capture tool serves `dist/` on loopback, writes PNG files under `docs/screenshots/`, and
updates the managed screenshot block in `README.md`. Inspect the resulting images at their target
size; automated capture confirms a reproducible artifact, while visual review confirms biological
readability, hierarchy, and direct-cell affordance.

## Inspect saves and semantic replay

Use a browser's developer tools while the local game is open to inspect the browser-local key
`cancer-clicker-ng.save.v2`. Treat its JSON as untrusted diagnostic input: normal play, parsing,
and replacement all go through the game's persistence boundary.

Run the focused replay behavior test while changing event, save, or replay code:

```bash
node --import tsx --test tests/test_replay.mjs
```

The development replay record is not a player save or public transport format. It replays accepted
events through the normal parser and reducer, comparing normalized durable state and visible
progression. [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) defines the save and replay contract.

## Run the balance suite

Run all tracked scenarios with the headless visible-state-only comparison. The aggregate report
uses the five canonical policy IDs `greedy-payback`, `naive-cheapest`, `hallmark-first`,
`prestige-rush`, and `check-in-idle`:

```bash
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

- Keep scenario inputs in `tools/balance_scenarios/`.
- Read the generated JSON from `output_balance/`; it is intentionally ignored output.
- Compare policy behavior, declared decision witnesses, traces, completions, and outliers before
  changing tuning.

Use `--scenario tools/balance_scenarios/<file>.json` when one decision witness needs a focused
report. The one-scenario command retains the same format-2 report shape.

The simulator is a one-time calibration tool, not a fixed performance or ranking gate. See
[PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) for its design boundary and
[FILE_STRUCTURE.md](FILE_STRUCTURE.md) for source and output ownership.
