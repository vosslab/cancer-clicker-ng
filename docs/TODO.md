# TODO

The first Cancer Clicker NG release candidate has no remaining local release blockers. Its
autonomous evidence and optional distribution boundary are recorded in
[RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md). This is a small, dispatchable follow-on backlog;
active sequencing and dated investigations belong in [active_plans/](active_plans/).

## Follow-on capabilities

### Measure the colony renderer at high density

- **Owner:** SVG rendering lane.
- **Files:** [src/svg/](../src/svg/), [tools/](../tools/), and
  [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md).
- **Outcome:** Capture representative highest-reachable colony scenes and compare SVG cost,
  interaction behavior, editability, and visual fidelity before changing renderer ownership.
- **Success criteria:** A dated design decision retains SVG or approves a replacement based on
  measured scenes and the observed tradeoff; the board still supports direct visible-cell
  interaction and accessible descriptions.
- **Verification:** Run the owning capture/performance route, inspect the captured scenes at
  1280 x 800 and a narrow viewport, and run the affected deterministic and browser behavior
  lanes. Record observations rather than introducing an arbitrary timing threshold.

### Extend the shared action-icon language

- **Owner:** visual-system lane.
- **Files:** [src/svg/icons.ts](../src/svg/icons.ts), [src/render/](../src/render/),
  [src/svg/](../src/svg/), and the owning CSS files.
- **Outcome:** Give recurring routine actions, resources, hallmark choices, and prestige choices
  recognizable small icons while preserving concise adjacent labels and accessible names for
  unfamiliar or consequential choices.
- **Success criteria:** The chosen recurring surfaces use one coherent editable SVG vocabulary;
  the living tumor remains the dominant 1280 x 800 interaction surface; focusable tooltips and
  the specimen drawer retain the supporting biology.
- **Verification:** Capture representative board states, inspect keyboard focus and accessible
  names in the production-browser route, and keep permanent behavior checks limited to durable
  interaction contracts.

### Add achievements as a replay-safe feedback system

- **Owner:** state and feedback lane.
- **Files:** [src/state/events.ts](../src/state/events.ts), [src/state/save_load.ts](../src/state/save_load.ts),
  [src/state/replay.ts](../src/state/replay.ts), [src/render/](../src/render/), and
  [src/content/](../src/content/).
- **Outcome:** Define a small achievement catalog whose awarded state and visible feedback follow
  accepted game events without becoming a second progression currency.
- **Success criteria:** Each achievement has a named feedback purpose, a deterministic award
  rule, a save/replay contract, and a concise player-facing presentation.
- **Verification:** Exercise award, reload, and replay equivalence through the canonical state
  paths; add focused permanent tests only for those durable contracts and review a representative
  production-browser capture.

### Add muted-by-default audio with a durable preference

- **Owner:** interaction-feedback lane.
- **Files:** [src/render/](../src/render/), [src/state/](../src/state/), [src/content/](../src/content/),
  and an owned static-asset location selected by the implementation.
- **Outcome:** Associate a small, purposeful sound palette with major feedback moments while the
  initial experience remains silent and the player controls the preference.
- **Success criteria:** Playback is activated only after a player-enabled preference and a
  browser-permitted interaction; the preference survives reload; audio never obscures essential
  visual or accessible feedback.
- **Verification:** Exercise enabled and muted preference restoration in the production-browser
  route and capture the visible preference state. Keep implementation tests offline and focused on
  preference and event-selection contracts.

### Establish the supported Node.js policy

- **Owner:** build-tooling lane.
- **Files:** [package.json](../package.json), [INSTALL.md](INSTALL.md), and any affected local
  workflow documentation.
- **Outcome:** Declare the minimum Node.js version that the verified build, deterministic suite,
  and production-browser tooling support.
- **Success criteria:** The manifest and installation guidance express one compatible policy that
  matches a tested toolchain rather than an unverified package-range inference.
- **Verification:** Run [check_codebase.sh](../check_codebase.sh),
  [build_github_pages.sh](../build_github_pages.sh), and the production-browser lane on the
  selected supported version.

## Backlog maintenance

- Keep this file for small, unscheduled capabilities. Move an accepted cross-cutting design into
  [active_plans/](active_plans/) with its own owner and evidence record.
- Keep distribution actions out of this list: the local candidate is already closed, and remote
  publication is optional work described in [RELEASE_EVIDENCE.md](RELEASE_EVIDENCE.md).
