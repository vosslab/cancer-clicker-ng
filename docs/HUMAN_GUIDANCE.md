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
- I want cancer cells forming tumors, gaining blood supply, pulsing, growing, and expressing the
  hallmarks of cancer.
- Show hypoxia, necrosis, invasion, and later-site seeding; every visual change should have
  biological provenance.
- I love Cookie Clicker's stats and always upgradability. Keep count, production rate, producer
  levels, costs, and quantity controls visible.
- Keep future upgrades discoverable; use hover or focus for richer stats and unlock biology.
- I want the local Cookie Clicker source reviewed for lessons in source layout, increment systems,
  and visual layout that Cancer Clicker NG can use.
- I would like the living clicker in the middle of the desktop board, with the other major columns
  on its left and right.
- I want fewer plain buttons and more small icons. Use a coherent biological icon language to make
  important action families easier to recognize while keeping each control's text label clear.
- I want the central panel to be much more dynamic than Cookie Clicker's cookie, and the original
  implementation plan's visual progression is the contract.
- The visuals should be top priority and draw players in first. Text should be very, very minimal
  and limited to tooltips.
- Make it fun for high-school and college students; let the living tumor, illustrated machines,
  and small icons carry the experience.

## Review expectations

- Use `./check_codebase.sh` and `docs/TYPESCRIPT_STYLE.md` as the canonical TypeScript validation
  route. Treat focused runners as supporting evidence rather than a replacement for that gate.
- Keep permanent tests grounded in durable semantic behavior. Classify screenshots, calibration,
  performance observations, and other one-time checks separately; use realistic acceptance gates
  without byte, pixel, or arbitrary timing equivalence.
- Use domain names in permanent test files and documentation; milestone numbers belong in planning
  and dated history rather than current test identities.
- I want every plan milestone to close through manager-and-subagent evidence while I am away. Use
  captured fixtures, synthetic transitions, debug harnesses, workflow checks, and automated
  behavior tests as the completion path.

## Working style

- Cancer Clicker NG means Next Gen: make it the superified, exciting evolution of Cancer Clicker
  while keeping current behavior claims evidence-backed and future ambition clearly labeled.
- Frame delegated work as positive, dispatchable actions with an owner, files, validation, and
  success criteria so smaller agents have a clear path to the intended result.
