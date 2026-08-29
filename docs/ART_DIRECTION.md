# Art direction

## Visual contract

Cancer Clicker NG uses a vivid medical-biological incremental-game board centered on a living,
editable SVG
tumor. The 1280 x 800 target presents a shallow scoreboard HUD above a three-part composition:
one active evolution family, dominant direct tumor interaction, and an illustrated upgrade rack. It is a
stylized scientific game illustration, not pathology, a patient image, a diagnostic slide, or a
clinical claim.

The board earns its visual density through information: visible cells invite the primary action;
morphology, regions, perfusion, and dissemination make progression legible; machine art and small
SVG marks organize choices. It avoids decorative cosmic cues, gore, photorealism, dense texture,
and generic button walls.

## Tumor arena

The colony scene uses a stable `viewBox="0 0 1000 700"` and responsive SVG scaling. Scene data
flows from morphology and layout contracts into `src/svg/cell.tsx` and `src/svg/colony.tsx`; the
renderer does not invent biological state. The visual reading order is:

1. Macro silhouette and negative space.
2. Regions and depth, including viable rim, hypoxic center, vascular margin, or invasive front.
3. Focal cellular morphology, including a bounded mitosis or atypical nucleus.
4. Brief non-diagnostic explanation and direct action instruction.

Pointer interaction uses a forgiving, membrane-shaped envelope: a rendered membrane or nucleus and
the nearby edge accept a pointer division, while broad tissue and voids remain inert. One native
`Divide cell` button provides keyboard parity through Enter, Space, and assistive activation,
avoiding a cluttered grid of cell tab stops. Pointer cursor, membrane response, count, rate, focus,
and pointer-local `+1 cell` daughter-cell feedback complete the interaction. A persistent crosshair
would imply an outside observer, so the tumor surface carries its own affordance.

Late-game automation uses a cell-priming glyph: one parent cell, two daughter cells, and a forward
cue. This keeps the saved producer-queue mechanic recognizable as an action while avoiding flask,
microscope, targeting, or other outside-observer equipment on the play surface.

The arena scoreboard treats the current illion name as a compact reward title. Million-and-above
names use rose emphasis, uppercase rhythm, and the same rounded triad as the large cell count; the
name disappears entirely when the formatter has no canonical title.

## Living progression contract

The arena opens with one large transformed cell. It is a direct-manipulation lesson: the cell
occupies enough of the well to read as the board's primary action while the surrounding tissue
space remains quiet. Progression then forms a non-regressive microcolony. Later biomass changes the
same living scene rather than swapping it for a smaller badge or a generic progress meter.

Four bounded biomass tiers govern representative composition:

| Tier        | Current source boundary           | Visual change                                                                                                       |
| ----------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Sparse      | below `10^3` cells                | opening cell or sparse, readable microcolony with generous negative space                                           |
| Established | `10^3` through below `10^6` cells | occupied extent and repeat-cell density increase while the colony remains locally legible                           |
| Dense       | `10^6` through below `10^9` cells | denser rim, stronger lobulation, and a constrained interior make the colony read as a tissue mass                   |
| Overgrown   | `10^9` cells and above            | broad occupied field, bounded negative-space pockets, and later-stage regional motifs make continued growth legible |

`src/svg/colony_visual_state.ts` owns the current tier boundary and
`src/svg/colony_layout.ts` owns the bounded layout response. The values are adaptable source-owned
game calibration, not an external biological measurement. Their visual analogy is deliberately
coarse: a small cluster near `10^3`, a roughly millimeter-scale lesion order near `10^6`, and a
roughly centimeter-scale lesion order near `10^9`. The game never claims an exact diameter,
diagnosis, or patient-specific growth model.

Stage grammar adds the biological read without overriding biomass: hypoxia and necrosis create a
quiet deep void against a viable rim; vascular maturation adds restrained margin vessels; invasion
breaks one directional boundary and creates satellites or route-bound departures. An accepted
division produces a local cleavage-and-daughter response plus the `+1 cell` reward at the accepted
pointer coordinate. Rejected, inert, and background pointer input produces no division feedback. A
newly accepted stage can add one transient arrival emphasis around the already-rendered scene; it
never replaces the scene or becomes durable biology.

