# Cancer Clicker NG execution ledger

## Purpose and authority

This is the live execution ledger for Cancer Clicker NG. The approved requirements, architecture,
and milestone definitions live only in
[implementation_plan.md](../implementation_plan.md). This ledger records current status,
accountability, dispatch order, and evidence. Do not copy or amend the canonical plan here.

Each lane has one accountable owner at a time. An owner reports the changed files, commands and
results, known limitations, and a proposed status. The manager accepts a milestone only after its
required independent review and validation evidence are present. Future named agents are
`unassigned` until dispatched; the listed role is still accountable for the outcome.

## Milestone ledger

| ID  | Status              | Dependency and readiness           | Accountable lane             | Dispatchable deliverable                                     | Measurable success criterion                                                     | Evidence status               |
| --- | ------------------- | ---------------------------------- | ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------- |
| M1  | Complete 2026-08-27 | None; baseline contracts available | contracts/type lane          | `src/types/*`, shell, slices                                 | Five typed slices, build, and error-free page                                    | Accepted; session reports     |
| M2  | Complete 2026-08-27 | M1 complete                        | progression-design lane      | `docs/PROGRESSION_DESIGN.md`                                 | 14 distinct decisions, 12 gameplay identities                                    | Accepted; session reports     |
| M3  | Complete 2026-08-27 | M1 complete                        | numeric-systems lane         | `src/bignum/*`, tests, `docs/BIGNUM_OPS.md`                  | Game invariants and named illion checkpoints pass                                | Accepted; session reports     |
| M4  | In progress         | M2 and M3 complete                 | state/persistence lane       | `src/state/*`, save fixtures, migration tests                | Exact save round-trip, migration, visible safe recovery, exhaustive event funnel | Repairs and rereviews pending |
| M5  | Not started         | M4 accepted                        | offline/state lane           | `docs/GAME_DESIGN.md`, `src/state/offline.ts`, report, tests | Offline and live simulation agree within 2 percent                               | Unassigned                    |
| M6  | Not started         | M5 accepted                        | economy lane                 | `src/economy/*`, `tests/test_costs.mjs`                      | Eight producers; 1/10/100/max and irregular-clock tests pass                     | Unassigned                    |
| M7  | Not started         | M6 accepted                        | playable UI and browser lane | `src/render/*`, Playwright spec, screenshot                  | Click, buy, idle, reload, and offline grant proven in real browser               | Unassigned                    |
| M8  | Not started         | M7 accepted                        | contract audit lane          | `docs/active_plans/reports/contract_freeze.md`               | Every real contract use audited; fixes or accepted reasons recorded              | Unassigned                    |
| M9  | Not started         | M8 accepted                        | stages/UI lane               | `src/stages/*`, `src/render/stage_panel.ts`                  | 12 reachable stages with distinct strategy changes                               | Unassigned                    |
| M10 | Not started         | M2 and M9 accepted                 | core-hallmarks/UI lane       | Six core hallmarks and `hallmark_tree.ts`                    | Each branch measurably changes purchase ordering                                 | Unassigned                    |
| M11 | Not started         | M10 accepted                       | 2011-hallmarks/UI lane       | Four 2011 hallmarks                                          | ATP has a sink; all four change purchase ordering                                | Unassigned                    |
| M12 | Not started         | M11 and M16 accepted               | 2022-hallmarks/SVG lane      | Four late hallmarks and morphology writes                    | 14 branches complete; late branches visibly affect colony                        | Unassigned                    |
| M13 | Not started         | M2 accepted                        | prestige-design lane         | `docs/PRESTIGE_DESIGN.md`, `docs/SYSTEM_INTERACTIONS.md`     | Four reset identities and 10-20 interactions specified                           | Unassigned                    |
| M14 | Not started         | M11 and M13 accepted               | prestige/UI lane             | `src/prestige/*`, panel, reset tests                         | Three L1 and one L2 cycle; exact reset behavior tested                           | Unassigned                    |
| M15 | Not started         | M12 and M14 accepted               | late-prestige/UI lane        | L3/L4 modules, panels, simulation tests                      | L4 reached and post-L4 progression accelerates                                   | Unassigned                    |
| M16 | Not started         | M1 complete; may start from M9     | morphology/SVG lane          | references, `src/svg/noise.ts`, `morphology.ts`, tests       | Traceable visual grammar and composition semantics pass review                   | Unassigned                    |
| M17 | Not started         | M16 accepted                       | colony-layout/SVG lane       | `src/svg/colony_layout.ts`, layout metrics                   | Detail-suppressed contact sheets distinguish stages                              | Unassigned                    |
| M18 | Not started         | M17 accepted                       | cell-rendering/SVG lane      | SVG cells, defs, descriptions, icons, visual tests           | Volume, uniqueness, family separation, and node budget proven                    | Unassigned                    |
| M19 | Not started         | M15 and M18 accepted               | ending/design/UI lane        | ending design, state, render, copy                           | Ending changes presentation without creating an economic wall                    | Unassigned                    |
| M20 | Not started         | M15 accepted                       | replay/state lane            | replay types/state, fixture logs, tests                      | Recorded replay serializes to byte-identical final state                         | Unassigned                    |
| M21 | Not started         | M19 and M20 accepted               | balance-laboratory lane      | simulator, JSON report, `docs/BALANCE.md`                    | Five bots meet pacing and prestige-distinctness criteria                         | Unassigned                    |
| M22 | Not started         | M21 and M18 accepted               | release-evidence lane        | release evidence, Pages workflow, artifacts                  | Every required gate and human artifact is assembled                              | Unassigned                    |

