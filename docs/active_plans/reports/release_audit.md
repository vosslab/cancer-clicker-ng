# M22 independent release audit

**Status:** PASS - the local working-tree candidate meets the approved M22 closure criteria and
the accepted M21 prerequisite. This is a candidate-closure verdict only; it does not claim a
commit, remote workflow run, GitHub Pages publication, or live-site inspection.

## Scope and candidate identity

This independent review uses the approved [implementation plan](../implementation_plan.md), the
active [milestone ledger](../active/cancer_clicker_build_plan.md),
[RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md), and the repository rules. It separately verifies
current source, generated artifacts, and executable gates rather than accepting earlier report
claims.

The pre-report candidate is the successfully projected nonignored tree recorded before this report
was replaced. The verifier used a disposable Git index and object store, then compared the
projected path, mode, and blob entries before publishing its ignored manifest.

| Pre-report identity         | Observed value                                                     |
| --------------------------- | ------------------------------------------------------------------ |
| Base `HEAD`                 | `28591cc98ec5e2bb9cd2acc4678468b99c4092b9`                         |
| Manifest path               | `output_release/candidate_manifest.json`                           |
| Pre-report manifest SHA-256 | `79b5e15aabd1ef9e5b0b514651f173c382c2c5fe35d12787600e2340ca5c815a` |
| Pre-report manifest digest  | `cd1243f28178775400bcea9f63e5018d2d2a4d420f95e45f7a31f8fe4cc1e088` |
| Projected paths             | 398                                                                |

These two manifest hashes intentionally identify the exact input reviewed before this report
entered the tracked candidate. They are not claims about the post-report manifest. Re-running the
verifier after documentation changes produces a different digest by design; the generated manifest
is the sole authority for that final self-inclusive identity.

The prior report's `127aac...` identity, 396 paths, 372 Node tests, 1,515 Python tests, and older
visual hashes are historical context only. They are not evidence for this candidate. The
post-report verifier reruns the candidate-aware documentation lane so this report is itself in the
final projected tree.

## Independent execution

All commands below were run on 2026-08-28 using Node `v26.7.0`, npm `11.19.0`, and Python
`3.12.14` through `source source_me.sh && python3` where required.

