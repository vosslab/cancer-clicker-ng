# Human guidance

<!-- VENDORED HEADER: START -->

Record the durable guidance Neil Voss states, or approves for preservation here, in his own words:
first person or close paraphrase, one to three lines per bullet. Material he supplies as a source
may inform [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) once it is settled, and an entry of uncertain
origin belongs there too. Rules: [REPO_STYLE.md](REPO_STYLE.md).
[PROPAGATED HEADER - ENTRIES BELOW ARE YOURS]
<!-- VENDORED HEADER: END -->

## Decision priority

- I like SolidJS and want it used for this client-side game interface.
- This codebase is pre-production, so strengthen foundational schemas, contracts, abstractions,
  and ownership boundaries when that creates the better long-term design; fix the design rather
  than preserving provisional compatibility.
- I want to target a 1280 x 800 (16:10) display. It shows the large clickable colony with
  count/rate, active stage and hallmark progression, producer store and quantity controls, and
  save/status without scroll-to-discover; larger layouts scale and smaller layouts stack.
- I expect the rendered cancer cells and colony to be the primary click action. Keep the clinical
  scientific SVG identity while using Cookie Clicker's large-object, center-progression,
  right-store spatial grammar as the interaction reference.
- Combine the incremental-clicker interface grammar with a living cancer-system visualization:
  cells form tumors, gain blood supply, pulse and grow, express hallmarks, develop hypoxia,
  necrosis, and invasion, then seed later sites. The center/progression field is the evolving
  tumor world, and every visual consequence traces through biological provenance.
- I like Cookie Clicker's always-available stats and upgrade surface. Keep count and production
  rate visible, retain producer store and quantity controls in the first-view right rail, and show
  each producer's owned count, next cost, affordability, and production contribution. Hover or
  focus can reveal richer stats; locked future content stays discoverable with its biological
  unlock condition, while purchases become actionable when their real requirements are met.

## Review expectations

- Use `./check_codebase.sh` and `docs/TYPESCRIPT_STYLE.md` as the canonical TypeScript validation
  route. Treat focused runners as supporting evidence rather than a replacement for that gate.
- Keep permanent tests grounded in durable semantic behavior. Classify screenshots, calibration,
  performance observations, and other one-time checks separately; use realistic acceptance gates
  without byte, pixel, or arbitrary timing equivalence.
- Use domain names in permanent test files and documentation; milestone numbers belong in planning
  and dated history rather than current test identities.

## Working style

- Cancer Clicker NG means Next Gen: make it the superified, exciting evolution of Cancer Clicker
  while keeping current behavior claims evidence-backed and future ambition clearly labeled.
- Frame delegated work as positive, dispatchable actions with an owner, files, validation, and
  success criteria so smaller agents have a clear path to the intended result.
