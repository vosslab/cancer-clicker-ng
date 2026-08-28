# Prestige design

Prestige asks four different questions at four different scales. It never automatically resets,
selects an upgrade, or chooses a route. Every action has a visible quote, confirmation, and one
atomic event. This document owns M13 reset, currency, and catalog contracts. Ordinary hallmark and
stage behavior remains in [PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md).

## Shared contract

PrestigeAvailability remains only an earned identity until revalidated during an explicit reset.
M14 and M15 replace provisional perform-prestige-reset with layer-specific catalog-validated events.
A reset captures an immutable pre-reset snapshot, calculates its quote from that snapshot, validates
the selection, builds fresh state, and records one event. A stale quote, malformed ID, or unavailable
layer rejects atomically with no gain.

All constants below live in typed catalogs, not renderer code. M21 may tune values, but not formula
shape, reset scope, or decision target without a new design decision. Quotes show every input,
whole-number reward, and field cleared.

| Layer              | Question                                      | Currency              | Persistent decision                | Counterweight                      |
| ------------------ | --------------------------------------------- | --------------------- | ---------------------------------- | ---------------------------------- |
| L1 Metastasis      | Where should the lineage establish?           | Metastatic Potential  | organ allocation and niche program | yield versus detection             |
| L2 Host Transfer   | Which host makes the next run worthwhile?     | Host Imprints         | host card and lineage boon         | a favorable trait closes a route   |
| L3 Immortalization | What work should never be manual again?       | Passages              | permanent workflow tree            | convenience narrows specialization |
| L4 Dissemination   | Should the network deepen, widen, or reroute? | Transmission Pressure | nodes, edges, and mandates         | income versus future topology      |

## Reset ledger

"Clear" reconstructs a field through an initial-state factory. It never mutates old state. M14/M15
must test every row plus hostile persisted records.

| State group                                  | L1                       | L2                              | L3                                     | L4 campaign                                     |
| -------------------------------------------- | ------------------------ | ------------------------------- | -------------------------------------- | ----------------------------------------------- |
| cells, substrate, ATP, producers             | clear                    | clear                           | clear                                  | clear local-node balances                       |
| stage and gates                              | transformed_cell; clear  | transformed_cell; clear         | immortalized_culture; clear host gates | preserve global mode; clear campaign gate       |
| hallmark levels                              | retain floor(level / 2)  | clear to zero                   | clear to zero                          | preserve culture levels                         |
| regions, vessels, routes, commitments        | clear                    | clear                           | clear host graph                       | clear retired campaign only                     |
| pressures, offers, queues, cooldowns, timers | clear                    | clear                           | clear                                  | clear retired campaign only                     |
| deterministic run seed                       | new catalog-derived seed | new draft-derived seed          | new culture-derived seed               | new mandate-derived seed                        |
| L1 Potential, allocations, programs          | gain and preserve        | preserve                        | clear                                  | preserve                                        |
| L2 Imprints, host card, boons                | preserve                 | award; old card and boons clear | clear                                  | no host card; retain translated L3 effects only |
| L3 Passages and upgrades                     | unavailable              | preserve                        | gain and preserve                      | preserve                                        |
| L4 graph, Pressure, mandates                 | unavailable              | unavailable                     | preserve if unlocked                   | gain/spend/preserve graph; retire campaign      |

Event sequence remains monotonic across all layers. The L1 half-retention rule rounds down: a
level-one hallmark is lost and level two becomes exactly one. A passage upgrade can automate a
declared acquisition but never creates a hidden reset exception.

## Implementation-boundary contract

This section is normative for M14 and M15. It resolves persistence, reset, generated-choice, and
event-funnel ownership before code dispatch. It specifies contracts only; no prestige code exists
yet.

### Lineage ledger

M14 adds LineageLedger to GameState in src/types/state.ts. It is a persisted, exact-key record
separate from PrestigeAvailability. It is the only historical source for a later prestige formula;
a renderer, transient quote, or reconstructed destroyed region is never a ledger source.

