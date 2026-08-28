# Visual-first screenshot review

**Status:** PASS - dated original-resolution review, 2026-08-28.

## Scope and identity

This review evaluates the seven current 1280 x 800 PNGs in `docs/screenshots/` produced by
`node tools/capture_readme_screenshots.mjs`. It is an independent static-image review of the
current candidate projected from base HEAD `d4230ce1a9abe6d52e00329365c7e29764027b3a`.

This report owns only the current visual verdict; it neither approves a commit nor makes a release
or publishing claim.

## Capture input contract

The exact capture route is:

```sh
./build_github_pages.sh
node tools/capture_readme_screenshots.mjs
```

The capture tool requires an already-built `dist/index.html` and `dist/main.js`, serves `dist/` on
a loopback HTTP server, uses headless Chromium at 1280 x 800 with reduced motion, and installs the
fixed clock `1750000000000`. Its board capture performs a visible cell click and verifies the
count changes, a direct cell target exists with a pointer cursor, no targeting overlay is present,
the expected state-derived scene overlays exist, and the document has no horizontal overflow. Each
later frame loads a parser-validated synthetic save state before boot. The tool also performs a
narrow, reduced-motion Chicago check and a normal-motion walkthrough before writing the README
image block.

The capture contract establishes the image inputs. This report evaluates the rendered result at
original PNG resolution. It creates no pixel, byte, rank, or timing equivalence requirement.

## Fresh capture provenance

`./build_github_pages.sh` completed with exit 0 immediately before
`node --import tsx tools/capture_readme_screenshots.mjs`. The capture completed with exit 0 on
2026-08-28, regenerated all seven documented 1280 x 800 PNGs, and passed its runtime assertions:
the opening board performed a direct visible-cell click; every fixed-state frame had no horizontal
overflow and the expected scene overlay; narrow Chicago preserved its 44px evolution action; and
the normal-motion walkthrough exposed both expected animations. All seven current files were
reviewed at original resolution and received PASS. All seven changed as expected after the medical
palette, direct-cell affordance, price-state, targeting-overlay, and named-magnitude corrections. Their current
SHA-256 values are recorded below as provenance, not future byte- or pixel-equivalence requirements.

## Reviewed artifacts

Every reviewed file is an 8-bit RGB, non-interlaced 1280 x 800 PNG. SHA-256 values identify the
current images only.

| Frame                   | Path                                                                                               | SHA-256                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Opening board           | [cancer_clicker_ng_board.png](../../screenshots/cancer_clicker_ng_board.png)                       | `ba4beb5b88af048ce86538c4b098c21281c140775ffa63821cb5c24f0c4416f7` |
| Hypoxic/necrotic lesion | [cancer_clicker_ng_hypoxic_necrotic.png](../../screenshots/cancer_clicker_ng_hypoxic_necrotic.png) | `31304b0fbca55d849f62fc604a06f8578880a92239c2b5ff2bb4ea65fd616d82` |
| Perfused tumor          | [cancer_clicker_ng_perfused_tumor.png](../../screenshots/cancer_clicker_ng_perfused_tumor.png)     | `2097996426d14ef19d4b0d00fc0c68bb0827b64eb6614ebec97084b177319b8a` |
| Invasive route          | [cancer_clicker_ng_invasive_route.png](../../screenshots/cancer_clicker_ng_invasive_route.png)     | `68e784eefcecbf2c13aa9a2aaab47af0a2179d449f2608ff0a73e8f5d3dfdbe3` |
| Culture laboratory      | [cancer_clicker_ng_culture_lab.png](../../screenshots/cancer_clicker_ng_culture_lab.png)           | `2c06b964bf8be770432bae15ac530cbe5eb43433041b4bc39ac0fbdc7c40183d` |
| Dissemination network   | [cancer_clicker_ng_network_map.png](../../screenshots/cancer_clicker_ng_network_map.png)           | `06a6fe7ba8b6265b02cf1d87217b6e7d61f530ac778ba2e36e4a99e72e4d2be7` |
| Chicago scale report    | [cancer_clicker_ng_chicago_scale.png](../../screenshots/cancer_clicker_ng_chicago_scale.png)       | `0200ac7c4a38f2f0e193379ab77c546950542b64c955837deed12bf46e0f7f0d` |

