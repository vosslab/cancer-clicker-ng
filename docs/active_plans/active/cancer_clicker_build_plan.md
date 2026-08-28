# Cancer Clicker NG execution ledger

## Purpose and authority

This is the live execution ledger for Cancer Clicker NG. The approved requirements, architecture,
and milestone definitions live only in
[implementation_plan.md](../implementation_plan.md). This ledger records present status,
accountability, dispatch order, and evidence. It does not amend the canonical plan.

Each active lane has one accountable owner. An owner reports changed files, commands and results,
known limitations, and a proposed status. The manager accepts a milestone only after its required
independent review and validation evidence are present. Milestone labels appear here because this is
an in-flight sequencing artifact; durable source, tests, tools, and reference documentation use
domain language.

## Milestone ledger

| ID  | Status                 | Dependency and readiness     | Accountable lane                    | Delivered outcome                                                                                        | Evidence and remaining work                                                                                                                                                                                                                                   |
| --- | ---------------------- | ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Complete 2026-08-27    | Baseline contracts           | contracts/type lane                 | Typed domain contracts, shell, and five compile-only slices                                              | Accepted; durable contracts, slices, and changelog entries exist.                                                                                                                                                                                             |
| M2  | Complete 2026-08-27    | M1                           | progression-design lane             | All 14 hallmark decisions and 12 stage identities                                                        | Accepted in `docs/PROGRESSION_DESIGN.md`.                                                                                                                                                                                                                     |
| M3  | Complete 2026-08-27    | M1                           | numeric-systems lane                | Custom BigNum arithmetic and named illion formatting                                                     | Accepted; `docs/BIGNUM_OPS.md` and focused arithmetic tests remain durable proof.                                                                                                                                                                             |
| M4  | Complete 2026-08-27    | M2, M3                       | state/persistence lane              | Canonical state, event funnel, strict current-save parsing, and recovery                                 | Accepted; durable parser, reducer, fixture, and persistence evidence.                                                                                                                                                                                         |
| M5  | Complete 2026-08-27    | M4                           | offline/state lane                  | Bounded offline economy replay and documented semantics                                                  | Accepted; deterministic boundary and normalized-state evidence retained.                                                                                                                                                                                      |
| M6  | Complete 2026-08-27    | M5                           | economy/tick lane                   | Eight producers, bulk purchase, and irregular-clock integration                                          | Accepted; focused economy tests cover the player-visible purchase quantities.                                                                                                                                                                                 |
| M7  | Complete 2026-08-27    | M6                           | Solid UI source/build lane          | SolidJS controller, direct cell click, producer store, save/reload/offline loop                          | Accepted; production-shaped browser behavior and accessibility evidence recorded.                                                                                                                                                                             |
| M8  | Complete 2026-08-27    | M7                           | contract audit lane                 | Exercised contract audit and closed persistence vocabulary                                               | Accepted; see `docs/active_plans/reports/contract_freeze.md`.                                                                                                                                                                                                 |
| M9  | Complete 2026-08-27    | M8                           | stages/UI lane                      | Twelve semantic stages with observable strategy changes                                                  | Accepted; stage domain, visible panel, and browser proof retained.                                                                                                                                                                                            |
| M10 | Complete 2026-08-27    | M2, M9                       | core-hallmarks/UI lane              | Six core hallmark branches with direct decisions                                                         | Accepted; reducer, economy, offline, and production-browser evidence retained.                                                                                                                                                                                |
| M11 | Complete 2026-08-27    | M10                          | 2011-hallmarks/UI lane              | ATP conversion/allocation, immune visibility, inflammation, and mutation drafting                        | Accepted; each event has strict parsing, authoritative reducer behavior, persistence, UI, and focused semantic proof.                                                                                                                                         |
| M12 | Complete 2026-08-27    | M11, M16                     | 2022-hallmarks/SVG lane             | Plasticity, epigenetic programming, microbiome, and senescence contracts/effects                         | Accepted; four late branches contribute through typed production, risk, resource, and morphology boundaries.                                                                                                                                                  |
| M13 | Complete 2026-08-27    | M2                           | prestige-design lane                | Four reset identities and owned cross-system interactions                                                | Accepted in `docs/PRESTIGE_DESIGN.md` and `docs/SYSTEM_INTERACTIONS.md`.                                                                                                                                                                                      |
| M14 | Complete 2026-08-27    | M11, M13                     | prestige/UI lane                    | Metastasis and host-transfer state, reset policies, quotes, and confirmation UI                          | Accepted; deterministic lineage/host contracts, hostile-input handling, and browser confirmation proof remain.                                                                                                                                                |
| M15 | Complete 2026-08-28    | M12, M14                     | late-prestige/UI lane               | Culture passages, cryobank choices, renewable dissemination campaigns, and containment tradeoffs         | Accepted after independent visual review at 1280 x 800; durable culture/network modules, panels, and semantic tests remain.                                                                                                                                   |
| M16 | Complete 2026-08-27    | M1                           | morphology/SVG lane                 | Biological morphology grammar and deterministic provenance                                               | Accepted; the renderer consumes this closed visual contract.                                                                                                                                                                                                  |
| M17 | Complete 2026-08-27    | M16                          | colony-layout/SVG lane              | Data-only colony geometry and suppressed-detail layout                                                   | Accepted; finite containment, clearance, and provenance are tested.                                                                                                                                                                                           |
| M18 | Complete 2026-08-28    | M17                          | cell-rendering/SVG lane             | Accessible inline living-tumor SVG, direct division target, defs, descriptions, and stage-aware overlays | Accepted through structural tests, production browser interaction, and visual review at the 1280 x 800 target.                                                                                                                                                |
| M19 | Complete 2026-08-28    | M15, M18                     | ending/design/UI lane               | Replayable Chicago-scale soft ending with continued progression                                          | Accepted after independent visual review; p8 persistence, accessible presentation, and post-ending continuation are durable contracts.                                                                                                                        |
| M20 | Complete 2026-08-28    | M15                          | replay/state lane                   | Development semantic replay and controller accepted-event observer                                       | Accepted; replay re-enters the parser/reducer and compares normalized durable state plus visible progression. A focused outcome-tampering rejection test is queued as audit remediation.                                                                      |
| M21 | In progress 2026-08-28 | M19, M20 complete            | balance-laboratory lane             | Visible-decision-surface simulator, five versioned scenarios, and generated calibration reports          | Initial simulator and scenarios exist. Complete the canonical five-player-model semantics, aggregate all scenario results into one reviewable report, write `docs/BALANCE.md`, then obtain independent calibration review.                                    |
| M22 | In progress 2026-08-28 | M21 acceptance; M18 complete | release-evidence/documentation lane | Durable documentation refresh, current screenshots, release evidence, and Pages handoff                  | Documentation lanes are actively producing newcomer, architecture, install/usage, and release material. Final release evidence, refreshed rendered screenshots, final browser/static gates, and the human-owned ready-to-stage Pages workflow handoff remain. |

