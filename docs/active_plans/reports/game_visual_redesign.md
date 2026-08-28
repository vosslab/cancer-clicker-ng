# Visual-first game redesign

## Purpose

Cancer Clicker NG becomes a fluorescent, tactile incremental game about an evolving tumor world.
At first glance, a player sees an organic tumor arena they can touch, a compact rack of strange
biological machines they can grow, and bright hallmark sigils that advertise the next obsession.
They should want to click before they need to read a paragraph.

This is an original game-art direction. Cookie Clicker supplies the useful interaction grammar:
one irresistible large action, always-available upgrade choices, owned quantities, and visual
accumulation. It does not supply visual assets, layout textures, or a theme. The game remains a
fictional biological abstraction and does not depict patients, diagnosis, or clinical outcomes.

## Visual contract

| Field            | Contract                                                                                                                                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audience         | High-school and college players who respond to visible growth, collection, discovery, and tactile feedback.                                                                                               |
| Primary viewport | 1280 x 800, 16:10. The first board state shows the arena, upgrade machinery, immediate progression, and concise status together.                                                                          |
| First read       | Living tumor arena, active cell click target, visible machine shelf, and one active hallmark/stage spectacle.                                                                                             |
| Second read      | Owned counts, affordability, resource rate, and the immediate next action.                                                                                                                                |
| Detail route     | Native `title`, `aria-label`, focus tooltip, or optional detail drawer. Long explanatory paragraphs leave the persistent board.                                                                           |
| Embed mode       | Inline SolidJS SVG for scene art and reusable decorative `ActionIcon` marks. Native HTML buttons remain the focusable controls.                                                                           |
| Palette          | Fluorescent microscopy over a deep blue-black laboratory field: cyan cytoplasm, violet nuclei, magenta growth signals, arterial coral vessels, acid-lime actionable energy, and restrained amber rewards. |
| Shape language   | Rounded cellular contours, branching vessels, faceted glassware, soft specimen shadows, and compact 24 by 24 sigils.                                                                                      |
| Text policy      | One compact name or number beside a control when it is necessary for scanning; the picture, silhouette, and icon identify the family first.                                                               |

The visual system uses the existing `0 0 1000 700` colony scene and `0 0 24 24` icon coordinate
systems. SVG `viewBox` coordinates stay stable while the viewport scales the same art at desktop,
compact, and tooltip sizes. Repeated machine parts, vessel marks, and sigil primitives live in
semantic `defs` or data-driven geometry so the game gains visual density without duplicate path
work.

The art direction applies biological-illustration clarity rather than a science-poster layout:
each frame has a focal mass, quiet supporting areas, and a small number of high-contrast cues.
Foreground cells carry the strongest contour and detail; middle cells carry normal contrast;
background tissue loses contrast and detail. This makes the tumor read as a volume at a glance and
keeps the smallest sigils recognizable.

## Arena composition

### Tumor as the hero

The left arena becomes a deep circular-to-lobulated specimen well, occupying the largest visual
mass on the board. It looks like a live fluorescent microscopy field rather than a framed chart.
The player clicks a visibly pulsing foreground cell or active membrane rim. The full cell field
remains the actual pointer target, so a player can click what they see instead of hunting for a
separate button.

- **Backdrop:** a cool, vignetted slide with faint tissue fibers, soft depth haze, and one subtle
  specimen-well rim. The quiet background creates a dark stage for fluorescent cells.
- **Tumor mass:** a readable outer colony silhouette before local cells. Early stages have generous
  extracellular gaps; later stages compress, lobulate, form a necrotic core, develop branching
  perfusion, then cast invasive satellites beyond the margin.
- **Cell depth:** surface cells use cyan membranes, deep plum nuclei, pearl highlights, and a
  heavier near-side contour. Mid-depth cells become cooler and less saturated. Deep cells fade into
  a violet-blue tissue field. Overlap, value falloff, and interrupted rear contours make density
  legible without a wall of identical blobs.
- **Vessel and tissue depth:** coral capillaries enter from the specimen edge, branch toward the
  viable rim, and stop at hypoxic or necrotic spaces. Their illuminated wall and darker lumen make
  them read as tubes rather than diagram lines. Hypoxia becomes a muted violet void and debris
  texture, paired with shape and density changes rather than color alone.
