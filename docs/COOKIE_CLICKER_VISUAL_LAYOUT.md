# Cookie Clicker visual layout

This document records the visual and interaction layout of the local 2013 Cookie Clicker snapshot,
then identifies how Cancer Clicker NG should adapt it. The owner preference is explicit: the living
clicker belongs in the middle, with the other major columns on its left and right.

## Review evidence

The review combined source inspection of `index.html`, `style.css`, and the DOM-building portions of
`main.js` with temporary local Chromium captures. The captures covered:

- Initial state at 1280 x 800.
- The first owned non-cursor building at 1280 x 800.
- Initial state at 360 x 800.

The screenshots were temporary review artifacts and are not project assets. Observations apply only
to commit `66e2542e2d56bbe68dedf4f4bc37b9111c169293`.

## Desktop frame

At 1280 x 800, a 32-pixel top bar sits above a 768-pixel game area. The measured regions are:

| Region | Left | Width | Main job |
| --- | ---: | ---: | --- |
| Click field | 0 px | 384 px | Count, CpS, large cookie, cursor ring, milk, and particles. |
| Production field | 384 px | 563 px | News/menu header and revealed owned-building rows. |
| Store | 980 px | 300 px | Upgrade crates and all building purchase tiles. |

Textured 16-pixel separators and padding occupy the gaps between the measured content boxes.

```text
+--------------------------------------------------------------------------------+
| 32 px site bar: title, creator links, help, update route                       |
+------------------------+----------------------------------+--------------------+
|                        | Menu + news ticker               | STORE              |
|                        +----------------------------------+ upgrade crates     |
| count and CpS          |                                  |                    |
|                        | owned production rows appear     | Cursor             |
|    LARGE COOKIE        | here, one illustrated world      | Grandma            |
|                        | strip per non-cursor building     | Farm               |
| cursor ring            |                                  | Factory            |
| click numbers          |                                  | ...                |
| milk and particles     |                                  | fixed 300 px rail  |
+------------------------+----------------------------------+--------------------+
```

The three columns answer three questions without navigation:

- Left: What can I do repeatedly, and what am I producing now?
- Middle: What has my production system become?
- Right: What can I buy next?

That separation of action, consequence, and next decision is more important than the exact column
order.

## Dynamic disclosure

The initial middle field is mostly empty beneath the news header. This quiet space creates
anticipation rather than presenting every system at once.

Every non-cursor building row exists from initialization but starts hidden. Buying the first unit
changes its class to `row enabled`. The observed first Grandma purchase revealed a 547 by 160 pixel
row directly below the header. Its repeating bakery background and owned grandma sprite turn a
numeric purchase into a place.

Cursor ownership uses a different spatial consequence: cursor hands arrange around the large cookie
instead of receiving a middle row. The distinction makes the first producer family reinforce the
primary action while later families build a production landscape.

The store follows the opposite disclosure rule. All building tiers remain visible from the start,
with unaffordable rows dimmed and prices red. The player can see the long-term ladder before owning
any part of it.

## Hierarchy and density

### Primary action

The large 256-pixel cookie is the strongest shape in the first read. It sits near the center of its
own column, has a rotating shine, grows slightly on hover, compresses on activation, and receives
floating numbers and falling cookie particles.

### Persistent status

The balance and CpS sit directly above the click target on a translucent dark band. They do not
move when the store, menu, or production rows change. The browser title also receives the current
balance.

### Store ladder

The right rail uses 64-pixel building tiles. Each tile combines:

- A family illustration.
- A large producer name.
- A price with a shared resource icon.
- A large, quiet owned count after purchase.
- Opacity and price color for affordability.
- A richer hover tooltip.

Upgrades use 60-pixel crates above the producer list. The compact sprite grid makes newly available
upgrades feel collectible without displacing the permanent building ladder.

### Owned-world rows

Each middle row is 128 pixels high plus a separator and padding. The row uses a repeating
environment background and one sprite per owned building. Horizontal overflow allows the owned
scene to extend without shrinking its objects.

Hovering a row reveals an information panel with owned count, local production, lifetime production,
and a sell action. The normal state stays visual; detail appears at the point of interest.

## Feedback layers

Cookie Clicker stacks many small feedback channels around the same economy:

- Hover enlargement and press compression on the click target.
- Floating `+amount` numbers at the target.
- Falling cookie particles and rate-dependent background showers.
- A rotating shine and orbiting cursor hands.
- Affordable versus unaffordable store opacity and price color.
- Owned producer sprites in the middle field.
- Achievement popups.
- A milk level derived from achievement progress.
- Random golden cookies placed over the whole game surface.
- A changing news ticker tied to lifetime production and owned systems.

