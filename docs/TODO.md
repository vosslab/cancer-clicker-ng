# TODO

This list tracks follow-on work after the first Cancer Clicker NG release candidate. Detailed
execution history remains in [active_plans/](active_plans/).

## Release blockers

All release-candidate blockers are closed by autonomous evidence. The balance review, release
evidence, seven-frame capture, independent agent image report, active ledger, CalVer
synchronization, `source source_me.sh && python3 devel/verify_candidate.py`, static workflow
contract, and final local gates are complete. The candidate route writes ignored
`output_release/candidate_manifest.json`, runs the full Python suite in disposable Git storage,
and proves the real index unchanged.

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

## Optional distribution and repository administration

These activities can distribute an already-complete candidate and never gate its completion.

- [ ] Copy the first paragraph of [../README.md](../README.md) into the GitHub About field if its
      repository description needs updating.
- [ ] Transfer the candidate through the repository's normal history workflow when a distribution
      record is useful.
- [ ] Publish through the configured Pages workflow when remote availability is useful.

## Working agreement

- Use [REPO_STYLE.md](REPO_STYLE.md) for durable ownership and file placement.
- Run [../check_codebase.sh](../check_codebase.sh) as the canonical TypeScript gate; browser,
  screenshot, calibration, and visual review remain separate evidence lanes.
- Keep permanent tests deterministic and semantic. Use generated reports and rendered captures as
  dated evidence when they inform a release or design review.
