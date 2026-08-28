# Art direction

## Visual contract

The colony is an ambitious specimen composition: a living tissue field whose macro silhouette,
negative space, depth, and regional focal points explain progression before the player notices a
single nucleus. It is a stylized scientific game illustration, not generic "more mutated" styling,
photorealistic pathology, a patient image, or a diagnostic slide. Each visible feature must convey
morphology, stage, hallmark state, environmental interaction, depth, or a deliberate transition.

The colony panel mounts one meaningful inline SVG inside one native colony control. Its stable
contract is:

| Property         | Requirement                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Source of truth  | Pure typed scene data plus inline Solid SVG; no bitmap or copied asset directory                         |
| View and scaling | `viewBox="0 0 1000 700"`, `preserveAspectRatio="xMidYMid meet"`, responsive width and auto height        |
| Target sizes     | 320 x 224 at a 360 px viewport, 560 x 392 desktop panel, 1000 x 700 evidence render                      |
| Backgrounds      | Current clinical-dark `#071418` delivery canvas and neutral light inspection canvas                      |
| Reading order    | stage silhouette -> region and depth -> focal morphology -> optional caption                             |
| Embed semantics  | one native `button` named `Divide cell`; its SVG is visual content and internal groups are `aria-hidden` |
| Caption          | short visible stage-aware non-diagnostic explanation described by the native control                     |

## Art principles survey

The local SVG corpus changes construction choices, not biological claims. Biology remains bounded
by [MORPHOLOGY_REFERENCE.md](MORPHOLOGY_REFERENCE.md).

| Local source and focused passage                                                                                                                | Applied decision                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `svg_authoring/Generative_Art_with_JavaScript_and_SVG-2024.md`, techniques around lines 100-120                                                 | Use correlated noise for organic variance and retain discrete seeded selections for traits; never use independent vertex jitter.                   |
| Same source, SVG canvas and viewBox around lines 1659-1745                                                                                      | Use unitless `1000 x 700` user space and responsive viewport scaling so geometry is stable across the two delivery sizes.                          |
| Same source, titles and definitions around lines 2150-2200                                                                                      | Give the meaningful SVG a title and description; centralize shared gradients, patterns, masks, and filters in `defs`.                              |
| `svg_authoring/Mastering_SVG-2018.md`, `viewBox and viewport in SVG` around lines 635-730                                                       | Treat viewport and viewBox as separate concerns; preserve aspect ratio and avoid hard-coded screen geometry.                                       |
| `scientific_illustration/A_Handbook_of_Biological_Illustration-1988.md`, reproduction and reduction around lines 165-230                        | Choose target sizes before detail; use strong open contours and values that survive reduction instead of dense hatching.                           |
| `scientific_illustration/Preparing_Scientific_Illustrations_a_Guide_to_Better_Posters_Presentations-1996.md`, planning around lines 148-225     | Establish audience, purpose, and information budget first; use one figure to clarify and summarize rather than putting every fact into every cell. |
| `drawing_fundamentals/The_Everything_Drawing_Book-2005.md`, thumbnail and negative-space route                                                  | Compose macro silhouette, focal region, and negative spaces before surface detail.                                                                 |
| `object_construction/How_to_Draw_Drawing_and_Sketching_Objects_and_Environments_from_Your_Imagination-2013.md`, volume and depth-contrast route | Create foreground dominance with overlap, value, and line weight rather than fake perspective.                                                     |
| `vector_tools/Quick_and_Easy_Vector_Graphics-2020.md`, primitives, Boolean construction, and Bezier route                                       | Prefer editable primitives and grouped contours; use paths only where an organic contour requires them.                                            |

## Specimen composition

The stage is a visual composition, not a scalar damage meter. The colony-layout resolver makes
data-only layouts in this fixed order: silhouette, regions, clusters, cell slots. The SVG cell
renderer then renders those slots and may not make layout decisions. This order makes the following
grammar structural.