## Validation ladder

Static gates establish source hygiene; they do not establish player-visible behavior. Every owner
selects the gates below required by the milestone and records command output in the report.

| Gate                  | Proof                                                                            | Required milestones                  |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| Static                | TypeScript, lint, Prettier, ASCII, Markdown links, source limits, diff check     | Every source or documentation change |
| Focused unit/property | Deterministic edge cases, invariants, migration corpus, seeded properties        | M3-M6, M8-M15, M20-M21               |
| Integration/build     | `./check_codebase.sh`, production build, import boundaries                       | M1, M3-M15, M20-M22                  |
| Real-browser/UI       | Production-shaped browser actions, reload, console/page errors, screenshots      | M1, M7-M15, M19, M22                 |
| SVG/render/human      | Structural tests, rendered contact sheets at consumer sizes, human visual review | M16-M19 and M22                      |
| Accessibility         | Keyboard, semantic labels, contrast, reduced motion, narrow viewport             | M1, M7-M19 and M22                   |
| Final packaging       | Reproducible release artifacts, Pages workflow, evidence inventory               | M22                                  |

M4 requires static, focused save/event tests, integration/build, and a structural page-health
smoke only. It does not yet own a storage-consuming UI. M7 owns the first committed real-stack
reload and recovery proof. M16-M18 do not close from SVG structure alone: they require render and
human evidence at the actual consumer size and background.

## Execution and handoff rules

### Owner report contract

- Work only in the assigned files and respect concurrent edits outside that ownership boundary.
- State the exact files changed, source size where relevant, commands run, result counts, and
  remaining gaps in a report under the session evidence directory.
- Report `DONE` only when the stated deliverable and its required gates pass; report
  `DONE_WITH_CONCERNS` when evidence is bounded or a known unrelated baseline failure remains.
- The manager records durable closure in tracked changelog, tests, and reference documents;
  session reports are supplementary evidence.

### Review loop

1. An implementation owner delivers the bounded artifact and focused proof.
2. Independent reviewers accept or reject against the canonical milestone exit criteria.
3. A rejection names the violated requirement, reproduction, owner, file group, and test needed.
4. One repair owner fixes the coupled boundary; reviewers rereview the repaired evidence.
5. The manager closes only after required gates and rereviews accept.

### Stall and writer boundaries

