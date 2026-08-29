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
- Hide upgrade identities until the player has achieved their reveal condition; show an unknown
  target instead of spoiling the future catalog.
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
- Highlight options I can afford so they read as clickable, and gray out options that cost more
  than I currently have.
- Replace the highlighter-tip detail buttons with Cookie Clicker-style tooltip popups. Hidden
  details should take no space in the layout.
- Make prices and benefits visually explicit on the upgrade itself. A player should not have to
  decode an unlabeled icon-and-number pair or open a tooltip to judge a purchase.
- Build a comprehensive automated screenshot system for tooltips and use its reviewed images to
  improve the README; screenshot automation supports, but does not replace, visual inspection.
- Clicking the rendered cancer cells must create more cells; that direct action is the point of
  the clicker loop.
- Give the interface a stronger medical and biological color identity.
- Remove the blue/green theme; cancer is not green. Use a warm body-tissue medical palette.
- The center must read as a cancer cell, not an eye or a cosmic object.
- Do not present fractional objects such as `0.01 cells`; show whole-cell inventory and remove
  next-cell progress completely.
- Make the live numbers update faster, and assess whether a WASM backend is actually necessary.
- Present the game from the cancer cells' perspective. Remove crosshairs and lab-observer
  equipment such as microscopes from the play surface.
- Make the number-naming content in `src/bignum/` more prominent in the interface.
- I like Cookie Clicker-style producer detail: show owned count, one-unit output, combined output,
  its share of total automatic growth, active modifier logic, and lifetime output when it is tracked.
- The right-side producer rows should be shorter so the rack can show more rows at once.
- Acquiring a hallmark must visibly confirm that it worked and show what new biological decision it
  enables.
- The entire left panel is not intuitive at all. It needs to make the next player goal obvious.
- Put the `+cell` bonus next to the pointer, and make any click close to a rendered cell work.

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