| Compositional layer | Responsibility                  | Visual result                                                                                                                   |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Macro silhouette    | Colony layout                   | Coherent seed, compact colony, diffusion-limited ring, voided core, asymmetric front, islands, or network constellation         |
| Negative space      | Colony layout                   | Early readable extracellular gaps; later compressed, fragmented, or displaced spacing                                           |
| Depth strata        | Layout assigns; renderer styles | Surface has largest scale, strongest contrast, heaviest contour; middle is normal; deep is smaller, quieter, and lower contrast |
| Regions             | Colony layout                   | Hypoxic center, viable rim, vascular margin, invasive edge, and focal site differences                                          |
| Cells               | SVG cell renderer               | Cytoplasm volume, contour, dark nucleus, and rare mitosis from resolved morphology only                                         |
| Foreground accents  | SVG cell renderer               | One focal mitosis, atypical nucleus, invasive edge, or hypoxic zone; never uniform interest                                     |

Depth is a three-stratum information hierarchy, not perspective. The figure uses overlap and
restrained value falloff so a crowded field never becomes hundreds of equally loud blobs. No stage
may rely solely on cell-internal detail; the colony-layout suppressed-detail contact sheet is the
decisive visual evidence.

## Living tumor world

The board combines the incremental-clicker grammar with a living cancer-system visualization. The
colony is the direct action at left; the central progression field is the evolving tumor world,
not empty decoration; the store stays a compact decision surface at right. As durable state
changes, cells form colonies and tumors, acquire perfusion, show hallmark consequences, develop
hypoxia, necrosis, and invasion, and later establish additional sites. The image remains a
scientific abstraction: it shows state consequences rather than simulating clinical outcomes.

At the 1280 x 800 (16:10) primary viewport, the first view presents the large colony action with
authoritative count/rate, active stage and hallmark progression, producer-store quantity controls,
and save/status together. Wider boards scale this composition; compact layouts retain its order by
stacking colony action, progression world, then store. The 1280 x 800 capture is a representative
task walkthrough, not a runtime benchmark.

Every visual consequence traces through a named biological and geometric owner:

| Consequence                                                                                      | Durable source and owner                                                                                                              | Rendering owner                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Cell family, nuclei, mitosis, and hallmark-visible traits                                        | `MorphologyParams` and contributor provenance in `src/svg/morphology.ts`                                                              | `src/svg/cell.tsx`                                       |
| Colony/tumor silhouette, density, hypoxia, necrosis, invasive fronts, and later-site composition | readonly layout data and `layoutOrigin` provenance in `src/svg/colony_layout.ts`                                                      | `src/svg/colony.tsx`                                     |
| Perfusion, vessel, and route motifs                                                              | `perfusion_layout.ts`, `route_commitment.ts`, and `elapsed_effects.ts` contribute typed state through an explicit layout contribution | `src/svg/colony.tsx` after its data contract is accepted |
| Local control feedback, focus, and reduced-motion presentation                                   | `ColonyPanel` local UI state                                                                                                          | `src/render/colony_panel.tsx` and `src/style.css`        |

Animation supplements durable state. A pulse, growth response, or route emphasis gives immediate
feedback after the already-authoritative count/rate and status change. Reduced motion preserves a
static state cue with the same biological reading. Future angiogenesis, vessel, and route layers
extend the named data and rendering owners above; CSS only presents accepted semantic classes and
does not invent biological state.

## Palette and non-color grammar

The existing clinical-dark shell supplies a teal/mint/gold UI language. The colony remains a
separate biological palette so actionable mint never becomes a severity code.

| Role                    | Direction                                      | Paired non-color cue                                           |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| Canvas and frame        | near-black blue-green with quiet border        | generous frame margin and stage title                          |
| Cytoplasm               | cool desaturated blue, green, or gray families | contour, volume gradient, and depth treatment                  |
| Nucleus                 | deep plum or navy, distinct from cytoplasm     | size, eccentricity, and lobed contour                          |
| Surface focal cells     | slightly brighter value, never neon            | stronger contour and overlap                                   |
| Middle and deep cells   | progressively quieter value and contrast       | smaller size, lighter stroke, fewer marks                      |
| Necrosis or warning     | restrained warm amber or muted ash             | void, debris, washed-out density, and quiet interior           |
| Vascular or route motif | restrained cool contrasting line               | margin placement and directional connection                    |
| Interactive UI          | existing mint and gold controls only           | HTML control label, focus, and state; never colony color alone |

