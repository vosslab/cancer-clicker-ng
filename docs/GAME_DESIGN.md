# Game design

## Player loop

Cancer Clicker NG is a fictional incremental cancer-biology game built around a living tumor game
board. Click a visible cancer cell to divide, use earned cells to buy illustrated molecular
machines, choose one active evolution family, and revisit new decisions as the colony progresses.
The initial 1280 x 800 board keeps the tumor, progression, and upgrade rack visible together, so
the main loop never collapses into a single generic button.

The board depicts state consequences: a colony becomes denser, establishes perfusion, expresses
hallmark-linked morphology, develops hypoxia or necrosis, invades, and later forms a saved network.
These are stylized systems-level game cues. They do not represent a patient, treatment advice,
diagnosis, prognosis, outbreak, or clinical simulation.

## Board grammar

| Surface                   | Decision promise                                                                                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Shallow scoreboard HUD    | Always shows cell count, cells/s, stage, save condition, number format, and an optional specimen route.                          |
| Living tumor arena        | A pointer action must land on visible cell geometry; Enter and Space activate the same `Divide cell` control.                    |
| Evolution dock            | Shows six compact icon tabs while one family is active, keeping upgrades legible rather than stacking every system at once.      |
| Illustrated upgrade rack  | Keeps buy quantity, machine art, owned level, next cost, marginal benefit, and biological details continuously available.        |
| Tooltip and drawer routes | Explain unfamiliar icons, biological tradeoffs, and specimen facts when requested without turning the first board into a manual. |

The icon is a family cue, not the only instruction. Decorative SVG marks sit beside text labels;
icon-first utility controls retain explicit accessible names and tooltips. High-consequence choices
keep their words visible.

## Progression and continued play

Stages and hallmarks create new constraints and tradeoffs rather than replacing the base loop.
The L1-L4 reset systems, culture, and dissemination network add durable choices while producers
and direct division continue to matter. [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) owns the detailed
reset and network contract; [PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md) owns the hallmark
branches and gates.

The optional Chicago-scale report is earned only at `global_lab_contamination` after the required
dissemination evidence and modeled `2.5e25` cell scale. Its high-rise-volume comparison is a
transparent fictional scale analogy, not a claim about buildings or biology. Opening it records a
durable event, and it remains revisitable after reload. Reaching it never stops direct division,
producer economics, offline gain, culture, or network decisions.

## Return from absence

On return, the game reports bounded earned production and any safety notice. It does not spend
cells, choose an upgrade, advance a stage, or perform a reset for the player. `src/state/offline.ts`
orchestrates absence while `src/economy/tick.ts` supplies the same formula used during live play.
The maximum applied absence is seven days, evaluated in 60,000 ms macro-steps with at most one
positive remainder.

The current save contract is `version: 2` and `stateSchemaVersion: 8`.
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) owns strict parsing, protected unreadable bytes, and
the explicit fresh-replacement route. Semantic replay compares normalized durable state and visible
progression, not serialized-byte identity.

## Evidence and calibration

`./check_codebase.sh` is the aggregate TypeScript gate. Production browser tests establish
interaction and accessibility behavior; rendered screenshots establish visual hierarchy at the
board target and narrow responsive width. Those rendered checks are qualitative acceptance evidence,
not pixel-equivalence or arbitrary machine-timing gates.

The deterministic balance laboratory is a development instrument. It compares visible-state-only
policies and records traces, witnesses, completions, stalls, and outliers for a human tuning
decision. [BALANCE.md](BALANCE.md), when present, owns the accepted calibration conclusion;
generated reports remain one-time output rather than a player-facing score.