## Validation ladder

Static gates establish source hygiene; they do not establish player-visible behavior. Every owner
records the command, exit status, behavior summary, and artifact link when applicable. Permanent
regression tests, one-time calibration, and design review remain separate evidence classes.

| Gate                 | Proof                                                                             | Required use                                                                                          |
| -------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Static               | TypeScript, lint, Prettier, ASCII, Markdown links, source limits, diff check      | Every authored source or documentation change                                                         |
| Permanent regression | Deterministic offline semantic tests for stable behavior and invariants           | Domain changes with lasting player-facing or persistence behavior                                     |
| Integration/build    | `./check_codebase.sh`, production build, import boundaries                        | Milestone closure and cross-boundary repairs                                                          |
| Real-browser/UI      | Production-shaped actions, reload, console/page errors, keyboard, narrow viewport | Interactive, accessibility, and release surfaces                                                      |
| SVG/render review    | Structural checks plus rendered 1280 x 800 and compact/reduced-motion review      | Living-tumor, ending, and screenshot artifacts                                                        |
| One-time calibration | Seeded balance scenarios, visual contact sheets, bounded performance observations | Curve, art, and profile tuning; reports inform decisions rather than becoming brittle pass/fail gates |
| Final packaging      | Reproducible release artifacts, Pages workflow handoff, evidence inventory        | M22                                                                                                   |

M4 requires static, focused save/event tests, integration/build, and structural page health. M7
owns the first committed real-stack reload and recovery proof. SVG work closes only with rendered
consumer-size evidence on its actual background, not structure alone.

