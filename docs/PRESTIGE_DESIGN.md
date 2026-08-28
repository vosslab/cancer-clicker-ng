# Prestige design

## Purpose and boundary

Prestige systems make cancer progression a sequence of scientific decisions rather than a single
reset button. L1 Metastasis, L2 Host Transfer, L3 Immortalization, and L4 Dissemination each use
their own currency, catalog, saved choice, event, reset projection, and player-facing explanation.
Ordinary hallmark and stage behavior remains in [PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md).

All player actions enter the same exact parsed event funnel as the rest of the game. Render code
uses typed quotes and view models; it does not calculate rewards, select choices, mutate durable
state, or construct an alternative reset path.

## Shared reset contract

A reset is a complete projection from validated state, parsed event time, and trusted selection. It
creates a fresh state through the owning projection; it does not patch retained fields onto an old
state. The projection preserves only declared lineage facts and removes transient run state.

| State group                       | L1                       | L2                      | L3                       | L4 campaign                     |
| --------------------------------- | ------------------------ | ----------------------- | ------------------------ | ------------------------------- |
| regions, routes, active damage    | clear                    | clear                   | clear                    | clear retired campaign only     |
| producers, hallmarks, stage state | clear                    | clear                   | clear                    | retain unlocked network context |
| offers, queues, timers, pressures | clear                    | clear                   | clear                    | clear campaign-local state      |
| deterministic seed                | new catalog-derived seed | new draft-derived seed  | new culture-derived seed | new mandate-derived seed        |
| L1 site/program                   | gain and preserve        | preserve                | clear                    | preserve                        |
| L2 Imprints and host card         | preserve                 | award and clear old run | clear                    | retain translated effects only  |
| L3 Passages and upgrades          | unavailable              | preserve                | gain and preserve        | preserve                        |
| L4 graph, Pressure, mandates      | unavailable              | unavailable             | preserve when unlocked   | gain, spend, and preserve graph |

`src/prestige/reset.ts` owns pure projections. `src/state/events.ts` invokes them only after the
event parser validates an explicit player action and current quote revision.

## L1 Metastasis

L1 converts a prepared terminal primary state into Potential and an organ-site allocation. The
player selects a site, assigns allocation, and selects a catalog program. The accepted reset writes
durable `activeNicheContext` containing the selected site, allocation rank, and program. That
context persists into the host run and supplies catalog-backed metabolic, perfusion, route-risk,
immune, pressure, and reserve effects through `src/prestige/effects.ts`.

Historical allocations remain portfolio/currency history. They never infer a biological location or
alter all producers. A future respec requires its own cost and current-state contract.

## L2 Host Transfer

L2 turns explicit host-transfer eligibility into Imprints and a deterministic saved `HostDraft`.
The saved draft includes identity, source seed, source event sequence, candidates, reveal policy,
and selected card. The player chooses from the displayed saved cards; reload and semantic replay use
that record and never regenerate a displayed choice.

Host-card benefits and liabilities compose with L1 niche effects through catalog data. Protected
route affinity requires compatible active-niche and active-host provenance. A trait-liability choice
names its selected card and target trait, validates both, debits Imprints, and changes only that
trait's declared liability.

## L3 Immortalization

L3 translates lineage history into passage capacity and culture choices. `CultureState` owns
passages, purchased upgrades, cryobank selection, and one queued assay producer action. A later
accepted queue event may explicitly retarget that one durable slot; it does not create a second
pending action. A producer purchase records `manual` or `assay` provenance so the intended culture
effect is auditable after save/load and replay.

Culture effects are local to the culture domain. They do not silently alter unrelated global
network balances.

## L4 Dissemination

L4 turns Network State into saved, renewable campaigns. `NetworkState` owns `globalTier`,
`transmissionPressure`, ordered nodes and edges, a pending frontier, one active campaign, completed
campaign archives, and optional node-local containment. A frontier has exactly three durable
mandates. A chosen mandate retains its complete selected plan and source-frontier tuple; a completed
campaign archives the same authority and renews the frontier.

The parser regenerates and structurally compares retained topology from source tuples. It rejects
unknown IDs, duplicates, dangling relations, invalid transitions, forged generated edges, and graph
limit breaches. Containment changes one selected node's throughput/detection tradeoff. Pressure
credit comes from the one accepted node claim and remains idempotent across save/load and replay.

## Persistence and replay

Prestige state belongs to the one current exact-key save shape: `version: 2` and
`stateSchemaVersion: 8`. Culture, network, and ending evidence are required current aggregates;
the parser rejects a partial or incompatible shape rather than inferring a prior run. The current
contract and protected fresh-replacement flow are owned by
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md).

`src/types/events.ts`, `src/state/event_parse.ts`, and `src/state/events.ts` own strict prestige
events. Payloads carry selected stable IDs, event time, and quote revision; reducers recompute
rewards and reject stale or hostile input atomically. `src/types/replay.ts` and
`src/state/replay.ts` own development-only `ReplayLog` recording and semantic replay. They compare
normalized durable state, accepted/rejected outcomes, and visible progression through `recordEvent`.
Replay is not a public transport or player save format.

## Durable ownership

| Owner                                                          | Behavior                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/prestige/reset.ts`, `seeding.ts`, `hosts.ts`, `layers.ts` | L1/L2 projection, catalog choices, lineage facts, and deterministic host drafts.    |
| `src/prestige/culture.ts` and `network.ts`                     | L3/L4 projections, culture, frontier, campaign, containment, and Pressure behavior. |
| `src/prestige/effects.ts`                                      | Pure composition of selected niche and host effects for named mechanics consumers.  |
| `src/state/save_load.ts` and `save_parse/prestige.ts`          | Current prestige persistence and strict aggregate validation.                       |
| `src/state/events.ts` and `event_parse.ts`                     | Exact durable prestige event funnel.                                                |
| `src/state/replay.ts` and `types/replay.ts`                    | Development semantic replay through the event funnel.                               |

Focused Node/tsx behavior tests and `./check_codebase.sh` validate these contracts. Production
browser proof and visual inspection are separately named acceptance evidence for player surfaces.

## Balance laboratory

The balance laboratory compares five visible-state-only policies on declared seeds and equal
budgets. `greedy-payback` uses the displayed marginal-production quote and displayed cost;
`naive-cheapest`, `hallmark-first`, `prestige-rush`, and `check-in-idle` each express a distinct
visible decision posture. It reports winner, score, runner-up, actions, assumptions, tradeoffs, and
observed rank reversals. Its witnesses vary a named cause while holding independent inputs fixed,
then confirm a player-visible quote, action availability, or durable semantic outcome changes as
declared. `docs/BALANCE.md` owns the precise policy vocabulary.

This work produces dated calibration evidence. It can tune catalog prices, trait magnitudes,
thresholds, and score bands without changing caller ownership. It does not impose a permanent rank,
pixel, byte, fixed-tier, or machine-timing gate.

Dated implementation history belongs in [CHANGELOG.md](CHANGELOG.md). Active follow-on work belongs
in `docs/active_plans/`.
