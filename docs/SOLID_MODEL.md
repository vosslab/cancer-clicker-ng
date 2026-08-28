# Solid UI model

## Decision and boundary

M7 adopts client-only SolidJS as Cancer Clicker NG's sole deliberate UI runtime. The static
GitHub Pages deployment remains the release target. SolidStart, a router, resources, server
functions, network calls, accounts, and server rendering are outside this release; a later
written design decision must reopen any of them.

The framework is a view boundary, not a game-engine boundary. `src/state/`, `src/economy/`,
`src/bignum/`, `src/svg/`, persistence, event parsing, and replay remain framework-free
TypeScript. Solid owns DOM composition in `src/render/` and `src/main.tsx` only. SVG factories
continue to return editable SVG/data contracts; a Solid component places that output into the
DOM without giving SVG code access to the store or event controller.

## Reactivity map

| Data                          | Primitive and owner                              | Rule                                                                                                |
| ----------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Durable `GameState` snapshot  | One controller-owned `createStore<GameState>`    | Components receive read-only access and typed action callbacks; none receives the store setter.     |
| Expensive display projections | `createMemo` in the nearest render owner         | Derived text, affordability, and visible producer rows are never copied into state by an effect.    |
| UI-only state                 | Narrow `createSignal` in the owning component    | Dialog visibility, selected tab, expanded help, and motion preference do not enter saves or replay. |
| Lifecycle handles             | Plain local variables plus `onMount`/`onCleanup` | Timer, keyboard listener, and observer handles are not signals or store fields.                     |
| Async/server data             | None                                             | This client-only release uses no `createResource`, `Suspense`, request, or server boundary.         |

Solid components run once. A store or signal read updates DOM only when read in JSX, a memo, or
an effect. Do not destructure reactive props; read `props.name` at the use site. Do not create
primitives conditionally, look for dependency arrays, return effect cleanup functions, or use
`Array.map()` for dynamic JSX. Put teardown in `onCleanup`.

Use `<For>` for identity-keyed producer, hallmark, queue, and replay rows; use `<Index>` only
when position is the deliberate identity. Use `<Show>` for one optional surface and its callback
form when TypeScript must narrow a value. Use `<Switch>` and `<Match>` for mutually exclusive
stage, recovery, and modal states. JSX uses `class`, not `className`.

## Planned component tree

```text
main.tsx
  App (controller boundary and mounted shell)
    GameShell
      StatusBar / NumberDisplay
      ColonyPanel (count/rate, native colony action, instruction, stage caption)
      ProducersPanel -> ProducerRow (For by ProducerId)
      OfflineReport (Show)
      SaveNotice (For by stable notice identity)
      DebugControls (URL-gated)
      later: StagePanel, HallmarkTree, PrestigePanel, EndingView
      later: ColonyView -> existing SVG factories and defs
```

`App` consumes the controller store, persistence scheduling, injected active-time clock, and
actions. It may
pass typed intent callbacks such as `onDivide` or `onBuyProducer`, but it never passes
`setGame`. Components only express player intent; they cannot bypass validation, persistence,
or replay recording. Later surfaces extend this tree rather than establish their own stores.

### Colony action seam

`App` passes `ColonyPanel` the read-only `GameState`, the existing typed `onDivide` callback, and
the current disabled/recovery state. `ColonyPanel` owns local visual feedback only; it receives no
store setter and does not construct an event, persist, or reconcile. Its one native colony button
is the only keyboard focus target for division. Enter and Space call the existing `onDivide`
intent once. Its virtual button activation and `colony.tsx`'s typed `onCellActivate` path have
separate event-detail handling, so pointer/touch input delegates only when the target belongs to
rendered visible cell geometry and every activation reaches the intent once. Both paths therefore
arrive at the same `controller.divide()` contract, which remains the sole constructor of the
durable `click-divide` event.

The component groups authoritative count/rate, the large action object, a short instruction,
save/recovery state, immediate restrained feedback, and the stage-aware scientific caption. A
successful action may set a narrow local feedback signal; it never treats animation as the source
of truth. Reduced-motion users receive the same static highlight and visible state result. The
button stays readable while recovery blocks mutation, and the controller's existing unsaved status
continues to state a failed persistence result honestly.

