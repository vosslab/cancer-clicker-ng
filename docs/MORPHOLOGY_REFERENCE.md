# Morphology reference

## Purpose and boundary

This is the biological-to-visual contract for the colony figure. It makes a stylized,
clinically readable game specimen, not a diagnostic image, a patient representation, a
histology slide, or a measurement instrument. The figure communicates changing game state through
explicitly limited abstractions. It never supplies diagnosis, grading, prognosis, an actual mitotic
index, a calibrated nuclear-to-cytoplasmic measurement, or evidence about a particular tumor.

The colony reads in this order: stage silhouette, regional condition, then individual-cell detail.
Its baseline is a coherent, roughly round cell with a regular dark nucleus, consistent orientation,
restrained division, and readable extracellular spacing. Later features remain meaningful only
because that baseline stays legible.

The canonical stage and hallmark contracts are in
[PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md). Reset and environmental sources are in
[PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) and
[SYSTEM_INTERACTIONS.md](SYSTEM_INTERACTIONS.md). This document does not alter biological state,
layout, rendering, balance, saves, or events.

## Abstraction ledger

Each row is a permitted visual claim. A visual feature without a row is not shipped. The `rowId`
values are stable grammar-test inputs; contributors cite them in fixture metadata.

| rowId                                 | Biology or game state                  | Permitted abstraction                                                           | Explicitly not claimed                                               | Axes and consumer                                              |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `morphology:baseline`                 | Game visual baseline                   | Coherent round cell, regular nucleus, consistent orientation, and clear spacing | Healthy-tissue control, microscopy observation, or normal-cell assay | all fields; morphology resolver baseline and SVG cell family   |
| `morphology:individual_variation`     | Deterministic individual variation     | Bounded within-family contour and discrete-trait variation                      | Measured clonal diversity or a stochastic biological process         | permitted continuous axes and `traits`; resolver and renderer  |
| `morphology:resolver_clamp`           | Resolver safety boundary               | Retained provenance annotation when an input reaches a declared range           | Biological threshold or state transition                             | all numeric axes; morphology resolver only                     |
| `morphology:polarity_loss`            | Loss of polarity                       | Orientation coherence and adhesion rhythm fall; rotations and gaps vary         | Histologic diagnosis                                                 | `polarity`; layout spacing and renderer contour alignment      |
| `morphology:pleomorphism`             | Pleomorphism                           | Bounded family spread in size, elongation, and asymmetry                        | Measured cell-size distribution                                      | `heterogeneity`, `elongation`, `asymmetry`; SVG cell family    |
| `morphology:nuclear_irregularity`     | Nuclear irregularity                   | Lobed or wavy eccentric dark nucleus                                            | Mutation identity or grade                                           | `nuclearEccentricity`, `membraneWaviness`; SVG nucleus         |
| `morphology:elevated_nc_ratio`        | Elevated nuclear-to-cytoplasmic ratio  | Dark nucleus occupies a larger stylized area share                              | Calibrated microscopy ratio                                          | `nuclearToCytoplasmicRatio`; SVG nucleus and cytoplasm         |
| `morphology:abnormal_mitosis`         | Abnormal mitoses                       | Rare divided or lopsided chromatin motif                                        | Mitotic-index measurement                                            | `mitoticState`; SVG motif                                      |
| `morphology:tissue_disorganization`   | Tissue disorganization                 | Alignment falls; packing and gaps become nonuniform                             | Architecture of a particular tumor                                   | `tissueDisorganization`, `polarity`; colony layout             |
| `morphology:invasion_front`           | Invasion                               | Directional broken boundary and escaped slots                                   | Real stromal invasion                                                | `invasion`; colony layout                                      |
| `morphology:necrotic_region`          | Necrosis                               | Central low-detail void, debris, or washed-out deep zone                        | Viability assay or pathology readout                                 | `necrosis`, `depthStratum`; layout and renderer                |
| `morphology:metastatic_dissemination` | Metastatic dissemination               | Separated site or cluster compositions sharing lineage palette                  | Clinical metastatic prediction                                       | `dissemination`; colony layout and L4 panel                    |
| `morphology:vascular_margin`          | Angiogenesis                           | Restrained vessel-like margin relationship, never blood-gore decoration         | Functional perfusion or patient vasculature                          | stage or hallmark tag; layout region and SVG motif             |
| `morphology:phenotype_variance`       | Phenotypic plasticity                  | Neighboring cell-family variance within a regional role                         | A stable cell lineage or treatment response                          | `heterogeneity`, `polarity`; SVG cell family                   |
| `morphology:chromatin_texture`        | Epigenetic reprogramming               | Bounded nucleus interior texture or contour change                              | Genomic sequence or epigenetic assay                                 | `nuclearEccentricity`, `membraneWaviness`; SVG nucleus         |
| `morphology:surface_motif`            | Microbiome or ecological surface state | Sparse contextual surface motif at a region, not on every cell                  | Organism identification or infection diagnosis                       | regional contributor; SVG foreground                           |
| `morphology:senescent_shape`          | Senescent-cell state                   | Enlarged flatter low-division cell family with persistent cohort                | Cell-age measurement or senescence assay                             | `elongation`, `mitoticState`, `heterogeneity`; SVG cell family |