## Fixed rubric

| Criterion                              | Verdict | Image-observable evidence                                                                                                                                                                                                                                        |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Living tumor dominates                 | PASS    | Every board frame centers a large rose, coral, and purple tissue mass or cellular lesion. The scoreboard and rack frame it rather than replacing it as the focal object.                                                                                         |
| Direct-cell affordance                 | PASS    | The opening frame centers one clearly bounded membrane and nucleus as the dominant target and labels the arena action "Divide a visible cell"; the capture contract verifies its pointer behavior.                                                               |
| Hypoxic/necrotic progression           | PASS    | The hypoxic frame has a dense dark-purple central core, a differently patterned/ringed rim, and many small cells; its form differs clearly from the opening cell.                                                                                                |
| Perfused progression                   | PASS    | The perfused frame adds a coral vessel entering from the left, internal coral branch geometry, and an arrow-like forward extension while preserving the tumor silhouette.                                                                                        |
| Invasive progression                   | PASS    | The invasive frame expands into three lobes bounded by dotted pink invasive fronts, with a seeded route leaving toward the upper right.                                                                                                                          |
| Culture progression                    | PASS    | The culture frame changes the left decision surface to illustrated dish, cryobank, and program cards while the central scene becomes a large tissue field with distinct colony islands.                                                                          |
| Network progression                    | PASS    | The network frame replaces the left surface with a compact site map, route actions, and network icon while retaining the living-board context.                                                                                                                   |
| Chicago progression and recoverability | PASS    | The Chicago frame adds a right-side scale drawer with cell count, modeled volume, city high-rise graphic, and a visible "Hide scale report" action; the central tumor remains visible.                                                                           |
| Icon-first utilities                   | PASS    | Header utilities and evolution-family selectors use small consistent icons; the upgrade cards use illustrated molecular icons and compact quantity chips. Labels remain available where meaning matters.                                                         |
| Price state is visible                 | PASS    | Affordable upgrade rows use bright cyan borders and enabled color; underfunded rows are gray, desaturated, and visibly inactive without exposing extra prose.                                                                                                    |
| Prose remains subordinate              | PASS    | The dominant vocabulary is numeric HUD, short stage names, icons, and card labels. Longer explanatory text is confined to optional tooltips and the specimen drawer.                                                                                             |
| Named magnitude is prominent           | PASS    | Million-and-above frames place the canonical full illion name directly over the compact central cell score. The title reads as progression feedback while preserving the number as the fastest-scanning value.                                                   |
| Game-first composition                 | PASS    | The images read as a dark, high-contrast incremental-game board with a central action arena, staged progression, molecular upgrade machinery, and score. They do not read as a static science poster.                                                            |
| 1280 x 800 fit, clipping, and overlap  | PASS    | Primary arena, stage surface, header, and Chicago drawer fit within the viewport. The upgrade rail deliberately continues below the viewport like an incremental-game store; no primary action or report control is cropped or overlaps another primary surface. |

## Per-frame observations