| Ledger field                   | Domain and bound                                                 | Sole writer event                        | Update rule                                                        | Consumer                          |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| lineageSeed                    | unsigned 32-bit integer                                          | initial state and L3 reset               | immutable after creation; L3 derives a new value                   | host draft and culture derivation |
| hostRunSequence                | safe natural below MAX_SAFE_INTEGER                              | accepted L2 selection and L3 projection  | increment once when a chosen HostCard begins a host run            | terminal-preparation identity     |
| completedL1ResetCount          | safe natural below MAX_SAFE_INTEGER                              | perform-metastasis-reset                 | increment once after accepted L1 projection                        | L2 Imprint quote                  |
| completedHostTransferCount     | safe natural below MAX_SAFE_INTEGER                              | perform-host-transfer                    | increment once after accepted L2 projection                        | L3 Passage quote                  |
| hostCollapseAfterTransferCount | safe natural below MAX_SAFE_INTEGER                              | advance-stage to host_collapse           | increment only when currentHostRunId exists                        | L3 gate                           |
| successfulTransitCount         | safe natural below MAX_SAFE_INTEGER                              | resolve transit with arrived outcome     | increment once for a newly resolved EventId                        | L1 Potential quote                |
| organTagsSeen                  | unique sorted OrganTagId values; catalog maximum                 | successful L1-compatible seeding event   | append every catalog tag on a newly established compatible site    | L1 diversity and L2 gate/quote    |
| chosenHallmarksAcrossLineage   | unique sorted HallmarkId values; 14 maximum                      | purchase-hallmark                        | append only on first accepted purchase of that HallmarkId          | L3 Passage quote                  |
| usedLineageBoonIds             | unique sorted LineageBoonId values; catalog maximum              | first accepted event consuming that boon | append once; a use cannot be inferred from UI display              | L3 gate                           |
| terminalPreparation            | exact record or null                                             | advance-stage to host_collapse           | replace only for the current hostRunId with eligible flag and atMs | L3 quote                          |
| hostDraftSequence              | safe natural below MAX_SAFE_INTEGER                              | perform-host-transfer                    | increment once when creating a draft                               | HostDraft identity                |
| networkSeed                    | unsigned 32-bit integer or null before L4                        | perform-immortalization                  | derive once; immutable once non-null                               | L4 frontier derivation            |
| frontierSequence               | safe natural below MAX_SAFE_INTEGER                              | choose-dissemination-mandate             | increment once after accepting a frontier choice                   | frontier identity                 |
| stabilizedRewardedNodeIds      | unique sorted NetworkNodeId values; bounded by saved graph limit | collect-transmission-pressure            | append only when first credit is accepted                          | one-time L4 reward                |

terminalPreparation is exactly { hostRunId, eligible, assessedAtActiveMs }. eligible is evaluated
from the accepted pre-transition state: one viable low-detection site, no pending damage event, and
no pending transit event. assessedAtActiveMs equals the accepted transition timestamp. L3 accepts
only a record whose hostRunId is the current completed host run; it never recomputes the predicate
after reset.

Every ledger writer is inside src/state/events.ts through recordEvent. New prestige handlers may
request a ledger update, but cannot mutate it directly. All counters reject overflow. Stable-ID
sets are ordered by their canonical catalog order, have no duplicates, and reject an unknown ID.
M14 preserves the whole ledger through L1/L2 projections; M15 preserves it through L3/L4
projections. Only the named writer can change its corresponding field.

M14 adds the state field, a current progression-version migration, canonical writer support, and
exact-key parsing in src/state/save_parse/prestige.ts. Earlier valid saves receive the documented
empty ledger default only during an explicit forward migration, with a visible field-defaulted
notice until the schema becomes current; current saves missing or malformed ledger data reject.
The writer must round-trip the ledger with zero notices. M14 fixtures cover each defaulted legacy
path and each current hostile field, including duplicate IDs, reordered IDs, foreign IDs, unsafe
counters, mismatched terminal timestamp, and a record for a noncurrent host run.

### Reset projections and domains

M14 implements pure projectL1Reset and projectL2Reset in src/prestige/reset.ts. M15 extends that
single module with projectL3Reset and projectL4CampaignReset. Each signature accepts a validated
immutable GameState, a typed catalog selection, and the parsed event timestamp; it returns a
complete GameState. A UI quote object, renderer object, or raw snapshot is never an argument.

