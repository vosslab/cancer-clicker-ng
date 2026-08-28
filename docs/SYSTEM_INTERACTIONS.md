# System interactions

This is a deliberately small, high-value interaction set. It specifies how one system changes the
value of another at a defined time and through a named owner. It is not an exhaustive matrix. An
interaction counts only if a saved-state predicate changes feasibility, action order, or a recorded
result; a tooltip or generic rate bonus is not evidence. Terms and prestige contracts come from
[PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md); ordinary hallmark mechanics come from
[PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md).

## Interaction contract

Each implementation has a stable relationId, a catalog or handler owner, a visible source in the
UI, and an M21 fixture. Direction describes the value change, not an uncontrolled percentage stack.

| ID                          | Interaction and direction                                                                                                                  | Timing                                 | Owner                         | Player-visible evidence                                | M21 falsification                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ----------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| site_metabolism             | Exploit raises substrate conversion; occult lowers it and lowers detection. Metabolic deregulation is more valuable in exploit.            | site-program selection and tick        | L1 organ catalog plus economy | site card shows conversion/detection; both meters move | metabolism-first loses to immune-first in occult fixture                       |
| site_angiogenesis           | Remodel increases vessel stability but charges ATP upkeep. Angiogenesis matters where it prevents capacity loss.                           | vessel placement and tick              | L1 organ plus stage/economy   | vessel badge names stability and upkeep                | equal vessel spending is infeasible in low-ATP remodel but feasible in exploit |
| site_invasion               | Organ route affinity lowers compatible transit loss. Invasion value rises for portfolios with unmatched route tags.                        | route quote and transit                | L1 organ plus route           | route board labels affinity and loss                   | changing only target organ changes chosen route parcel                         |
| site_immune                 | Occult lowers detection, but vigilant hosts partly cancel it. Immune avoidance gains marginal value in the combination.                    | host selection and detection           | L1/L2 trait composition       | host/site badges list detection source                 | occult/vigilant cannot score like occult/tolerant                              |
| host_metabolism             | Nutrient-poor reduces substrate availability. Metabolic deregulation gains value but exploit detection remains.                            | host selection through reset           | L2 trait plus economy         | host card names substrate constraint                   | metabolism purchase becomes earlier only in nutrient-poor fixture              |
| host_angiogenesis           | Vascular amplifies perfusion while vigilant raises vessel-linked visibility. Angiogenesis is a route choice, not universal buy.            | vessel placement and immune check      | L2 trait plus vessel          | vessel quote lists perfusion and visibility            | vascular/vigilant reverses vascular/tolerant vessel ranking                    |
| host_horizon_immortality    | Brief favors early output; durable favors telomere reserve and replicative immortality while adding surveillance.                          | draft through collapse                 | L2 trait plus hallmark        | horizon badge and collapse forecast                    | same reserve allocation cannot win brief/durable pair                          |
| host_mutation_immune        | Vigilant magnifies mutation visibility liabilities. Immune avoidance or safer card gains value.                                            | mutation selection and detection       | L2 trait plus mutation        | card shows host-adjusted liability                     | high-output card loses only when vigilance holds                               |
| passage_assay_producers     | Assay discipline queues one exact-affordable producer action. It improves tempo but cannot make strategic choices.                         | post-purchase eligibility              | L3 passage handler            | queue labels producer and quote                        | hallmark/route/reset automation rejects; producer workflow is faster           |
| passage_cryobank_site       | Cryobank preserves one L1 program as a culture modifier, not L1 allocation or currency.                                                    | L3 reset and culture tick              | L3 passage                    | bench names program and source site                    | cultures with different cryobank programs differ; no L1 allocation remains     |
| passage_plasticity_routes   | High-throughput unlocks plasticity. Migratory phenotype helps routes while giving up local output.                                         | phenotype switch and route             | L3 passage plus route         | phenotype badge changes route quote/output             | migration wins route fixture and loses stationary-output fixture               |
| passage_epigenetic_mutation | Culture protocol makes program editing practical after a liability mutation. Editing redirects one acquired rule, never deletes liability. | edit cooldown and mutation evaluation  | L3 passage plus program       | panel shows rule, cooldown, retained liability         | edit retains mutation ID/liability while action order changes                  |
| passage_containment_network | Containment lowers one node detection penalty but forfeits throughput. It is better for deep risks than shallow relays.                    | hardening and network tick             | L3 passage plus L4 node       | detail shows containment and lost throughput           | containment loses shallow-safe relay and wins deep-risk node                   |
| plasticity_site_program     | Cryobanked exploit rewards proliferative, occult stress-tolerant, remodel migration/perfusion.                                             | phenotype cooldown window              | phenotype plus cryobank       | regional explanation names program tradeoff            | same phenotype allocation loses in one program fixture                         |
| microbiome_network_ecology  | High-yield microbiome raises conversion but can raise inflammation/visibility; ecology family can amplify either.                          | microbiome selection and stabilization | microbiome plus L4 ecology    | compatibility/ecology badges show both                 | high-yield pair fails high-detection node where lower-yield pair stabilizes    |
| senescence_containment      | Retained senescence gives local secretion but costs maintenance/detection; containment can make it viable at selected nodes.               | senescence and node detection          | senescence plus L3/L4         | card reports space, upkeep, effect, detection          | keep/clear ranking reverses without containment                                |
| inflammation_frontier       | Inflammation discovers routes faster but raises detection; expansion values discovery and enclave values stability.                        | mandate, discovery, detection          | inflammation plus mandate     | mandate names discovery/stability                      | inflammation-first wins expansion and loses enclave                            |
| dissemination_morphology    | Site program, host ecology, and node environment contribute independently to morphology.                                                   | render resolution after event          | M16 morphology resolver       | inspector lists contributor provenance                 | node-only change affects owned fields without erasing hallmark provenance      |