| Frame                   | Observed facts at original 1280 x 800 resolution                                                                                                                                                                                                                                         | Judgment                                                                                                                                                                                          | Verdict |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Opening board           | A single large rose cell with a purple nucleus occupies the arena center. The immediate cell total, cells/s value, stage chip, compact icon strip, and illustrated producer cards frame that target. The only instructional phrase is the small `Divide a visible cell` label.           | The direct action and its reward are readable before any specimen prose. This is a game board, not a scientific explainer page.                                                                   | PASS    |
| Hypoxic/necrotic lesion | The central lesion has a dark-purple core, an irregular eosin-pink rim, and a dense ring of individually marked cells. The left stage card stays compact and no observer overlay competes with the lesion.                                                                               | The change from the opening cell is carried by topology, density, and internal void, not stage text or a color swap alone.                                                                        | PASS    |
| Perfused tumor          | A coral vessel enters from the left, branches through the rose lesion, and terminates in a forward-pointing route. The board retains its score chip and upgrade rack without adding laboratory-observer decoration.                                                                      | Vascular access supplies a new visual grammar while preserving the same clicker loop.                                                                                                             | PASS    |
| Invasive route          | The tumor expands into three overlapping lobes with a central void, dotted pink boundary fronts, and a pink route exiting toward the upper right. Distinct cells remain visible on the lobes, and `MILLION` crowns the compact score.                                                    | The larger silhouette and route cue communicate invasion at a glance; the named magnitude makes the scale itself feel like a progression reward.                                                  | PASS    |
| Culture laboratory      | The left panel changes to illustrated dish, cryobank, and program marks with small action cards. The arena becomes a broad tissue field containing separated colony islands around a central route. A lower secondary panel begins below the viewport after the active culture controls. | Culture reads as a new playable system with an icon-led decision surface, while the biological board remains the focal region. The lower continuation does not obscure an active primary control. | PASS    |
| Dissemination network   | A compact blue network surface presents site, link, and route marks. The arena still shows the tissue field and separated colonies; the upgrade rail remains visible at the right.                                                                                                       | Network state changes the control vocabulary without becoming a prose-heavy dashboard or displacing the living board.                                                                             | PASS    |
| Chicago scale report    | A bounded right drawer presents three compact metrics, a skyline comparison graphic, and a high-contrast `Hide scale report` control. `SEPTILLION` remains visible above the compact central score beside it.                                                                            | The milestone is legible, recoverable, and additive: it supplies scale while the named score and living board remain visible.                                                                     | PASS    |

## Findings and remediation status

| Finding                                                                               | Status                                                                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Static frames show an icon-rich game shell with only compact, purpose-specific text.  | Resolved in current captures.                                                                                                      |
| All required biological and world transitions have visibly distinct compositions.     | Resolved in current captures.                                                                                                      |
| Affordable choices must be recognizable before reading their price.                   | Resolved by bright enabled rows and gray, desaturated underfunded rows.                                                            |
| The board must express the cancer-cell viewpoint without observer equipment.          | Resolved by direct cell targets and the absence of a persistent targeting overlay.                                                 |
| The Chicago report must preserve the active board and provide an obvious return path. | Resolved in current capture by the intact board and visible Hide action.                                                           |
| The lower upgrade rail continues beyond the fixed screenshot viewport.                | Intentional incremental-store affordance; capture shows no primary-content crop. Browser tests own keyboard/reachability behavior. |

## Limitations and static-image boundary

This review proves static hierarchy, visible affordances, visual distinction, no observed
primary-surface overlap, and 1280 x 800 composition. A PNG cannot prove hit testing, a real pointer
click, keyboard parity, focus movement, tooltip invocation, drawer close behavior, persistence,
reduced motion, responsive reflow, console health, or actual scroll reachability.

Those interaction claims belong to the current production-dist Playwright suite, especially
`tests/playwright/test_colony_interaction.mjs`, `tests/playwright/test_network_pointer_hit.mjs`,
`tests/playwright/test_gameplay_lifecycle.mjs`, and `tests/playwright/test_soft_ending.mjs`, run by
`./run_playwright_tests.sh --build --workers=1`. The current execution result is recorded in
[RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md); this report does not infer those behaviors from
the PNGs.

## Final verdict

PASS. All seven current fixed-clock captures satisfy the visual-first rubric at original 1280 x 800
resolution. The living tumor remains the dominant dynamic board, numbers remain a shallow
scoreboard, affordable controls announce themselves with color and state, controls use compact
icons and illustrated cards, prose stays subordinate, and the biological/world progression has
materially distinct compositions. The medical palette and absence of observer equipment keep the
viewpoint inside the living tumor. The deliberate below-viewport continuation of the upgrade rail
and lower secondary panels reads as incremental-game scrolling, not clipping of a primary action.
This is dated visual review evidence, not a permanent pixel-equivalence gate or a substitute for
production-browser behavior evidence.