- **Focal event:** each stage exposes one visual event: a split cell, a new vessel tip, a nuclear
  mutation spark, a tearing invasive edge, a connected secondary site, or the final city-scale
  reframe. The focal event uses brightness, scale, and motion together; the rest of the field stays
  quieter.

### Tactile click feedback

A direct cell click produces a short, layered response: membrane compression, a cyan-magenta ring
that travels into the field, a tiny burst of daughter-cell motes, and the authoritative cell total
increments beside the arena. The feedback reads as a biological division pulse, not a generic
button flash. It is local presentation after the existing typed divide intent succeeds.

Keyboard activation receives the same visible pulse from the currently active arena focal point.
Focus shows a high-contrast membrane halo and a compact tooltip. Reduced motion uses a stable
bright membrane ring, a changed count, and a brief non-moving highlight; all state remains equally
readable without animation.

## Upgrade-machine families

The right store becomes a vertically accumulating illustrated machine shelf. Each upgrade is a
small collectible prop with an unmistakable silhouette, owned-count badge, cost medallion, and
production sparkline. The whole row is the purchase target; its illustration carries the family
identity and the concise adjacent number carries the transactional state.

| Family                | Illustration recipe                                                  | Existing owner seam                                  | Visual evolution                                                                        |
| --------------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Division machinery    | Mitotic spindle press, paired chromosomes, and a glass cell chamber  | `src/render/producers_panel.tsx`, `src/svg/icons.ts` | Additional owned machines stack behind the lead prop and add a small cyan output pulse. |
| Growth signaling      | Receptor tower with magenta ligand sparks                            | `src/render/hallmark_tree.tsx`, `src/svg/icons.ts`   | Signal nodes light outward from the membrane.                                           |
| Metabolic machinery   | Glucose flask, pipette pump, and ATP cell                            | `src/render/hallmark_tree.tsx`, `src/svg/icons.ts`   | Fluid fills and amber charge marks increase.                                            |
| Genome machinery      | Repair-fork loom, broken helix, and chromosomal cassette             | `src/render/hallmark_tree.tsx`, `src/svg/icons.ts`   | The fork develops controlled asymmetric branches.                                       |
| Culture apparatus     | Culture dish, cryobank cassette, and assay cartridge                 | `src/render/culture_panel.tsx`, `src/svg/icons.ts`   | One selected vessel glows and owned modules fill a rack.                                |
| Dissemination network | Node atlas, route tube, and containment shell                        | `src/render/network_panel.tsx`, `src/svg/icons.ts`   | Lines connect physical node props and then echo into the tumor scene.                   |
| Stage spectacle       | Large specimen stamp, arrow gate, and evolving organ-site silhouette | `src/render/stage_panel.tsx`, `src/svg/icons.ts`     | The current stage uses a larger emblem and an earned transition flare.                  |

Each family begins as an editable inline SVG component built from a silhouette, two or three value
planes, one shared highlight direction, and a small repeated detail motif. Use symbols for parts
that repeat across instances: tube caps, wells, node ports, chromosome arms, and signal stars.
The full illustrated row remains semantic HTML; the SVG is decorative and the native control name
combines its compact label, cost, and owned count.

## Hallmark sigils

Hallmarks need collector-grade visual identities. Each remains a small 24 by 24 icon for lists and
becomes a 56 to 72 pixel illuminated seal for the currently offered or newly unlocked hallmark.
The outer silhouette must identify the family at 20 pixels; the interior detail rewards close
inspection.

| Hallmark                               | Sigil silhouette                             | Accent behavior                                     |
| -------------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| Sustaining proliferative signaling     | Radiating receptor cell                      | Magenta signal rays pulse from a central membrane.  |
| Evading growth suppressors             | Open shield with escaped check               | A broken inhibitory arc reveals a cyan path.        |
| Resisting cell death                   | Heart-like cell with a diagonal survival bar | Coral survival core holds against a dim outer ring. |
| Enabling replicative immortality       | Looping clock and telomere ends              | Violet loop closes into an endless orbit.           |
| Inducing angiogenesis                  | Branching capillary sprout                   | Coral branches grow toward a cyan rim.              |
| Activating invasion and metastasis     | Escaping cell and directional trail          | A detached satellite crosses the badge edge.        |
| Deregulating cellular metabolism       | Charged flask                                | Amber fill and a lime charge notch rise together.   |
| Avoiding immune destruction            | Masked shield                                | A dark mask slides across a bright immune scan.     |
| Tumor-promoting inflammation           | Controlled flame in tissue                   | Coral flame flickers inside a muted tissue ring.    |
| Genome instability and mutation        | Split double helix                           | One branch breaks into precise magenta fragments.   |
| Unlocking phenotypic plasticity        | Three shifting cell profiles                 | The profiles share a center but differ in contour.  |
| Nonmutational epigenetic reprogramming | Layered chromatin loop                       | A cyan strand wraps a violet core.                  |
| Polymorphic microbiomes                | Clustered microbe constellation              | Three distinct dots orbit one tissue niche.         |
| Senescent cells                        | Arrested clock-cell                          | Amber pause bars sit inside a worn membrane.        |