For every projection, preconditions are: event timestamp equals state.activeTimeMs; active time,
total offline time, and eventSequence are safe naturals; eventSequence is below MAX_SAFE_INTEGER;
all selected IDs are present in the currently saved, unconsumed quote/draft/frontier; and every
currency debit is affordable. On success, the output has eventSequence equal to input plus one,
activeTimeMs unchanged, stageStartedAtMs equal to activeTimeMs for a fresh stage, totalOfflineMs
unchanged, and a derived deterministicSeed. It clears only the reset-ledger table fields and
preserves all fields marked preserve. It never calls createInitialGameState and then repairs fields.

| Value family                                                          | Representation                               | Bounds and owner                                                                                  |
| --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Metastatic Potential and Transmission Pressure                        | canonical nonnegative BigNum                 | src/prestige/layers.ts quote/debit handlers; zero is canonical; no negative or noncanonical value |
| Host Imprints and Passages                                            | safe nonnegative integer                     | M14 hosts and M15 culture handlers; reject arithmetic overflow and catalog-unaffordable debit     |
| allocation ranks, boon/passage ranks, node depth, tier, and sequences | safe nonnegative integer                     | typed catalogs set each per-ID maximum; reject values outside it                                  |
| IDs, selected program/card/mandate, and graph edges                   | branded catalog IDs or exact durable records | M14/M15 types and parser; no duplicate, dangling, or unknown reference                            |
| timestamps and event sequence                                         | safe nonnegative integer                     | event funnel; no wall-clock reset substitution                                                    |

A failed precondition, stale quote revision, unavailable eligibility, failed debit, or projection
validation error returns the original object with no eventSequence advance, ledger update, currency
change, or saved-choice consumption. Tests must retain old references and deep-compare the original
state after each rejection. A successful reset is one recordEvent call and exactly one sequence
advance, never a reset event plus follow-up hidden mutation.

### Deterministic generated choices

M14 creates src/state/deterministic_random.ts as the sole random derivation owner. It exports
deriveSeedV1 and a documented Mulberry32 V1 stream. All state is unsigned 32-bit arithmetic using
Math.imul and unsigned shifts; no Math.random, locale conversion, object enumeration, or current
time is allowed. deriveSeedV1 encodes its ordered tuple as ASCII domain plus NUL-separated decimal
unsigned-integer fields, hashes the bytes with FNV-1a 32-bit, and maps zero output to one. Domain
strings are fixed ASCII constants. This is the canonical V1 derivation contract; changing it
requires a new versioned function and save/replay migration.

HostDraft generation receives exactly:
(host-draft-v1, lineageSeed, hostDraftSequence, preEventSequence).
The stable draft ID is host-draft-v1:lineageSeed:hostDraftSequence. Every draft always generates
and saves four candidate cards. Their IDs are that draft ID plus :0, :1, :2, and :3 in candidate
order. The baseline reveal set is [:0, :1, :2]. A previously acquired extra-card-reveal boon adds
:3 to the saved revealedCardIds set for that draft; it does not generate a fourth card later. The
stream chooses one trait from each declared axis without duplicate card tuples. A player chooses
exactly one revealed card, and selection names only draft ID and card ID.

M14 saves the full exact HostDraft before display: draft ID, source seed, source event sequence,
ordered four candidate records, revealedCardIds in candidate order, available flag, and consumed
card ID or null. The candidate count is always four; the visible count is three without the boon
and four with it. Reload/replay preserves both candidate and reveal order. A selection must name a
revealed, unconsumed card and cannot submit traits or a UI-supplied quote.

M15 frontier generation receives exactly:
(network-frontier-v1, networkSeed, globalTier, frontierSequence, preEventSequence).
The frontier ID is network-frontier-v1:networkSeed:globalTier:frontierSequence. Mandate IDs append
:0, :1, and :2 in display order. Generated node IDs use
generated-node-v1:networkSeed:globalTier:frontierSequence:mandateOrdinal:localOrdinal and edge IDs
use the analogous generated-edge-v1 tuple. The entire ordered frontier and all generated node/edge
records are saved before display. Acceptance names only frontier and mandate IDs.

