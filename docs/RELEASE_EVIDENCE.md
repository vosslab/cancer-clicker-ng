# Release evidence

## Scope and revision

This is the autonomous M22 evidence record for the Cancer Clicker NG working-tree candidate
reconciled on 2026-08-28 from base HEAD `28591cc98ec5e2bb9cd2acc4678468b99c4092b9`. It records a
pre-production local-browser game where the player directly divides visible tumor cells, develops
illustrated molecular machinery and evolution choices, reaches culture, dissemination, and the
optional Chicago scale report, then continues playing.

The evidence integrator assembled the required local inputs, and the fresh independent
[release audit](active_plans/reports/release_audit.md) returned **PASS**. This record therefore
describes an audited local candidate closure. Repository history, GitHub Pages publication, remote
workflow execution, and live-site inspection remain optional distribution work outside that local
closure.

The medical-palette, direct-cell, affordability, tooltip, cancer-cell-viewpoint, and named-magnitude correction was
then verified from base HEAD `d4230ce1a9abe6d52e00329365c7e29764027b3a`. The source, build,
production-browser, and seven-frame rows below record the current correction; the candidate
projection, release audit, renderer corpus, and balance rows remain explicitly dated M22 baseline
evidence rather than claims that those broader one-time lanes were rerun.

## Progression narrative

The intended experience is continuous visual escalation, not a sequence of biology slides. The
living tumor remains the central game board; the HUD is a shallow scoreboard, the left lane is an
evolution dock, and the right rail is an always-upgradable illustrated store. The synthetic,
fixed-state browser evidence below demonstrates reachability without turning a screenshot, count,
or timing sample into a future release threshold.

| Transition                                                     | Dominant player mechanic                                                         | Captured visual evidence                                                                                                                 | Reachability and behavior evidence                                                                                                                                  |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Single transformed cell -> early tumor                         | Click a visible cell to divide; buy initial producers                            | [Opening living tumor board](screenshots/cancer_clicker_ng_board.png)                                                                    | The 49/49 production-browser suite includes rendered membrane/nucleus pointer activation and keyboard parity.                                                       |
| Early tumor -> carcinoma in situ / oxygen stress               | Keep production alive while the lesion gains a hypoxic, necrotic core            | [Hypoxic and necrotic lesion](screenshots/cancer_clicker_ng_hypoxic_necrotic.png)                                                        | The seven-frame harness loads parser-validated synthetic state and checks the target and scene overlays.                                                            |
| Oxygen stress -> vascularized primary -> invasion              | Develop a perfused route, then act on the invasive surface                       | [Perfused tumor](screenshots/cancer_clicker_ng_perfused_tumor.png); [invasive route](screenshots/cancer_clicker_ng_invasive_route.png)   | The production-browser suite covers stages, pointer, and lifecycle; the renderer corpus covers every registered stage.                                              |
| Invasion -> first metastasis -> host collapse                  | Choose route, allocation, and prestige pressure rather than only a larger number | [Invasive route](screenshots/cancer_clicker_ng_invasive_route.png); [Contact-sheet review](active_plans/reports/contact_sheet_review.md) | The 216-frame corpus includes micrometastatic seeding, metastatic burden, and host collapse; balance traces use only the visible decision surface.                  |
| Host collapse -> immortalized culture                          | Start the culture/passage system and choose illustrated laboratory routes        | [Culture laboratory](screenshots/cancer_clicker_ng_culture_lab.png)                                                                      | Current-save, prestige, and culture behavior run in the canonical Node and production-browser routes.                                                               |
| Culture -> global contamination                                | Use renewable dissemination/network decisions                                    | [Dissemination network](screenshots/cancer_clicker_ng_network_map.png)                                                                   | Five-policy calibration records L4 and post-ending decision surfaces; replay tests transport accepted culture/network events.                                       |
| Global contamination -> Chicago scale report -> continued play | Reach, dismiss, and reopen the optional soft ending while retaining the board    | [Chicago scale report](screenshots/cancer_clicker_ng_chicago_scale.png)                                                                  | The 49/49 suite includes soft-ending lifecycle; [tests/test_soft_ending.mjs](../tests/test_soft_ending.mjs) preserves the precise cell resource and continued play. |

## Exact inputs and reproducible routes

The following dated observations used Node v26.7.0 and Python 3.12.14 from the base HEAD above.
The checked-in toolchain declares Playwright

> =1.62.1, tsx >=4.23.12, and TypeScript >=6.0.2 <7. Commands are the authoritative interface; no
> network connection or owner action is required.