## Composition contract

`MorphologyParams` is complete, immutable, and renderer-facing. The resolver receives declared
contributions rather than `GameState`; it is pure and cannot read storage, timers, DOM order, or
wall time. Every accepted contribution has a stable `contributorId`, a human-readable label, a
layer, and exactly one `referenceRowId`. Contributor IDs are catalog or durable-record IDs, never
player-visible prose or DOM IDs. Resolver-generated baseline, individual variation, and clamp
sources respectively carry `morphology:baseline`, `morphology:individual_variation`, and
`morphology:resolver_clamp`.

The required resolution chain is:

```text
baseline -> stage -> hallmark -> prestige -> regional -> individual variation
```

`regional` has an internal stable order because it combines independently selected environments:

```text
site/program -> host -> node -> region
```

This preserves the top-level chain while ensuring a node-only change cannot erase stage, hallmark,
prestige, site, program, or host provenance. Individual variation is last, has no categorical
authority, and is bounded by resolved `heterogeneity`.

| Field                       |    Baseline | Combination             | Clamp or categorical rule                                                                    | Provenance and visual meaning                                                          |
| --------------------------- | ----------: | ----------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `elongation`                |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; membrane major/minor radius ratio                  |
| `asymmetry`                 |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; lopsided silhouette or displaced mass              |
| `nuclearToCytoplasmicRatio` |        0.35 | additive                | 0.20..0.85                                                                                   | baseline plus all accepted sources; stylized nucleus-area share                        |
| `nuclearEccentricity`       |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; nucleus offset or ellipticity                      |
| `membraneWaviness`          |        0.10 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; low-frequency contour amplitude                    |
| `polarity`                  |        1.00 | multiplicative          | 0.00..1.00                                                                                   | baseline plus all accepted sources; orientation and adhesion coherence                 |
| `heterogeneity`             |        0.10 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; bounded spread around family means                 |
| `tissueDisorganization`     |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; colony-layout placement and axis-coherence request |
| `invasion`                  |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; colony-layout front and escape-slot request        |
| `necrosis`                  |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; layout void and SVG muted interior                 |
| `dissemination`             |        0.00 | additive                | 0.00..1.00                                                                                   | baseline plus all accepted sources; colony-layout separate-site distribution request   |
| `mitoticState`              | `quiescent` | prioritized categorical | Highest priority; then later layer; then lexicographic `contributorId`                       | winning source plus baseline; SVG paired-nucleus or spindle motif only                 |
| `depthStratum`              |   `surface` | prioritized categorical | Layout slot priority 100; stage default priority 10; then later layer; then lexicographic ID | winning source plus baseline; SVG value, stroke, and detail treatment                  |