A NetworkNodeState contains its stable node ID, source kind, campaign ID, stability status,
establishedAtActiveMs, and stabilizedAtActiveMs or null. It has no duplicate credited flag:
LineageLedger.stabilizedRewardedNodeIds is the sole durable idempotence authority. A
pressure-collection event accepts a node only when it is stable and absent from that set; it
atomically credits Pressure and appends its ID. Replaying, reloading, or re-clicking an already
rewarded node changes nothing. No visible draft or mandate is regenerated after save/load; M20
replay consumes the already recorded events and saved generated records.

M15 adds NetworkState to GameState in src/types/state.ts and owns it in src/prestige/network.ts.
It is the one persisted aggregate for L4 topology; the LineageLedger retains only networkSeed,
frontierSequence, and rewarded-node identities. NetworkState has exactly these durable fields:

| Field                | Domain and purpose                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| globalTier           | safe natural; the accepted tier used by frontier derivation                                               |
| transmissionPressure | canonical nonnegative BigNum; the current L4 balance credited only by an accepted one-time node claim     |
| nodes                | unique ordered NetworkNodeState records, bounded by the save graph limit                                  |
| edges                | unique ordered NetworkEdgeState records with edge ID, fromNodeId, toNodeId, status, and campaign ID       |
| pendingFrontier      | exact saved NetworkFrontier or null; its ID, source tuple, and exactly three ordered mandates are durable |
| activeMandateId      | DisseminationMandateId or null; the chosen mandate whose topology condition remains active                |
| retiredMandateIds    | unique ordered mandate IDs rejected or superseded by a chosen frontier, bounded by the graph limit        |
| activeCampaignId     | NetworkCampaignId or null; identifies the local campaign that L4 campaign reset may clear                 |

Each NetworkFrontier mandate record contains its stable mandate ID, category, ordered generated
node/edge IDs, status pending/selected/retired, and topology completion predicate. A pending
frontier has three pending mandates and null activeMandateId. Choosing one marks it selected,
stores its ID as activeMandateId, marks the other two retired, appends their IDs to
retiredMandateIds, and clears pendingFrontier only after those mutations validate atomically.
The 80-percent authored-completion test counts stable NetworkNodeState records whose source kind
is authored against the catalog's reachable authored nodes; it is not a renderer counter.

NetworkState parses/writes as an exact-key current-save record in src/state/save_parse/prestige.ts.
M15 migration supplies its documented empty initial state only for earlier accepted saves; a current
save with missing/unknown fields, duplicate IDs, unsorted records, dangling edge/node/mandate links,
invalid status transition, mismatched frontier tuple, or graph-limit breach rejects. Tests prove
stable IDs, frontier reload order, selected/pending transitions, dangling/duplicate rejection, and
the ledger-owned one-time credit.

### Event and replay handoff

M14 and M15 own strict gameplay events now. They add variants to src/types/events.ts, exact
parsing in src/state/event_parse.ts, closed EVENT_TYPES inventory, reducer handling in
src/state/events.ts, and state/save fixtures. Every event enters recordEvent. There is no
prestige-only UI mutation path.

M14 event variants are perform-metastasis-reset, allocate-organ-site, select-colonization-program,
purchase-lineage-boon, perform-host-transfer, and select-host-card. M15 variants are
perform-immortalization, purchase-passage-upgrade, select-cryobank-program,
establish-dissemination-node, commit-dissemination-edge, choose-dissemination-mandate,
stabilize-network-node, and collect-transmission-pressure. Exact final names may differ only if
their one-to-one semantic coverage, parsed payload, and EVENT_TYPES update are preserved.

Each reset/choice payload includes atMs, selected stable IDs, and source eventSequence as quote
revision. It carries no UI-computed reward, raw terminal snapshot, trait value, generated node, or
mutable state. Reducers recompute every quote from trusted state and reject revision mismatch.
M14/M15 tests prove each variant increments sequence once on success, rejects hostile/exact-key
input atomically, and survives canonical save/load.