## Icon and control language

`src/svg/icons.ts` defines reusable 24 by 24 inline marks with `currentColor`, rounded strokes,
and a single clear silhouette before interior detail. Hallmark, producer, stage, lineage, culture,
network, transit, and scale-report marks identify durable action families. `ActionIcon` renders
them as decorative adjacent imagery; text labels remain the accessible name. A compact icon-only
utility control has an explicit accessible name and a focusable tooltip.

This is a recognition aid, not a substitution for language. Purchases retain names, costs, owned
levels, and marginal benefit. Biological decisions retain their labels, gates, and tradeoffs.
Producer biology and economics share the purchase surface's pointer/focus tooltip; they do not add
separate detail buttons or expanding rows. Tooltips and the optional specimen drawer concentrate
explanatory text at the moment it is useful.

## Palette and non-color cues

| Role                                  | Direction                                               | Companion cue                                           |
| ------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Board canvas                          | Deep marrow and burgundy tissue with quiet stroma bands | Stable panel hierarchy and generous spacing             |
| Action controls                       | Eosin rose, arterial coral, cream, and ATP amber        | Native label, visible focus, enabled state              |
| Cytoplasm and nucleus                 | Eosin-like rose tissue with a hematoxylin-purple core   | Contour, volume, depth, and overlap                     |
| Hypoxia, necrosis, and vascular state | Purple, ash, arterial coral, or contrasting route line  | Region, void, density, directional placement, and shape |
| Network connection                    | Cream outline and amber diamond/route geometry          | Connected-site position and label                       |

Color never carries stage, selection, action availability, depth, or biological status alone.
Meaningful text and icons are reviewed in their actual backgrounds, and every interaction has a
visible focus state.

## Responsive and motion composition

At desktop size the board reads evolution, dominant tumor arena, then upgrade rack. At intermediate
width the Store spans the board beneath arena and evolution. Task and compact layouts put the tumor
first, followed by the active evolution family, upgrade rack, then rewards. The compact view
preserves direct cell activation, native labels, tooltips, and the specimen drawer rather than
reducing the game to a poster or a single button.

The viewpoint stays with the cancer cells and their tissue environment. Medical color and
biological morphology provide the identity; microscope reticles and observer equipment stay off
the play surface. Motion reinforces an already-readable state change. Tissue breathing, cycling, perfusion, invasion,
and local division feedback use bounded, synchronized movement anchored to the living tumor rather
than independent decoration. Generic full-arena scanner rings are absent. A stage arrival cue is a
brief, keyed presentation layer with static geometry, not a persistent scanning effect. Under
`prefers-reduced-motion: reduce`, the same morphology, local division result, focus, stage-arrival
state, and earned report remain visible as static equivalents. No motion communicates a required
outcome or biology distinction.

## Fictional and scientific boundaries

The game uses cancer-biology terms to teach systems relationships and makes its evidence basis
available through [MORPHOLOGY_REFERENCE.md](MORPHOLOGY_REFERENCE.md). It does not show real
patients, use real pathology images, manufacture prognostic meaning, simulate treatment, or claim
that the city-scale ending is a real infection or measured disease outcome. The Chicago graphic is
an editable volume analogy behind the persistent game board, with lake, streets, towers, and routes
used only to communicate earned fictional scale.

## Editing and review

Keep SVG source code-native, grouped, and editable. Shared gradients, masks, and filters belong in
scene definitions; reusable icon primitives belong in the icon catalog. Prefer clear primitives and
semantic class names over opaque path collections. Every visual change receives source checks plus
a rendered review at 1280 x 800, narrow 360px, and reduced-motion conditions. An independent-agent
report evaluates explicit criteria: hierarchy, biological abstraction, clipping, targetability,
contrast, and whether the primary action still reads as clicking living cancer cells.
