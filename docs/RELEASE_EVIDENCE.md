# Release evidence

## Candidate status

Cancer Clicker NG remains a pre-production release candidate. The implementation is a visual-first,
local-browser incremental game: the player divides visible tumor cells, buys illustrated molecular
machines, selects one evolution family at a time, and continues through culture, dissemination, and
the optional Chicago scale report. This document records evidence as it becomes current. It does not
represent a local build, screenshot, or source checkout as a released Pages deployment.

M22 local release verification is **complete as of 2026-08-28**. The final local gates and
seven-frame review are recorded below. Human Git review, staging, commit/push, remote Pages
execution, live-site inspection, and final owner acceptance remain the release handoff.

## Current durable boundary

The game accepts and writes one current pre-production save: envelope version 2 and
stateSchemaVersion 8. [src/state/save_load.ts](../src/state/save_load.ts) and
[src/state/save_parse/](../src/state/save_parse/) own strict parsing and protected recovery.
[src/state/event_parse.ts](../src/state/event_parse.ts) and
[src/state/events.ts](../src/state/events.ts) own accepted durable mutation. Development replay
re-enters that parser/reducer and compares normalized durable state, accepted outcomes, and visible
progression; it makes no byte, pixel, or timing equivalence claim.

[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) owns the full save and recovery contract.

## Evidence classes

| Class               | Permanent evidence                                                                                          | One-time acceptance evidence                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| State and economy   | Deterministic parser, reducer, save, replay, prestige, and visible-decision tests                           | A reproduced diagnostic trace when a defect needs investigation           |
| Browser behavior    | Production-dist tests for pointer, keyboard, focus, reload, recovery, responsive layout, and reduced motion | Reviewer walkthrough of the current production artifact                   |
| SVG and icon source | Structural tests for editable scene and icon ownership                                                      | Render review for biological readability, hierarchy, and icon recognition |
| Balance             | Deterministic visible-surface simulator semantics                                                           | Scenario-policy report and human tuning decision                          |
| Documentation       | Markdown structure, link, ASCII, and repository-hygiene checks                                              | Screenshot composition and alt-text review                                |

Permanent tests protect durable behavior. Screenshots, visual/HCI assessments, calibration reports,
and remote deployment records are dated acceptance artifacts. They inform decisions without
becoming pixel, byte, rank, or machine-timing gates.

## Screenshot capture and review

[tools/capture_readme_screenshots.mjs](../tools/capture_readme_screenshots.mjs) **serves an
already-built production artifact**. It first checks for dist/index.html and dist/main.js, then
starts a loopback server rooted at dist/. Build the artifact separately with
[build_github_pages.sh](../build_github_pages.sh). The tool writes seven 1280 x 800 documentation
PNGs and synchronizes the managed README screenshot block after its capture checks succeed.

| Required current frame      | Artifact                                                                                 | Image-observable review question                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Opening living tumor board  | [cancer_clicker_ng_board.png](screenshots/cancer_clicker_ng_board.png)                   | Does the tumor read as the primary game action, with HUD and upgrade rack visible? |
| Hypoxic and necrotic lesion | `cancer_clicker_ng_hypoxic_necrotic.png`                                                 | Are hypoxia and necrosis legible through shape, region, and density?               |
| Perfused tumor              | [cancer_clicker_ng_perfused_tumor.png](screenshots/cancer_clicker_ng_perfused_tumor.png) | Are perfusion and stage progression legible without crowding the board?            |
| Invasive route              | `cancer_clicker_ng_invasive_route.png`                                                   | Does the invasive front and seeded route remain readable at board scale?           |
| Culture laboratory          | [cancer_clicker_ng_culture_lab.png](screenshots/cancer_clicker_ng_culture_lab.png)       | Do the culture props read as an integrated laboratory decision surface?            |
| Dissemination network       | [cancer_clicker_ng_network_map.png](screenshots/cancer_clicker_ng_network_map.png)       | Does the site-map and campaign surface read as a tactical extension of the board?  |
| Chicago scale report        | [cancer_clicker_ng_chicago_scale.png](screenshots/cancer_clicker_ng_chicago_scale.png)   | Does the report fit while preserving the continuing tumor-game context?            |

The final seven-frame capture and independent original-resolution image review are accepted in
[visual_first_screenshot_review.md](active_plans/reports/visual_first_screenshot_review.md).
Screenshots establish framing, visible hierarchy, clipping, static contrast cues, and whether the
direct cell target reads clearly. Browser evidence, not a static image, establishes tooltip
invocation, keyboard behavior, focus restoration, hit testing, persistence, responsive behavior,
and reduced-motion behavior.

## Balance evidence

[BALANCE.md](BALANCE.md) owns the deterministic five-policy, five-scenario calibration contract:
greedy-payback, naive-cheapest, hallmark-first, prestige-rush, and check-in-idle. The complete
one-time suite reads current scenario inputs and writes ignored output:

    node --import tsx tools/balance_sim.mjs --suite \
      --output output_balance/balance_report.json

The report records traces, decision witnesses, completion, stalls, and outliers for a human tuning
decision. It does not create a release threshold.

## Final local verification

These routes were run against the settled local candidate on 2026-08-28. Counts describe these
runs; they are evidence, not machine-speed or future suite-size requirements.

| Required route                                  | Current status | Current evidence                                                                                                            |
| ----------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| ./check_codebase.sh                             | Pass           | TypeScript, lint, Prettier, and 370/370 Node tests passed; all five canonical checks passed.                                |
| ./build_github_pages.sh                         | Pass           | Exit 0; `dist/` was rebuilt as a GitHub Pages-ready artifact.                                                               |
| ./run_playwright_tests.sh --build --workers=1   | Pass           | 48/48 production-browser tests passed with one worker after rebuilding `dist/`.                                             |
| source source_me.sh && python3 -m pytest tests/ | Candidate pass | A disposable full-candidate Git projection passed 1,484/1,484 tests; the real Git index was unchanged.                      |
| Seven-frame original-resolution review          | Accepted       | All seven 1280 x 800 PNGs were independently accepted; the current Chicago drawer frame was rereviewed after its final fix. |
| Reduced-motion/narrow capture verification      | Pass           | The 360 x 800 capture had no horizontal overflow, retained a contained 44px evolution action, and reported reduced motion.  |

The ordinary Python run reported 1,478 passes and one README link failure because the link checker
projects Git-tracked files and the two new hypoxic/invasive PNGs remain untracked. A disposable Git
index and object store containing the complete working-tree candidate passed all 1,484 tests. This
separates a human-staging dependency from source or documentation correctness without changing the
real index.

## Pages workflow and human handoff

[deploy-pages.yml](../deploy-pages.yml) is the tracked workflow template. The repository candidate
also contains .github/workflows/deploy-pages.yml. Local file presence and a successful local build
are implementation evidence only. Remote Actions, a live Pages URL, external publication, and
human visual acceptance require the release owner.

The human release owner performs these handoff steps:

1. Review the candidate and stage the intended files.
2. Commit and push through the repository's normal human workflow.
3. Confirm the workflow on the configured default branch and inspect the live Pages artifact.
4. Record final human acceptance after reviewing the live target-display game.

## Release boundary

M22 is locally complete with the fresh final routes and seven-frame acceptance above. Git staging,
commits, pushes, remote Actions, Pages publication, and final human approval remain external handoff
evidence. This page preserves those boundaries while keeping the local candidate ready for owner
review.
