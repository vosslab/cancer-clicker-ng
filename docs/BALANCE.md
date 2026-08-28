# Balance laboratory

The balance laboratory is a deterministic, headless review tool for Cancer Clicker NG. It turns
the current save boundary and the authoritative visible decision surface into reproducible traces;
it does not define the fun of the game or enforce a target completion time.

## Contract

`tools/balance_sim.mjs` receives a tracked scenario from `tools/balance_scenarios/`. For every
declared seed it creates the scenario state, projects `projectVisibleDecisionSurface()`, selects
only an action already visible to a player, validates that action through the parser and reducer,
and advances time with the shared offline-economy adapter. The generated JSON therefore records
what the current game exposes rather than a second hidden action catalog.

The suite has five canonical policy identities. Friendly display names preserve the game's
biological flavor, while `canonicalPolicy` in every trace names the exact model:

| Canonical policy | Display name      | Visible-state behavior                                                                                                               |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `greedy-payback` | Local growth      | Selects the producer with the shortest disclosed cells-cost-per-marginal-cells-per-second payback.                                   |
| `naive-cheapest` | Naive cheapest    | Selects the lowest displayed cost without considering biological effect.                                                             |
| `hallmark-first` | Adaptive drafter  | Selects hallmark choices before visible mutation, phenotype, and program follow-ups.                                                 |
| `prestige-rush`  | Network architect | Selects visible stage, reset, prestige, dissemination, and ending choices before local growth.                                       |
| `check-in-idle`  | Stealth seeder    | Advances through the declared schedule and acts only on every third window when a visible route, network, or prestige action exists. |

This deliberately uses only published action kind, tags, ordering, displayed cost, and displayed
marginal benefit. Producer actions disclose both their cost and their exact `+cells/s` purchase
benefit from the same production modifiers used by simulation ticks. The Store presents that same
quote beside the purchase cost, so the player and `greedy-payback` evaluate one shared contract.

## Commands

Run the complete tracked calibration suite and write its one aggregate report:

```bash
node --import tsx tools/balance_sim.mjs --suite \
  --output output_balance/balance_report.json
```

With no selector, the same command defaults to `--suite`. Run one focused question when changing
that scenario's curve or contract:

```bash
node --import tsx tools/balance_sim.mjs \
  --scenario tools/balance_scenarios/l4_mandate_sequence_v1.json \
  --output output_balance/balance_report.json
```

The report is generated under ignored `output_balance/`. Its `policyCatalog` documents the model,
each scenario carries its seed/schedule/curve assumptions and decision witness, and `completion`
contains every scenario-policy outcome. `outliers` collects dead-action, tie, unreachable-gate,
L4-surface, and post-ending observations across the whole suite. `candidateSelection` names the
input revisions and current shipped candidate, classifies every flag by its actual witness scope,
records demonstrated blocking findings separately, and states the selection, rationale, and
remediation status. The aggregate report uses format 3; tracked scenario inputs use format 2.

## Current calibration evidence

The 2026-08-28 suite ran five tracked scenarios, all five policies, and 25 scenario-policy
completions. Its observations are starting points for design review:

- The L1, L2, and L3 parser-validated durable snapshots expose their declared metastasis, host-card,
  and culture decision surfaces. Their report witnesses identify the policy, window, action IDs,
  exact event types, and effect tags that make each surface reachable.
- The L4 mandate and post-ending scenarios each retain their declared network decision surface;
  post-ending traces preserve reached-ending continuation state.
- The suite records several action kinds that no policy selected in a bounded scenario. Those are
  prompts to inspect the witness, policy, and player surface together before touching a curve.

## Candidate selection

The generated `candidateSelection` record identifies the current shipped
`catalog-2026-08-28` curve with `p8-visible-surface-v1` semantics and the five declared policy
inputs. Every decision witness declares nonempty visible event types and action tags. The report
records the policy, decision window, and action IDs where a declared type-and-tag match is exposed.
It treats a bounded nonselection, an aggregate tie, or a later tier absent from an earlier witness
as a scoped calibration observation rather than a claim that a player action is permanently dead.

The current report selects the sole shipped `catalog-2026-08-28` candidate. It records no
demonstrated blocking findings and a `completed` remediation status. The completed bounded work
replaced duplicate new-game probes with distinct parser-validated L1, L2, and L3 durable inputs,
then repaired the persistence, reset-transition, and visible-surface contracts that make those
legal decision surfaces available. The fresh rerun grounds selection in every scenario's declared
full event-type and tag match; its remaining scoped observations stay available for the next
calibration question.

Ranks and elapsed windows describe the chosen scenarios; they are not permanent CI gates. A tuning
change earns a new one-time report, a written comparison to the previous witness, and a decision
about whether the observed tradeoff is desirable.

## Tuning questions

1. Should early scenarios expose a stronger hallmark decision before their bounded local-growth
   window closes, or are they correctly scoped to basic production?
2. Which L4 campaign choices remain visibly divergent after more than one renewal, and which need
   a new scenario with a longer declared schedule?
3. Do the disclosed producer cost and marginal-rate quotes make the intended early tradeoffs clear
   enough at each purchase quantity?

The next calibration should answer one question with a revised tracked scenario or curve revision,
then retain the generated JSON as dated evidence rather than a fixture or release gate.
