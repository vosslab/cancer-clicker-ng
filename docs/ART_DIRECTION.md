# Art direction

## Visual contract

The colony is an ambitious specimen composition: a living tissue field whose macro silhouette,
negative space, depth, and regional focal points explain progression before the player notices a
single nucleus. It is a stylized scientific game illustration, not generic "more mutated" styling,
photorealistic pathology, a patient image, or a diagnostic slide. Each visible feature must convey
morphology, stage, hallmark state, environmental interaction, depth, or a deliberate transition.

M18 mounts one meaningful inline SVG in the future colony panel. Its stable contract is:

| Property         | Requirement                                                                                           |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Source of truth  | Pure typed scene data plus inline Solid SVG; no bitmap or copied asset directory                      |
| View and scaling | `viewBox="0 0 1000 700"`, `preserveAspectRatio="xMidYMid meet"`, responsive width and auto height     |
| Target sizes     | 320 x 224 at a 360 px viewport, 560 x 392 desktop panel, 1000 x 700 evidence render                   |
| Backgrounds      | Current clinical-dark `#071418` delivery canvas and neutral light inspection canvas                   |
| Reading order    | stage silhouette -> region and depth -> focal morphology -> optional caption                          |
| Embed semantics  | one `role="img"` SVG with unique title and description IDs; internal drawing groups are `aria-hidden` |
| Caption          | short stage-aware non-diagnostic explanation adjacent to or in the image description                  |

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

The stage is a visual composition, not a scalar damage meter. M17 makes data-only layouts in this
fixed order: silhouette, regions, clusters, cell slots. M18 then renders the slots and may not make
layout decisions. This order makes the following grammar structural.

| Compositional layer | Responsibility          | Visual result                                                                                                                   |
| ------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Macro silhouette    | M17                     | Coherent seed, compact colony, diffusion-limited ring, voided core, asymmetric front, islands, or network constellation         |
| Negative space      | M17                     | Early readable extracellular gaps; later compressed, fragmented, or displaced spacing                                           |
| Depth strata        | M17 assigns; M18 styles | Surface has largest scale, strongest contrast, heaviest contour; middle is normal; deep is smaller, quieter, and lower contrast |
| Regions             | M17                     | Hypoxic center, viable rim, vascular margin, invasive edge, and focal site differences                                          |
| Cells               | M18                     | Cytoplasm volume, contour, dark nucleus, and rare mitosis from resolved morphology only                                         |
| Foreground accents  | M18                     | One focal mitosis, atypical nucleus, invasive edge, or hypoxic zone; never uniform interest                                     |

Depth is a three-stratum information hierarchy, not perspective. The figure uses overlap and
restrained value falloff so a crowded field never becomes hundreds of equally loud blobs. No stage
may rely solely on cell-internal detail; the M17 suppressed-detail contact sheet is the decisive
test.

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

M18 measures final text and meaningful icon contrast in its real backgrounds. A biological
distinction always pairs color with contour, gap, shape, density, pattern, position, or visible
text. Color is never the sole indicator of hypoxia, necrosis, depth, stage, hallmark, selection,
or an available player action.

## SVG structure and editing policy

The SVG is code-native and editable. M18 must use semantic group names, readable geometry, stable
IDs, and a single owner for reusable treatments.

```text
<svg class="colony-figure" role="img" aria-labelledby="colony-title colony-desc"
     viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid meet">
  <title id="colony-title">[stage] colony morphology</title>
  <desc id="colony-desc">[non-diagnostic stage summary]</desc>
  <defs>shared gradients, patterns, masks, and bounded filters</defs>
  <g class="colony-figure__backdrop" />
  <g class="colony-figure__regions" aria-hidden="true" />
  <g class="colony-figure__cells" aria-hidden="true" />
  <g class="colony-figure__foreground" aria-hidden="true" />
</svg>
```

- Prefix fragment IDs with `ccng-`. Add a deterministic scene suffix only when uniqueness is
  required. IDs, URL references, masks, patterns, gradients, and labels must resolve uniquely.
- `defs.ts` owns shared gradients, masks, patterns, and filters. `blob.ts` creates one organic
  contour from resolved local values. `cell.tsx` maps a cell scene to semantic nodes. `colony.tsx`
  maps an existing layout to cells. `colony_layout.ts` emits data and no SVG.
- Prefer `circle`, `ellipse`, `line`, `polygon`, and grouped transforms where they express intent.
  Use paths for membrane and nuclear contours. Do not emit opaque path soup or bake text into paths.
- Use CSS classes for repeated treatment. Share gradients and masks. Stable `data-*` keys are test
  hooks, never visual labels or game state authority.
- Live text stays live. The colony itself has no clickable SVG regions in M18. Future interaction
  uses an HTML control or a fully named, focusable keyboard-equivalent control.

## Performance and motion policy

M16 ships no motion. M18 may add a very slow shared transform or opacity pulse only after contact
sheet and frame-cost evidence. Motion cannot communicate a biology distinction, gate, or outcome.
`prefers-reduced-motion: reduce` makes the colony static.

| Budget            | Requirement                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Noise             | Pure seeded field, 1..4 octaves; no `Math.random`, wall time, or mutable global seed            |
| Contours          | 18..32 samples per cell; one cell-local membrane path, one nucleus path, optional mitosis motif |
| Reuse             | Shared defs and CSS classes; no filter or gradient per cell                                     |
| Filters           | At most one bounded subtle shared lighting or texture effect after real inspection              |
| Prohibited motion | no per-cell timers, `requestAnimationFrame` loop, animated filters, or path `d` interpolation   |
| Evidence          | M18 records representative node count, SVG bytes, and frame cost after M17 fixes slot count     |

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
- The M18 image-evaluator review checks biological abstraction discipline as well as visual quality;
  M21 owns numerical balance and does not tune art by screenshots alone.
