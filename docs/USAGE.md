# Usage

Cancer Clicker NG lets you grow a stylized transformed-cell colony by clicking visible cells,
spending the resulting cells on producers, and making biological tradeoffs as the tumor changes.

## Start a local game

From the repository root, build and serve the GitHub Pages-shaped artifact:

```bash
npm run serve
```

The server prints a local URL and rebuilds `dist/` before it serves it. Open that URL in a browser.
Use `Ctrl-C` in the terminal to stop the foreground server.

## First successful loop

1. Click a painted cancer cell in **Your colony** on the left rail. Keyboard users can focus the
   colony action and press Enter or Space.
2. Read the cell count and cells-per-second rate above the colony.
3. Buy an affordable item in the always-present **Division apparatus** Store on the right rail.
   The producer raises cells per second.
4. Follow the center rail as growth opens stage and hallmark decisions. Each control explains its
   available action, cost, and biological tradeoff.
5. Reload the same local URL to continue from browser-local progress. Returning after time away
   can show an **Offline progress** report with the bounded applied gain.

The cell field is the primary manual action: a click must land on a rendered cell, while the
surrounding tissue and whitespace remain inert. The biological scene is a stylized game abstraction,
not clinical advice or a depiction of patients.

## Local progress and recovery

- Progress is stored only in this browser origin under the versioned local save key documented in
  [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md). A new port is a new browser origin, so use the
  same printed URL when you want to revisit a local save.
- A missing save starts a new game. Valid saved progress reloads and applies bounded offline
  economics before play resumes.
- When saved data cannot be safely read, the game preserves that data and presents an explicit
  replacement action. Choose that action only when starting fresh is appropriate.
- The number-format control switches between short and full large-number names without changing
  gameplay state.

## Local debug controls

Append `?debug=1` to a local game URL to expose the built-in local debug panel:

```text
http://localhost:PORT/?debug=1
```

It provides a 60-second fast-forward, a prepared offline-reload baseline, producer-order and
lifecycle probes, and a hostile-event check. The debug panel exists for local inspection and
automated browser evidence; normal play begins without the query parameter.

## Development validation

Use the validation lane that matches the question you are asking:

```bash
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build
```

- `./check_codebase.sh` checks TypeScript, lint, formatting, and deterministic Node behavior.
- `./build_github_pages.sh` creates the static deployment artifact.
- `./run_playwright_tests.sh --build` exercises the rebuilt artifact in a browser.

## Advanced balance experiment

The balance simulator is a development review tool, not a player command. It accepts one tracked
scenario and writes one machine-readable report below the root `output_balance/` directory:

```bash
node --import tsx tools/balance_sim.mjs \
  --scenario tools/balance_scenarios/l4_mandate_sequence_v1.json \
  --output output_balance/balance_report.json
```

The report records a deterministic policy comparison, its decision witness, assumptions, traces,
and falsification signals. Use it to investigate a proposed tuning change alongside the scenario;
keep final balance claims tied to the accepted balance review rather than to one generated report.

## Related documentation

- [GAME_DESIGN.md](GAME_DESIGN.md) explains the economy, offline clock, and player-facing model.
- [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) explains the reset layers and durable culture/network
  decisions.
- [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) defines save migration, recovery, and replay
  ownership.
- [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) explains browser-test and screenshot workflows.

## Known gaps

- Publish the accepted balance review before presenting generated simulator reports as a tuning
  conclusion; this guide intentionally treats them as development evidence.
