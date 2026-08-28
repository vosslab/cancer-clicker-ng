# Solid UI model

## Decision and boundary

Cancer Clicker NG uses client-only SolidJS as its deliberate UI runtime. The static application
ships a TypeScript/TSX bundle and has no server runtime. The game engine, BigNum arithmetic, save
parsing, event reduction, replay, SVG factories, and prestige domains remain framework-free.

SolidJS owns fine-grained display updates and local presentation state. It never owns a second
authoritative game state or an alternative mutation path. `src/render/game_controller.ts` is the
single controller boundary between UI intent and the framework-free engine.

## Component tree

```text
main.tsx
  App (controller boundary and mounted shell)
    GameShell
      StatusBar / NumberDisplay
      ColonyPanel / ColonyView (direct visible cancer-cell action)
      StagePanel / HallmarkTree / PrestigePanel
      ProducersPanel -> ProducerRow
      EndingView (optional Chicago-scale layer above live play)
      OfflineReport / SaveNotice / DebugControls
```

`App` consumes the controller store, persistence scheduling, injected active-time clock, and typed
actions. It may pass callbacks such as `onDivide` and `onBuyProducer`, but never a store setter.
Components render read-only state and express player intent; parsing, event recording, persistence,
and replay observation stay in the controller and state modules.

`EndingView` is a leaf above the same board. Once the explicit p8 soft-ending event is accepted, it
shows the Chicago-scale culmination while direct cancer-cell action, producer purchases, culture,
and network interactions continue. It restores in normal reading order after reload.

## Reactivity and state

| State class                  | Solid primitive                                | Contract                                                          |
| ---------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| Durable `GameState` snapshot | one controller-owned `createStore<GameState>`  | Components receive read-only data and typed actions only.         |
| Display projection           | nearest-owner `createMemo`                     | Derived text, affordability, and rows are not copied into state.  |
| UI-only presentation         | narrow `createSignal`                          | Dialog, help, and motion preference do not enter saves or replay. |
| Lifecycle handles            | local variables with `onMount` and `onCleanup` | Timers and listeners are not store fields.                        |

Use `<For>` for identity-keyed rows, `<Show>` for one optional surface, and `<Switch>`/`<Match>`
for mutually exclusive states. Read reactive props at use sites. Components use semantic controls,
visible focus, and `class` JSX attributes.

## Direct-cell action

The normal board is a 1280 x 800 (16:10) landscape: direct colony action at left, the living
tumor/progression world in the middle, and the always-upgradable Store at right. `ColonyPanel` and
the SVG colony expose one native colony control plus visible cell geometry. Pointer, touch, Enter,
and Space reach the same typed `controller.divide()` intent exactly once. The controller alone
constructs the durable `click-divide` event and reconciles only after persistence succeeds.

The first view shows the colony, count/rate, active stage and hallmark progression, producer
quantities, next costs, affordability, production contribution, and save status. Locked content
states biological unlock conditions. Narrow layouts keep the readable order of colony action,
progression, then full-width Store; reduced-motion users receive the same static state cue without
requiring animation.

## Persistence and replay seam

The controller clones its current store, routes each raw or typed input through `recordEvent`, and
persists the accepted candidate. A successful storage result is required before reconciliation.
Parser, reducer, clock, or storage failure preserves the displayed durable state and gives a narrow
visible status. Recovery begins through the same validated persistence boundary.

The controller may attach an optional development accepted-event observer. It receives an event only
after persistence and reconciliation are successful, and observer diagnostics cannot recast that
successful player action as a failure. `src/state/replay.ts` owns recording and semantic replay; UI
components do not own a replay format.

## Client and build contract

| Boundary       | Current behavior                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Browser client | SolidJS rendering, local typed intents, accessibility behavior, and browser storage through the state owner.              |
| Static build   | `tools/build_solid.mjs` bundles `src/main.tsx` to `dist/main.js`; `build_github_pages.sh` remains the public build entry. |
| Server         | None. The release has no router, loader, request, session, account, API route, or network data boundary.                  |

`src/style.css` provides the base stylesheet. Named domain stylesheets are explicit `src/index.html`
assets, allowlisted by the production build, and use stable semantic class names and CSS custom
properties. Browser proof verifies linked stylesheets are present in `dist/`.

## Test ownership

Node/tsx tests own DOM-free controller, parsing, reducer, persistence, replay, and signal-isolation
behavior. Production-dist Playwright owns transformed JSX, keyboard and pointer interaction, focus,
accessibility, responsive layout, reduced motion, browser errors, and real storage lifecycle.
`./check_codebase.sh` is the canonical aggregate TypeScript gate. Production build, browser capture,
and visual inspection are separately named one-time acceptance evidence when a client change needs
rendered review.

## Risks and scope

React-shaped prop snapshots, direct store mutation, and a second store would bypass fine-grained
updates and the event funnel. The controller boundary and typed callbacks keep that risk visible.
Adopting a server runtime would add deployment and serialization obligations; this static client
does not own those obligations.