M20 alone owns src/types/replay.ts, src/state/replay.ts, recording lifecycle, ReplayLog
serialization, and byte-identical replay proof. M14/M15 provide closed events and durable saved
records for it to transport; they do not introduce a second event log, private replay format, or
bypass event. M20 must consume the stored IDs, source revisions, and timestamps, never regenerate
a different displayed choice.

### Dispatch and success criteria

| Owner | Files                                                                                                                                                                               | Required proof                                                                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| M14   | src/prestige/reset.ts, seeding.ts, hosts.ts, layers.ts; src/state/deterministic_random.ts; types ids/state/events; event_parse.ts; events.ts; save parser/writer; reset/draft tests | ledger writer matrix; pure L1/L2 projections; saved four-candidate/three-or-four-reveal reload fixture; stale and hostile events atomic; migration/default closure |
| M15   | src/prestige/reset.ts, culture.ts, network.ts; types ids/state/events; event_parse.ts; events.ts; save parser/writer; culture/network tests                                         | L3/L4 projections reuse reset module; one-time pressure credit; saved frontier reload/replay fixture; 30-tier alternative test; graph hostile cases                |
| M20   | src/types/replay.ts, src/state/replay.ts, replay fixtures                                                                                                                           | serializes and replays the M14/M15 closed events without generating choices or bypassing recordEvent                                                               |

M14/M15 exit only after all new state parses/writes zero-notice current saves, every old migration
is explicit, every durable mutation is recordEvent-routed, and focused Node/tsx plus TypeScript,
check_codebase, build, and diff gates pass. M20 does not reopen their event ownership.

## L1 Metastasis

### Purpose and gate

L1 confirms the recommended allocation identity. It converts an exhausted host run into a portfolio
decision. It is available only when L1 is earned and revalidated at host_collapse, at least one
viable seeded site exists, and the resulting quote is nonzero.

### Currency and allocation

M14 calculates the quote solely from the accepted terminal snapshot:

```text
base = floor(log10(1 + terminalCells))
siteBonus = 2 * survivingSeededSiteCount
diversityBonus = distinctOrganTagCount
routeBonus = floor(successfulTransitCount / 2)
gainedPotential = max(1, base + siteBonus + diversityBonus + routeBonus)
```

terminalCells uses canonical BigNum logarithm/formatting then a safe, catalog-bounded integer
conversion. Potential is a persistent spendable balance; spent allocations are persistent site
upgrades. There is no random reward or hidden site multiplier.

The initial catalog has bone marrow, liver, lung, brain, adrenal, and peritoneum. Each typed
OrganSiteId has capacity, substrate, immune-detection, route-affinity, morphology tags, and a
nonempty canonical-order list of branded OrganTagId values plus three priced allocation ranks.
OrganTagId is distinct from OrganSiteId: several sites may share a tag and one site may have more
than one. On a successful compatible seeding event, the reducer appends every site tag to
LineageLedger.organTagsSeen if absent, preserving global OrganTag catalog order. All L1 diversity
and L2 distinct-organ-tag gates/quotes use that persisted OrganTagId list. A rank becomes available
only after a prior compatible route.

Early L1 variation needs a genuine second axis, not a cosmetic destination list. The first rank at
each site requires one irreversible ColonizationProgramId:

| Program       | Value direction                                | Cost                              | Observable effect                   |
| ------------- | ---------------------------------------------- | --------------------------------- | ----------------------------------- |
| exploit niche | more substrate conversion and earlier capacity | more detection                    | high-output/high-visibility badge   |
| occult niche  | less detection and better transit survival     | lower capacity                    | dormant-site badge and delayed gate |
| remodel niche | more capacity and vessel stability             | ATP upkeep and slower first yield | fibrotic/perfused badge             |

This program changes resource availability, hallmark value, stage behavior, and morphology. It is
cleared only by L3. M14 proves that identical allocations with different programs change a
feasibility or action-order result, not merely a tooltip.

### Decision and failure modes

The player chooses a detectable high-yield liver/lung portfolio, a concealed brain/adrenal
portfolio, or a slower capacity-oriented marrow/peritoneum portfolio. Angiogenesis and metabolism
benefit exploit/remodel sites; immune avoidance and invasion benefit occult sites.

