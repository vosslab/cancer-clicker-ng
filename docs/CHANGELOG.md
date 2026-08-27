## 2026-08-27

### Additions and New Features

- Added provisional focused TypeScript contracts, five compile-only slice probes, and a minimal accessible clinical-dark placeholder shell.
- Added `docs/PROGRESSION_DESIGN.md`, specifying all 14 hallmark branches, their player-facing decisions, gates, stage identities, and named cross-branch interactions before implementation.
- Rebuilt `README.md` as an evidence-backed newcomer landing page with verified local probe
  instructions, current milestone limits, a curated documentation route, and a managed placeholder
  for future screenshot proof.

### Behavior or Interface Changes

- The progression design now treats hallmark mechanics as a uniform 14-branch game abstraction while labeling biological evidence by publication category rather than implying identical research status.

### Fixes and Maintenance

- BigNum now normalizes finite signed inputs, canonicalizes zero, enforces safe exponents, and uses an opaque private-symbol brand so callers cannot bypass construction.
- Completed the M3 BigNum operations lane in `docs/BIGNUM_OPS.md`: signed normalized
  arithmetic, safe extreme comparisons, fractional powers, geometric cost quoting,
  max-affordable solving, and deterministic short/full illion formatting.
- Replaced the 1,133-line active-plan duplicate with a compact live execution ledger that preserves
  M1-M3 completion and M4-in-progress status, names accountable lanes and validation evidence,
  and points to the unchanged canonical `docs/active_plans/implementation_plan.md`.

### Decisions and Failures

- Independent review found that the BigNum boundary claimed normalization without enforcing it; a scoped constructor-invariant repair was dispatched before M1 closure.
- After numeric normalization was repaired, a fresh review found the public structural BigNum marker still allowed constructor bypass; an opaque private-symbol repair was dispatched before closure.
- Progression-design audit found that late prestige availability needed a reward-free deterministic fixture; random offers and events also need saved deterministic identities and outcomes for reproducible state and replay.
- The biology-status labels were repaired to distinguish publication categories from the game's uniform 14-branch abstraction.
- M3 review repairs corrected fractional-power safe-exponent precision, finite-tolerance overflow,
  the zero-cost quote boundary, and test oracles that were too weak to reject malformed results.

### Developer Tests and Notes

- Production-page checks passed at desktop and narrow viewports with no console or page errors, and verified both visible actions.
- TypeScript, lint, format, and build gates passed. Node runtime tests were skipped because M1 intentionally has no `tests/test_*.mjs` yet.
- Final independent acceptance confirmed the repaired BigNum construction boundary and all five compile-only contract slices.
- Post-fix manager and browser gates passed after the construction-boundary repair.
- Final M2 systems and balance acceptance confirms every hallmark has a distinct decision, stage identities alter play, and the recorded synergies and tensions are ready to drive later balance tests.
- M2 documentation passed ASCII, Prettier, and local-link validation gates.
- M3 final acceptance passed focused Node tests (20/20), `./check_codebase.sh` (5/5), and the
  production build. A real production-page smoke passed at desktop and mobile sizes with zero
  console or page errors.
- The standard Playwright runner currently exits with `No tests found` because no committed spec
  exists. The full Python suite reported 589 passed and three pre-existing failures: the README
  first-paragraph-link rule and the 1,133-line implementation plan at canonical and root paths.
- The existing `allowScripts` pin still names esbuild 0.28.1 while the installed package is
  0.28.2; this baseline dependency-manifest drift was observed but not changed.
