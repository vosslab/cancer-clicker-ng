# Visual-first screenshot review

**Status:** PASS - dated, independent original-resolution review, 2026-08-28.

## Scope and identity

This review evaluates the seven current 1280 x 800 PNGs in `docs/screenshots/` produced by
`node tools/capture_readme_screenshots.mjs`. It is an independent static-image review of the
current candidate projected from base HEAD `28591cc98ec5e2bb9cd2acc4678468b99c4092b9`.

The working tree contains concurrent documentation, tooling, workflow, and asset changes. The
assigned report had no local diff when this review began. This report owns only the visual verdict;
it neither approves a commit nor makes a release or publishing claim.

## Capture input contract

The exact capture route is:

```sh
./build_github_pages.sh
node tools/capture_readme_screenshots.mjs
```

The capture tool requires an already-built `dist/index.html` and `dist/main.js`, serves `dist/` on
a loopback HTTP server, uses headless Chromium at 1280 x 800 with reduced motion, and installs the
fixed clock `1750000000000`. Its board capture performs a visible cell click and verifies the
count changes, a direct cell target exists, the reticle intersects a visible cell, the expected
state-derived scene overlays exist, and the document has no horizontal overflow. Each later frame
loads a parser-validated synthetic save state before boot. The tool also performs a narrow,
reduced-motion Chicago check and a normal-motion walkthrough before writing the README image block.

The capture contract establishes the image inputs. This report evaluates the rendered result at
original PNG resolution. It creates no pixel, byte, rank, or timing equivalence requirement.

## Fresh capture provenance

`./build_github_pages.sh` completed with exit 0 immediately before
`node --import tsx tools/capture_readme_screenshots.mjs`. The capture completed with exit 0 on
2026-08-28, regenerated all seven documented 1280 x 800 PNGs, and passed its runtime assertions:
the opening board performed a direct visible-cell click; every fixed-state frame had no horizontal
overflow and the expected scene overlay; narrow Chicago preserved its 44px evolution action; and
the normal-motion walkthrough exposed both expected animations. In this docset pass, all seven
current files were independently reviewed at original resolution and received PASS. Six recaptured
files remained byte-identical to their prior approved copies; the perfused-tumor frame changed and
its current SHA-256 is recorded below. This is capture provenance and a dated visual verdict only;
it does not establish a future byte- or pixel-equivalence requirement.

## Reviewed artifacts

Every reviewed file is an 8-bit RGB, non-interlaced 1280 x 800 PNG. SHA-256 values identify the
current images only.

| Frame                   | Path                                                                                               | SHA-256                                                            |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Opening board           | [cancer_clicker_ng_board.png](../../screenshots/cancer_clicker_ng_board.png)                       | `8ffeac5c5b3ffe6531aa509c20ec1edfadff630ba0bb68d5077e39c437a5fc28` |
| Hypoxic/necrotic lesion | [cancer_clicker_ng_hypoxic_necrotic.png](../../screenshots/cancer_clicker_ng_hypoxic_necrotic.png) | `35fc1be6020a4c8951888b7c30a3b6d3b38d59e5c8a265cff68995b368a2ce68` |
| Perfused tumor          | [cancer_clicker_ng_perfused_tumor.png](../../screenshots/cancer_clicker_ng_perfused_tumor.png)     | `2f18efcbb1d0795beb38b41c6ed850d8a0ce8a1755ffe7ed9f7ece62ab7ae4f4` |
| Invasive route          | [cancer_clicker_ng_invasive_route.png](../../screenshots/cancer_clicker_ng_invasive_route.png)     | `a291355fbdf879c97f542f406fad5892f4187acbb48ed79ff517dda4741c77df` |
| Culture laboratory      | [cancer_clicker_ng_culture_lab.png](../../screenshots/cancer_clicker_ng_culture_lab.png)           | `af9f382366396eab189ee440671543cac35a9f397f74b53bbdc0d016d803eac2` |
| Dissemination network   | [cancer_clicker_ng_network_map.png](../../screenshots/cancer_clicker_ng_network_map.png)           | `d8e7c50a4489897605bd62b35e7f76e5c8d124db2178adcfce18cc88b0e56ed8` |
| Chicago scale report    | [cancer_clicker_ng_chicago_scale.png](../../screenshots/cancer_clicker_ng_chicago_scale.png)       | `804245546922eaf0ed624258a9683acbfaee1d2fd21bcc04a9adb1ec4578595b` |

## Fixed rubric

