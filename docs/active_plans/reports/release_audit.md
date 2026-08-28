# M22 independent release audit

**Status:** PASS - the complete local pre-production candidate satisfies every required M22
criterion and its M21 prerequisite. This is an autonomous candidate-closure verdict, not a
repository-history or publication claim.

## Scope and pre-report candidate identity

This independent audit checks the complete nonignored working tree against the approved
[implementation plan](../implementation_plan.md), its manager-complete checklist, the active
[milestone ledger](../active/cancer_clicker_build_plan.md), and the repository rules. It also
checks the user direction that the tumor is the visual game board, text stays subordinate,
closure works without a human gate, and observations remain grounded rather than becoming
fragile pixel or timing requirements.

The review input is the pre-report candidate projection at
`output_release/candidate_manifest.json`:

| Identity field                   | Observed value                                                     |
| -------------------------------- | ------------------------------------------------------------------ |
| Source HEAD                      | `127aac26bc8b9ac388afb31940b7d43db649245e`                         |
| Manifest digest                  | `1a1e0df09a0544a2693ffde33c4a523e8a10e89616fdbf1db6ed4f902968bc76` |
| Projected paths                  | 396                                                                |
| Release-audit path in projection | Absent by design                                                   |

The candidate verifier ran before this report was written, used a disposable Git index and
object store, and reported that real-index bytes were preserved. This report therefore
intentionally falls outside its own pre-report review input; the manager's post-audit disposable
projection includes this final artifact.

After writing this report, I ran that post-audit projection as the candidate-aware tracked-link
lane: it exited 0 with 1,520 tests, included both this report and
`contact_sheet_review.md`, and again reported real-index preservation. That later run validates
the new tracked documentation graph without replacing the pre-report identity above.

## Exact inputs

All observations below were rerun locally on 2026-08-28 with Node `v26.7.0`, npm `11.19.0`, and
Python `3.12.14`. The checked-in toolchain declares Playwright `>=1.62.1`, tsx `>=4.23.12`, and
TypeScript `>=6.0.2 <7`.

| Input                            | Independent observed result                                                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source hygiene and Node behavior | `./check_codebase.sh` - Exit 0; 5/5 canonical checks and 372/372 Node tests passed.                                                                                                                 |
| Pages-shaped build               | `./build_github_pages.sh` - Exit 0; rebuilt `dist/index.html`, `dist/main.js`, and `.nojekyll`.                                                                                                     |
| Production browser behavior      | `./run_playwright_tests.sh --build --workers=1` - Exit 0; 48/48 passed in 20.8 seconds.                                                                                                             |
| Candidate projection             | `source source_me.sh && python3 devel/verify_candidate.py` - Exit 0; 1,515 tests passed and real-index preservation was reported.                                                                   |
| Pages workflow contract          | `source source_me.sh && python3 devel/verify_pages_workflow.py` - Exit 0; semantic parity, triggers, permissions, build, upload, and deploy contract passed.                                        |
| Balance selection                | `node --import tsx tools/balance_sim.mjs --suite --output output_balance/balance_report.json` - Exit 0; format 3 report SHA-256 `a8fa966d8651a0a3f928b1c0dc2b23f5d90560586c1bbcd04a0880aeab98355d`. |
| Current visual corpus            | `node --import tsx tools/colony_contact_sheet.mjs --verify-existing` - Exit 0; 216 current frames and served-asset identity verified read-only.                                                     |

Counts, hashes, and the elapsed time identify this dated candidate. They are not future
release thresholds.

## Required criteria