| Required route                                                       | Result | Current evidence                                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./check_codebase.sh`                                                | PASS   | Exit 0; typecheck, lint typecheck, ESLint, Prettier, and 368/368 Node tests passed. This includes the sparse-lesion direct-division regression.                                                                      |
| `./build_github_pages.sh`                                            | PASS   | Exit 0; rebuilt the Pages-shaped `dist/` artifact.                                                                                                                                                                   |
| `./run_playwright_tests.sh --build --workers=1`                      | PASS   | Exit 0; 48/48 production-browser tests passed. The first sandboxed attempt could not launch Chromium because of managed macOS Mach-port permissions; the unchanged permitted rerun executed assertions successfully. |
| `source source_me.sh && python3 devel/verify_pages_workflow.py`      | PASS   | Exit 0; root template and published workflow match triggers, least permissions, build, upload, and deploy semantics.                                                                                                 |
| `source source_me.sh && python3 devel/verify_candidate.py`           | PASS   | Exit 0; 1,533 Python tests passed through the disposable projection, with real-index preservation reported.                                                                                                          |
| `node --import tsx tools/colony_contact_sheet.mjs --verify-existing` | PASS   | Exit 0; verified the existing current corpus against the served bundle and visual aggregate without mutating the contact artifact.                                                                                   |

The plan's validation ladder is followed: stable behavioral contracts have permanent Node,
Playwright, or pytest coverage; balance and rendered-image measurements remain dated one-time
calibration evidence rather than brittle pixel, count, rank, or timing regression requirements.

## Plan and architecture conformance

| Plan criterion                          | Verdict | Current verification                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M21 selection prerequisite              | PASS    | `output_balance/balance_report.json` is format 3 with five scenarios, five policies, and 25 completions. Its generated `candidateSelection` selects `shipped:catalog-2026-08-28`, records no demonstrated blocking findings, and marks bounded witness remediation `completed`.                       |
| M22 release evidence and local workflow | PASS    | The plan's required source, build, browser, candidate, workflow, balance, visual, replay, copy, and documentation routes are represented in [RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md) and corroborated by the executable results above.                                                        |
| Domain ownership and durable names      | PASS    | The active ledger retains milestone IDs only as planning evidence. Current durable code, tests, and tools use domain names; the plan's durable-naming migration criterion is satisfied without a milestone-numbered production path.                                                                  |
| Current-schema boundary                 | PASS    | The current documentation and parser boundary is exactly save `version: 2` and `stateSchemaVersion: 8`. Incompatible data is rejected into protected recovery; no legacy migration claim remains as a current behavior.                                                                               |
| Permanent-test policy                   | PASS    | The candidate adds a behavioral verifier test and retains stable semantic/browser tests. The visual, balance, manifest, and screenshot hashes are provenance for this audit, not newly encoded brittle pytest requirements.                                                                           |
| Candidate byte integrity                | PASS    | `verify_candidate.py` removes a prior manifest, projects the nonignored tree, runs tests, reprojections for identical path/mode/blob entries, atomically publishes only on success, and checks the real index in `finally`. Its dedicated verifier test is present and passed in the 1,533-test lane. |
| Sparse lesion clickability              | PASS    | `tests/test_colony_layout.mjs` exercises avascular and hypoxic sparse layouts across declared seeds and canonical game scenes, requiring accepted visible cell slots for direct division. Browser tests separately verify membrane/nucleus hit behavior and inert tissue.                             |
| Clean-command boundary                  | PASS    | `devel/clean_build.sh` is the documented everyday cleaner and preserves dependency installs; `devel/dist_clean.sh` is explicitly the distribution-clean reset. The commands' scopes are documented instead of being conflated with release validation.                                                |

These checks show no architectural drift from the approved data-driven state, renderer, visible
decision-surface, save/replay, and local-candidate boundaries. No freestyle implementation is
needed or authorized by this audit.

## Current visual and balance attribution

| Evidence                   | Current value                                                                              | Judgment                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contact manifest           | SHA-256 `7788e971d8caf90fa4f9035708efdc8dfd7eb173f3b534c741ce150b7466f3fe`                 | Matches the current v2 provenance record.                                                                                                               |
| Served bundle              | `dist/main.js`, SHA-256 `2e3671f6824bdb6152dd36409d1183c70c3cb8593262179c7c0d73073dd89610` | Matches the verified contact artifact.                                                                                                                  |
| Visual-asset aggregate     | `5b2492f97c893b24550557fae4d9466ff674c990ffbdf41926247a14c9f3d155`                         | Matches the contact manifest's 12 served assets.                                                                                                        |
| Renderer report            | SHA-256 `638610d38525ce6fb422d6bd61ae54ad9decea8f4e3e9309e0782d8ea87af304`                 | Records 36 samples and 1,257 unique hashes.                                                                                                             |
| Original-resolution review | [contact_sheet_review.md](contact_sheet_review.md) PASS                                    | Independently accepts 44 originals: all 36 repaired-lesion combinations plus eight progression samples. The current corpus contains 216 frames.         |
| Seven screenshot captures  | [visual_first_screenshot_review.md](visual_first_screenshot_review.md) PASS                | All seven 1280 x 800 PNGs are byte-identical to their prior approved copies after fresh runtime assertions; this is provenance, not a future byte gate. |
| Balance report             | SHA-256 `a16dde1fb5e20b6661094ddb396b6eefa718258199d710545351d9e202eb1b66`                 | The current artifact supports the selected candidate and scoped, non-blocking observations.                                                             |

The visual reviews establish original-resolution composition, biology-driven progression, and
attribution to production inputs. The 48-test browser lane owns live hit testing, keyboard,
focus, persistence, normal motion, and responsive behavior; static imagery is not used to infer
those properties.

## Original audit findings

| Original six-pass finding                                                        | Current remediation check                                                                                                                                                                 | Verdict  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Test policy risked encoding calibration artifacts as permanent tests.            | The active validation ladder separates durable behavior from one-time visual and balance calibration; current artifacts are reported as dated evidence.                                   | Resolved |
| Clean behavior lacked a clear everyday versus distribution boundary.             | `clean_build.sh` and `dist_clean.sh` now document their distinct dependency-preserving and deep-reset scopes.                                                                             | Resolved |
| Legacy schema language obscured the pre-production current-schema-only contract. | Current source/docs name only schema 2/8 acceptance with strict protected recovery; retired migration language is historical only.                                                        | Resolved |
| Durable paths could inherit milestone labels rather than responsibility names.   | The plan records the domain-named durable-path rule, and current implementation, test, and tool paths follow it.                                                                          | Resolved |
| Candidate manifests could be stale or fail to establish byte integrity.          | The verifier tests first, reprojections exact entries, atomically publishes on success, and proves real-index preservation; the current manifest identity above resulted from that route. | Resolved |
| Sparse lesion geometry could leave no visible direct-division target.            | Current layout tests require accepted sparse slots, and production-browser tests exercise pointer/keyboard division while tissue remains inert.                                           | Resolved |

## Boundary and final verdict

- The candidate is a local pre-production working tree. Repository history, remote Pages execution,
  and live-site inspection are optional publication evidence, not M22 blockers.
- The contact review retains one repeated intravasation path datum as a renderer-maintenance note;
  it is not clipping, accessibility, stage-identity, or release failure.
- The managed sandbox cannot launch macOS Chromium, but the unchanged permitted browser rerun passed
  all 48 tests. That infrastructure condition does not weaken the executed production-browser result.

**PASS - AUDITED LOCAL CANDIDATE.** All M22 criteria and the M21 prerequisite are green for the
identified pre-report candidate, with current source/artifact attribution and test-policy boundaries
verified. Publication remains a separate, optional maintainer workflow.
