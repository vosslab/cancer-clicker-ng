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

| ID  | Status                 | Dependency and readiness            | Accountable lane           | Dispatchable deliverable                                               | Measurable success criterion                                                                            | Evidence status                                                                                                                          |
| --- | ---------------------- | ----------------------------------- | -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Complete 2026-08-27    | None; baseline contracts available  | contracts/type lane        | `src/types/*`, shell, slices                                           | Five typed slices, build, and error-free page                                                           | Accepted; session reports                                                                                                                |
| M2  | Complete 2026-08-27    | M1 complete                         | progression-design lane    | `docs/PROGRESSION_DESIGN.md`                                           | 14 distinct decisions, 12 gameplay identities                                                           | Accepted; session reports                                                                                                                |
| M3  | Complete 2026-08-27    | M1 complete                         | numeric-systems lane       | `src/bignum/*`, tests, `docs/BIGNUM_OPS.md`                            | Game invariants and named illion checkpoints pass                                                       | Accepted; session reports                                                                                                                |
| M4  | Complete 2026-08-27    | M2 and M3 complete                  | state/persistence lane     | `src/state/*`, inline migration records and tests                      | Normalized save round-trip, migration, visible recovery, registered-event coverage                      | Accepted; final terminal reports                                                                                                         |
| M5  | Complete 2026-08-27    | M4 accepted                         | offline/state lane         | `docs/GAME_DESIGN.md`, `src/state/offline.ts`, report, tests           | Equal scheduled boundaries preserve normalized durable outcomes; calibrated display envelope documented | Accepted: systems `2f8a`, boundary `f4a1`, oracle `20260827`; 32 focused, 52 Node                                                        |
| M6  | Complete 2026-08-27    | M5 accepted                         | economy/tick lane          | `src/economy/*`, `tests/test_costs.mjs`, M5 adapter integration        | Eight producers; 1/10/100/max and irregular-clock tests pass                                            | Accepted: economy, p4 boundary, oracle/integration, types; 68/68 Node/tsx                                                                |
| M7  | Complete 2026-08-27    | M6 accepted                         | Solid UI source/build lane | F: no-JSX controller/render/toolchain; I: Node + production Playwright | Clone -> event -> notice-aware persist -> reconcile; real browser click, buy, idle, reload, offline     | Accepted: types `a84e`, boundary `20260827`, browser `20260827`, visual `rereview_20260827`; 75 Node/tsx, 6/6 production-dist Playwright |
| M8  | Complete 2026-08-27    | M7 accepted                         | contract audit lane        | `docs/active_plans/reports/contract_freeze.md`                         | Every real contract use audited; fixes or accepted reasons recorded                                     | Accepted: implementation, types, boundary/security, oracle; 78 Node/tsx, 8/8 production-dist Playwright                                  |
| M9  | Complete 2026-08-27    | M8 accepted                         | stages/UI lane             | `src/stages/*`, `src/render/stage_panel.tsx`                           | 12 reachable stages with distinct strategy changes                                                      | Accepted: domain, UI, architecture, balance, boundary/security, and terminal browser; 98 Node/tsx, 11/11 production-dist Playwright      |
| M10 | Complete 2026-08-27    | M2 and M9 accepted                  | core-hallmarks/UI lane     | Six core hallmarks and `hallmark_tree.ts`                              | Each branch has a reachable direct decision witness                                                     | Accepted: semantic, boundary/security, offline; `check_codebase` 5/5, 164 Node/tsx, Pages build, 15/15 browser, diff                     |
| M11 | In progress 2026-08-27 | M10 accepted; event contract active | 2011-hallmarks/UI lane     | Four 2011 hallmarks and closed event contract                          | ATP is a real resource; each event path changes its named authoritative outcome                         | Semantic amendment recorded; direct domain outcomes, atomicity, and production-page proof are the closeout evidence                      |
| M12 | Not started            | M11 and M16 accepted                | 2022-hallmarks/SVG lane    | Four late hallmarks and morphology writes                              | 14 branches complete; late branches visibly affect colony                                               | Unassigned                                                                                                                               |
| M13 | Complete 2026-08-27    | M2 accepted                         | prestige-design lane       | `docs/PRESTIGE_DESIGN.md`, `docs/SYSTEM_INTERACTIONS.md`               | Four reset identities and named high-value interactions                                                 | Accepted: design, systems/balance, implementation contract; 18 interactions                                                              |
| M14 | Not started            | M11 and M13 accepted                | prestige/UI lane           | `src/prestige/*`, panel, reset tests                                   | Declarative reset policy and deliberate browser confirmation                                            | Unassigned                                                                                                                               |
| M15 | Not started            | M12 and M14 accepted                | late-prestige/UI lane      | L3/L4 modules, panels, simulation evidence                             | Renewable L4 decision surface with documented alternatives                                              | Unassigned                                                                                                                               |
| M16 | Complete 2026-08-27    | M1 complete; may start from M9      | morphology/SVG lane        | references, `src/svg/noise.ts`, `morphology.ts`, tests                 | Traceable visual grammar and composition semantics pass review                                          | Accepted: references, grammar, art, types/provenance, determinism, activation; 98 Node/tsx, build, diff                                  |
| M17 | Complete 2026-08-27    | M16 accepted                        | colony-layout/SVG lane     | `src/svg/colony_layout.ts`, `src/svg/colony_metrics.ts`                | Data-only geometry preserves finite containment, clearance, and suppressed-detail readability           | Accepted: final repair, geometry, types/architecture, and dated macro-separation calibration evidence                                    |
| M18 | Not started            | M17 accepted                        | cell-rendering/SVG lane    | SVG cells, defs, descriptions, icons, visual tests                     | Accessible living-tumor colony fits supported consumer sizes and receives division                      | Dispatchable: consume M17 readonly slots and physical suppressed-detail geometry; own all SVG, DOM, browser, and visual evidence         |
| M19 | Not started            | M15 and M18 accepted                | ending/design/UI lane      | ending design, state, render, copy                                     | Ending changes presentation without creating an economic wall                                           | Unassigned                                                                                                                               |
| M20 | Not started            | M15 accepted                        | replay/state lane          | replay types/state, inline traces, tests                               | Replay reaches equivalent normalized durable state and visible progression                              | Unassigned                                                                                                                               |
| M21 | Not started            | M19 and M20 accepted                | balance-laboratory lane    | `tools/balance_sim.mjs`, JSON report, `docs/BALANCE.md`                | Strategy evidence informs a reviewed curve and decision witnesses                                       | Unassigned                                                                                                                               |
| M22 | Not started            | M21 and M18 accepted                | release-evidence lane      | release evidence, Pages workflow, artifacts                            | Every required gate and human artifact is assembled                                                     | Unassigned                                                                                                                               |