No single effect carries the whole experience. The game feels responsive because the same state
change is acknowledged numerically, spatially, and decoratively.

## Menu behavior

Menu, Stats, and Updates controls occupy the edges of the middle header. Opening a menu hides the
owned rows and uses the middle field as the menu surface. The click field and Store stay in place.

This is a strong progressive-disclosure pattern: secondary information temporarily reuses one
region instead of replacing the entire game. Cancer Clicker NG's inspector drawer and active
evolution surface serve a similar purpose with better keyboard and focus behavior.

## Small viewport result

The snapshot has no media queries. At 360 x 800:

- The 300-pixel right Store overlaps most of the viewport.
- The 30-percent click column becomes too narrow for the 256-pixel cookie.
- The middle column collapses under fixed right offsets and separators.
- Top-bar links collide.
- Major content becomes clipped and visually interleaved.

The fixed desktop composition is valuable as a desktop grammar, not as a responsive implementation.

## Accessibility boundary

The source uses non-semantic `div` and `a` controls, inline mouse handlers, hover-only detail, and a
page-wide text-selection ban. The primary click, store, menu, and tooltip surfaces do not provide a
modern keyboard or assistive-technology contract.

Cancer Clicker NG should retain its native buttons, accessible names, focus-visible tooltips, one
keyboard click target, reduced-motion equivalents, and responsive source order.

## Parent layout direction

Cancer Clicker NG should adapt the three-question grammar while centering its primary action:

```text
+--------------------------------------------------------------------------------+
| HUD: cells, cells/s, active stage, save state, compact utilities               |
+----------------------+--------------------------------------+------------------+
| EVOLUTION            | LIVING TUMOR CLICKER                 | UPGRADE RACK     |
| stage and next gate  |                                      | buy quantity     |
| hallmark sigils      | largest visual mass                  | machine rows     |
| routes and resets    | click visible cells                  | owned count      |
| culture and network  | local feedback and tumor changes     | cost and +rate   |
| active detail        |                                      | compact detail   |
+----------------------+--------------------------------------+------------------+
| compact rewards, notices, and transient feedback                               |
+--------------------------------------------------------------------------------+
```

The center tumor remains larger than either side column. The left column owns progression and
biological decisions; the right column owns producer purchases. Rewards and save feedback remain
compact rather than becoming a competing fourth column.

For narrow screens, task order should remain:

```text
living tumor clicker -> evolution and progression -> upgrade rack -> rewards
```

The DOM can keep that task-first order while desktop CSS grid areas place Evolution on the visual
left and the arena in the visual center. This avoids copying Cookie Clicker's mobile failure or
making keyboard reading order follow a decorative desktop arrangement.

## Transfer rules

- Keep stable action, consequence, and purchase regions. Put the living clicker in the center and
  use a real responsive grid instead of fixed offsets.
- Keep balance, rate, and the Store always visible. Use a shallow accessible HUD and one
  authoritative calculation for top-line and row values.
- Keep the aspirational producer ladder. State biological unlock conditions and the route to each
  locked system.
- Make purchases appear in the world. Add machine and tumor-world consequences beyond the owned
  number.
- Keep the normal state visual and disclose detail on demand. Support focus and activation, not
  hover alone.
- Reuse a stable region for secondary surfaces. Preserve focus and give every temporary surface an
  explicit close route.
- Layer action feedback around accepted durable intent. Keep every required state readable without
  motion.

## Recommended next use

This review is a reference, not an implemented layout change. If the center-clicker preference is
implemented, the design contract and rendered acceptance should be updated together:

- Make the desktop grid visually `evolution / arena / rack`.
- Keep the arena first in task and narrow-screen order.
- Preserve the arena as the largest visual mass.
- Keep both side columns useful in the first 1280 x 800 view.
- Make owned producer levels accumulate visible machinery or arena-linked consequences.
- Review 1280 x 800, 360-pixel width, keyboard order, focus disclosure, and reduced motion.

The parent visual contract remains [ART_DIRECTION.md](ART_DIRECTION.md). Source ownership is in
[COOKIE_CLICKER_SOURCE_LAYOUT.md](COOKIE_CLICKER_SOURCE_LAYOUT.md), and the economy reinforcement
model is in [COOKIE_CLICKER_INCREMENT_SYSTEM.md](COOKIE_CLICKER_INCREMENT_SYSTEM.md).