Numeric inputs must be finite. Unknown axis, unknown combination mode, missing contributor ID, or
nonfinite value rejects before rendering. Clamp once after the whole ordered chain. A clamp retains
every accepted source and adds a resolver clamp annotation; it never hides the contributor that
reached a bound. Every output field includes its baseline source, each accepted contribution, and
`individual:<seed>` only when individual variation changes that field.

### Individual variation and traits

`MorphologyResolution.traits` is a deep-frozen public morphology-resolver result. It is deterministic scene data,
not a render choice. Correlated noise shapes continuous membrane and nucleus form. Discrete seeded
streams select only the bounded traits below. They never alter a resolved categorical state, stage
identity, contributor provenance, or a colony-layout slot's depth stratum.

| Trait                 | Exact public domain                                              | Stable stream label           | Constraint and SVG consumption                                                                                        | Not claimed                                               |
| --------------------- | ---------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `familyVariant`       | `round`, `ovoid`, `lobed`, `spindle`                             | `m16:family-variant-v1`       | SVG cell renderer selects a compatible base volume before continuous contour noise; it does not change stage identity | Cell type, lineage, or measured pleomorphism distribution |
| `polarityOrientation` | `bucket` integer 0..7 and `angleDegrees = bucket * 45`           | `m16:polarity-orientation-v1` | SVG cell renderer rotates adhesion or contour alignment; colony layout retains placement authority                    | Measured tissue axis or migration vector                  |
| `mitosis.motif`       | `none`, `paired_nuclei`, `bipolar_spindle`, `multipolar_spindle` | `m16:mitosis-motif-v1`        | SVG cell renderer selects a rare motif only after resolved `mitoticState` permits it                                  | Mitotic index, chromosome count, or diagnosis             |
| `mitosis.placement`   | `none`, `central`, `offset`, `peripheral`                        | `m16:mitosis-placement-v1`    | SVG cell renderer places a permitted motif within the local cell volume; no layout movement                           | Tissue location or observed subcellular measurement       |

`quiescent` forces `mitosis.motif = none` and `mitosis.placement = none`. `dividing` permits only
`paired_nuclei` or `bipolar_spindle`, each with a non-`none` placement. `abnormal` permits
`multipolar_spindle` with a non-`none` placement. A trait stream is hash-derived independently, so
adding or changing family rendering cannot perturb orientation or mitosis selection. The complete
stable identity is the durable scene seed plus stage ID, stable region or slot ID, and cell index;
the colony layout owns those identity parts and the SVG cell renderer receives the already-resolved result. Changing the seed
creates a valid variation of the same stage, not a different stage.

## Stage reference table

The IDs and order below are exact. This is the morphology grammar table. It deliberately separates
the executable morphology-resolver declarations from colony-layout requests and SVG renderer cues.
No layout request or renderer cue is presented as an already-executable resolver contribution.

`numericTokens` has the exact machine grammar `axis|mode|value|referenceRowId`, separated by `;`.
`categoryTokens` has the exact grammar `field|value|priority|referenceRowId`, separated by `;`.
`NONE` means no direct morphology-resolver declaration. `rowIds` always includes the stage row
first and then its biological ledger rows. Values are morphology grammar constants, not balance
calibration knobs. A parser must
verify every token's `referenceRowId` is in the ledger and every direct executable fixture
contribution is represented exactly once in this row.