Visual calibration measures final text and meaningful icon contrast in their real backgrounds. A
biological distinction always pairs color with contour, gap, shape, density, pattern, position, or
visible text. Color is never the sole indicator of hypoxia, necrosis, depth, stage, hallmark,
selection, or an available player action.

## Action icon language

The action surface uses compact, editable inline SVG marks beside retained text labels. The source
catalog is `src/svg/icons.ts`; `src/render/action_icon.tsx` provides the one decorative embed
contract. Every icon has a `0 0 24 24` viewBox, semantic primitive groups, rounded `currentColor`
strokes, and a small-scale line hierarchy with one clear outer silhouette before interior detail.
Producer, hallmark, stage, lineage, culture, network, transit, and scale-report families receive
distinct marks; routine confirmation and cancellation retain concise text to avoid visual noise.

The icons are decorative (`aria-hidden`, unfocusable) because the adjacent native label is the
accessible control name. Their density and spacing preserve the first-view 1280 x 800 board. This
contract follows the local SVG references on viewBox/viewport scaling, reusable grouped elements,
and biological-illustration clarity: communicate the durable action, then stop before detail turns
into texture.

## SVG structure and editing policy

The SVG is code-native and editable. The colony panel owns one native `button type="button"` named
`Divide cell`; it contains the SVG, carries the single keyboard focus target, and describes itself
with the visible instruction and stage-aware caption. The SVG remains visual content under that
control. It uses semantic group names, readable geometry, stable IDs, and a single owner for
reusable treatments.

```text
<section class="colony-panel">
  <p class="colony-panel__count-rate">[authoritative count and rate]</p>
  <button type="button" class="colony-panel__action"
          aria-describedby="colony-instruction colony-caption">
    <svg class="colony-figure" aria-hidden="true"
         viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
      <defs>shared gradients, patterns, masks, and bounded filters</defs>
      <g class="colony-figure__backdrop" />
      <g class="colony-figure__regions" />
      <g class="colony-figure__cells" />
      <g class="colony-figure__foreground" />
    </svg>
  </button>
  <p id="colony-instruction">Click a visible cell to divide. Enter or Space also divides.</p>
  <p id="colony-caption">[non-diagnostic stage summary]</p>
</section>
```

- Prefix fragment IDs with `ccng-`. Add a deterministic scene suffix only when uniqueness is
  required. IDs, URL references, masks, patterns, gradients, and labels must resolve uniquely.
- `defs.ts` owns shared gradients, masks, patterns, and filters. `blob.ts` creates one organic
  contour from resolved local values. `cell.tsx` maps a cell scene to semantic nodes. `colony.tsx`
  maps an existing layout to cells. `colony_layout.ts` emits data and no SVG.
- Prefer `circle`, `ellipse`, `line`, `polygon`, and grouped transforms where they express intent.
  Use paths for membrane and nuclear contours. Do not emit opaque path soup or bake text into paths.
- Use CSS classes for repeated treatment. Share gradients and masks. Stable `data-*` keys are local
  UI hooks, never visual labels or game-state authority.
- `cell.tsx` marks each visible cell group with a local `data-cell-key` and `data-colony-cell`.
  `colony.tsx` delegates pointer and touch activation from that visible geometry to the one typed
  colony action. The button accepts virtual keyboard or assistive-technology activation while the
  delegated pointer path owns pointer/touch activation, so either user action calls the intent
  once. Cell keys do not enter events, saves, reducers, or `GameState`.
- Count/rate, a restrained immediate local response, visible focus, the instruction, save failure,
  reduced-motion behavior, and the stage caption complete the control's feedback contract. The
  count/rate and status are authoritative; reduced motion retains a static response.
- The dense cell field uses actual cell geometry for pointer and touch activation. The one colony
  button supplies the reachable keyboard and compact-width target without inventing overlapping
  per-cell focus targets.