- A silent or long-running lane is not stalled by time alone. Check recent messages, report or
  file modification evidence, and task state before intervening. A documented absence of progress
  plus an unresolved blocker is the threshold for reassignment.
- `src/state/*` has one writer for each coupled persistence, event, migration, or replay change.
- A UI lane owns a coherent render surface and does not edit state semantics without a handoff.
- A morphology/SVG lane owns the upstream grammar, layout, and shared `<defs>` boundaries; later
  render contributors consume accepted contracts rather than changing them opportunistically.

## Next dispatch queue

1. M4 state/persistence repair owner: finish the bounded schema, event, and parser repair in
   `src/state/game_state.ts`, `src/state/events.ts`, `src/state/save_load.ts`, and catalog support.
   Success: exact fields and relationships survive a V2 round-trip; invalid input fails closed
   with typed visible recovery; safe bounds and canonical identities are enforced.
2. M4 oracle/fixture owner: strengthen `tests/test_save_migration.mjs` and
   `tests/fixtures/m4_legacy_v1.json`; add a fully populated V2 fixture if absent. Success: exact
   state equality, V1 migration, hostile nested payloads, duplicate/dangling IDs, unsafe numbers,
   and action-distinguishing events each have a failing-before/passing-after oracle.
3. M4 independent rereview lanes: schema/event, persistence/security, and test-quality reviewers
   evaluate the repaired files against M4 and report an explicit accept/reject verdict. Success:
   every earlier rejection is directly tested or disproven with evidence.
4. M4 persistence-contract documentation owner after acceptance: add the durable contract in the
   appropriate tracked documentation and changelog entry. Success: version support, trust
   boundary, recovery and retention policy, drift guards, ownership, and deferred UI proof are
   discoverable without session reports.
5. M5 single state owner after M4 closure: first write the offline section in
   `docs/GAME_DESIGN.md`, then implement `src/state/offline.ts`,
   `src/render/offline_report.ts`, and `tests/test_offline_equivalence.mjs`. Success: the selected
   model is explicit and N-hour offline/live results agree within 2 percent for every resource.

## Accepted evidence ledger

The following reports are session-local evidence in `/private/tmp/cancer-clicker-ng.pTNth9`.
They can disappear between sessions. Durable closure remains the tracked tests, documentation,
and `docs/CHANGELOG.md` entries they support.

| Milestone | Accepted session evidence                                                                                             | Durable evidence                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| M1        | `m1_final_contract_review.13df.report.md`; `m1_terminal_browser.72ea.report.md`                                       | Type contracts, slices, shell, changelog              |
| M2        | `m2_final_systems_acceptance.b905.report.md`; `m2_balance_reaudit.a6b4.report.md`                                     | `docs/PROGRESSION_DESIGN.md`, changelog               |
| M3        | `m3_final_acceptance.edd2.report.md`; `m3_test_quality_rereview.a91e.report.md`; `m3_terminal_browser.611b.report.md` | BigNum modules/tests, `docs/BIGNUM_OPS.md`, changelog |

## Baseline gaps and ambition backlog

Known baseline gaps remain outside this tracker repair: the README first-paragraph plain-prose
failure and the two 1,133-line canonical plan copies. This file was the duplicate tracker
violation; its replacement removes that separate violation without changing either canonical
plan. Dependency-manifest drift remains separately observed and is not changed autonomously.

The following work is intentionally assigned to future milestones rather than added as parallel
scope now.

- M7 adds committed real-stack Playwright reload and recovery proof after UI storage consumption
  exists; a mock does not demonstrate reload behavior.
- M8 adds corrupt-save overwrite protection to the contract-freeze audit, including proof that a
  rejected raw payload cannot silently replace recoverable data.
- M4 and later state work preserve parser headroom by splitting `src/state/save_load.ts` before
  adding new durable fields if its size or coupling threatens the source limit.
- M16-M18 require SVG structure, rendered contact sheets, and human review at relevant consumer
  sizes and backgrounds, with durable captured evidence in M22.
