# Frequently asked questions

This FAQ answers common player and contributor questions about Cancer Clicker NG. The game is a
stylized biology-learning system, not clinical advice, a patient representation, or a simulation of
clinical outcomes.

## What is Cancer Clicker NG?

Cancer Clicker NG is a SolidJS browser game about growth, scarcity, adaptation, and tradeoffs in a
stylized transformed-cell colony. It combines the satisfying incremental-game loop of clicking,
earning, and upgrading with a changing tumor world: cell colonies become vascularized, hypoxic,
invasive, and eventually connected across a saved network.

## Why click cancer cells?

The primary manual action lands on painted cancer-cell geometry in the colony rail. Clicking the
surrounding tissue or whitespace does not divide a cell. That connection keeps the action tied to
the living visual system rather than to a detached counter button.

Keyboard and assistive-technology users reach the same action through the named colony control:
focus it, then press Enter or Space. The authoritative cell count, production rate, and visible
feedback explain the result of every accepted action. See [ART_DIRECTION.md](ART_DIRECTION.md) for
the full visual and interaction contract.

## What screen is it designed for?

The representative board is 1280 x 800 pixels in a 16:10 landscape layout. It keeps the colony
action on the left, the changing tumor and progression world in the middle, and the always-upgradable
Store on the right. Narrow layouts preserve that reading order by stacking the colony action,
progression world, and Store.

The 1280 x 800 capture is a design walkthrough, not a loading-time, pixel-match, or hardware-speed
requirement.

## Why does the game use SolidJS?

SolidJS provides fine-grained browser display updates and local presentation state while the game
engine remains framework-free. The controller is the one boundary from rendered player intent to
typed game events, persistence, and replay. This keeps the browser interface responsive without
creating a second authoritative game state. See [SOLID_MODEL.md](SOLID_MODEL.md) for the component,
reactivity, and build boundary.

## Where does my progress live?

Progress is anonymous and browser-local. Returning to the same browser origin reloads valid saved
progress; a different local server port is a different browser origin. A missing save starts a new
game. When stored data cannot be read safely, the game preserves it and presents an explicit
replacement choice instead of silently discarding it.

The current save contract, recovery behavior, and explicit fresh-replacement flow are described in
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md).

## What happens while I am away?

On return, the game can grant a bounded offline economic gain and explains the applied time and any
cap in an Offline progress report. It does not spend cells, select upgrades, advance a stage, or
choose a prestige action for the player. Those decisions remain visible choices after return. See
[GAME_DESIGN.md](GAME_DESIGN.md) for the offline-economy model.

## What is semantic replay?

Semantic replay is a development diagnostic. It re-runs accepted event histories and compares their
normalized durable state and visible progression. It is separate from player saves and from the
offline economic replay used when a player returns to the game.

## How do accessibility and motion work?

The colony action uses a native control with visible focus and a clear name. Pointer, touch, Enter,
and Space reach the same typed action. Reduced-motion users receive the same count, rate, state,
and biological cues without needing a pulse or growth animation. The browser validation lane also
covers reachable controls, responsive layout, and reduced-motion behavior.

## Are the artwork and icons editable?

Yes. The living tumor is inline, typed SVG assembled from named scene data, reusable definitions,
and focused render layers. Its art direction favors readable tissue shape, perfusion, hypoxia,
necrosis, invasion, and state-linked morphology over bitmap assets or clinical imagery. Small
action and status icons have a dedicated editable source catalog in `src/svg/icons.ts`; controls
retain visible text and accessible names so an icon never has to carry a decision by itself.

See [ART_DIRECTION.md](ART_DIRECTION.md) and [FILE_STRUCTURE.md](FILE_STRUCTURE.md) for the visual
owners and editing routes.

## Is there an ending?

The game can unlock an optional Chicago-scale presentation after explicit stage, dissemination, and
modeled-cell-scale conditions are met. It is a transparent fictional scale analogy, not a real-world
measurement claim. Opening it preserves the live colony, so direct cell action, producers, offline
accrual, culture choices, and network decisions continue.

## How should I validate a change?

Use the validation lane that matches the change:

- Run `./check_codebase.sh` for TypeScript, lint, formatting, and deterministic Node behavior.
- Run `./build_github_pages.sh` to produce the static deployment artifact.
- Run `./run_playwright_tests.sh --build` for production-browser behavior after an interface change.
- Review a fresh rendered capture when SVG, layout, contrast, iconography, or motion changes.

Keep durable behavior tests deterministic and offline. Treat a rendered capture and visual review as
one-time implementation evidence rather than a permanent pixel-equivalence test. Start with
[INSTALL.md](INSTALL.md) and [USAGE.md](USAGE.md) for setup and local play.