The normal board is a 1280 x 800 (16:10) landscape composition: colony action at left, the living
tumor/progression world in the middle, and store at right. Its first view includes the large
colony, count/rate, active stage and hallmark progression, producer quantity controls, and
save/status. The first-view right rail keeps every producer discoverable: each row shows owned
count, next cost, affordability, and production contribution, with hover/focus revealing richer
derived statistics. Locked future content remains visible with its biological unlock condition;
the real game requirements determine when its action becomes available. At narrower widths it
retains that order as colony action, progression, then a full-width store, and it stacks in the
same order below the compact breakpoint. This is a responsive layout rule, not a second game mode.
Animation may supplement a data-derived cancer state, while a reduced-motion static cue preserves
the same state reading.

## Typed action and persistence seam

The illustrative M7 seam below is deliberately compile-shaped. `unwrap()` removes a Solid proxy;
it does **not** clone the tree. `plainGameSnapshot` therefore always makes an isolated
`structuredClone` before passing state to the framework-free event or persistence boundaries. It
uses no assertion: the current all-plain-data `GameState` type is preserved by both APIs.

F owns the named no-JSX, DOM-free controller boundary at `src/render/game_controller.ts`. It may
import Solid primitives and `solid-js/store`, but never `document`, `window`, `localStorage`, a
component, or the application entry. `main.tsx` and TSX components consume its typed surface.

The controller's atomic contract is fixed. It clones the current store, sends every typed or raw
event through `recordEvent`, then clones the accepted result for persistence. Only a successful
storage result permits `reconcile` to advance the store. Parser or reducer failure leaves the
store and persistence untouched. A persistence notice or thrown save-clock/storage adapter also
leaves the store unchanged and sets a narrow, visible unsaved-status signal; the UI must never
imply that the new state was saved. The failed intent is not retained or replayed: once storage
recovers, the player intentionally issues the action again. This prevents unwritable
`localStorage` from lying about durable state while retaining responsive controls once storage
recovers.

M8 adds a recovery block before this event funnel. A parser-rejected payload with retained raw
bytes and a storage read failure are distinct reasons, but both disable ordinary mutation,
persistence, ticks, and offline initialization. The visible confirmation uses the same validated
persistence boundary to start fresh; a failed confirmation remains blocked. The read-failure copy
does not claim that exact previous bytes were retained.

Two independently injected clocks have distinct meanings. `ActiveClock.now()` supplies a safe,
nonnegative integer simulation timestamp for event `atMs`; the controller rejects invalid output
before it forms the runtime event, so persistence is untouched. `SaveClock.now()` supplies a safe,
nonnegative integer wall-clock sample for envelope `savedAtMs`; it never substitutes for
`activeTimeMs`. The controller passes that sample to persistence. An invalid save sample is a
failed write result at the existing save boundary, while an exception from either the save-clock
sample or persistence adapter follows the same visible, no-reconcile failure path.

```ts
import { createSignal } from "solid-js";
import { createStore, reconcile, unwrap } from "solid-js/store";

import { recordEvent } from "../state/events.js";
import type { StorageLike } from "../state/save_load.js";
import { saveToStorage } from "../state/save_load.js";
import type { GameState } from "../types/state.js";
import type { SaveNotice } from "../types/save.js";

export type ActiveClock = Readonly<{ now: () => number }>;
export type SaveClock = Readonly<{ now: () => number }>;
export type PersistResult =
  Readonly<{ ok: true }> | Readonly<{ ok: false; notices: readonly SaveNotice[] }>;
export type PersistSnapshot = (state: GameState, savedAtMs: number) => PersistResult;
export type ApplyResult =
  | Readonly<{ ok: true }>
  | Readonly<{
      ok: false;
      kind: "persistence" | "recovery-blocked";
      notices: readonly SaveNotice[];
    }>;

export function plainGameSnapshot(game: GameState): GameState {
  return structuredClone(unwrap(game));
}

export function persistWithStorage(storage: StorageLike): PersistSnapshot {
  function persist(state: GameState, savedAtMs: number): PersistResult {
    const notices = saveToStorage(storage, state, savedAtMs);
    const result = notices.length === 0 ? { ok: true } : { ok: false, notices };
    return result;
  }
  return persist;
}

export function createGameController(
  initial: GameState,
  activeClock: ActiveClock,
  saveClock: SaveClock,
  persist: PersistSnapshot,
) {
  const [game, setGame] = createStore<GameState>(initial);
  const [saveError, setSaveError] = createSignal<string | undefined>();

  function applyRawEvent(raw: unknown): ApplyResult {
    const next = recordEvent(plainGameSnapshot(game), raw);
    const persisted = plainGameSnapshot(next);
    let write: PersistResult;
    try {
      const savedAtMs = saveClock.now();
      write = persist(persisted, savedAtMs);
    } catch {
      setSaveError("Progress is not saved. Keep this tab open and try the action again.");
      return { ok: false, kind: "persistence", notices: [] };
    }
    if (!write.ok) {
      setSaveError("Progress is not saved. Keep this tab open and try the action again.");
      return { ok: false, kind: "persistence", notices: write.notices };
    }
    setGame(reconcile(next));
    setSaveError(undefined);
    return { ok: true };
  }

  function divide(): ApplyResult {
    const result = applyRawEvent({ type: "click-divide", atMs: activeClock.now() });
    return result;
  }

  function debugOrImportedEvent(raw: unknown): ApplyResult {
    const result = applyRawEvent(raw);
    return result;
  }

  return { game, divide, debugOrImportedEvent, saveError };
}
```