## Earned Chicago-scale overlay

The soft-ending overlay retains the living tumor as the primary composition. Once the saved ending
record is reached, `src/svg/colony_visual_state.ts` projects only the earned L4 tier, stable-site
count, and accepted colony anchors into `EndingVisualState`. `src/svg/ending_overlay.tsx` then
draws a fictional, editable Chicago volume analogy behind that existing tissue: a lake edge, a
river, a legible street grid, stacked tower volumes, and route curves that start at actual colony
anchors. Tower markers use both a diamond shape and a bright outline, so network connection never
depends on hue alone. It is a scale reframe rather than a city map or a claim about real-world
infection, measurement, or pathology.

The overlay retains the shared 1000 by 700 viewBox and has no independent timer or animation.
Existing global reduced-motion handling therefore presents the same final routes and city volumes
immediately at desktop and narrow widths. Screen-reader copy names the transformation only after
the reached semantic state is present; the interactive colony control keeps its existing keyboard
and direct-cell-click ownership.

## Reached-report lakefront scale cue

The early transformed-cell board retains its direct colony-and-Store loop without a Chicago report
surface. At the global-laboratory availability boundary, the report becomes a compact action. Once
earned, the report adds `ChicagoScaleGraphic`: an original, editable inline 260 by 132 lakefront
and skyline cue beside the saved metrics. Its near skyline uses darker, heavier outlines, restrained
gold landmarks, a pale dashed shoreline, a cool lake edge, and a quiet signal route so the graphic
reads at 1280 by 800 without adding vertical bulk. It is decorative (`aria-hidden`) because the
adjacent text names the report, values, and continued-play outcome. The component has no motion;
the report retains the existing reduced-motion behavior.

## Performance and motion policy

The morphology resolver and colony layout produce no motion. The SVG cell renderer may add a very
slow shared transform or opacity pulse after contact-sheet and visual-calibration evidence. Motion
cannot communicate a biology distinction, gate, or outcome. `prefers-reduced-motion: reduce` makes
the colony static.

| Budget            | Requirement                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Noise             | Pure seeded field, 1..4 octaves; no `Math.random`, wall time, or mutable global seed                                              |
| Contours          | 18..32 samples per cell; one cell-local membrane path, one nucleus path, optional mitosis motif                                   |
| Reuse             | Shared defs and CSS classes; no filter or gradient per cell                                                                       |
| Filters           | At most one bounded subtle shared lighting or texture effect after real inspection                                                |
| Prohibited motion | no per-cell timers, `requestAnimationFrame` loop, animated filters, or path `d` interpolation                                     |
| Evidence          | Visual calibration records representative node count, SVG bytes, and render observations after the colony layout fixes slot count |

## Deliberate omissions

- No real patient, image-derived specimen, pathology image, fake scale bar, clinical grading, or
  prognosis claim.
- No blood, gore, horror decoration, glowing sci-fi cells, or unbounded visual noise.
- No per-cell label clutter, dense hatching, high-frequency turbulence, or texture used as a
  substitute for morphology.
- No photorealism, imported copyrighted imagery, or external asset dependency.
- No stage identity communicated by a hue shift alone, and no use of actionable mint as a disease
  severity signal.
- No fake vessel anatomy, immune-cell census, infection claim, or real-world outbreak implication
  in the fictional L4 network.

## Evidence criteria

- XML and browser checks verify root namespace, positive viewBox, finite geometry, unique IDs, and
  every local reference in `href` or `url(#...)`.
- Production renders inspect 320 x 224, 560 x 392, and 1000 x 700 on both required backgrounds for
  silhouette, clipping, hierarchy, depth, spacing, focal clarity, non-color cues, and title/desc.
- Reduced-motion evidence confirms a fully informative static colony and no active animation.
- Grammar and contact-sheet evidence confirms deterministic seeded variation, stage distinction
  without internals, bounded complexity, and provenance-preserving contributors.
- Visual calibration reviews biological abstraction discipline as well as visual quality; balance
  calibration owns numerical tuning and uses screenshots as one qualitative evidence source.
