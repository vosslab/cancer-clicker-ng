# Complete visual review

## Scope and evidence boundary

This review covers the production-built game at the opening, success, persistence-error,
corrupt-save recovery, offline-return, and forced-colors states; advanced tumor states; Culture;
Network; the Chicago scale report; responsive composition; keyboard tooltips; the specimen drawer;
touch targets; accessibility semantics; palette contrast; and live-number cadence. It is an expert
heuristic evaluation and cognitive walkthrough, not a participant usability study.

Rendered inspection used the repository's production `dist/` artifact. Automated geometry and
screenshots are reproducible one-time review evidence, not permanent pixel or timing expectations.
Durable behavior remains in Node and production-browser tests.

The first review attached to this work was not acceptable evidence: it missed a clipped rack
tooltip, unlabeled price semantics, fractional-cell copy, an eye-like opening silhouette, unreadable
hallmark overlap, premature catalog disclosure, and a blue/green science-fiction theme. The results
below describe the corrective capture produced after those defects were addressed. Final aesthetic
acceptance remains with the human owner.

## Player task walkthrough

| Task                        | Expected visible route                                                                        | Result         |
| --------------------------- | --------------------------------------------------------------------------------------------- | -------------- |
| Orient to the current state | Shallow HUD shows cells, rate, stage, save state, and utilities                               | PASS           |
| Perform the primary action  | The living tumor is the dominant center object and one native divide control                  | PASS           |
| Read the outcome            | HUD and arena count update; brief reward/status feedback confirms acceptance                  | PASS           |
| Find the next decision      | Evolution sits left, tumor center, and Upgrade Rack right at desktop                          | PASS           |
| Judge an upgrade            | Owned, Output, Buy, Cost, Adds, enabled treatment, and disabled state remain visible          | PASS           |
| Request concise help        | Hover, focus, and pointer-down open an in-flow-neutral tooltip                                | PASS           |
| Leave help                  | Escape dismisses the tooltip without stealing trigger focus                                   | PASS after fix |
| Inspect more biology        | The optional drawer opens from the HUD, focuses Close, closes with Escape, and restores focus | PASS           |
| Continue on a narrow screen | Tumor, evolution, rack, then rewards preserve task order without horizontal scrolling         | PASS           |

## HCI task model and guideline ledger

The intended learner is a first-time biology student who may recognize cancer terms without already
knowing incremental-game notation. The review therefore uses a cognitive walkthrough of the first
session and a heuristic evaluation of repeat play. It does not substitute for observed student use.

| Learner goal | Observable question at the decision point | Guideline applied | Acceptance evidence |
| --- | --- | --- | --- |
| Start the loop | "What do I do first?" | Visibility of system status; action and result must be co-located | The central tumor is the dominant target, Divide has a native label, and HUD/arena feedback update together |
| Understand count | "Can I have a fraction of a cell?" | Match the biological model; do not expose implementation precision as object count | Inventory uses whole cells, partial accrual is Next Cell progress, and sub-one rates say time per cell |
| Decide on a producer | "What costs what, and what will I gain?" | Recognition over recall; a tooltip supplements rather than carries a primary decision | Each discovered row exposes Owned, Output, Buy, Cost, and Adds; the focused price tooltip is captured and measured |
| Avoid spoilers | "What can I work toward next?" | Progressive disclosure while preserving a near-term goal | The rack shows only discovered rows and at most two anonymous targets; screenshot fixtures exercise both states |
| Ask for help | "Can I read this without losing my place?" | In-place, dismissible contextual help | Tooltip portal placement is clamped to the viewport, avoids rack content, and Escape returns to the unchanged trigger |
| Change modes | "Where did the tumor controls go?" | Stable spatial landmarks and explicit mode selection | Desktop keeps Evolution, Living Tumor Clicker, Upgrade Rack; narrow layouts retain tumor, evolution, rack task order |
| Recover from failure | "Did my game save, and what can I do now?" | Explain status and recovery without hiding the primary action | Error, corrupt-save recovery, and offline-return states appear in the corpus with ARIA snapshots |

The related guideline ledger records 51 responsive and interaction frames, 33 rendered-tooltip
measurements, 11 automated Axe states, a served-palette scan, and manual original-resolution
inspection. The automated checks cover containment and semantic contracts; they do not demonstrate
that a student understands every cancer term, icon, or long-session progression choice.