`persistWithStorage` is the required production adapter over the actual
`saveToStorage(storage, state, savedAtMs)` API. That API returns `[]` only on success and returns a
nonempty `readonly SaveNotice[]` for ordinary serialization, quota, privacy, or write
failures. The controller treats notices as failure, and separately catches a save-clock or adapter
exception. It does not catch parser/reducer failures, so malformed raw input cannot create a
persistence side effect. The sample omits UI-specific presentation only; it does not permit a
different ordering or a second mutation path.

Producer, hallmark, stage, route, mutation, and other identifiers remain their established
branded types. Components receive already-branded IDs from catalog-backed view models; raw DOM
strings are converted only by the controller's explicit trusted catalog lookup before a typed
event is built.

## Client and server map

| Boundary       | M7 through M22 behavior                                                                                                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser client | SolidJS render, local event intents, injected active-time clock, `localStorage` only through the state owner, static SVG composition, accessibility behavior, and Playwright interaction. |
| Static build   | TypeScript/TSX is bundled to `dist/main.js`; `src/index.html`, `src/style.css`, and `.nojekyll` remain the GitHub Pages contract.                                                         |
| Server         | None. No SolidStart, router, loaders, resources, server functions, API routes, sessions, accounts, network calls, or secret environment values.                                           |

## CSS, SVG, and build policy

All CSS stays in `src/style.css`, the stylesheet copied by the production build. Components use
stable semantic class names and CSS custom properties; they do not add CSS Modules, Tailwind, or
inline style systems. CSS continues to meet keyboard focus, contrast, reduced-motion, narrow
viewport, and touch-target requirements.

M7 adds `solid-js` as a production dependency and `esbuild-plugin-solid` as its sole new
development dependency, beside the existing esbuild/tsx/Playwright tooling. The M7 owner installs
them normally and changes `package.json` and `package-lock.json` together; this documentation task
changes neither.

`tsconfig.json` preserves JSX (`"jsx": "preserve"`), uses
`"jsxImportSource": "solid-js"`, includes both `**/*.ts` and `**/*.tsx`, and retains required
Node types. `tsconfig.lint.json` includes `tests/` and `tools/` TypeScript and TSX files without
dropping Node types; ESLint's test glob includes `.tsx`. `check_codebase.sh` remains the fast
gate: its current Node/tsx test discovery runs pure controller/store atomicity and signal-isolation
tests that need no JSX or DOM. A pure Node test may import Solid primitives and `solid-js/store`; any test requiring
transformed TSX, a DOM, accessibility behavior, keyed identity/focus, cleanup, or interaction is
committed production-dist Playwright evidence through `run_playwright_tests.sh`.

`tools/build_solid.mjs` is the one sanctioned production bundle implementation: it imports
esbuild's JavaScript `build` API and `solidPlugin`, and preserves ESM, `es2020`, browser, minify,
sourcemap, and `dist/main.js` outfile settings. `build_github_pages.sh` remains the public front
door: it resolves `src/main.tsx` before `src/main.ts`, delegates exactly one bundle invocation to
that wrapper, and preserves the existing front door, `dist/` cleanup, asset copying, `.nojekyll`,
and assertions. It never runs a second raw-esbuild bundle.

## M7 migration steps

1. F owns `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.lint.json`, the ESLint
   test glob, `check_codebase.sh`, `tools/build_solid.mjs`, `build_github_pages.sh`,
   `src/main.tsx`, `src/render/game_controller.ts`, `src/render/**/*.tsx`, `src/index.html`, and
   `src/style.css`. Add the approved packages and TSX settings, then make the wrapper compile a
   minimal `src/main.tsx` through the unchanged production-build front door.