| rowId | stageId | rowIds | numericTokens | categoryTokens | Colony-layout request | SVG render motif or cue | Deliberately unchanged |
| --- | --- | --- | --- | --- | --- | --- |
| `stage:transformed_cell` | `transformed_cell` | `stage:transformed_cell;morphology:nuclear_irregularity` | `nuclearEccentricity|add|0.04|morphology:nuclear_irregularity` | `NONE` | one centered slot and generous negative space | one coherent cell with a subtly displaced nucleus | no necrosis, invasion, dissemination, or vascular margin |
| `stage:microcolony` | `microcolony` | `stage:microcolony;morphology:pleomorphism;morphology:polarity_loss` | `heterogeneity|add|0.08|morphology:pleomorphism;polarity|multiply|0.94|morphology:polarity_loss` | `NONE` | compact aligned cluster with repeated gaps | coherent contour rhythm and readable extracellular spacing | no hypoxic core or escaped cells |
| `stage:avascular_lesion` | `avascular_lesion` | `stage:avascular_lesion;morphology:tissue_disorganization;morphology:necrotic_region` | `tissueDisorganization|add|0.18|morphology:tissue_disorganization;necrosis|add|0.06|morphology:necrotic_region` | `depthStratum|deep|10|morphology:necrotic_region` | dense outer ring with constrained center | a quiet deep core through depth styling | no vascular margin or route departure |
| `stage:hypoxic_lesion` | `hypoxic_lesion` | `stage:hypoxic_lesion;morphology:necrotic_region;morphology:polarity_loss` | `necrosis|add|0.32|morphology:necrotic_region;polarity|multiply|0.76|morphology:polarity_loss` | `depthStratum|deep|10|morphology:necrotic_region` | central low-detail void and uneven packing | washed-out deep core against viable rim | no perfused expansion or separated sites |
| `stage:angiogenic_primary` | `angiogenic_primary` | `stage:angiogenic_primary;morphology:vascular_margin` | `NONE` | `NONE` | expanded rim with one restrained vascular-margin relation | regional vascular motif and perfused expansion are deferred to the colony layout and SVG renderer | no invasive broken boundary or route parcel |
| `stage:invasive_carcinoma` | `invasive_carcinoma` | `stage:invasive_carcinoma;morphology:invasion_front;morphology:pleomorphism;morphology:polarity_loss` | `invasion|add|0.48|morphology:invasion_front;asymmetry|add|0.14|morphology:pleomorphism;elongation|add|0.12|morphology:pleomorphism;polarity|multiply|0.7|morphology:polarity_loss` | `NONE` | directional broken front and protrusive slots | one asymmetric front through placement and contour alignment | no detached destination island |
| `stage:intravasation` | `intravasation` | `stage:intravasation;morphology:invasion_front;morphology:abnormal_mitosis` | `NONE` | `NONE` | departure corridor with sparse escaping slots | route departure and selected mitosis are regional/event, colony-layout, and SVG-renderer work, not stage grammar | no established remote colony |
| `stage:micrometastatic_seeding` | `micrometastatic_seeding` | `stage:micrometastatic_seeding;morphology:metastatic_dissemination;morphology:phenotype_variance` | `dissemination|add|0.52|morphology:metastatic_dissemination;heterogeneity|add|0.16|morphology:phenotype_variance` | `NONE` | several small related islands with distinct spacing | separated lineage-consistent cluster families | no system-wide burden field |
| `stage:metastatic_burden` | `metastatic_burden` | `stage:metastatic_burden;morphology:metastatic_dissemination;morphology:pleomorphism;morphology:tissue_disorganization` | `dissemination|add|0.74|morphology:metastatic_dissemination;heterogeneity|add|0.3|morphology:pleomorphism;tissueDisorganization|add|0.22|morphology:tissue_disorganization` | `NONE` | unequal site roles and density zones | heterogeneous multi-site composition | no collapse plate or culture geometry |
| `stage:host_collapse` | `host_collapse` | `stage:host_collapse;morphology:necrotic_region;morphology:tissue_disorganization` | `necrosis|add|0.72|morphology:necrotic_region;tissueDisorganization|add|0.5|morphology:tissue_disorganization` | `NONE` | fragmented field with a clear transition focal region | depleted negative space and a quiet collapse focal zone | no clinical outcome claim or culture dish |
| `stage:immortalized_culture` | `immortalized_culture` | `stage:immortalized_culture;morphology:senescent_shape;morphology:chromatin_texture` | `NONE` | `NONE` | organized dish-like field with passage zones | culture tags and persistent cohorts are deferred to prestige declarations and the SVG cell renderer | no host anatomy, prognosis, or L4 network |
| `stage:global_lab_contamination` | `global_lab_contamination` | `stage:global_lab_contamination;morphology:metastatic_dissemination;morphology:surface_motif;morphology:phenotype_variance` | `dissemination|add|0.92|morphology:metastatic_dissemination` | `NONE` | constellation of related node clusters | node and ecology surface motifs are deferred regional, colony-layout, and SVG-renderer work | no real-world outbreak, infection, or clinical dissemination claim |