The compact names in `src/svg/icons.ts` remain the standard inline catalog. Feature-scale hallmark
silhouettes now live in `src/svg/evolution_sigils.tsx` and project through
`src/render/hallmark_tree.tsx`; its `HallmarkSigil` covers all 14 catalog identities without
changing the compact `ActionIcon` API.

## Stage and unlock spectacle

Every major unlock gets an illustrated reveal with a single phrase and a clear continuation cue.
The spectacle lasts long enough to register but never blocks the click loop.

- **Stage advance:** the arena iris opens, the specimen well gains one new environmental layer, and
  the current-stage emblem lands in the progression rail. The new visual pressure appears in the
  tumor scene immediately.
- **Hallmark unlock:** the new sigil briefly expands from the active cell into its position in the
  collection rail; the halo remains as a static accent under reduced motion.
- **Producer purchase:** the machine slides onto its shelf, its owned badge increments, and a small
  production route connects to the arena edge.
- **Prestige/culture/network:** the arena pulls back to reveal a culture dish, route map, or
  satellite site. These are scene transitions, not dense modal forms.
- **Soft ending:** the Chicago overlay stays an earned scale reframe behind the living tumor. Its
  lakefront geometry and network routes form a final wide spectacle while the primary cell action
  remains available.

## Icon hierarchy and text economy

| Tier      | Size              | Use                                                            | Text companion                                 |
| --------- | ----------------- | -------------------------------------------------------------- | ---------------------------------------------- |
| Micro     | 16 px             | quantity mode, row status, cost token, tooltip lead-in         | none or one short number                       |
| Standard  | 24 px             | producer, hallmark, culture, network, stage, utility action    | one compact name when scanning needs it        |
| Feature   | 40 px             | active stage, current available hallmark, major store category | one 1-3 word caption                           |
| Spectacle | 56-96 px          | unlock reveal, stage gate, prestige transition                 | one short phrase plus optional tooltip         |
| Scene     | 180 px and larger | direct-click tumor, vessel field, secondary-site world         | count/rate and a single accessible instruction |

Buttons use the icon first, a compact label second, cost/owned number third, and details through a
tooltip. Producer rows condense prose such as "Current contribution uses..." into `title` or
focus-visible detail. Hallmark panels retain a short unlock condition, then move explanatory text
into a hover/focus card. This preserves accessible control names and keyboard use while giving the
board its visual rhythm.

## SVG ownership and component plan

| Owner                     | Responsibility                                                                                    | Delivered files                                                                                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared icon catalog       | Typed 24 by 24 geometry, semantic primitive groups, stable `currentColor` line treatment          | `src/svg/icons.ts`, `src/render/action_icon.tsx`                                                                                                                                                         |
| Tumor arena               | Scene hierarchy, reusable filters/gradients, direct-cell focal overlay, semantic cell composition | `src/svg/defs.ts`, `src/svg/cell.tsx`, `src/svg/colony.tsx`, `src/svg/colony_overlays.tsx`, `src/svg/tumor_feedback.tsx`, `src/render/tumor_arena.tsx`                                                   |
| Layout truth              | Stage/region/depth placement, vessel anchors, focal-event placement; no SVG nodes                 | `src/svg/colony_layout.ts`, `src/svg/colony_visual_state.ts`, `src/svg/render_types.ts`                                                                                                                  |
| Machine illustrations     | Reusable molecular-machine geometry and catalog-to-prop mapping                                   | `src/svg/producer_machines.tsx`, `src/render/producers_panel.tsx`                                                                                                                                        |
| Hallmark collection       | Catalog-to-sigil mapping, active/unlocked/locked treatments                                       | `src/svg/icons.ts`, `src/svg/evolution_sigils.tsx`, `src/render/hallmark_tree.tsx`                                                                                                                       |
| Stage spectacle           | Current-stage emblem and compact transition reveal                                                | `src/svg/evolution_sigils.tsx`, `src/render/stage_panel.tsx`                                                                                                                                             |
| Culture and network props | Dishes, cryobank, assay, nodes, routes, containment, and lineage-route illustrations              | `src/svg/culture_network_props.tsx`, `src/svg/prestige_route_props.tsx`, `src/render/culture_panel.tsx`, `src/render/network_panel.tsx`, `src/render/transit_panel.tsx`, `src/render/prestige_panel.tsx` |
| Styling and motion        | Palette tokens, board geometry, density, hover/focus, reduced-motion equivalents                  | `src/style.css`, `src/prestige.css`, `src/ending.css`                                                                                                                                                    |
| Solid composition         | Fine-grained signals drive local feedback while durable state continues to own game truth         | `src/render/app.tsx`, `src/render/tumor_arena.tsx`                                                                                                                                                       |

