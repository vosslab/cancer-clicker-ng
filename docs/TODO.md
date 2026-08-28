# TODO

This list tracks the remaining work for the first Cancer Clicker NG release candidate. It keeps
release blockers distinct from product exploration and from actions that need a human owner.
Detailed execution history remains in [active_plans/](active_plans/).

## Release blockers

Local implementation blockers are closed. The balance review, release evidence, five-scene capture,
independent visual acceptance, active ledger, CalVer synchronization, and final local gates are
complete. Human Git and Pages acceptance remains below.

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

- [ ] Review [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md), the captured living-board states, and the
      stated known limitations; approve the release candidate from that consolidated evidence.
- [ ] Add the complete candidate, including `.github/workflows/deploy-pages.yml`, to the repository
      index and rerun the tracked-only Markdown link gate.
- [ ] Copy the first paragraph of [../README.md](../README.md) into the GitHub About field if its
      repository description needs updating.
- [ ] Commit and trigger publication after the evidence review, then verify the live Pages game.

## Working agreement

- Use [REPO_STYLE.md](REPO_STYLE.md) for durable ownership and file placement.
- Run [../check_codebase.sh](../check_codebase.sh) as the canonical TypeScript gate; browser,
  screenshot, calibration, and visual review remain separate evidence lanes.
- Keep permanent tests deterministic and semantic. Use generated reports and rendered captures as
  one-time evidence when they inform a release or design review.