## Automated visual-review tool

`tools/capture_visual_review.mjs` has two closed modes:

```bash
node tools/capture_visual_review.mjs
node tools/capture_visual_review.mjs --verify-existing
```

Capture mode serves only the rebuilt local `dist/`, creates an ignored contact sheet, and records
screenshots plus diagnostics in `output_visual/game_visual_review/`. Verification mode reads the
existing manifest and confirms screenshot byte counts and hashes without launching Chromium or
writing files. Callers cannot supply a server root or output path.

The manifest covers:

- Narrow phone 320 x 900, full page
- Wide phone 480 x 900, full page
- Tablet 768 x 1024, full page
- Target desktop 1280 x 800, viewport
- Wide desktop 1920 x 1080, viewport
- Focused tooltip, open inspector, successful feedback, persistence error, corrupt-save recovery,
  offline return, and forced-colors states
- One board screenshot for each of the six evolution views and one screenshot for every rendered
  tooltip in the seeded Stage, Culture, and Network surfaces; the fully labeled Hallmarks, Routes,
  and Resets surfaces currently expose no tooltip trigger
- Panel rectangles and desktop top/bottom alignment
- Desktop and mobile task order, including a bounded stacked-panel dead-space check
- Horizontal overflow and visible native-button target sizes
- Tooltip viewport containment, text fit, trigger overlap, rack-content overlap, settled placement,
  and Escape dismissal
- Console/page errors
- Green-hue and named-green tokens in served CSS and JavaScript
- WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA Axe results for 11 meaningful states
- ARIA-tree snapshots for the primary controls, state, recovery action, reward log, and offline report

Loading and permission states are not applicable: this is a static client shell with no
asynchronous startup resource and it requests no device, account, or operating-system permission.

## Responsive geometry results

| Viewport    | Board result | Evidence                                                                                                            |
| ----------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| 320 x 900   | PASS         | 0 px horizontal overflow; arena/evolution/rack order; 0 px evolution dead space; no visible button below 44 x 44 px |
| 480 x 900   | PASS         | Same responsive and target-size evidence; 0 px evolution dead space                                                 |
| 768 x 1024  | PASS         | Same task order; 0 px evolution dead space; no visible button below 44 x 44 px                                      |
| 1280 x 800  | PASS         | Evolution/arena/rack top and bottom spreads both 0 px; arena is the widest column                                   |
| 1920 x 1080 | PASS         | Same exact three-column alignment; bounded 80rem board prevents over-dilution                                       |

At the opening state, the full phone document is about 1,443 px tall and the tablet document is
1,310 px
tall. That is a deliberate stacked-task cost rather than hidden horizontal content: the
primary tumor remains first, the active decision second, and the progressively revealed upgrade
rack third.

## Findings and changes

| Finding                                                                                    | Severity | Resolution                                                                                                                                  |
| ------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Culture, prestige, affordable rows, and legacy surfaces used a generic blue/green identity | High     | Reassigned the board to marrow, burgundy, rose, coral, plum, cream, and amber body-tissue roles across served CSS and SVG source            |
| Opening cell read as an eye inside concentric scanner geometry                             | High     | Removed the transformed-stage macro ellipse and activity ring; enlarged an irregular granular cell with an eccentric nucleus                |
| Upgrade prices and gains depended on cryptic icon-number pairs                             | High     | Added explicit Owned, Output, Buy, Cost, and Adds labels to every discovered purchase surface                                               |
| Rack disclosed the entire future producer catalog                                          | Medium   | Limited normal play to discovered targets plus at most the next two anonymous targets; owned and primed rows remain established discoveries |
| Continuous accrual displayed impossible fractional objects such as `0.01 cells`            | High     | Kept the balance continuous while presenting whole-cell inventory, next-cell progress, and sub-one output as time per cell                  |
| Hallmark descriptions and hover help overlapped a seven-column grid                        | High     | Changed to a three-column readable name grid and a selected-detail region; hallmark cards no longer depend on overlapping tooltip prose     |
| Live values stepped only once per second                                                   | High     | Moved the live timer to four updates per second without weakening persist-before-reconcile                                                  |
| Tooltips had no explicit keyboard dismissal                                                | Medium   | Added Escape handling for enabled and disabled focus routes; focus stays on the trigger                                                     |
| Producer assay control was about 38 px square                                              | Medium   | Raised the permanent target to 44 x 44 px                                                                                                   |
| Producer buy surface did not fill its available row width at intermediate sizes            | Medium   | Made the single buy surface span the full row track                                                                                         |
| Inspector width obscured more of the target desktop than its content required              | Low      | Reduced the maximum width from 24rem to 21rem while retaining readable wrapping                                                             |
| Base disabled text missed the 5.5:1 house target                                           | Medium   | Raised it from `#8e9ca2` to `#aab8be`, producing 6.30:1 on `#25343c`                                                                        |
| Stacked evolution panels stretched to the rack height and left a large blank block         | Medium   | Let the stacked evolution row fit content and added a maximum 8px dead-space assertion; current evidence is 0px at 320, 480, and 768        |
| Two labeled plain `div` elements used prohibited ARIA attributes                           | High     | Assigned image semantics to the NG mark and chronological log semantics to recent rewards; permanent browser assertions protect both roles  |
| Forced-colors mode made the stage sigil faint                                              | Medium   | Mapped its track, progress, core, and outline to system colors                                                                              |
| Whole-game review depended on separate screenshots and informal inspection                 | Medium   | Added one 51-frame responsive, six-view, all-rendered-tooltip, interaction, accessibility, diagnostics, and served-palette harness          |