## Execution and handoff rules

### Owner report contract

- Work in the assigned files and preserve concurrent edits outside that ownership boundary.
- State changed files, source size where relevant, commands run, result counts, and remaining gaps
  in a report under the session evidence directory.
- Report `DONE` only when the stated deliverable and required gates pass; report
  `DONE_WITH_CONCERNS` when evidence is bounded or a known unrelated baseline issue remains.
- The manager records durable closure in tracked changelog, tests, and reference documentation;
  session reports are supplementary evidence.

### Review loop

1. An implementation owner delivers a bounded artifact and focused proof.
2. Independent reviewers accept or reject it against the canonical milestone exit criteria.
3. A rejection names the violated requirement, reproduction, owner, file group, and appropriate
   verification.
4. One repair owner fixes the coupled boundary; reviewers rereview the repaired evidence.
5. The manager closes only after required gates and rereviews accept.

### Stall and writer boundaries

- A silent or long-running lane is checked through recent messages, report or file-modification
  evidence, and task state before reassignment.
- Each coupled persistence, event, migration, or replay change has one `src/state/*` writer.
- A UI lane owns a coherent render surface and receives state-semantics changes through a handoff.
- A morphology/SVG lane owns visual grammar, layout, and shared `<defs>` boundaries; downstream
  render work consumes accepted contracts.

## Next dispatch queue

1. M21 repair owner: make the five named player models behaviorally explicit over the canonical
   visible decision surface, add a scenario-suite aggregation report, retain per-scenario CLI use,
   and write `docs/BALANCE.md`. Success: all five scenarios are represented in one generated
   report with reproducible seeds, action traces, observations, and no hidden-state reads.
2. Audit-remediation owners: add the replay outcome-tampering rejection proof; rename enduring
   source/test vocabulary away from milestone labels; split files that exceed the 999-line source
   limit; remove unused aliases; and connect the editable icon catalog to visible controls while
   retaining text labels and accessible names.
3. M22 evidence owner: consolidate the documentation set, current 1280 x 800 screenshots, final
   static/build/browser evidence, release-evidence inventory, and a human-owned ready-to-stage
   workflow manifest. Success: a reviewer can reproduce the release candidate without relying on
   an ephemeral session report.

## Accepted evidence ledger

Session evidence may live under `/private/tmp/cancer-clicker-ng.pTNth9` and can disappear between
sessions. Durable closure remains the tracked tests, documentation, source, and changelog entries
they support.

| Milestone | Durable evidence                                                                                                                                     |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1-M10    | Contracts, domain modules, focused tests, design documents, and dated changelog entries summarized above.                                            |
| M11       | 2011-hallmark catalog/handlers, strict event parsing/reduction, persistence relations, Solid controls, and focused semantic/browser tests.           |
| M12       | Late-hallmark catalog/effects/tick, current-save parsing, visible panels, and semantic tests.                                                        |
| M14       | Prestige state, catalogs, reset/effects/transit modules, persistence, UI confirmation, and deterministic tests.                                      |
| M15       | Culture/network contracts, effects, panels, tests, and independent 1280 x 800 visual acceptance.                                                     |
| M18       | Cell/colony SVG modules, visual-state mapping, direct-click browser tests, structural tests, and rendered review.                                    |
| M19       | Ending trigger/sequence/copy/overlay, p8 parsing, UI/browser tests, and independent visual acceptance.                                               |
| M20       | Replay types/parser/reducer/controller observer, hostile-log tests, and visible-progression equivalence tests.                                       |
| M21       | `tools/balance_sim.mjs`, five versioned scenario inputs, decision surface, and ignored generated reports; aggregate calibration review remains open. |

## Current scope and release boundary

The canonical plan remains the scope authority. The active work now concentrates on durable audit
repairs, the balance calibration package, polished icon-led visual affordances, documentation,
screenshots, and release evidence. The repository is pre-production, so active repair owners may
strengthen schemas and ownership boundaries when that produces the clearer long-term contract.

Git staging, commits, pushes, and workflow installation are human-owned external handoff steps.
M22 will provide a precise ready-to-stage manifest, validated commands, and artifact inventory for
that handoff; it will not represent those actions as complete before a human performs them.