- M21 rejects a site/program pair within 95 percent of best value in every L1 fixture.
- Zero-site collapse cannot farm Potential; revalidation requires a viable seed.
- M14 provides no free respec; a future respec needs its own cost and migration contract.
- Reset tests prove level-one loss and exact half retention.

## L2 Host Transfer

### Purpose and gate

L2 confirms the recommended draft identity. It makes the next run a chosen constraint set, not a
larger multiplier. It is available after three L1 resets, at host_collapse, with two distinct organ
tags recorded across the lineage. It clears all host-local stages, hallmarks, regions, and temporary
state.

### Currency and draft

The terminal snapshot awards Imprints before the draft:

```text
gainedImprints = 1 + floor(distinctOrganTagCount / 2) + floor(completedL1ResetCount / 3)
```

Imprints purchase lineage boons: one extra card reveal, one protected route-affinity tag, or one
reduced liability on a named host trait. Each boon declares a tradeoff. A saved deterministic draft
always contains four candidate HostCard records; baseline reveals three and the extra-card-reveal
boon reveals the fourth. The player still selects exactly one card.

Each card has one trait from each axis:

| Axis           | Values                            | Tradeoff                                           |
| -------------- | --------------------------------- | -------------------------------------------------- |
| immune regime  | vigilant, ordinary, tolerant      | detection high to low; liability response reverses |
| tissue ecology | vascular, nutrient-poor, fibrotic | perfusion, substrate, and remodel cost differ      |
| host horizon   | brief, ordinary, durable          | runway differs; durable adds surveillance          |

No card combines two improvements without a listed liability. The chosen card is a run modifier
applied through named handlers, never renderer conditionals, and clears at the next L2/L3 reset.

### Decision and failure modes

Tolerant/nutrient-poor rewards metabolism and immune avoidance; vascular/vigilant rewards rapid
angiogenesis and route play; fibrotic/durable rewards remodeling and persistence. Best card rank
must change with L1 portfolio.

- Drafts never reroll on render, reload, or unrelated event; fixtures replay all three cards.
- M21 runs every card against two L1 portfolios and requires a changed ranking.
- Reset tests prove old host offers, liabilities, and routes are absent while declared L1 fields stay.

## L3 Immortalization

### Purpose and gate

L3 confirms the recommended persistence identity. It turns host-run knowledge into a durable
laboratory workflow and explicitly enters fictional immortalized_culture; it makes no clinical
claim. It requires an L2 host transfer that reached host_collapse, one used boon, and L3
revalidation.

### Currency and tree

```text
gainedPassages = 1 + completedHostTransfers
                 + floor(distinctChosenHallmarksAcrossLineage / 4)
                 + stableCulturePreparationBonus
```

The preparation bonus is one only for a terminal host with a viable low-detection site and no
unresolved damage/transit event. M15 stores the lineage counters explicitly rather than inferring
from destroyed state.

| Branch                  | Permanent character                                     | Explicit limit                                          |
| ----------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| assay discipline        | queues one exact-affordable producer action             | never buys hallmarks, drafts, stages, routes, or resets |
| cryobank                | preserves one selected L1 program as a culture modifier | preserves neither allocation nor currency               |
| culture protocol        | shortens one program-edit or phenotype cooldown         | cannot erase liability or cooldown                      |
| high-throughput passage | unlocks 2022 hallmark interfaces                        | normal branch purchase and ATP cost remain              |
| containment practice    | lowers detection at one chosen network node             | forfeits local throughput                               |

High-throughput passage gates phenotypic plasticity, epigenetic reprogramming, polymorphic
microbiomes, and senescent cells, whose ordinary gates remain in
[PROGRESSION_DESIGN.md](PROGRESSION_DESIGN.md). Automation removes a narrow repetitive producer
action while all strategic actions remain manual.

### Decision and failure modes

Assay discipline favors producer tempo, cryobank extends a chosen niche, and containment prepares
L4. M21 requires each branch to be best in at least one workflow family or rework/removal.