## Palette and contrast

The rendered system now reads as eosin-like tumor rose, hematoxylin plum nuclei, coral
vascular/growth signals, cream contours, and amber ATP/reward emphasis on a deep marrow and
burgundy tissue field. Culture, Network, prestige, and the rack share that body-tissue family rather
than switching to blue or green subsystem themes. Affordable machinery uses brighter rose, a
strong border, and a full enabled control, while unavailable rows retain native disabled state,
muted value, icon, and text.

[PALETTE_CONTRAST_AUDIT.md](../../PALETTE_CONTRAST_AUDIT.md) records the measured text pairs. All
audited foreground tokens pass 5.5:1 on the tissue background: primary copy 17.57:1, muted copy
9.91:1, growth rose 7.98:1, bright growth 15.34:1, ATP/focus amber 13.66:1, and danger coral
9.29:1.

## Heuristic evaluation

Scores use Nielsen's 0-4 severity scale, where 0 means no usability problem and 4 means a usability
catastrophe. The baseline is a retrospective expert score grounded in the rejected rendered
captures and source; it is not a participant measurement. The after score uses the current
51-frame corpus and interaction evidence. A score of 1 remains where participant comprehension or
long-session comfort has not been tested.

| Heuristic                       | Before | After | Evidence                                                                                                               |
| ------------------------------- | -----: | ----: | ---------------------------------------------------------------------------------------------------------------------- |
| Visibility of system status     |      1 |     0 | Count, rate, stage, save glyph, gate state, price, owned levels, reward, and error status stay visible                 |
| Match to the game world         |      3 |     1 | Warm body tissue and a cellular opening replace the blue/green laboratory and eye-like styling                         |
| User control and freedom        |      2 |     0 | Escape closes tooltip and drawer; drawer restores invoker focus                                                        |
| Consistency and standards       |      1 |     0 | Native buttons, 44px targets, shared focus rings, shared tooltip behavior, and stable panel roles                      |
| Error prevention                |      0 |     0 | Unaffordable/locked actions remain disabled and persistence failure remains atomic                                     |
| Recognition over recall         |      3 |     1 | Explicit economic labels and full hallmark names remove icon-only decoding; classroom comprehension remains unmeasured |
| Flexibility and efficiency      |      1 |     0 | Direct tumor action, quantity controls, number format, keyboard routes, and responsive ordering                        |
| Aesthetic and minimalist design |      4 |     1 | The tumor dominates, overlap is removed, and progressive disclosure limits the rack; owner acceptance remains pending  |
| Error recovery                  |      1 |     0 | Save failure and protected replacement are visible without bypassing the controller                                    |
| Help and documentation          |      3 |     1 | All rendered tooltips, the README decision frame, drawer, usage guide, and contact sheet provide inspectable evidence  |

## Automated accessibility and assistive-technology evidence