| Criterion                              | Verdict | Image-observable evidence                                                                                                                                                                                                                                        |
| -------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Living tumor dominates                 | PASS    | Every board frame centers a large turquoise tissue mass or cellular lesion. The scoreboard and rack frame it rather than replacing it as the focal object.                                                                                                       |
| Direct-cell affordance                 | PASS    | The opening, hypoxic, perfused, invasive, culture, and Chicago frames show a bright reticle on a cell; the opening frame also labels the arena action "Divide a visible cell."                                                                                   |
| Hypoxic/necrotic progression           | PASS    | The hypoxic frame has a dense dark-purple central core, a differently patterned/ringed rim, and many small cells; its form differs clearly from the opening cell.                                                                                                |
| Perfused progression                   | PASS    | The perfused frame adds a coral vessel entering from the left, internal coral branch geometry, and an arrow-like forward extension while preserving the tumor silhouette.                                                                                        |
| Invasive progression                   | PASS    | The invasive frame expands into three lobes bounded by dotted pink invasive fronts, with a seeded route leaving toward the upper right.                                                                                                                          |
| Culture progression                    | PASS    | The culture frame changes the left decision surface to illustrated dish, cryobank, and program cards while the central scene becomes a large tissue field with distinct colony islands.                                                                          |
| Network progression                    | PASS    | The network frame replaces the left surface with a compact site map, route actions, and network icon while retaining the living-board context.                                                                                                                   |
| Chicago progression and recoverability | PASS    | The Chicago frame adds a right-side scale drawer with cell count, modeled volume, city high-rise graphic, and a visible "Hide scale report" action; the central tumor remains visible.                                                                           |
| Icon-first utilities                   | PASS    | Header utilities and evolution-family selectors use small consistent icons; the upgrade cards use illustrated molecular icons and compact quantity chips. Labels remain available where meaning matters.                                                         |
| Prose remains subordinate              | PASS    | The dominant vocabulary is numeric HUD, short stage names, icons, and card labels. Longer explanatory text is confined to the Chicago drawer and the collapsed "Specimen notes" affordance.                                                                      |
| Game-first composition                 | PASS    | The images read as a dark, high-contrast incremental-game board with a central action arena, staged progression, collectible equipment, and score. They do not read as a static science poster.                                                                  |
| 1280 x 800 fit, clipping, and overlap  | PASS    | Primary arena, stage surface, header, and Chicago drawer fit within the viewport. The upgrade rail deliberately continues below the viewport like an incremental-game store; no primary action or report control is cropped or overlaps another primary surface. |

## Per-frame observations

| Frame                   | Observed facts at original 1280 x 800 resolution                                                                                                                                                                                                                                         | Judgment                                                                                                                                                                                          | Verdict |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Opening board           | A single large teal cell and cyan reticle occupy the arena center. The immediate cell total, cells/s value, stage chip, compact icon strip, and illustrated producer cards frame that target. The only instructional phrase is the small `Divide a visible cell` label.                  | The direct action and its reward are readable before any specimen prose. This is a game board, not a scientific explainer page.                                                                   | PASS    |
| Hypoxic/necrotic lesion | The central lesion has a dark-purple core, an irregular bright rim, and a dense ring of individually marked cells. The reticle remains on a visible cell and the left stage card stays compact.                                                                                          | The change from the opening cell is carried by topology, density, and internal void, not stage text or a color swap alone.                                                                        | PASS    |
| Perfused tumor          | A coral vessel enters from the left, branches through the teal lesion, and terminates in a forward-pointing coral route. The board retains its reticle, score chip, and upgrade rack.                                                                                                    | Vascular access supplies a new visual grammar while preserving the same clicker loop.                                                                                                             | PASS    |
| Invasive route          | The tumor expands into three overlapping lobes with a central void, dotted pink boundary fronts, and a pink route exiting toward the upper right. The target marker remains visible on the left lobe.                                                                                    | The larger silhouette and route cue communicate invasion at a glance and keep the tumor dominant.                                                                                                 | PASS    |
| Culture laboratory      | The left panel changes to illustrated dish, cryobank, and program marks with small action cards. The arena becomes a broad tissue field containing separated colony islands around a central route. A lower secondary panel begins below the viewport after the active culture controls. | Culture reads as a new playable system with an icon-led decision surface, while the biological board remains the focal region. The lower continuation does not obscure an active primary control. | PASS    |
| Dissemination network   | A compact blue network surface presents site, link, and route marks. The arena still shows the tissue field and separated colonies; the upgrade rail remains visible at the right.                                                                                                       | Network state changes the control vocabulary without becoming a prose-heavy dashboard or displacing the living board.                                                                             | PASS    |
| Chicago scale report    | A bounded right drawer presents three compact metrics, a skyline comparison graphic, and a high-contrast `Hide scale report` control. The full central tissue field and reticle remain readable beside it.                                                                               | The milestone is legible, recoverable, and additive: it supplies scale without replacing the board or turning the screen into a static report.                                                    | PASS    |

## Findings and remediation status

| Finding                                                                               | Status                                                                                                                             |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Static frames show an icon-rich game shell with only compact, purpose-specific text.  | Resolved in current captures.                                                                                                      |
| All required biological and world transitions have visibly distinct compositions.     | Resolved in current captures.                                                                                                      |
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
scoreboard, controls use compact icons and illustrated cards, prose stays subordinate, and the
biological/world progression has materially distinct compositions. The deliberate below-viewport
continuation of the upgrade rail and lower secondary panels reads as incremental-game scrolling,
not clipping of a primary action. This is dated visual acceptance evidence, not a permanent
pixel-equivalence gate or a substitute for production-browser behavior evidence.