- Tests reject automation of hallmark, route, draft, stage, prestige, and microbiome actions.
- L3 fixtures prove both lower currencies/allocation modifiers disappear while Passages remain.

## L4 Dissemination

### Purpose and gate

L4 confirms the recommended network identity. It turns culture output into graph topology. It is
available from global_lab_contamination after a stable route and L4 revalidation. It preserves the
L3 passage tree and creates a network above a local culture campaign.

### Currency and renewable graph

```text
nodeCredit = floor(log10(1 + stableNodeOutput)) + nodeDepth + diversityContribution
gainedTransmissionPressure = sum(nodeCredit for newly stabilized nodes)
```

Stability requires the node-specific duration without unresolved containment/detection failure.
Pressure buys edges, hardening, depth, or a renewal mandate. Nodes expose throughput, detection,
ecology family, adjacency, depth limit, and morphology environment tags.

After 80 percent of reachable authored nodes stabilize, a tier frontier presents three saved
deterministic DisseminationMandate choices:

| Mandate            | Immediate value                     | Persistent problem                 |
| ------------------ | ----------------------------------- | ---------------------------------- |
| frontier expansion | two low-depth nodes and new ecology | long edges and detection           |
| resistant enclave  | deep high-credit node               | adjacent containment burden        |
| relay mesh         | short low-loss network              | weaker diversity until new ecology |

The chosen mandate increments globalTier and generates the next frontier from saved seed/tier.
Generation guarantees a new-edge action plus deepen, harden, or reroute. A tier completes only
when its topology condition is met, never merely on currency collection.

### Decision and failure modes

Breadth improves diversity/future edges; depth improves credit but compounds detection; rerouting
trades income for resilience. Passage containment and microbiome/phenotype choices alter the best
path.

- M21 samples 30 deterministic tiers; every tier has a feasible alternative category and the best
  category changes at least twice.
- Pressure arrives only once after stability and remains idempotent across save/load/replay.
- Invalid route, stale mandate, duplicate edge, or unknown ecology rejects before state change.

## Implementation inventory

M14 introduces OrganSiteId, OrganTagId, ColonizationProgramId, HostCardId, HostTraitId, and
LineageBoonId; typed L1/L2 quotes; saved deterministic HostDraft; explicit reset events; and
durable lineage counters. It tests reset rows, quote determinism, four-candidate/three-or-four
reveal reload stability, half retention, OrganTagId derivation, and program decision divergence.

M15 introduces PassageUpgradeId, NetworkNodeId, NetworkEdgeId, NetworkFrontierId,
NetworkCampaignId, EcologyFamilyId, and DisseminationMandateId; typed L3/L4 quotes; NetworkState,
NetworkNodeState, NetworkEdgeState, NetworkFrontier, and saved mandates. It owns
culture-local/global-network separation, reset projections, frontier validation, idempotent
collection, and a 30-tier fixture. Both milestones extend the replayable GameEvent inventory,
state/save migration, and exact-key hostile tests; M20 owns ReplayLog transport and replay fixtures.
No availability record implies currency.

## M21 strategy-lab oracle

M21 compares visible-state-only policies local_growth, stealth_seeder, adaptive_drafter, and
network_architect on fixed seeds and equal budget. It reports winner, score, runner-up, and actions.
L1 scores viable site value minus detection failures; L2 scores card fit and gates; L3 scores
workflow reached with only permitted manual strategic actions; L4 scores stable pressure plus
reachable option categories. L1 must reverse local/stealth winners across route fixtures; L2 must
defeat any fixed card rank on one portfolio; L3 must reject a universal first passage buy; and L4
must make all-depth and all-breadth lose on a mandate sequence.

A policy is impermissibly dominant when it reaches 95 percent of best in every layer family. The
gate fails for dominance, missing meaningful alternatives, or a universal bonus. It is a
falsification test, not a promise of one universal best play style.

## Deferred calibration

- M21 sets quote ranges, prices, trait magnitudes, thresholds, and score bands.
- M16 maps site/host/program/node tags into clamped SVG provenance.
- M17 writes player-facing copy and confirmation warnings.
- M20 specifies replay serialization after M14/M15 state shapes exist.
