# Visual-first screenshot review

**Review scope:** seven fresh 1280 x 800 documentation PNGs at original detail.
**Status:** accepted 2026-08-28 after independent original-resolution review.

## Acceptance question

The review asks whether the completed board reads as a living incremental cancer game: a direct
tumor action, shallow HUD, one active evolution family, illustrated upgrade rack, compact icon
language, and an earned Chicago scale report that preserves continued-play context. It evaluates
only what is observable in static images.

## Required frame checklist

| Frame                   | Artifact                               | Image-observable criteria                                                                            | Verdict  |
| ----------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- |
| Opening board           | cancer_clicker_ng_board.png            | Tumor is the first visual draw; HUD and rack are visible; primary action reads as cellular clicking. | Accepted |
| Hypoxic/necrotic lesion | cancer_clicker_ng_hypoxic_necrotic.png | Regional hypoxia and necrosis use shape, density, and non-color cues without obscuring hierarchy.    | Accepted |
| Perfused tumor          | cancer_clicker_ng_perfused_tumor.png   | Vessel/perfusion cues and evolution surface remain legible at board scale.                           | Accepted |
| Invasive route          | cancer_clicker_ng_invasive_route.png   | Invasive front, seeded route, and continuing board context remain legible.                           | Accepted |
| Culture laboratory      | cancer_clicker_ng_culture_lab.png      | Dish, cryobank, and laboratory decision surface read as integrated illustrated gameplay.             | Accepted |
| Dissemination network   | cancer_clicker_ng_network_map.png      | Site map, campaign frontier, and rack remain visually contained and readable.                        | Accepted |
| Chicago scale report    | cancer_clicker_ng_chicago_scale.png    | Scale report fits in the board without clipping the tumor or erasing continued-play context.         | Accepted |

## Shared visual criteria

- The tumor scene reads as a biological game abstraction, not a patient image, pathology slide,
  cosmic scene, horror image, or a course poster.
- HUD information remains shallow and subordinate to the tumor arena.
- The first view contains the direct tumor action, visible progression context, and a continuously
  upgradeable illustrated rack.
- SVG icons aid recognition without replacing visible labels for unfamiliar or consequential
  choices.
- Action, selection, biological state, and network connection have non-color cues such as shape,
  border, position, pattern, or text.
- No frame has clipped primary content, crowded unreadable text, or empty decorative space that
  competes with the tumor action.

## Evidence boundary

Static frames can support claims about hierarchy, composition, visible labels, icon recognition,
clipping, illustration readability, and non-color visual cues. They cannot establish pointer hit
testing, keyboard parity, tooltip invocation, focus restoration, drawer behavior, save persistence,
responsive reflow, reduced-motion behavior, console health, or measured contrast. The final review
links those claims to the production-browser and accessibility evidence recorded in
[RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md).

## Review record

The 2026-08-28 capture produced seven RGB PNGs at 1280 x 800 with no reported horizontal overflow
or browser diagnostics. Independent original-resolution review accepted every frame:

- The opening cell and later tumors are the primary visual draw, with the count/rate scoreboard and
  illustrated rack supporting the central action.
- Hypoxic/necrotic regions, perfused vessels, and the invasive front remain distinguishable through
  topology, pattern, and shape rather than prose alone.
- The invasive route stays inside the cyan arena with a visible gutter before the rack.
- Culture and network frames read as later game worlds; the network retains a large tissue mass,
  six colony islands, and a central route/void.
- The final Chicago report reads as an intentional right-rail drawer. Its city-volume graphic and
  metrics remain readable, its Hide action is conspicuous, and the living central tumor is fully
  unobscured.

The review establishes current static visual acceptance only. Direct-cell input, persistence,
non-modal report behavior, responsive ordering, and reduced motion are supported by the separate
production-browser and capture evidence in [RELEASE_EVIDENCE.md](../../RELEASE_EVIDENCE.md).
