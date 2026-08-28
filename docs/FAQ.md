# Frequently asked questions

## Is this medical software?

No. Cancer Clicker NG is a fictional biology-learning game. Its tumor scene is a stylized game
abstraction, not a patient image, diagnosis, prognosis, treatment recommendation, or clinical
simulation. [MORPHOLOGY_REFERENCE.md](MORPHOLOGY_REFERENCE.md) identifies the bounded biology
reference role.

## Where do I click?

Click a visible cell membrane or nucleus in the living tumor arena. The surrounding tissue and
open space do not divide cells. Keyboard players focus **Divide cell** and press Enter or Space;
this uses the same game action.

## What do the small icons mean?

Icons identify families such as hallmarks, producers, culture, or network decisions. Text labels
remain the authoritative control names. Hover, focus, or press a compact control to read its
tooltip; open the specimen drawer for selected biological details.

## Why is only one evolution area open?

The evolution dock keeps one decision family active so the board remains playable at 1280 x 800
and at narrow widths. Switching tabs changes local UI presentation only; it does not discard,
reset, or advance durable progress.

## Does the Chicago report end the game?

No. It is an optional earned scale report. Direct cell division, producers, culture, dissemination,
and offline production continue after it opens. The comparison is a fictional volume analogy, not a
claim about Chicago or disease spread.

## Can I keep progressing?

Yes. The Chicago report is a soft ending, not an economic stop. Direct division and producers keep
growing, while the four reset systems, culture, and renewable dissemination network continue to
offer decisions. [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) explains those long-term systems.

## What does a reset change?

Each reset is a deliberate strategic choice with its own retained history, currency, and target
stage. The game shows the consequence before you confirm it; it never performs a reset while you
are away. [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) owns the four reset contracts.

## What happens while I am away?

On return, the game applies a bounded production gain and reports it. It does not spend cells,
buy upgrades, advance stages, or choose resets for you. [GAME_DESIGN.md](GAME_DESIGN.md) documents
the offline model.

## Why did my old save open recovery?

The pre-production game accepts only the current `version: 2`, `stateSchemaVersion: 8` save shape.
An invalid or older shape stays protected until you explicitly choose a validated fresh replacement.
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) documents this current-schema contract.

## Why use SolidJS?

SolidJS keeps the browser board responsive while the game rules, economy, saves, and replay remain
framework-free TypeScript. [SOLID_MODEL.md](SOLID_MODEL.md) defines that boundary for contributors.

## Can I play with a keyboard or reduced motion?

Yes. Focus **Divide cell** and press Enter or Space for the same division action. Controls keep
accessible names, tooltips work on focus, and reduced-motion preferences retain the board and its
actions while removing motion. [SOLID_MODEL.md](SOLID_MODEL.md) defines the interaction contract.

## Why did nothing happen after I clicked?

A pointer click must land on a visible cell. Try a membrane or nucleus, or use the focused
**Divide cell** control with Enter or Space. A disabled control can indicate that the protected
save-recovery screen needs an explicit choice.