Every inline SVG keeps a stable viewBox, descriptive group names, unique local IDs, and reusable
definitions. Decorative SVGs are `aria-hidden` and sit beside accessible native labels. The
interactive tumor remains one named button with delegated visible-cell pointer activation; scene
cells do not create a forest of tiny focus targets.

## Motion and reduced motion

Motion has one job: reveal a successful interaction or spatial relationship.

| Motion             | Normal presentation                                      | Reduced-motion presentation                                |
| ------------------ | -------------------------------------------------------- | ---------------------------------------------------------- |
| Direct division    | 180-260 ms membrane compress, pulse ring, daughter motes | Static bright membrane ring and authoritative count change |
| Affordable upgrade | Gentle shelf illumination and single output spark        | Stable highlighted affordance                              |
| Unlock             | Sigil expands into its collection position               | Sigil appears at final scale with a bright outline         |
| Vessel/perfusion   | Slow shared directional shimmer along a route            | Route is fully drawn with alternating dash/value cue       |
| Stage/prestige     | One scene-scale crossfade or iris reveal                 | Final scene and title appear immediately                   |

CSS owns timings and `prefers-reduced-motion`; Solid owns only local transient presentation state.
The scene has no per-cell timers, animated filters, or independent state machine. A user can pause
over any visual element to receive a short tooltip without losing a keyboard route.

## 1280 x 800 hierarchy map

```text
+--------------------------------------------------------------------------------+
|  [tiny status chips]      CANCER CLICKER NG       [cells/s] [save] [settings] |
+-------------------------------+-------------------------------+----------------+
|                               |  [active hallmark seal]        | [machine shelf]|
|                               |  one short stage phrase         | [qty icons]    |
|        LIVING TUMOR ARENA     +-------------------------------+----------------+
|   bright focal cell / pulse   |  PROGRESSION CONSTELLATION     | [machine prop] |
|                               |  sigils, route, one next goal  | owned  cost     |
|  count                       |                               | [machine prop] |
|  cells / second              |  unlock spectacle / tooltip    | owned  cost     |
|  [compact action tooltip]    |                               | [machine prop] |
|                               +-------------------------------+----------------+
|  cell field, vessels, tissue |  culture/network mini-world     | scroll only here|
+-------------------------------+-------------------------------+----------------+
```

The arena holds roughly 48 percent of the first-view visual mass, the progression world 30
percent, and the store 22 percent. The header is a thin instrument strip. Most text sits at the
edges of illustrated objects, keeping the center of gravity in the game world.

## Dispatchable asset packages