```
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build --workers=1
source source_me.sh && python3 devel/verify_candidate.py
source source_me.sh && python3 devel/verify_pages_workflow.py
node --import tsx tools/capture_readme_screenshots.mjs
node --import tsx tools/colony_contact_sheet.mjs
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

The screenshot route serves an already-built dist/ artifact, uses a fixed clock and reduced-motion
1280 x 800 Chromium capture, and exercises a visible cell target plus parser-validated synthetic
states. The contact-sheet route rebuilds and captures every declared stage, seed, viewport, and
theme. It regenerates `output_visual/colony-contact-sheet/`; the structural renderer route
regenerates `output_visual/colony-rendering-verification/`. Each tool clears only its own exact
subdirectory before writing its dated artifact. The candidate route uses a disposable Git index and
object store, then runs its Python suite under that disposable projection.

## Evidence paths

| Evidence                        | Dated result and path                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical source gate           | `./check_codebase.sh`: Exit 0; PASS, five checks and 368 Node tests in 1.45 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Production artifact             | `./build_github_pages.sh`: Exit 0; PASS; rebuilds dist/index.html, dist/main.js, and .nojekyll.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Production browser              | `./run_playwright_tests.sh --build --workers=1`: Exit 0; PASS, 49/49.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Historical candidate manifest   | output_release/candidate_manifest.json: authoritative generated record for the dated M22 projected candidate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Historical candidate projection | `source source_me.sh && python3 devel/verify_candidate.py`: Exit 0; PASS, 1,533 Python tests for the M22 baseline. The projected worktree path, mode, and blobs remained stable, and the real Git index was preserved. Candidate manifests publish only after this byte-stable re-projection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Pages workflow parity           | [`devel/verify_pages_workflow.py`](../devel/verify_pages_workflow.py): Exit 0; PASS for deploy-pages.yml and .github/workflows/deploy-pages.yml; validates main-push/manual triggers, least permissions, build order, and dist/ upload/deploy shape.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Seven-frame visual evidence     | `./build_github_pages.sh` and `node --import tsx tools/capture_readme_screenshots.mjs`: Exit 0; all seven 1280 x 800 frames regenerated with runtime assertions passing. The fresh [original-resolution review](active_plans/reports/visual_first_screenshot_review.md) is PASS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Historical renderer corpus      | [Contact-sheet review](active_plans/reports/contact_sheet_review.md): PASS for the dated M22 216-frame corpus after independent review of 44 originals: all 36 repaired-lesion combinations plus eight progression samples. The v2 provenance manifest is `output_visual/colony-contact-sheet/manifest.json`, SHA-256 `7788e971d8caf90fa4f9035708efdc8dfd7eb173f3b534c741ce150b7466f3fe`, captured `2026-08-28T21:31:14.013Z`; its index SHA-256 is `3989e3065f3eb1a76edeef9d33ea96446473e8147e3c8917a5adc5e33202f54e`; its `dist/main.js` SHA-256 is `2e3671f6824bdb6152dd36409d1183c70c3cb8593262179c7c0d73073dd89610`; and the 12-asset aggregate is `5b2492f97c893b24550557fae4d9466ff674c990ffbdf41926247a14c9f3d155`. The renderer report SHA-256 is `638610d38525ce6fb422d6bd61ae54ad9decea8f4e3e9309e0782d8ea87af304`, with 36 structural samples and 1,257 unique hashes. |
| Balance calibration             | `node --import tsx tools/balance_sim.mjs --suite --output output_balance/balance_report.json`: Exit 0; PASS; format-3 report with five policies, five scenarios, and 25 traces; SHA-256 `a8fa966d8651a0a3f928b1c0dc2b23f5d90560586c1bbcd04a0880aeab98355d`. Its generated `candidateSelection` selects the shipped curve with no demonstrated blocking findings and completed bounded witness remediation; [BALANCE.md](BALANCE.md) records the witness rationale.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Copy boundary                   | [copy_review.md](active_plans/reports/copy_review.md): accepted; named copy guards passed 3/3 and 4/4.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Current save and replay         | [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md), [tests/test_save_migration.mjs](../tests/test_save_migration.mjs), and [tests/test_replay.mjs](../tests/test_replay.mjs).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Architecture and file map       | [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md), [FILE_STRUCTURE.md](FILE_STRUCTURE.md), and [README.md](../README.md).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

The candidate manifest is an ignored local artifact produced by the candidate verifier. Its own
manifest_digest, source_head, and projected_paths identify each run. The verifier compares exact
real-index bytes before and after its disposable projection. These run-specific values belong in
the generated artifact, so the permanent evidence record stays stable as the candidate changes.

## Documentation provenance

| Documentation output                                                                    | Agent route                               | Independent validation                                                                                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [CODE_ARCHITECTURE.md](CODE_ARCHITECTURE.md) and [FILE_STRUCTURE.md](FILE_STRUCTURE.md) | `$vosslab-skills:arch-docs` agent route   | `source source_me.sh && python3 devel/verify_candidate.py`: Exit 0; its disposable candidate projection includes the full Markdown-link lane. |
| [README.md](../README.md)                                                               | `$vosslab-skills:readme-docs` agent route | `source source_me.sh && python3 devel/verify_candidate.py`: Exit 0; its disposable candidate projection includes the full Markdown-link lane. |

These are agent routes that generated the listed documentation outputs, not shell commands. The
candidate verifier is the executable validation route. This evidence record identifies its own
generation provenance; the verifier independently checks its Markdown links through the disposable
projection, preserving the self-reference boundary.

## Local gate results

| Criterion                                                           | Command or exact input                                                                        | Verdict    | Concise observed result                                                                                                                                                                                         |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type safety, lint, formatting, repository checks, and Node behavior | `./check_codebase.sh`                                                                         | PASS       | Exit 0; all five canonical checks passed and the Node suite reported 369 tests in 1.23 seconds.                                                                                                                 |
| Pages-shaped build                                                  | `./build_github_pages.sh`                                                                     | PASS       | Exit 0; the local release artifact rebuilt successfully.                                                                                                                                                        |
| User-visible production behavior                                    | `./run_playwright_tests.sh --build --workers=1`                                               | PASS       | Exit 0; 49/49 browser tests passed, covering direct interaction, price state, focusable no-layout tooltip behavior, reload/storage, responsive layout, reduced motion, and lifecycle surfaces.                  |
| Historical full nonignored candidate and documentation graph        | `source source_me.sh && python3 devel/verify_candidate.py`                                    | DATED PASS | Exit 0; the M22 disposable projection passed 1,533 Python tests with stable worktree path, mode, and blobs, and preserved the real index.                                                                       |
| Local workflow contract                                             | `source source_me.sh && python3 devel/verify_pages_workflow.py`                               | PASS       | Exit 0; root template and published workflow matched trigger, permission, build, upload, and deploy semantics.                                                                                                  |
| Fixed-clock full-game captures                                      | `node --import tsx tools/capture_readme_screenshots.mjs`                                      | PASS       | Exit 0; seven 1280 x 800 frames regenerated with direct-click, price-state, no-targeting-overlay, scene-overlay, overflow, narrow, and motion assertions passing; the fresh original-resolution review is PASS. |
| Historical stage/seed/viewport/theme visual calibration             | `node --import tsx tools/colony_contact_sheet.mjs`                                            | DATED PASS | Exit 0; the M22 corpus contains 216 frames; independent review inspected 44 originals. The structural report contains 36 samples and 1,257 unique hashes.                                                       |
| Historical balance calibration                                      | `node --import tsx tools/balance_sim.mjs --suite --output output_balance/balance_report.json` | DATED PASS | Exit 0; five policy identities traversed five tracked scenarios for 25 dated traces.                                                                                                                            |

Counts, hashes, measurements, and tool versions in this section are dated observations. Permanent
tests protect behavior; one-time capture and calibration artifacts support design judgment without
creating pixel, byte, rank, size, or machine-timing equivalence gates.

`output_visual/` is an ignored root-level generated-output family under the repository's
root-scoped `/output*/` rule. The contact-sheet and structural-rendering tools regenerate their
respective subdirectories from canonical source commands; an existing artifact is evidence only
after its owning command has completed successfully for the candidate under review.

## Accessibility, SVG, copy, save, and replay evidence

The primary action is a native Divide cell control containing a decorative inline SVG. Its
accessible, stage-specific description is provided by #colony-a11y-description, rather than
duplicating it in an SVG title or desc. The production renderer test checks one decorative
svg.colony-figure, no external SVG references, no unresolved local references, no focusable
descendants, no inline handlers, and a nonempty description associated with the action. This
preserves one uncluttered visual arena while giving keyboard and assistive-technology users the
same game action.

The contact-sheet corpus verifies nonempty descriptions across 12 stage identities, finite
geometry, fully visible panel/figure bounds, no document horizontal overflow, and dark plus
neutral-light themes. The independent original-resolution review passed after inspecting 44
originals: all 36 repaired-lesion combinations plus eight progression samples. The current v2
manifest records 216 frames and the 12-asset aggregate; its renderer report records 36 structural
samples and 1,257 unique hashes. The static
image review and browser suite separately establish the 1280 x 800 composition and interaction.
Reduced-motion capture was enabled for the seven-frame and contact-sheet routes; the narrow
360 x 800 verification reported no horizontal overflow and a contained 44px evolution action.
These are observations from this candidate, not future fixed measurements.

[COLOR_CONTRAST_ACCESSIBILITY.md](COLOR_CONTRAST_ACCESSIBILITY.md) sets a 5.5:1 text-pair policy.
The reviews confirm biological distinctions use silhouette, region, density, route/front geometry,
and value contrast as well as color. Biology prose stays in focusable tooltips and the optional
specimen drawer; the board prioritizes action, iconography, and numbers.

The accepted copy review confirms the satire targets a fictional transformed-cell system rather
than patients or clinical outcomes. Its permanent guards use canonical values, reject clinical and
prognostic vocabulary from colony descriptions, and retain the fictional game illustration
boundary. Current saves accept only envelope version 2 with stateSchemaVersion 8; strict parsing
rejects incompatible shape into protected recovery. Development replay re-enters the normal parser
and reducer, comparing normalized durable state, accepted outcomes, and visible progression. It
makes no byte, pixel, or timing equivalence claim.

## Balance and continued-play evidence

The balance report uses the authoritative visible decision surface, not a parallel hidden bot API.
Its five models are greedy payback, naive cheapest, hallmark first, prestige rush, and check-in
idle. Each trace records a declared seed, action budget, elapsed schedule, curve revision, and
decision witness. The current report preserves an L4 visible route for the check-in policy and
post-ending continuation for every recorded trace. It also records unselected action kinds as
questions for the next calibration rather than silently converting them into failures.

This is evidence that the game retains different decision surfaces as it progresses; it is not a
claim that a bot defines fun or that its elapsed windows are universal pacing targets. The next
design iteration should compare a revised scenario or data curve to these witnesses in
[BALANCE.md](BALANCE.md).

## Criteria verdicts and remediation status

| Required M22 criterion                                                                                       | Verdict                             | Evidence                                                                                                                          | Remediation status                                                    |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Every release claim has a reproducible command, result, behavior summary, version context, and artifact path | PASS                                | Exact routes, tool versions, results, and paths above.                                                                            | Resolved by this record.                                              |
| Progression is demonstrated from first cell through continued post-Chicago play                              | PASS                                | Progression narrative, seven linked PNGs, contact-sheet review, and soft-ending/replay/browser evidence.                          | Resolved.                                                             |
| Five-bot calibration and decision witnesses are recorded                                                     | PASS                                | [BALANCE.md](BALANCE.md) and the 25-trace report.                                                                                 | Resolved; future tuning is normal design work.                        |
| Art, stage progression, accessibility description, reduced motion, and SVG calibration are captured          | PASS                                | Seven-frame review, 36-sample renderer report, contact review, production renderer test, and `output_visual/` reports.            | Resolved; provenance is embedded in the regenerated contact manifest. |
| Current-save parsing, protected recovery, semantic replay, and copy boundary are traceable                   | PASS                                | [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md), replay/save tests, and [copy review](active_plans/reports/copy_review.md).          | Resolved.                                                             |
| Candidate manifest leaves the real Git index unchanged                                                       | PASS                                | output_release/candidate_manifest.json and verifier result.                                                                       | Resolved.                                                             |
| Local Pages workflow matches the checked-in deployment contract                                              | PASS                                | [Workflow verifier](../devel/verify_pages_workflow.py) result.                                                                    | Resolved.                                                             |
| Independent final release audit                                                                              | PASS                                | [release_audit.md](active_plans/reports/release_audit.md) independently checks the complete local candidate and M21 prerequisite. | Resolved by the autonomous candidate-closure verdict.                 |
| Repository history, remote Pages execution, and live-site inspection                                         | NOT_APPLICABLE to candidate closure | Local build and workflow parity above establish the offline candidate boundary.                                                   | Optional post-plan distribution work.                                 |

## Known limitations and final boundary

- One repeated SVG path datum appears in intravasation captures. The review found no clipping,
  accessibility failure, or stage ambiguity; it remains a maintenance observation, not a gate.
- Static image review cannot prove live hit testing, focus movement, persistence, tooltip/drawer
  interaction, or future render behavior. The production-browser route owns those behavior claims.
- This candidate is a local pre-production working-tree candidate. It does not claim an externally
  published or live GitHub Pages site.

## Final verdict

**PASS - AUDITED LOCAL CANDIDATE.** All M22 criteria above have dated green results, and the fresh
independent [release audit](active_plans/reports/release_audit.md) has a PASS verdict. Optional
repository-history and distribution work can follow without changing this local evidence boundary.