The first Axe run exposed one serious `aria-prohibited-attr` violation rule affecting two nodes:
the NG mark and recent-rewards container. Recording Axe's incomplete results then exposed two more
real tooltip-contract defects: closed triggers referenced absent description IDs, and focusable
disabled wrappers placed ARIA labels on roleless spans. Tooltip descriptions now stay in the DOM
while hidden, disabled wrappers use group semantics, the stage-number cluster has a named group,
and the harness rejects serious or critical incomplete rules except the manually reviewed
`color-contrast` rule.

Final audits across 11 states report 0 violation rules, 0 violating nodes, and 0 serious/critical
violation rules. Each state retains Axe's `color-contrast` incomplete result where gradients,
overlapped SVG, or short icon decorations prevent automated background inference. The measured
source-pair audit covers the shared foreground tokens, icons never carry state alone, and the
rendered normal and forced-colors frames were manually inspected. The manifest keeps every
incomplete node rather than treating automated uncertainty as a pass.

The same manifest stores Playwright ARIA-tree snapshots for the named main surface, Divide, number
format, purchase quantity, stage advance, count, reward log, save and live-error statuses, recovery
alert and replacement action, disabled Divide state, and offline panel. This is deterministic
screen-reader-oriented tree evidence, not a claim that every screen reader/browser pairing was
manually tested. Forced-colors rendering was separately inspected at 1280 x 800.

## Number-update and WASM assessment

The perceived slowness came from `setInterval(advance, 1000)`. A one-time Node profile of a populated
state measured 10,000 economy advances at about 0.011 ms each and 2,000 full-save serializations at
about 0.109 ms each; the serialized state was about 2.7 KB. Those numbers are diagnostic evidence,
not a permanent timing test.

The implemented four-hertz loop keeps the established atomic behavior: advance, serialize/persist,
then reconcile the Solid store. It does not create a second interpolated number, a worker mirror,
or an animation-frame simulation. WebAssembly is not justified: arithmetic is not the measured
bottleneck, and a native boundary would add build, type conversion, state ownership, debugging,
and Pages deployment costs. Revisit only if profiling on supported devices later shows sustained
engine time that cannot be fixed within the TypeScript domain.

## Rendered inspection conclusion

The opening narrow-phone, wide-phone, tablet, target-desktop, and wide-desktop views have coherent
hierarchy, exact desktop column alignment, content-fit stacked panels, bounded controls, and a warm
body-tissue theme. Success, error, recovery, offline, tooltip, inspector, and forced-colors states
remain legible and aligned. Advanced perfused and invasive tumors preserve distinct biological
layers without turning the board into a cool aquatic field. Culture and Network remain in the same
marrow/rose/plum family; the Chicago report keeps its local architectural analogy. Tooltip and
drawer overlays remain readable and contained in the inspected frames.

This completes the corrective expert review and automated evidence path. It does not claim owner or
student participant acceptance or future pixel identity; a later classroom usability study should
evaluate icon comprehension, progressive discovery, and whether the stacked mobile rack feels too
long during sustained play.

## Final verification

| Gate                                                       | Result                                                                                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./check_codebase.sh`                                      | PASS: typecheck, typecheck-lint, ESLint, Prettier, 371 Node tests                                                                                                         |
| `./build_github_pages.sh`                                  | PASS: production `dist/` rebuilt                                                                                                                                          |
| `./run_playwright_tests.sh --build`                        | PASS: 49 production-browser tests                                                                                                                                         |
| `source source_me.sh && python3 devel/verify_candidate.py` | PASS: 1,555 Python tests against the complete nonignored projection; disposable Git storage preserved the real index                                                      |
| `node tools/capture_visual_review.mjs`                     | PASS: 51 screenshots, 33 rendered tooltips, all six views, 11 zero-violation Axe audits, no diagnostics, no overflow or undersized controls, zero served green candidates |
| `node tools/capture_visual_review.mjs --verify-existing`   | PASS: 51 screenshot identities and contact sheet verified read-only                                                                                                       |
| `node --import tsx tools/capture_readme_screenshots.mjs`   | PASS: eight documentation frames including explicit upgrade economics and tooltip geometry, narrow containment, reduced/normal motion, no diagnostics                     |
| Original-resolution visual inspection                      | PASS: five widths, six evolution views, representative tooltip frames, all seven interaction/edge states, and eight documentation frames                                  |

The screenshot captures and performance measurements remain dated review artifacts. The Node and
browser suites own permanent semantic behavior.
