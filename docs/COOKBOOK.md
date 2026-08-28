# Player and developer cookbook

## Inspect a first board

1. Run `npm run serve` from the repository root and open the printed URL.
2. Click a visible cell and confirm the arena count changes.
3. Choose a buy quantity in the upgrade rack and purchase an affordable illustrated machine.
4. Open an evolution tab, focus a compact icon to read its tooltip, and open specimen details from
   the HUD or an available detail control.

This walkthrough checks the intended board sequence: direct tumor action, growth feedback, upgrade
choice, then biological explanation. It uses fictional game state rather than clinical
interpretation.

## Review keyboard parity

1. Tab to the `Divide cell` control and press Enter or Space.
2. Tab through the evolution tabs and upgrade controls; read each visible focus treatment and
   tooltip.
3. Open the specimen drawer, press Escape, and verify focus returns to the invoking control.
4. Repeat at a 360px viewport, where the board stacks tumor, evolution, upgrade rack, and rewards.

## Reproduce the README visual evidence

Use this after a visual, interaction, or documentation-image change. The checked-in seven-frame
set is generated from parser-validated game states at a fixed 1280 x 800 viewport; it is stronger
evidence than an ad-hoc browser screenshot.

```bash
./build_github_pages.sh
node --import tsx tools/capture_readme_screenshots.mjs
```

The capture tool updates the owned files in `docs/screenshots/` and verifies direct-cell targeting,
scene overlays, reduced motion, and layout geometry while it runs. Review the regenerated images
at their original size to confirm that cell geometry, rather than whitespace, remains the primary
pointer target; labels and small icons remain legible; and no clipping hides the action or upgrade
rack. The captures are one-time visual evidence; permanent tests remain focused on deterministic,
behavioral contracts.

## Inspect a staged biological state

Append `?debug=1` to the local URL printed by `npm run serve` when you need a bounded local
inspection route:

```text
http://localhost:PORT/?debug=1
```

Use **Fast-forward 60 seconds** to see elapsed economy effects, **Prepare 2-minute offline reload**
to inspect the bounded offline report after a reload, and the lifecycle and hostile-event probes to
inspect their visible outcomes. These controls operate only when the explicit query flag is present;
use the normal URL for player-facing checks.

## Rebuild the visual calibration corpus

Use these headless, reproducible artifacts when a change affects SVG morphology, stage overlays,
or the 1280 x 800 board composition:

```bash
node --import tsx tools/colony_contact_sheet.mjs
node --import tsx tools/verify_colony_rendering.mjs
```

The first command recreates the complete contact corpus in
`output_visual/colony-contact-sheet/`; the second writes its structural renderer report beneath
`output_visual/colony-rendering-verification/`. Both output directories are ignored and each tool
recreates only its own artifact directory. Inspect the contact sheet and report as calibration
evidence, then retain permanent browser coverage only for durable player-visible behavior.

## Investigate a balance proposal

The balance laboratory compares the displayed economic surface without becoming part of the player
interface. Start with the complete tracked scenario suite:

```bash
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

For a single question, substitute a tracked scenario path:

```bash
node --import tsx tools/balance_sim.mjs \
  --scenario tools/balance_scenarios/<file>.json \
  --output output_balance/balance_report.json
```

Read the generated format-3 report alongside [BALANCE.md](BALANCE.md). Treat one report as a
calibration observation: change an owned curve only when it is supported by the relevant scenario,
visible quote, and player-facing tradeoff.

## Verify a complete local candidate

After the appropriate code, browser, and visual lanes pass, run the full candidate projection:

```bash
source source_me.sh && python3 devel/verify_candidate.py
```

It projects the full nonignored worktree through a disposable Git storage path, runs the Python
validation suite, then requires the original path, mode, and blob entries to remain stable before
publishing `output_release/candidate_manifest.json`. This is a release-evidence step, distinct
from the fast TypeScript gate and from normal local play.
