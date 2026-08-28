# Roadmap

Cancer Clicker NG is building its first pre-production release candidate: a lasting incremental
game whose biology, decisions, and living SVG colony explain one another. This roadmap names the
product priorities that remain after the current implementation pass; detailed execution status
lives in [active_plans/](active_plans/).

## Release candidate evidence

- Maintain `docs/RELEASE_EVIDENCE.md` as the manager-owned record of the working build, save
  migration, browser behavior, accessibility, independent-agent visual report, and known limits.
  Success is reproducible evidence that links each release claim to its command or captured artifact.
- Run the headless calibration owner in [tools/balance_sim.mjs](../tools/balance_sim.mjs) and turn
  its observations into `docs/BALANCE.md`. Success is a manager-recorded calibration policy for
  cost curves and decision witnesses, with measurements informing decisions rather than arbitrary
  pass thresholds.
- Prepare the static Pages release surface through [build_github_pages.sh](../build_github_pages.sh)
  and the repository's release documentation. Success is a reproducible local candidate with the
  maintained artifacts present; publication is an optional external distribution action.

## Make the living board legible

- Evolve [src/svg/icons.ts](../src/svg/icons.ts), [src/svg/colony.tsx](../src/svg/colony.tsx), and
  the Solid render surfaces into a compact visual language for actions, resources, hallmarks, and
  prestige choices. Success is that routine interaction exposes a recognizable icon plus an
  accessible name, while text remains available for unfamiliar or consequential decisions.
- Keep direct cell division as the dominant primary action at the 1280 x 800 target, with store
  and progression information continuously visible. Success is a playable capture and browser
  journey showing a cell click, a purchase, a saved return, and one newly available decision.
- Treat motion and contrast as part of the interface contract. The owner is the shared CSS plus
  each interactive Solid component; success is keyboard operation, readable reduced-motion states,
  and render review at the board target and a narrow viewport.

## Preserve endless strategic depth

- Use the canonical decision surface in [src/state/decision_surface.ts](../src/state/decision_surface.ts)
  for later UI, replay, and balancing work. Success is that an action's displayed cost, eligibility,
  and reducer result come from one state-owned projection.
- Continue the soft-ending experience in [src/ending/](../src/ending/) as a scale reframing rather
  than an economic stop. Success is continued production, direct cell interaction, and renewable
  dissemination decisions after the Chicago-scale report is reached.
- Keep new persistent mechanics inside the typed event, save, and replay contracts. Success is a
  deterministic semantic replay and current-save validation for each meaningful durable action.

## Grow only with evidence

- Evaluate a canvas renderer only after measuring the SVG colony at the highest reachable density.
  The owner is [src/svg/](../src/svg/); success is a measured reason to change renderer ownership,
  not a speculative rewrite.
- Consider achievements and muted-by-default audio as later product additions after the first
  release candidate. The event funnel and save contract provide their future integration points;
  each addition needs a distinct player decision or feedback purpose.
- Keep backend accounts, cloud saves, leaderboards, analytics, and monetization outside this
  roadmap. The first release remains a self-contained client-side game with local persistence.

## Working agreement

- Use [REPO_STYLE.md](REPO_STYLE.md) for durable ownership, validation, and file placement.
- Keep active implementation sequencing, dated findings, and temporary execution labels in
  [active_plans/](active_plans/) and [CHANGELOG.md](CHANGELOG.md), not in this roadmap.
