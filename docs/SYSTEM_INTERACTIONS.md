# System interactions

## Purpose and owner

This contract identifies the durable sources, direction, timing, and player-visible evidence for
cross-system interactions. `src/state/decision_surface.ts` projects authoritative state for
decisions; domain modules own their formulas; render code presents the
result without creating a second balance model.

## Interaction contract

| ID                       | Interaction and direction                                                                           | Timing                  | Owner                                     | Player-visible evidence                 | Calibration witness                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------- |
| organ_colonization       | Selected organ site and program change viable growth, route risk, and morphology inputs.            | accepted selection      | `src/prestige/seeding.ts`                 | site/program summary                    | a paired scenario changes the named cause only                              |
| host_ecology             | Selected host/card changes its declared benefit and liability.                                      | accepted selection      | `src/prestige/hosts.ts`                   | host dossier and quote                  | a portfolio shows an alternative tradeoff                                   |
| culture_translation      | Passage upgrades, cryobank choice, and the one-slot assay action change local culture behavior.     | accepted event          | `src/prestige/culture.ts`                 | culture bench and producer provenance   | an assay route differs from manual purchase by its declared effect          |
| network_campaign         | Mandate, nodes, edges, stability, and containment change campaign completion and node-local credit. | accepted event          | `src/prestige/network.ts`                 | frontier, campaign, and Pressure quote  | a node relation changes without changing unrelated topology                 |
| dissemination_morphology | Site program, host ecology, and node environment contribute independently to morphology.            | render resolution       | `src/svg/morphology.ts`                   | inspector provenance                    | a node-only change affects owned fields without erasing hallmark provenance |
| soft_ending              | Stage, global tier, and modeled cells permit the optional Chicago presentation.                     | explicit accepted event | `src/ending/trigger.ts` and `sequence.ts` | EndingView overlay above the live board | reached evidence restores after p8 reload                                   |

Direction describes declared value change, not an uncontrolled percentage stack. The source owner
supplies every multiplier, quote, cap, and prerequisite; a renderer exposes the owner-provided
explanation.

## Ownership and timing rules

| Layer            | Contract                                                                                                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| State and events | `src/types/state.ts`, `src/state/event_parse.ts`, and `src/state/events.ts` own durable state and accepted changes.                                                                                           |
| Prestige         | `src/prestige/` owns L1-L4 quotes, reset projections, saved choices, Culture, and Network behavior.                                                                                                           |
| Save and replay  | `src/state/save_load.ts` writes p8. P7 topology is a bounded migration input; p7-to-p8 installs only an unreached ending. `src/state/replay.ts` owns development semantic replay of saved events and records. |
| Morphology       | `src/svg/morphology.ts` combines baseline, stage, hallmark, prestige, regional/site, host, node, and individual variation with provenance.                                                                    |
| Client           | `src/render/game_controller.ts` routes intent through parsing and persistence before reconcile; SolidJS components render typed results.                                                                      |

Saved host drafts, dissemination mandates, source-frontier tuples, active campaigns, and completed
campaigns are authoritative records. Reload and replay consume those records; they never regenerate
a displayed choice. Parser validation rejects unknown IDs, duplicate edges, forged topology, and
invalid exact-key relations. Pressure credit comes from the one accepted node claim and remains
idempotent across save/load and replay.

`ReplayLog` is development-only. Its bounded parser re-enters the event funnel and compares
normalized durable state plus visible progression. It is not a public wire format, and its semantic
comparison does not require serialized bytes, pixels, or arbitrary timing to match.

## Calibration evidence

The balance laboratory creates dated calibration witnesses for these relations. Each witness varies
the named cause while holding independent inputs fixed, then records a falsifiable semantic result:

- a visible quote or derived outcome changes in the documented direction;
- a source-owned prerequisite makes an action available or unavailable; or
- a durable result changes under the same replayed event sequence.

The laboratory compares declared policies and reports assumptions, tradeoffs, and observed rank
reversals. It supplies one-time calibration evidence rather than a permanent rank, byte, pixel,
fixed-tier, or machine-timing gate.

## Current and future work

The state, prestige, morphology, ending, replay, and SolidJS owners above are implemented current
boundaries. The remaining balance-laboratory work may tune catalog values after its dated witnesses
exist. Dated implementation history belongs in [CHANGELOG.md](CHANGELOG.md); active dispatch
belongs in `docs/active_plans/`.
