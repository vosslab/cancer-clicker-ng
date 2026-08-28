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

| Canonical policy | Display name | Visible-state behavior |
| --- | --- | --- |
| `greedy-payback` | Local growth | Selects the producer with the shortest disclosed cells-cost-per-marginal-cells-per-second payback. |
| `naive-cheapest` | Naive cheapest | Selects the lowest displayed cost without considering biological effect. |
| `hallmark-first` | Adaptive drafter | Selects hallmark choices before visible mutation, phenotype, and program follow-ups. |
| `prestige-rush` | Network architect | Selects visible stage, reset, prestige, dissemination, and ending choices before local growth. |
| `check-in-idle` | Stealth seeder | Advances through the declared schedule and acts only on every third window when a visible route, network, or prestige action exists. |

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
L4-surface, and post-ending observations across the whole suite.

## Current calibration evidence

The 2026-08-28 suite ran the five tracked scenarios, all five policies, and 25
scenario-policy completions. Its observations are starting points for design review:

- The L1, L2, and L3 new-game scenarios retain unreachable later network observations within
  their short declared windows; that is expected scope evidence, not a failure threshold.
- The L4 mandate scenario retains a visible network route for the check-in policy, and the
  post-ending scenario preserves reached-ending continuation state for every recorded trace.
- The suite records several action kinds that no policy selected in a bounded scenario. Those are
  prompts to inspect the witness, policy, and player surface together before touching a curve.

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