## Validation ladder

Static gates establish source hygiene; they do not establish player-visible behavior. Every owner
selects the gates below required by the milestone and records the command, exit status, behavior
summary, and artifact link when applicable. Permanent regression, one-time calibration, and design
review remain separate evidence classes.

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

1. Hallmark closeout owner: retain direct domain proof that conversion conserves cells while
   moving substrate into ATP, masking is region-local, inflammation expires cleanly, and a saved
   mutation selection applies one named descriptor effect or rejects atomically. Record broad
   multi-card/rank and balance observations as one-time evidence, then obtain semantic review,
   canonical Node/tsx, and production-dist browser proof.
2. M18 owner: render M17's accepted readonly layout without changing its geometry contract. Success:
   one accessible inline SVG supplies the primary visible-cell divide action, a living tumor world,
   target-size readability at the 1280 x 800 first view and compact supported sizes, and
   production-browser behavior; calibration reports tune DOM/detail tradeoffs.

## Accepted evidence ledger

The following reports are session-local evidence in `/private/tmp/cancer-clicker-ng.pTNth9`.
They can disappear between sessions. Durable closure remains the tracked tests, documentation,
and `docs/CHANGELOG.md` entries they support.

| Milestone | Accepted session evidence                                                                                                                                                                                                                                                                                                                                    | Durable evidence                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1        | `m1_final_contract_review.13df.report.md`; `m1_terminal_browser.72ea.report.md`                                                                                                                                                                                                                                                                              | Type contracts, slices, shell, changelog                                                                                                                                                     |
| M2        | `m2_final_systems_acceptance.b905.report.md`; `m2_balance_reaudit.a6b4.report.md`                                                                                                                                                                                                                                                                            | `docs/PROGRESSION_DESIGN.md`, changelog                                                                                                                                                      |
| M3        | `m3_final_acceptance.edd2.report.md`; `m3_test_quality_rereview.a91e.report.md`; `m3_terminal_browser.611b.report.md`                                                                                                                                                                                                                                        | BigNum modules/tests, `docs/BIGNUM_OPS.md`, changelog                                                                                                                                        |
| M4        | `m4_terminal_final_schema.a0e1.report.md`; `m4_terminal_final_security.1c79.report.md`; `m4_terminal_final_oracle.0cda.report.md`; `m4_terminal_browser_postrepair.c430.report.md`                                                                                                                                                                           | State/event parser, fixtures/tests, `docs/STATE_PERSISTENCE.md`, changelog                                                                                                                   |
| M5        | `m5_final_systems_accept.2f8a.report.md`; `m5_final_boundary_accept.f4a1.report.md`; `m5_final_oracle_accept.20260827.report.md`                                                                                                                                                                                                                             | Offline replay, p3 persistence, event boundary, report renderer, tests, changelog                                                                                                            |
| M6        | `m6_final_economy_numerical.20260827.report.md`; `m6_final_p4_boundary_rereview.20260827.report.md`; `m6_final_oracle_integration.final_51c8.report.md`; `m6_final_types_contract_final.20260827c.report.md`                                                                                                                                                 | Economy tick/costs, p4 migration and save closure, tests, design/persistence docs, changelog                                                                                                 |
| M7        | `m7_solid_source_build.27aug.report.md`; `m7_final_solid_types.a84e.report.md`; `m7_final_boundary_security.20260827.report.md`; `m7_final_browser_oracle.20260827.report.md`; `m7_final_visual_a11y.rereview_20260827.report.md`                                                                                                                            | Solid controller and TSX surface, sanctioned build wrapper, production-dist browser proof, accessibility evidence, changelog                                                                 |
| M8        | `m8_contract_freeze_implementation.27aug.report.md`; `m8_contract_types_accept.27aug.report.md`; `m8_boundary_security_accept.27aug.report.md`; `m8_oracle_integration_accept.final.27aug.report.md`                                                                                                                                                         | Closed save/load/recovery contracts, protected-recovery UI/controller, audit report, Node and production-browser proof, changelog                                                            |
| M13       | `m13_prestige_design.7f4a.report.md`; `m13_systems_balance_accept.27aug.report.md`; `m13_implementation_contract_accept.final2.27aug.report.md`                                                                                                                                                                                                              | `docs/PRESTIGE_DESIGN.md`, `docs/SYSTEM_INTERACTIONS.md`, durable decisions, changelog                                                                                                       |
| M9        | `m9_stage_domain_implementation.27aug.report.md`; `m9_stage_ui_implementation.27aug.report.md`; `m9_stage_architecture_accept.27aug.report.md`; `m9_balance_oracle_accept.27aug.report.md`; `m9_boundary_security_accept.27aug.report.md`; `m9_terminal_browser_recheck.27aug.report.md`                                                                     | Stage domain, semantic transition and gate boundary, observable stage panel, bounded purchase-order oracle, production-browser proof                                                         |
| M10       | `m10_core_mechanics_semantics_accept.27aug.report.md`; `m10_boundary_security_accept.27aug.report.md`; `m10_offline_oracle_accept.27aug.report.md`; `m10_production_browser_accept.27aug.report.md`; `m10_event_funnel_implementation.27aug.report.md`; `m10_route_save_invariant_repair.27aug.report.md`; `m10_economy_balance_integration.27aug.report.md` | Closed core-six catalog/handlers, atomic event funnel and p4 route graph, trusted elapsed projection, real economy effects, Solid controls, and production-browser proof                     |
| M16       | `m16_morphology_reference_docs.27aug.report.md`; `m16_morphology_grammar_implementation.27aug.report.md`; `m16_art_reference_accept.27aug.report.md`; `m16_types_provenance_accept.27aug.report.md`; `m16_determinism_oracle_accept.27aug.report.md`; `m16_contract_activation.27aug.report.md`                                                              | Morphology reference/grammar, deterministic resolver, row-ID provenance, discrete traits, and accepted contract activation                                                                   |
| M17       | `m17_final_geometry_contract_repair.27aug.report.md`; `m17_geometry_oracle_accept.27aug.report.md`; `m17_types_architecture_accept.27aug.report.md`; `m17_macro_separation_accept.27aug.report.md`                                                                                                                                                           | Readonly four-phase colony layout, truthful completed-cluster accounting, immutable M16 layout origin, physical suppressed-detail geometry, and accepted bounded geometry/separation oracles |

## Baseline gaps and ambition backlog

The README first-paragraph plain-prose gap is closed. The two canonical-plan path identities still
resolve to a 1,133-line authored plan; the current committed exact-path override suppresses that
source-limit check. A durable plan split or redesign remains future maintenance work. This file was
the duplicate tracker violation; its replacement removes that separate violation without changing
either canonical plan. Dependency-manifest drift remains separately observed and is not changed
autonomously.

The following work is intentionally assigned to future milestones rather than added as parallel
scope now.

- M4 and later state work preserve parser headroom by splitting `src/state/save_load.ts` before
  adding new durable fields if its size or coupling threatens the source limit.
- M16-M18 require SVG structure, rendered contact sheets, and human review at relevant consumer
  sizes and backgrounds, with durable captured evidence in M22.