## Ownership and timing rules

| Boundary          | Rule                                                                                                                                                                                                                                                                                                       |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog           | Organ programs, host traits, passages, nodes, mandates, and ecology families are typed data with stable IDs and declared relation IDs.                                                                                                                                                                     |
| Event reducer     | Validates explicit selections, applies reset projections, and records durable chosen IDs. It never chooses a program, host, upgrade, node, or mandate.                                                                                                                                                     |
| Economy and stage | Evaluate current relation predicates during ticks, quotes, transit, and gates; return explicit state/result changes.                                                                                                                                                                                       |
| UI                | Displays active relation IDs, source values, and tradeoffs before confirmation; it has no hidden gameplay conditional.                                                                                                                                                                                     |
| Morphology        | M16 combines baseline, stage, hallmark, prestige, regional/site, host, node, then individual variation. Every output carries provenance.                                                                                                                                                                   |
| Save and replay   | M14/M15 persist selections and generated drafts/mandates through replayable GameEvent variants and current saves; M20 owns ReplayLog transport and fixtures. Reload never regenerates visible choices. Unknown IDs, duplicate edges, and exact-key violations reject or recover through the save contract. |

## Durable interaction sources

An interaction may consume only a declared durable source: GameState, the persisted LineageLedger,
a saved HostDraft, a saved DisseminationMandate, or a typed catalog. M14/M15 record selected IDs
and source eventSequence through recordEvent before UI confirmation can affect later behavior. A
relation handler never rebuilds an old host fact from cleared regions or regenerates a draft/frontier.
M20 later transports those closed events and saved records; it does not create a parallel path.

For a relation that changes a quote, the reducer recomputes the quote from trusted state and rejects
an event whose source eventSequence is stale. For a relation that changes a one-time network reward,
the persisted rewarded-node identity is the idempotence authority. These rules make table evidence
reproducible after save/load and replay.

## M21 interaction protocol

For every row, M21 creates a paired deterministic fixture that varies the named cause while holding
unrelated resource, stage, and catalog inputs fixed. It checks one of these outcomes:

- a previously invalid action becomes valid or vice versa;
- a declared policy changes its action; or
- a durable result field changes under the same replayed event sequence.

The row fails if only text, CSS, or a generic global multiplier changes. At least one passing row
must influence each of L1, L2, L3, and L4; at least six must cross a hallmark/prestige boundary.
The strategy-lab gate in [PRESTIGE_DESIGN.md](PRESTIGE_DESIGN.md) consumes these paired fixtures
to prove no policy is optimal everywhere.

## Deferred detail

- M14 declares organ/program/host/boon values and adds L1/L2 reducer tests.
- M15 declares passage/node/edge/mandate values and adds L3/L4 simulation tests.
- M16 maps contributor ranges to SVG MorphologyParams with clamps and provenance.
- M21 tunes values only after these predicates and falsification fixtures exist.