| Package                      | Status                             | Delivered files                                                                                                                                                                                                              | Remaining success criterion                                                                                             | Evidence                                                         |
| ---------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| V1 Arena hierarchy           | Implemented source; review pending | `src/svg/colony.tsx`, `src/svg/cell.tsx`, `src/svg/defs.ts`, `src/render/tumor_arena.tsx`, `src/style.css`                                                                                                                   | Confirm at 1280 x 800 that the tumor is the largest, directly clickable focal object with a readable three-depth field. | Built desktop and compact screenshots; direct-cell Playwright.   |
| V2 Microscopy palette        | Implemented source; review pending | `src/style.css`, `src/svg/defs.ts`, `src/svg/colony_overlays.tsx`                                                                                                                                                            | Confirm cyan, violet, coral, lime, and amber roles read with shape/value companions.                                    | Render review plus measured contrast for meaningful text.        |
| V3 Click response            | Implemented source; review pending | `src/svg/tumor_feedback.tsx`, `src/render/tumor_arena.tsx`, `src/style.css`                                                                                                                                                  | Confirm a successful divide reads as a biological pulse with keyboard and reduced-motion clarity.                       | Focused browser interaction and reduced-motion capture.          |
| V4 Machine shelf             | Implemented source; review pending | `src/svg/producer_machines.tsx`, `src/render/producers_panel.tsx`, `src/style.css`                                                                                                                                           | Confirm every producer reads as a collectible machine with concise owned/cost state.                                    | 1280 x 800 store capture and native-control accessibility check. |
| V5 Hallmark seals            | Implemented source; review pending | `src/svg/icons.ts`, `src/svg/evolution_sigils.tsx`, `src/render/hallmark_tree.tsx`, `src/style.css`                                                                                                                          | Confirm all 14 hallmarks retain unique small silhouettes and a feature-scale active seal.                               | Icon contact sheet at 16, 24, 56, and 72 px.                     |
| V6 Progression spectacle     | Implemented source; review pending | `src/svg/evolution_sigils.tsx`, `src/render/stage_panel.tsx`, `src/style.css`                                                                                                                                                | Confirm a stage or hallmark unlock creates one legible event without a text-heavy panel.                                | Reached-state screenshots and reduced-motion review.             |
| V7 Culture and network props | Implemented source; review pending | `src/svg/culture_network_props.tsx`, `src/svg/prestige_route_props.tsx`, `src/render/culture_panel.tsx`, `src/render/network_panel.tsx`, `src/render/transit_panel.tsx`, `src/render/prestige_panel.tsx`, `src/prestige.css` | Confirm culture and network decisions read as a growing laboratory/world rather than form rows.                         | L3/L4 screenshots and keyboard journey.                          |
| V8 Text reduction            | Active refinement                  | `src/render/*.tsx`, `src/style.css`, `src/prestige.css`, `src/ending.css`                                                                                                                                                    | Make persistent board copy short while native names and hover/focus tooltips retain detail.                             | Keyboard/focus audit and first-view 1280 x 800 review.           |
| V9 Screenshot story          | Pending review artifact            | `tools/capture_readme_screenshots.mjs`, `docs/screenshots/*`, `README.md`                                                                                                                                                    | Capture direct click, visual accumulation, hallmark unlock, culture/network world, and earned ending.                   | Fresh production-dist captures plus independent image review.    |

## Validation

- Build the production artifact and run the canonical `./check_codebase.sh` gate after each
  integrated visual slice.
- Use the existing Playwright player journeys to preserve direct cell click, keyboard activation,
  native control names, compact layout, and reduced-motion behavior.
- Treat 1280 x 800 and narrow reduced-motion screenshots as one-time visual acceptance evidence,
  not pixel-equivalence tests.
- Render icon sheets at 16, 24, 56, and 72 pixels. Revise a sigil when its silhouette or state
  family stops reading at the target size.
- Inspect SVG IDs, references, viewBoxes, and XML structure. Scene and prop visuals remain editable
  source, with no external image dependency.

## Local illustration references

- `svg_authoring/Mastering_SVG-2018.md`, "viewBox and viewport in SVG": stable user-space
  geometry lets the same source scale from a 24 px sigil to the 1000 by 700 arena.
- `svg_authoring/Generative_Art_with_JavaScript_and_SVG-2024.md`, "Grouping and Reusing
  Elements": semantic groups, symbols, and `use` support editable repeated machine and vessel
  parts.
- `scientific_illustration/A_Handbook_of_Biological_Illustration-1988.md`, "CLARITY" and
  "heaviest lines are used to draw the closest parts": a limited information budget and depth-line
  hierarchy make the crowded tumor field legible without turning it into a poster.

## First implementation order

1. Deliver V1 and V3 together so the hero arena looks and feels immediately clickable.
2. Deliver V4 and V5 in parallel to replace the dominant plain-button vocabulary with collectible
   machines and hallmark seals.
3. Deliver V2 and V6 to bind the arena, progression rail, and unlocks into one fluorescent world.
4. Deliver V7 and V8 to complete the prestige-world reading and reduce persistent copy.
5. Deliver V9 after the integrated build, then use the screenshot review to tune hierarchy rather
   than freeze a pixel-level target.
