# Solid UI model

## Decision and boundary

Cancer Clicker NG is a client-only SolidJS game. Solid owns fine-grained rendering and brief,
local presentation state; the framework-free TypeScript domain owns game state, BigNum arithmetic,
save parsing, event reduction, replay, and SVG scene data. `src/render/game_controller.ts` is the
single mutation boundary: a rendered control expresses intent, the controller records and persists
the accepted event, then Solid reconciles the resulting durable state.

## Board composition

The default 1280 x 800 (16:10) composition is a living game board rather than a page of controls.
A shallow `GameHud` keeps cells, production rate, stage, local-save state, number formatting, and
specimen inspection available without competing with play. The central count adds the formatter's
full million-and-above magnitude title while keeping the compact numeric value dominant. `GameBoard`
then arranges four stable areas:

| Area                  | Solid owner                                       | Player purpose                                                                                               |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Living tumor arena    | `TumorArena` through `ColonyPanel`                | Directly divide a rendered cancer cell and read immediate count/rate feedback.                               |
| Evolution family      | `EvolutionDock` plus the selected tab             | Keep one progression family active at a time: stage/hallmarks, routes, reset, culture, or network.           |
| Upgrade rack          | `ProducersPanel`                                  | Read price state immediately, inspect row tooltips, choose a buy quantity, and purchase molecular machinery. |
| Rewards and inspector | `GameRewardDock`, `EndingView`, `InspectorDrawer` | Surface short feedback, the optional scale report, and on-demand specimen facts without crowding the board.  |

The active evolution tab, drawer open state, tooltip visibility, and transient reward feedback are
presentation state in `src/render/game_ui_state.ts`. They never enter saves or replay. The game
state remains the only durable source for costs, eligibility, rates, morphology, prestige, and
ending evidence.

## Direct rendered-cell interaction

`TumorArena` exposes one native `button` named `Divide cell`, containing the inline colony SVG.
Pointer and touch activation succeeds only when its coordinate lands in a rendered cell membrane or
nucleus; background tissue, voids, and board whitespace remain inert. Enter, Space, and virtual
assistive activation use that same button and typed divide intent once. There are no per-cell tab
stops or duplicate mutation paths.

The control includes a focusable tooltip, stage-aware accessible description, cell-level pointer
treatment, authoritative count/rate outputs, and a local division response without a persistent
targeting overlay. The colony is a
fictional scientific game abstraction, not a patient image, diagnosis, clinical prediction, or
medical advice. [ART_DIRECTION.md](ART_DIRECTION.md) and
[MORPHOLOGY_REFERENCE.md](MORPHOLOGY_REFERENCE.md) define that boundary.

## Icons, tooltips, and keyboard routes

`src/svg/icons.ts` supplies compact, editable 24 by 24 SVG glyph geometry. `ActionIcon` places a
decorative glyph beside an existing visible text label; the label remains the native accessible
name. Icon-first utility controls use `ActionTooltip`, which supplies an explicit accessible name
and focusable tooltip. `HelpTooltip` attaches the same concise explanation to an existing button
without changing its action. Producer rows use that existing buy surface for economics and biology,
so hidden help is absolutely positioned and contributes no track or row height.

Tooltips open for pointer, focus, and pointer-down input, expose `role="tooltip"`, and connect to
the trigger with `aria-describedby`. Escape dismisses a tooltip without moving its trigger focus.
The optional specimen drawer moves focus to its close control, closes with Escape, and restores
focus to its invoker. These are presentation routes; no tooltip or drawer state changes gameplay.

## Live update cadence

`App` owns one 250ms timer and disposes it with the component. Each callback advances elapsed
simulation time through `controller.tick()`. The controller retains the established atomic
boundary: it computes the next snapshot, persists it, and reconciles the Solid store only after the
write succeeds. Components continue to read one canonical store; no interpolated display value,
worker mirror, or WebAssembly state duplicates the durable numbers.

The cadence is deliberately slower than animation frames and faster than the former one-second
step. CSS owns continuous decorative motion. TypeScript owns economy arithmetic and canonical
`BigNum`; a native or WebAssembly backend requires new profiling evidence and a separate design
decision.

## Responsive and motion contract

The board holds three columns above 72rem, becomes arena plus progression with a full-width Store
at intermediate widths, and becomes one readable sequence below 48rem: tumor arena, active
evolution family, upgrade rack, then rewards. At a 360px viewport the direct action and every
native control retain their accessible names and full keyboard operation; detail moves into the
drawer and tooltips rather than being omitted.

`prefers-reduced-motion: reduce` removes transitions and animation while retaining the same durable
state, direct-cell focus route, board ordering, and static response cues. Responsive and
reduced-motion behavior belong to production browser tests and rendered review, not to a second
state model.

## Verification ownership

Node and tsx tests cover controller, parser, reducer, persistence, replay, and presentation-state
isolation. Production-dist Playwright covers transformed JSX, rendered-cell pointer behavior,
keyboard parity, focus restoration, accessible names, responsive layout, reduced motion, and
browser-local saves. `./check_codebase.sh` is the canonical aggregate TypeScript gate. Build and
captured-board review are separate one-time evidence when visual work changes.
`tools/capture_visual_review.mjs` owns the reproducible whole-board viewport, tooltip, drawer,
success, error, recovery, offline, forced-colors, geometry, touch-target, palette, Axe, and
ARIA-tree evidence. Its output is ignored and is not a pixel-regression test.
