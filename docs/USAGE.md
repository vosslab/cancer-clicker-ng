# Usage

Cancer Clicker NG is a visual incremental game: click rendered tumor cells, spend cells on
illustrated producers, and make biological tradeoffs as the living tumor changes.

## Quick start

From the repository root, use the local-production preview front door:

```bash
./run_web_server.sh
```

The script builds `dist/`, prints a local URL, and serves only that GitHub Pages-shaped artifact.
Open the URL in a browser and use `Ctrl-C` in the terminal to stop the foreground server. The
`npm run serve` alias invokes the same script.

## First loop

1. Click a visible cancer cell in the tumor arena. Keyboard users can focus **Divide cell** and
   press Enter or Space.
2. Read automatic growth in the shallow header and the single live cell total in the tumor arena.
3. Buy an affordable illustrated machine from the upgrade rack; each known row explicitly labels
   Owned, Output, Buy, Cost, and Adds. Future targets do not render until their discovery condition
   is achieved.
4. Start with Stage and Hallmarks. Further evolution systems enter the icon dock only when their
   durable prerequisite is met. Focusable tooltips and the specimen drawer provide optional biology
   detail.
5. Reload the same local URL to continue from browser-local progress. A return after time away may
   show a bounded offline-progress report.

The tumor is the board and its rendered cells are the manual target. Surrounding tissue and
whitespace have no manual click action. The scene is a stylized teaching abstraction rather than
clinical advice or a depiction of patients.

## Local save and debug

- Progress is stored under the current browser origin as described in
  [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md). A new server port is a new browser origin.
- A missing save starts a new game. The protected recovery flow preserves unreadable saved data
  and presents an explicit replacement action.
- Append `?debug=1` to a local game URL to show development inspection controls, including a
  60-second fast-forward and prepared offline-reload baseline. Normal play starts without that
  query parameter.

## Development commands

Run each named front door for the question it answers:

```bash
./check_codebase.sh
./build_github_pages.sh
node tools/capture_visual_review.mjs
node tools/capture_visual_review.mjs --sync-readme
node tools/capture_visual_review.mjs --verify-existing
./run_playwright_tests.sh --build
source source_me.sh && python3 devel/verify_pages_workflow.py
source source_me.sh && python3 devel/verify_candidate.py
```

- `./check_codebase.sh` checks TypeScript, lint, formatting, and deterministic Node behavior.
- `./build_github_pages.sh` produces the static deployment artifact.
- `node tools/capture_visual_review.mjs` captures five responsive boards, a paced opening
  playthrough, the full earned Upgrade Rack, six guided earned-system surfaces, their 11 exercised
  tooltip states, and inspector, success, persistence-error, recovery, offline-return, and
  forced-colors states. It rejects a dense-rack state with fewer than eight visible rows or a row
  taller than 64px. It clears only stale generated review artifacts, then writes an ignored contact
  sheet and evidence manifest under `output_visual/game_visual_review/`, including tooltip
  viewport/text/overlap geometry, target size, served palette, Axe, and ARIA-tree evidence.
  `@axe-core/playwright` is development-only and is not shipped in `dist/`.
- `node tools/capture_visual_review.mjs --sync-readme` copies the two named reviewed playthrough
  frames into `docs/screenshots/` and rewrites only the managed screenshot block in `README.md`.
- `node tools/capture_visual_review.mjs --verify-existing` checks the existing visual-review files
  and hashes without launching a browser or changing the corpus.
- `./run_playwright_tests.sh --build` exercises that rebuilt artifact in supported browser tests.
- `source source_me.sh && python3 devel/verify_pages_workflow.py` checks the local Pages workflow
  contract without contacting GitHub.
- `source source_me.sh && python3 devel/verify_candidate.py` projects the nonignored candidate,
  runs the Python suite, writes an ignored `output_release/candidate_manifest.json`, and confirms
  the real Git index remains unchanged.

## Balance experiment

The balance simulator is a development review tool rather than a player command. Its aggregate
run writes a machine-readable report under the ignored `output_balance/` directory:

```bash
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

Use `--scenario tools/balance_scenarios/<file>.json` for one focused question. The generated
report records policy behavior and diagnostic observations; accepted conclusions belong in
[BALANCE.md](BALANCE.md).

## Related documentation

- [GAME_DESIGN.md](GAME_DESIGN.md) explains the player economy and offline clock.
- [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) explains reset layers and culture/network choices.
- [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md) explains browser and screenshot workflows.
- [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md) records the candidate closure evidence.

## Known gaps

- Confirm the intended audience for the local debug panel before exposing it beyond development
  and automated browser evidence.