## Hallmark and prestige inputs

Only declared sources may change the grammar. The stage and hallmark catalogs use these row IDs,
then cite the exact axis fields they own in catalog data. The renderer never infers a hallmark from
a rate or label.

| Source family                   | Permitted ledger row IDs                                                                             | Expected contribution scope                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Genome instability and mutation | `morphology:nuclear_irregularity`, `morphology:pleomorphism`                                         | nuclear irregularity and occasional family variance              |
| Phenotypic plasticity           | `morphology:phenotype_variance`, `morphology:polarity_loss`                                          | regional heterogeneity and orientation coherence                 |
| Proliferative signaling         | `morphology:abnormal_mitosis`                                                                        | categorical mitotic-state priority only                          |
| Replicative immortality         | `morphology:senescent_shape`                                                                         | persistent older cohort; no generic glow                         |
| Angiogenesis                    | `morphology:vascular_margin`                                                                         | regional vessel-margin motif, not a direct cell mutation         |
| Invasion and metastasis         | `morphology:invasion_front`, `morphology:metastatic_dissemination`                                   | Colony-layout front, escape slots, and separated sites           |
| Epigenetic program              | `morphology:chromatin_texture`                                                                       | bounded nucleus texture or contour change                        |
| Microbiome or ecology           | `morphology:surface_motif`                                                                           | sparse regional context motif                                    |
| L1 site and program             | `morphology:phenotype_variance`, `morphology:vascular_margin`, `morphology:metastatic_dissemination` | regional `site/program` contributions                            |
| L2 host trait                   | `morphology:polarity_loss`, `morphology:pleomorphism`                                                | regional `host` contributions                                    |
| L3 passage or cryobank program  | `morphology:senescent_shape`, `morphology:phenotype_variance`                                        | prestige contribution, retained at culture boundary              |
| L4 node or ecology              | `morphology:surface_motif`, `morphology:metastatic_dissemination`                                    | regional `node` contribution that retains all earlier provenance |

## Layout and renderer handoff

The colony layout consumes only resolved grammar requests: `tissueDisorganization`, `invasion`,
`necrosis`, `dissemination`, `polarity`, `heterogeneity`, and stable depth requests. It owns macro
silhouette, regions, density, negative space, depth strata, invasive fronts, focal regions, and
cell slots. It makes every stage distinguishable when cell internals are suppressed.

The SVG cell renderer consumes resolved cell parameters and colony-layout slots. It owns volume
construction, cytoplasm, nucleus, contour, mitotic motif, shared SVG definitions, semantic image
description, and CSS hooks. It does not decide stage macro form, reroll traits, or reinterpret
biology. `nuclearToCytoplasmicRatio` is a stylized area-share instruction, never a measurement.
`depthStratum` affects value, stroke, and detail hierarchy, not perspective or a claim about tissue
depth.

## Verification criteria

- Grammar tests parse the exact tables in this document and confirm every stage row names an exact
  `StageId`, one or more `ledgerRowIds`, a macro request, visible cue, and unchanged cue.
- The resolver proves complete finite parameters, deterministic same-seed output, permitted
  changed-seed variation, exact composition order, all clamps, categorical ties, and provenance
  retention under a node-only delta.
- Colony-layout contact sheets suppress cell internals and still distinguish every stage through
  silhouette, gaps, density, depth, and focal-region composition.
- SVG-renderer visual calibration inspects the smallest 320 x 224, desktop 560 x 392, and evidence
  1000 x 700 scenes on dark and neutral-light inspection backgrounds. Review checks non-color cues,
  unclipped geometry, coherent depth, legible focus, and absence of diagnostic implication.
- A concise adjacent caption or SVG description says the image is a stylized game abstraction.
  The image's accessible name gives stage identity; internal visual groups remain silent.
