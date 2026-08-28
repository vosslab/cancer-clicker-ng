# Cookie Clicker increment system

This document traces how the local 2013 Cookie Clicker snapshot turns one click into a layered idle
economy. It complements [COOKIE_CLICKER_SOURCE_LAYOUT.md](COOKIE_CLICKER_SOURCE_LAYOUT.md) and
[COOKIE_CLICKER_VISUAL_LAYOUT.md](COOKIE_CLICKER_VISUAL_LAYOUT.md).

## Core resource model

The snapshot separates several meanings that all involve cookies:

| Field | Meaning |
| --- | --- |
| `Game.cookies` | Current spendable balance. |
| `Game.cookiesEarned` | Lifetime cookies earned in the current run. |
| `Game.handmadeCookies` | Lifetime production from direct clicks. |
| `Game.cookiesPs` | Current global production per second. |
| `Game.cookiesReset` | Production forfeited across resets. |
| `Game.cookieClicks` | Accepted direct-click count. |
| `Game.goldenClicks` | Golden-cookie interaction count. |

`Game.Earn(amount)` increases both the balance and current-run lifetime total. `Game.Spend(amount)`
reduces only the balance. That distinction lets purchases consume currency without erasing progress
gates, achievements, or prestige evidence.

## Main feedback loop

```text
direct click ------------------------------+
                                           v
30 Hz production tick -> Game.Earn() -> spendable cookies
                                           |
                                           v
                                  building or upgrade
                                           |
                          +----------------+----------------+
                          v                                 v
                    higher base CpS               new multiplier or link
                          |                                 |
                          +---------------+-----------------+
                                          v
                              higher click and idle yield
```

The important design is not exponential numbers by themselves. Every layer feeds the same visible
resource and strengthens the next decision.

## Purchase curve

Every building uses the same geometric price rule:

```text
next_cost(owned) = base_price * 1.15 ^ owned
```

The store displays the rounded result, while the purchase checks and spends the unrounded floating
value. On a successful purchase, the building:

1. Spends the current price.
2. Increments `amount` and lifetime `bought`.
3. Computes the next price.
4. Runs its content-specific purchase callback.
5. Marks the store and production totals dirty.
6. Reveals the building's center row after its first non-cursor purchase.

This shared rule gives all 10 building types a recognizable cost rhythm while their base prices and
production rates create the ladder.

## Production calculation

`Game.ComputeCps()` supplies one local building formula:

```text
unit_cps = (base + additive_bonus) * 2 ^ doubling_count + cross_system_bonus
building_cps = amount_owned * unit_cps
```

`Game.CalculateGains()` then composes the global total:

```text
raw_cps = sum(building_cps for every building)

global_multiplier =
    1
  + additive cookie-upgrade percentages
  + research percentages
  + 2 percent per heavenly chip

global_multiplier *= kitten and milk multipliers
global_multiplier *= temporary frenzy or clot multiplier
global_multiplier *= elder-covenant penalty when active

cookies_per_second = raw_cps * global_multiplier
```

The 30 Hz logic step adds `cookies_per_second / 30` to the balance. Delayed frames run extra logic
steps, capped at five seconds of catch-up.

## Direct click calculation

The click starts at one cookie and uses a parallel modifier stack:

```text
click_yield = click_frenzy * (
    (1 + reinforced_finger_bonus) * 2 ^ click_doubling_count
    + non_cursor_finger_bonus
    + purchased_percent_of_cps_bonus
)
```

This creates two important cross-links:

- Owning non-cursor buildings can strengthen clicks and cursors through the finger upgrades.
- Mouse upgrades add a percentage of global CpS to every direct click.

The direct action therefore remains relevant after automation begins. It is not a disconnected
opening mechanic that becomes meaningless once producers exist.

## Producer identities

The building ladder contains Cursor, Grandma, Farm, Factory, Mine, Shipment, Alchemy lab, Portal,
Time machine, and Antimatter condenser. Each building combines four kinds of differentiation:

- A distinct base price and base production rate.
- A local additive upgrade.
- Several doubling upgrades.
- A visual row, icon, background, and owned-sprite arrangement.

Grandmas add a deeper cross-building system. Owning later building families unlocks themed grandma
upgrades, and research adds self-scaling and portal-linked production. The result is a network of
reinforcement rather than ten isolated linear counters.

## Unlock layers

The economy reveals content through several kinds of evidence:

| Evidence | Consequence |
| --- | --- |
| First, tenth, fiftieth, or later building ownership | Unlocks building-specific upgrades. |
| Lifetime cookies earned | Unlocks global cookie multipliers and achievements. |
| Handmade cookies | Unlocks click-linked mouse upgrades and achievements. |
| Golden-cookie clicks | Unlocks frequency and duration upgrades. |
| Achievement count | Raises milk progress and unlocks kitten multipliers. |
| Grandma and building combinations | Unlocks grandma specializations and research. |
| Reset production | Produces heavenly-chip prestige. |

This is the strongest transferable system-level lesson. Different player behaviors create distinct
progress evidence, but nearly every reward returns to click yield, idle yield, visual state, or the
next unlock.

## Temporary opportunities

The golden cookie adds an interrupt layer above the steady economy. It appears after a randomized
delay, stays visible for a bounded duration, and chooses from effects such as:

- A temporary global production multiplier.
- A temporary direct-click multiplier.
- A balance award capped by owned cookies or a duration of current CpS.
- A negative balance or production effect during wrath states.
- A chained sequence with escalating repeated digits.

The balance awards depend on current economy state, so a random opportunity remains proportionate
to the player's run. The snapshot uses unseeded browser randomness and direct mutation; any Cancer
Clicker NG equivalent must cross the typed event parser, reducer, persistence, and replay boundary.

## Prestige loop

A reset moves current-run production into `cookiesReset`. Heavenly chips are derived by inverting a
triangular progression after scaling reset cookies by one trillion:

```text
scaled = cookies_reset / 1,000,000,000,000
heavenly_chips = floor((-1 + sqrt(1 + 8 * scaled)) / 2)
```

Each chip contributes two percentage points to the global production multiplier. Resetting therefore
turns erased run progress into a durable acceleration for later runs.

## What the loop does well

- Direct clicks remain useful after idle production starts.
- One geometric cost rule makes the store immediately learnable.
- Local upgrades, global upgrades, temporary effects, and prestige stack in distinct layers.
- Lifetime evidence unlocks content without competing with the spendable balance.
- Achievements affect the visible milk layer and later production, not only a checklist.
- Building purchases create both numeric growth and an owned-world visual consequence.
- Random opportunities scale from the current economy instead of using a fixed reward.
- The same producer identity appears in its cost, output, art, upgrades, and achievements.

## Snapshot limitations

- The snapshot has no implemented offline-production path despite mentioning one in update text.
- Floating-point balances and rounded display prices can diverge at boundaries.
- Saves floor several numeric fields and bind arrays to catalog position.
- Bulk purchases are not part of the building purchase contract.
- The row contribution display uses pre-global building totals, so displayed rows do not always sum
  to the top-line CpS after global multipliers.
- Random events are neither seeded nor replayable.
- Economy mutation, unlock checks, achievements, persistence, and DOM refresh share one global loop.

## Lessons for the parent

Cancer Clicker NG already has stronger technical owners in `src/economy/`, `src/state/`, and
`src/bignum/`. The parent should borrow reinforcement patterns without weakening those contracts.

### Keep current strengths

- Keep `quoteProducerPurchase()` authoritative for displayed debit and reducer execution.
- Keep marginal production quotes on the same modifier path as live and offline production.
- Keep effective row contributions additive to the displayed global rate.
- Keep BigNum arithmetic, stable IDs, strict current-schema parsing, and exact event validation.
- Keep live and offline production on the same economy adapter.

### Borrow next

1. Make every purchased producer leave a persistent visible consequence, not only a higher owned
   number. The machine can accumulate parts, output pulses, or a route into the tumor arena.
2. Preserve multiple progress evidence lanes: direct divisions, producer ownership, hallmark
   choices, stage progress, and reset history should each unlock something recognizable.
3. Keep the direct cell click strategically relevant through explicit, biologically named links to
   automation. Any link should be quoted and visible, not hidden in a multiplier.
4. Let milestone systems change the world. Achievement-like evidence can affect specimen layers,
   machine art, stage sigils, or the compact HUD rather than becoming a separate trophy page.
5. Consider rare, bounded biological opportunities only after the core loop is calibrated. They
   must be deterministic or replay-recorded and must use the canonical event funnel.
6. Keep the price ladder aspirational. Showing later producers and their requirements helps players
   form a plan even when only the first purchase is affordable.

The near-term priority is visual consequence, not another currency. Cookie Clicker's economy feels
dense because many systems reinforce one loop; Cancer Clicker NG should make its existing biology
systems reinforce the living center clicker just as visibly.

See [BALANCE.md](BALANCE.md) for the parent repository's current calibration contract and
[SYSTEM_INTERACTIONS.md](SYSTEM_INTERACTIONS.md) for its authored cross-system effects.