| Required criterion                                                                                         | Verdict        | Evidence and independent judgment                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M22 evidence record is complete and auditable.                                                             | PASS           | [RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md) records reproducible commands, Exit 0 results, versions, concise behavior summaries, artifacts, a progression narrative, and limitations. Its final-audit boundary remains accurate until this report.                                                                                                                                                                                                                                         |
| Source quality, build, and user-visible behavior are green.                                                | PASS           | The canonical source gate, build, and 48-test production browser suite above all passed against the current required light-theme asset as well as the game bundle.                                                                                                                                                                                                                                                                                                                              |
| The full candidate is tested without changing the real Git index.                                          | PASS           | [verify_candidate.py](../../../devel/verify_candidate.py) passed 1,515 tests from the disposable projection and reported index preservation. The pre-report manifest has the identity recorded above.                                                                                                                                                                                                                                                                                           |
| Checked-in Pages deployment has autonomous local validation.                                               | PASS           | [verify_pages_workflow.py](../../../devel/verify_pages_workflow.py) passed for the canonical root workflow and its maintained semantic-parity copy.                                                                                                                                                                                                                                                                                                                                             |
| M21 supplies a grounded completed selection prerequisite.                                                  | PASS           | The format-3 balance report selects `shipped:catalog-2026-08-28`, has zero demonstrated blocking findings, and records completed remediation. Five parser-valid, durable scenario surfaces expose their declared L1, L2, L3, L4, and post-ending event/tag witnesses across 25 completions. Bounded nonselection remains a scoped observation, consistent with [BALANCE.md](../../BALANCE.md) and the plan.                                                                                     |
| The visual-first 1280 x 800 shell is independently accepted.                                               | PASS           | [visual_first_screenshot_review.md](visual_first_screenshot_review.md) directly reviews seven current original-resolution frames. It finds a dominant clickable tumor, a shallow scoreboard, icon-led controls, subordinate prose, and distinct hypoxic, perfused, invasive, culture, network, and Chicago compositions.                                                                                                                                                                        |
| The broad morphology and accessibility corpus is independently accepted.                                   | PASS           | [contact_sheet_review.md](contact_sheet_review.md) directly reviews 24 paired original PNGs across all 12 stages and the declared seed/viewport families. It accepts dark and neutral-light treatments, morphology, fit, 216 reduced-motion records, zero recorded horizontal overflows, and 12 stage descriptions.                                                                                                                                                                             |
| Current visual evidence is attributable to the served production inputs.                                   | PASS           | The contact manifest v2 is SHA-256 `50958c9678adbb704e0e9a74745ace89df8c76e10c310307959ea1d362474696`; its index is `3989e3065f3eb1a76edeef9d33ea96446473e8147e3c8917a5adc5e33202f54e`; `dist/main.js` is `a28d63f981f836e20171a9ba95cf350199b569f9979ba3900ccf447d2ffb2ecb`; and its 12-asset aggregate is `7735f1f1c9f8c01c3fdb826e61ad7d73641253493842309b8aa4c588f341e3de`. The current structural renderer report covers 12 stages x 3 seeds, 36 samples, and 1,142 representative hashes. |
| Save/recovery, semantic replay, and fictional-system copy have durable ownership.                          | PASS           | [STATE_PERSISTENCE.md](../../STATE_PERSISTENCE.md), the green semantic suites, and [copy_review.md](copy_review.md) cover parser-owned recovery, normalized replay outcomes and visible progression, and the fictional non-clinical copy boundary.                                                                                                                                                                                                                                              |
| Documentation provenance, architecture/file map, README, version normalization, and changelog are current. | PASS           | [RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md) records the `arch-docs` and `readme-docs` routes plus candidate-aware Markdown validation. [CODE_ARCHITECTURE.md](../../CODE_ARCHITECTURE.md), [FILE_STRUCTURE.md](../../FILE_STRUCTURE.md), [README.md](../../../README.md), [VERSION](../../../VERSION), and [CHANGELOG.md](../../CHANGELOG.md) agree with the candidate.                                                                                                                    |
| Human interaction, history publication, remote workflow, and live-site inspection are required for M22.    | NOT_APPLICABLE | The approved plan expressly keeps those distribution activities outside autonomous candidate closure; all M22 gates above have local manager/subagent execution paths.                                                                                                                                                                                                                                                                                                                          |

## Findings and remediation status

| Finding                                                                                                                           | Remediation owner and current evidence                                                                                                                                                                                                                        | Status    |
| --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| M22 was claimed complete before independent audit input existed.                                                                  | Evidence/ledger owner retained M22 as in progress and marked [RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md) ready for an independent audit.                                                                                                                 | Resolved. |
| The contact route had a variable synthetic clock, a noncanonical invocation, and nonportable outputs.                             | Visual-tool owner uses `node --import tsx`, fixes the save clock at `2030-01-01T00:00:00.000Z`, and writes only the ignored root `output_visual/colony-contact-sheet/` artifact.                                                                              | Resolved. |
| A missing neutral-light CSS treatment meant its capture label lacked semantic visual evidence.                                    | Visual owner added a built, required neutral-light treatment; fresh review found a coherent ivory/plum/rose board and all 108 matched dark/light pairs differ. The byte result corroborates review; it is not a permanent image gate.                         | Resolved. |
| An unsupported contact-tool argument could enter capture cleanup.                                                                 | Visual-tool owner added fail-fast argument handling before build or output mutation and a read-only `--verify-existing` route. Independent audit confirmed an unsupported argument exited nonzero while manifest and index SHA-256 values remained unchanged. | Resolved. |
| Build entry ownership and static-asset provenance were ambiguous.                                                                 | Build owner requires the single `src/main.tsx` entry and the neutral-light static asset; contact manifest v2 records all served visual assets.                                                                                                                | Resolved. |
| Candidate manifests could survive a failed projected test run.                                                                    | Candidate-verifier owner now removes a prior record, tests first, atomically publishes on success, and checks the real index; failure/atomicity proof and current success are recorded.                                                                       | Resolved. |
| Pages workflow, PyYAML, documentation route, style, and artifact-ownership boundaries were underspecified.                        | Documentation/tool owners defined root workflow ownership and semantic-parity copy, scoped PyYAML to offline local workflow parsing, refreshed architecture/file mapping, and recorded `arch-docs`/`readme-docs` provenance.                                  | Resolved. |
| M21 named surfaces were previously represented by duplicate early-game inputs and selection had no executable remediation record. | Balance/state owners produced distinct canonical durable L1-L3 scenarios, reducer-valid decision surfaces, format-3 witness matching, and a selected shipped candidate with completed remediation.                                                            | Resolved. |

## Known limitations

- Static image evidence establishes hierarchy, topology, and declared reduced-motion composition.
  The production browser suite owns pointer, keyboard, focus, persistence, normal-motion, and
  responsive interaction behavior.
- The contact review notes one repeated intravasation path datum as renderer-maintenance
  information. It is neither a clipping nor a stage-identity failure.
- The candidate is local and pre-production. Repository-history transfer, remote Pages execution,
  and live-site inspection are optional distribution evidence, not release blockers.

## Final verdict

**PASS.** Every M22 criterion and the M21 prerequisite is independently green for the dated
pre-report candidate. The result is grounded in executable local gates and original-resolution
visual review, with durable tests reserved for stable behavior and one-time calibration retained
as evidence rather than brittle future thresholds.
