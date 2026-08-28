# TODO

This list tracks the remaining work for the first Cancer Clicker NG release candidate. It keeps
release blockers distinct from product exploration and from actions that need a human owner.
Detailed execution history remains in [active_plans/](active_plans/).

## Release blockers

- [ ] Complete the balance review. Run the five declared visible-state player policies, retain the
  generated report in `output_balance/`, and publish [BALANCE.md](BALANCE.md) with pacing,
  decision witnesses, dead-action findings, dominance findings, reachable gates, and renewed
  late-game choices. The design owner records a curve decision based on evidence rather than a
  fixed rank or elapsed-time target.
- [ ] Assemble [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md). It needs the exact commands, outcomes,
  tool versions, behavior summaries, and artifact links for the codebase, build, browser,
  persistence, replay, accessibility, SVG, visual, copy, and balance evidence.
- [ ] Capture the current 1280 x 800 living-board journey after the compact action-icon treatment
  lands: direct cell division, a producer purchase, a newly available progression decision, a
  saved return, prestige, and the Chicago-scale continuation. Include narrow and reduced-motion
  review where the interface changes materially; retain the source captures in
  [screenshots/](screenshots/).
- [ ] Reconcile the active execution ledger with the completed implementation and the remaining
  release work, then archive it when the release evidence package closes. The durable product
  documents use domain language; dated implementation history belongs in
  [active_plans/](active_plans/) and [CHANGELOG.md](CHANGELOG.md).
- [ ] Synchronize the CalVer value in [../VERSION](../VERSION) with `package.json`, then run the
  release commands from [INSTALL.md](INSTALL.md) and [USAGE.md](USAGE.md) against that version.

## Later improvements

- [ ] Measure high-density colony SVG rendering before deciding whether a canvas renderer earns a
  replacement of the current editable SVG system. Record the observed cost and visual tradeoff in
  a design decision before changing renderer ownership.
- [ ] Extend the shared icon language only where it clarifies routine actions, resources,
  hallmarks, or prestige choices. Preserve adjacent text and accessible names for unfamiliar or
  consequential controls.
- [ ] Evaluate achievements and muted-by-default audio as separate player-feedback additions after
  the release candidate. Each proposal names its event, save, and feedback purpose before it adds
  interface complexity.

## Human-owned actions

- [ ] Install `.github/workflows/deploy-pages.yml` from [../deploy-pages.yml](../deploy-pages.yml)
  when the release candidate is ready for the repository workflow.
- [ ] Review [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md), the captured living-board states, and the
  stated known limitations; approve the release candidate from that consolidated evidence.
- [ ] Copy the first paragraph of [../README.md](../README.md) into the GitHub About field if its
  repository description needs updating.
- [ ] Stage, commit, and trigger publication after the evidence review. The implementation and
  documentation work prepares this handoff without changing the Git index.

## Working agreement

- Use [REPO_STYLE.md](REPO_STYLE.md) for durable ownership and file placement.
- Run [../check_codebase.sh](../check_codebase.sh) as the canonical TypeScript gate; browser,
  screenshot, calibration, and visual review remain separate evidence lanes.
- Keep permanent tests deterministic and semantic. Use generated reports and rendered captures as
  one-time evidence when they inform a release or design review.