2. Replace the M1 DOM probe with `App`, `GameShell`, `NumberDisplay`, and `ProducersPanel` TSX
   components while retaining accessible semantic controls and the existing static shell IDs.
3. Introduce exactly one controller store from the loaded/recovered `GameState` in
   `src/render/game_controller.ts`; route every UI, debug, and imported event through the action
   seam above. Use `persistWithStorage` with separately injected active and save clocks; reconcile
   only after its empty-notice success result.
4. I owns `tests/test_solid_controller.mjs` and committed
   `tests/playwright/m7_minimal_playable.mjs`. Add the live tick through the M6 injected active-time
   clock, URL-gated debug fast-forward, recovery notice, offline report, and real production-dist
   browser workflow. Neither F nor I changes `src/state/`, economy, BigNum, or SVG contracts.
5. Keep later stage, hallmark, prestige, ending, and SVG components as leaf consumers of the
   same controller contract. They do not add framework state to the engine.

## Test oracles and success gates

I owns `tests/test_solid_controller.mjs`, imported through the existing Node/tsx loader from only
the no-JSX controller module. Its success criteria are clone isolation, canonical BigNum shape,
hostile raw input with no write, one `recordEvent` route, UI-only signal isolation, and
result-aware dual-clock save atomicity. The corpus uses `persistWithStorage` for success, returned
notice failure, and invalid save metadata; it also covers thrown save-clock/adapter failure and an
intentional reissue after recovery. On every unsuccessful write the old visible `GameState` stays
unchanged and the unsaved signal is set. These Node tests make no JSX render, effect-count,
identity/focus, accessibility, or lifecycle claim.

I also owns committed production-dist Playwright proof as the sole owner of real JSX DOM
granularity/effect instrumentation, `<For>` identity and focus, and `onCleanup`. It additionally
proves keyboard division/purchase, focus visibility, recovery announcement, reduced motion, narrow
layout, click/buy/idle/reload, saved state, clock-skewed offline grant, zero browser errors, and a
captured screenshot. The build integration test proves `./build_github_pages.sh` resolves
`main.tsx`, produces `dist/main.js`, and ships no raw JSX. The M7 gate runs strict TypeScript for
TSX, Prettier, ASCII and Markdown-link checks, `git diff --check`, `./check_codebase.sh`,
`./build_github_pages.sh`, and `./run_playwright_tests.sh`.

## M7 accepted evidence

M7 is complete as of 2026-08-27. The controller/store lane passed 75 Node/tsx tests and the
canonical `./check_codebase.sh` five-check gate; production build output passed through the one
Solid wrapper. Six production-dist Playwright tests then proved the transformed TSX boundary:
keyboard click and purchase, idle and reload persistence, actual offline gain, clock skew and
recovery notices, same-node keyed-row focus restoration, `onCleanup`, zero console/page errors,
and a captured production screenshot. The final Python documentation gate reported 723 passing
tests, and `git diff --check` passed.

The normal UI intentionally has no debug mutation surface. Under the exact `?debug=1` gate, the
test-only "Prepare 2-minute offline reload" action temporarily backdates the injected `SaveClock`,
persists through the controller, and restores the normal clock in `finally`. It neither writes
storage directly nor mutates game state. Offline replay always runs, but the progress card is
shown only for at least 1,000 ms of applied offline time; zero/skew/cap notices remain visible.

Accessibility evidence measures the format target and all 32 purchase targets at least 44 px in
both desktop and 360 px layouts, including disabled buttons. The narrow page has no horizontal
overflow; focus styling, reduced motion, semantic purchase groups, and readable disabled copy are
part of the production proof. No Vitest, Vite, jsdom, or Testing Library is part of this contract:
the normal Node/tsx gate owns DOM-free controller behavior, while production-dist Playwright owns
real DOM, lifecycle, and accessibility behavior.

M8 separately owns retained corrupt-raw save protection. M7 recovers into a fresh state and does
not write until an intentional action, but it does not accept a policy allowing retained rejected
raw data to be overwritten; the contract-freeze milestone must make that boot/UI policy explicit.

## Risks and scope assessment

Reactivity risk: React-shaped prop snapshots, dynamic `map`, direct store mutation, or a second
store would bypass fine-grained updates and the event funnel. This is in scope for M7 review.

Server-boundary risk: adopting SolidStart, resources, a router, or network data would create
serialization and deployment behavior the static release does not own. This is out of scope
unless a later design decision explicitly reopens it.
