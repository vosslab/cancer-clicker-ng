# Cookie Clicker source layout

This document reviews the local Cookie Clicker checkout as implementation evidence for Cancer
Clicker NG. It describes the checked-out snapshot, not the architecture of the current live Cookie
Clicker game.

## Review scope

| Evidence | Observed snapshot |
| --- | --- |
| Local source | `OTHER_REPOS/cookie-clicker/` |
| Git commit | `66e2542e2d56bbe68dedf4f4bc37b9111c169293` |
| Commit date | 2013-09-26 |
| Displayed game version | `Game.version = 1.036` |
| Main authored files | 6 HTML, CSS, and JavaScript files plus `README.md` |
| Image catalog | 65 PNG files and 6 JPG files |
| Runtime catalogs | 10 buildings, 109 upgrades, and 92 achievements |

The HTML source states that the code and graphics remain Orteil's copyrighted work. These notes
study the implementation and identify transferable patterns; they do not make the local checkout a
source of assets or code to copy into Cancer Clicker NG.

## Top-level files

| Path | Responsibility |
| --- | --- |
| `index.html` | Declares the permanent DOM anchors and loads scripts in dependency order. |
| `main.js` | Owns boot, state, economy, catalogs, saves, menus, rendering, and the loop. |
| `style.css` | Owns the three-column board, sprites, interaction states, and effects. |
| `dungeons.js` | Adds the unfinished dungeon feature through the global `Game` object. |
| `base64.js` | Supplies save-string encoding and decoding used by `main.js`. |
| `ajax.js` | Supplies the update-check request helper used by `main.js`. |
| `img/` | Holds producer art, repeating environments, UI panels, sprites, and effect textures. |

This is a static site with no module loader, package manifest, build step, or test suite in the
snapshot. The browser receives authored files directly.

## Boot sequence

`index.html` establishes a strict load order because every script communicates through globals:

```text
index.html
  |
  +-- base64.js  -> global Base64
  +-- ajax.js    -> global ajax()
  +-- dungeons.js -> global LaunchDungeons()
  +-- main.js
        |
        +-- create global Game
        +-- Game.Launch() defines Init, Logic, Draw, and Loop
        +-- window.onload calls Game.Init()
        +-- Game.Init() constructs catalogs and dynamic DOM
        +-- LaunchDungeons() extends Game
        +-- Game.LoadSave()
        +-- Game.Loop()
```

The key strength is legibility: a reader can find the whole startup path in one place. The cost is
that script order is an implicit dependency contract and almost every subsystem can mutate every
other subsystem.

## Runtime ownership

### One global object

`Game` is simultaneously:

- The mutable state container.
- The service registry.
- The building, upgrade, and achievement catalog.
- The command surface for clicks, purchases, saves, menus, and resets.
- The derived-economy calculator.
- The renderer and animation coordinator.
- The loop scheduler.

This creates a very short path from a game rule to a visible result. It also removes module
boundaries: a building callback can unlock upgrades, win achievements, redraw rows, and change
global calculation flags in the same function.

### Constructor catalogs

`Game.Object`, `Game.Upgrade`, and `Game.Achievement` act as registration functions. Constructing a
record assigns its numeric ID, places it in both a name lookup and an ordered array, and attaches
behavior directly to the record.

The building constructor is especially dense. One record owns:

- Stable catalog facts such as name, base price, icon, and base production.
- Mutable facts such as amount owned and lifetime output.
- Purchase, sale, refresh, and special-screen behavior.
- DOM construction for its center production row.
- The draw callback for owned sprites.

This makes the content definition highly expressive, but it couples domain data, mutations, DOM,
and art placement.

### Static anchors, dynamic content

`index.html` supplies only the durable page skeleton: left, middle, and right sections; the large
cookie; menu and news anchors; store containers; particles; tooltip; and background layers.
`main.js` builds the repeating content with HTML strings:

- Each non-cursor building creates a center `row` during catalog construction.
- `Game.RebuildStore()` rebuilds every building purchase tile.
- `Game.RebuildUpgrades()` rebuilds the unlocked upgrade crates.
- Menu functions replace the middle-column menu markup.
- Particle pools and cursor sprites are created and updated by ID.

The useful architectural idea is a stable shell with replaceable, state-driven regions. Cancer
Clicker NG already expresses that idea more safely with Solid components and typed props.

## Loop phases

The snapshot separates simulation work from visual work even though both live in `main.js`:

```text
Game.Loop()
  |
  +-- Game.Logic()
  |     mutate state, earn production, expire effects,
  |     unlock content, rebuild dirty catalogs
  |
  +-- catch-up Game.Logic() calls for up to 5 seconds of delay
  |
  +-- Game.Draw()
  |     update positions, classes, counters, row details, and effects
  |
  +-- setTimeout(..., 1000 / 30)
```

Three dirty flags avoid rebuilding everything on every frame:

- `recalculateGains` requests authoritative CpS and click-yield recalculation.
- `storeToRebuild` requests building-store reconstruction.
- `upgradesToRebuild` requests upgrade-store reconstruction.

The flags are simple and effective for a mutable DOM application. Cancer Clicker NG should retain
the underlying lesson - make expensive derived work and its invalidation explicit - while keeping
pure selectors and Solid reactivity as the implementation.

## Persistence coupling

The save is a compact, positional string. Building state follows `Game.ObjectsById`; upgrade and
achievement bits follow their catalog arrays. Source comments warn that inserting a new upgrade or
achievement in the middle breaks saves.

This is the clearest architecture lesson not to copy. Catalog display order, runtime identity, and
serialized identity are the same thing. Cancer Clicker NG's branded string IDs, strict parser,
current schema, and explicit reconstruction keep those owners separate.

## What works well

- The complete action-to-feedback path is easy to locate.
- Catalog construction makes a large amount of content consistent.
- A stable DOM shell supports dynamic progression without page navigation.
- Logic and draw are named phases rather than one undifferentiated callback.
- Dirty flags make derived-state refresh visible and intentional.
- One building definition supplies its store identity and its owned-world identity.
- The asset catalog uses consistent producer, icon, and background families.

## Modernization boundaries

Cancer Clicker NG should not adopt these source-era constraints:

- Global mutable state and global script-order dependencies.
- Catalog records that mix state, economy, DOM, and rendering.
- Inline `onclick` strings and string-generated interactive markup.
- Numeric array position as the save identity.
- Direct DOM reads and writes throughout simulation code.
- A timer loop that owns simulation, rendering, and browser persistence together.
- An unfinished feature module that mutates the core namespace during initialization.

## Lessons for the parent

- **Traceable boot:** Keep `src/main.tsx` small and document composition through
  `src/render/app.tsx`.
- **Consistent catalogs:** Keep typed catalogs and stable branded IDs in their domain modules.
- **One economy path:** Share pure production and quote functions across UI, reducer, live tick,
  and offline replay.
- **Purchase-to-world projection:** Project canonical producer state into both rack art and visible
  tumor-world effects.
- **Logic and drawing boundary:** Keep framework-free state transitions below Solid and SVG
  presentation.
- **Explicit derived work:** Use narrow memos and selectors instead of adding global dirty flags.
- **Stable shell:** Keep the HUD and three major board regions stable while their contents evolve.

The parent should learn from the source's visibility of ownership, not from its lack of boundaries.
The useful target is a traceable pipeline:

```text
catalog -> quote -> parsed event -> reducer -> durable state -> projection -> Solid -> SVG/CSS
```

The economy details are in
[COOKIE_CLICKER_INCREMENT_SYSTEM.md](COOKIE_CLICKER_INCREMENT_SYSTEM.md). The screen composition
and center-clicker adaptation are in
[COOKIE_CLICKER_VISUAL_LAYOUT.md](COOKIE_CLICKER_VISUAL_LAYOUT.md).
