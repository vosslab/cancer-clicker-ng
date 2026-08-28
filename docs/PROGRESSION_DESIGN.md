# Progression design

## Purpose and boundaries

This document is the implementation contract for the 14 hallmark branches and the 12-stage
arc. It makes a playable system from cancer biology without presenting invented game states as
clinical staging. `src/hallmarks/` and `src/stages/` implement this document; later balance work
may change the parameters listed in [Unresolved tuning](#unresolved-tuning), not the settled
mechanic identities.

The player is always the optimizing transformed cell or its descendants. Deadpan copy may be
dark, but it never mocks people with cancer, names a patient, or treats disease as a lesson
panel. There are no quizzes or explanatory interrupts.

## Biological basis

The canonical branch set is Hanahan and Weinberg's six original capabilities, the four 2011
additions or enabling characteristics treated here as playable branches, and four 2022
dimensions. The papers establish the biological labels and their relationships; the resources,
costs, UI, and choices below are invented game abstractions. In particular, the uniform
fourteen-branch catalog is a settled game-design abstraction, not a claim that all fourteen have
the same biological status.

- [Hanahan and Weinberg 2000, The hallmarks of cancer](https://pubmed.ncbi.nlm.nih.gov/10647931/)
  establishes the original six capabilities.
- [Hanahan and Weinberg 2011, Hallmarks of cancer: the next generation](https://pubmed.ncbi.nlm.nih.gov/21376230/)
  adds metabolism and immune destruction and identifies inflammation and genome instability as
  enabling characteristics.
- [Hanahan 2022, Hallmarks of cancer: new dimensions](https://pubmed.ncbi.nlm.nih.gov/35022204/)
  supplies phenotypic plasticity, nonmutational epigenetic reprogramming, polymorphic
  microbiomes, and senescent cells.
- [NCI cancer staging](https://www.cancer.gov/about-cancer/diagnosis-staging/staging) is the
  authoritative staging reference. The game uses a biologically ordered dramatic arc, not a
  replacement for TNM, prognosis, or clinical care.

## Canonical vocabulary

The implementation uses these exact `HallmarkId` labels and display names. Later catalogs may
add levels, but may not rename, merge, or add a fifteenth branch in this release. "Core
capability" refers to the six capabilities identified in 2000; "enabling characteristic" retains
the publications' distinction from a capability. The 2022 senescent-cell entry represents a
tumor-microenvironment (TME) dimension, not a standalone hallmark capability.

| Era  | Biological status            | `HallmarkId`                   | Display name                           |
| ---- | ---------------------------- | ------------------------------ | -------------------------------------- |
| 2000 | Core capability              | `proliferative_signaling`      | Sustaining proliferative signaling     |
| 2000 | Core capability              | `growth_suppressor_evasion`    | Evading growth suppressors             |
| 2000 | Core capability              | `cell_death_resistance`        | Resisting cell death                   |
| 2000 | Core capability              | `replicative_immortality`      | Enabling replicative immortality       |
| 2000 | Core capability              | `angiogenesis`                 | Inducing angiogenesis                  |
| 2000 | Core capability              | `invasion_metastasis`          | Activating invasion and metastasis     |
| 2011 | Emerging hallmark capability | `metabolic_deregulation`       | Deregulating cellular metabolism       |
| 2011 | Emerging hallmark capability | `immune_destruction_avoidance` | Avoiding immune destruction            |
| 2011 | Enabling characteristic      | `tumor_promoting_inflammation` | Tumor-promoting inflammation           |
| 2011 | Enabling characteristic      | `genome_instability_mutation`  | Genome instability and mutation        |
| 2022 | Proposed hallmark capability | `phenotypic_plasticity`        | Unlocking phenotypic plasticity        |
| 2022 | Enabling characteristic      | `epigenetic_reprogramming`     | Nonmutational epigenetic reprogramming |
| 2022 | Enabling characteristic      | `polymorphic_microbiomes`      | Polymorphic microbiomes                |
| 2022 | TME senescent-cell dimension | `senescent_cells`              | Senescent cells                        |

## Mechanic taxonomy

Each primary class changes a different player operation. A secondary effect may support an
interaction, but does not replace the primary operation. The class cap is two; this design uses
each class once, so a later implementation cannot quietly turn the tree into rate multipliers.

| Mechanic class        | Player operation                                                                         | Assigned branch                 |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------- |
| Division allocation   | Split active division effort between manual burst and sustained cycle                    | Proliferative signaling         |
| Checkpoint routing    | Choose which checkpoint gate to bypass for a temporary production lane                   | Growth suppressor evasion       |
| Damage triage         | Spend survival capacity to absorb, repair, or accept a loss event                        | Cell death resistance           |
| Replicative budget    | Allocate finite telomere reserve between immediate output and retained future capacity   | Replicative immortality         |
| Perfusion layout      | Allocate vascular connections among colony regions with capacity and maintenance costs   | Angiogenesis                    |
| Route commitment      | Commit biomass to local expansion or a risky dissemination route                         | Invasion and metastasis         |
| Energy budgeting      | Convert substrate into ATP, then choose ATP sinks rather than buying direct output       | Metabolic deregulation          |
| Visibility management | Balance immune visibility against the efficiency of conspicuous high-output actions      | Immune destruction avoidance    |
| Event cultivation     | Trigger a local inflammatory event for a timed opportunity while raising damage pressure | Tumor-promoting inflammation    |
| Mutation drafting     | Draft one mutation from a constrained offer and accept its linked liability              | Genome instability and mutation |
| Phenotype switching   | Switch a region between proliferative, migratory, and stress-tolerant phenotypes         | Phenotypic plasticity           |
| Program editing       | Reconfigure one acquired branch's operating rule at a cooldown and ATP cost              | Epigenetic reprogramming        |
| Community composition | Fill limited microbiome niches with mutually exclusive symbiont effects                  | Polymorphic microbiomes         |
| Senescence management | Preserve senescent cells for their local secretion or clear them for space and cost      | Senescent cells                 |

## Branch specifications

The `affected state` fields are the minimum semantic state required by the canonical progression
schema. Exact numeric values are intentionally deferred. A visible consequence belongs in normal
play, not only a tooltip.

### Sustaining proliferative signaling

- **Mechanic.** The player assigns each acquired signaling pulse to `burst` for stronger manual
  clicks now or `cycle` for a lasting producer-cycle fill rate. The assignment can be changed
  between purchases, not during a click.
- **Affected state.** `signalingAllocation`, `manualDivisionCharge`, and `cycleFillRate`.
- **Unlock.** The first completed manual division enters `transformed_cell` and sets
  `signalingAllocation` to the deterministic `burst` default. The allocation control is enabled
  immediately; a reallocation event may occur before the second manual division. This makes the
  first two actions and their replay trace testable.
- **Visible consequence.** The nucleus pulses for burst allocation; a cycling rim advances for
  cycle allocation, and the producer panel shows both rates.
- **Class.** Division allocation.
- **Interaction.** ATP from metabolic deregulation makes cycle allocation affordable; plasticity
  can redirect cycle-heavy regions into migration.
- **Decision test.** Before this branch, the player clicks and buys the cheapest producer; after
  it, the player decides whether the next signaling pulse should shorten the present purchase or
  improve sustained production.

### Evading growth suppressors

- **Mechanic.** A checkpoint board presents contact inhibition, nutrient arrest, and damage
  arrest. The player bypasses one board slot per stage; bypassing one unlocks its producer lane
  but raises its named pressure.
- **Affected state.** `bypassedCheckpoints`, `contactPressure`, `nutrientPressure`, and
  `damagePressure`.
- **Unlock.** Microcolony stage with two active producers.
- **Visible consequence.** The selected checkpoint is visibly crossed out and the colony grows
  into denser regions; the corresponding pressure meter begins moving.
- **Class.** Checkpoint routing.
- **Interaction.** Angiogenesis makes nutrient-arrest bypass safer; cell-death resistance makes
  damage-arrest bypass tolerable.
- **Decision test.** Before this branch, the player buys every available producer in one order;
  after it, the player decides which constrained producer lane is worth opening and which pressure
  to carry.

### Resisting cell death

- **Mechanic.** At a damage event, the player chooses to spend survival capacity to absorb the
  event, repair one pressure meter, or let a region die and collect its recoverable substrate.
- **Affected state.** `survivalCapacity`, `damageEvents`, `regionalViability`, and `substrate`.
- **Unlock.** Avascular lesion with nonzero damage pressure.
- **Visible consequence.** Cells either remain viable with a membrane repair flash, shrink into a
  cleared gap, or leave a substrate marker.
- **Class.** Damage triage.
- **Interaction.** Inflammation produces more useful and more dangerous events; senescent-cell
  clearance competes for the same regional space.
- **Decision test.** Before this branch, the player passively loses output when pressure wins;
  after it, the player decides whether a present resource outlay, a repair, or a deliberate local
  loss best preserves the run.

### Enabling replicative immortality

- **Mechanic.** Every division consumes telomere reserve. The player spends telomerase charges
  either to refill reserve in a chosen region or to bank a permanent reserve floor for the rest of
  the current host run.
- **Affected state.** `telomereReserveByRegion`, `telomeraseCharges`, and `reserveFloor`.
- **Unlock.** Hypoxic lesion after a region reaches its first division-limit warning.
- **Visible consequence.** The chosen region loses or regains chromosomal-end warning marks; its
  capacity badge changes from finite to protected.
- **Class.** Replicative budget.
- **Interaction.** Senescent cells conserve a failing region's short-term output but consume the
  space needed for a telomerase-protected replacement.
- **Decision test.** Before this branch, the player treats every division as equally durable;
  after it, the player decides whether telomerase should rescue current throughput or establish
  long-run capacity in a region that will matter later.

### Inducing angiogenesis

- **Mechanic.** The player places limited vessel links to colony regions. A link increases that
  region's oxygen and carrying capacity, but each link costs maintenance ATP and deprives an
  unlinked region of priority.
- **Affected state.** `vesselLinks`, `oxygenByRegion`, `regionalCapacity`, and
  `vesselMaintenanceAtp`.
- **Unlock.** Hypoxic lesion after oxygen demand exceeds local supply.
- **Visible consequence.** SVG vessel paths reach selected regions; linked tissue brightens while
  neglected centers develop a hypoxic rim.
- **Class.** Perfusion layout.
- **Interaction.** Proliferative signaling raises oxygen demand, and invasion can use a vessel as
  an intravasation route.
- **Decision test.** Before this branch, the player treats the colony as one uniform capacity;
  after it, the player decides which region receives perfusion and which region is allowed to
  remain capacity-limited.

### Activating invasion and metastasis

- **Mechanic.** The player commits a biomass parcel to local expansion or one revealed exit route.
  A route has a transit loss chance, a destination capacity, and a future L1-compatible organ tag.
- **Affected state.** `committedBiomass`, `invasionRoutes`, `routeRisk`, and
  `seededSites`.
- **Unlock.** Invasive carcinoma after an angiogenic primary has one viable vessel link.
- **Visible consequence.** An invasive front leaves the primary and a route badge shows its
  destination and loss risk.
- **Class.** Route commitment.
- **Interaction.** Plasticity can create migratory cells that reduce transit loss; immune
  avoidance lowers detection risk on a route.
- **Decision test.** Before this branch, the player spends biomass only to enlarge the current
  colony; after it, the player decides whether a smaller primary now is worth a risky future
  foothold elsewhere.

### Deregulating cellular metabolism

- **Mechanic.** Substrate conversion creates ATP. The player sets the ATP budget among producer
  acceleration, vessel maintenance, mutation drafting, and later control costs; unused ATP does
  not become biomass automatically.
- **Affected state.** `substrate`, `atp`, `atpBudget`, and `atpSinks`.
- **Unlock.** Avascular lesion with sustained cycle production.
- **Visible consequence.** A separate ATP meter and budget wedges appear, with a glycolytic glow
  when substrate is converted.
- **Class.** Energy budgeting.
- **Interaction.** Proliferative signaling competes for ATP with angiogenesis; microbiome niches
  can alter substrate yield rather than direct biomass.
- **Decision test.** Before this branch, the player spends one currency on the next purchase;
  after it, the player decides which ATP sink receives limited energy and accepts the delayed
  consequence in the other systems.

### Avoiding immune destruction

- **Mechanic.** High-output actions create immune visibility. The player may spend concealment
  tokens to mask a region, slow its action rate, or leave it visible for better immediate output.
- **Affected state.** `immuneVisibilityByRegion`, `concealmentTokens`, `immunePressure`, and
  `maskedRegions`.
- **Unlock.** Angiogenic primary after the first immune-recruitment threshold.
- **Visible consequence.** Visible regions receive an immune overlay and targeted markers;
  masked regions dim and show a concealment badge.
- **Class.** Visibility management.
- **Interaction.** Genome instability improves mutation offers while raising visibility through
  neoantigen-like exposure in the abstraction; inflammation raises both recruitment and token
  generation.
- **Decision test.** Before this branch, the player maximizes every available output action;
  after it, the player decides which region can afford to be conspicuous and which must trade
  efficiency for concealment.

### Tumor-promoting inflammation

- **Mechanic.** The player activates a bounded inflammatory episode in one region. It temporarily
  raises local substrate access and route discovery while also adding damage and immune pressure.
- **Affected state.** `inflammationEpisodes`, `regionalInflammation`, `damagePressure`, and
  `routeDiscoveryProgress`.
- **Unlock.** Angiogenic primary with at least one vessel link and one immune-visible region.
- **Visible consequence.** The chosen region has a timed inflammatory halo, a route-discovery
  progress marker, and rising pressure bars.
- **Class.** Event cultivation.
- **Interaction.** Cell-death resistance can capture the short-term opportunity; immune avoidance
  determines whether the episode becomes an unacceptable detection spike.
- **Decision test.** Before this branch, the player waits for conditions to improve; after it,
  the player decides whether a temporary high-risk episode is worth forcing for a route or
  substrate window.

### Genome instability and mutation

- **Mechanic.** At mutation thresholds, the player drafts one of three mutation cards with a
  named benefit and liability. Unchosen cards vanish; each draft permanently raises genome burden
  for the current host run.
- **Affected state.** `mutationOffers`, `chosenMutations`, `genomeBurden`, and
  `mutationLiabilities`. Each offer has a stable `OfferId`; its cards and source outcome are a
  saved pending snapshot, never a render-time reroll.
- **Unlock.** Angiogenic primary with ATP available for a draft.
- **Visible consequence.** A three-card choice appears, and chosen regions gain altered mitosis
  marks plus a genome-burden indicator.
- **Class.** Mutation drafting.
- **Interaction.** Immune destruction avoidance counters the visibility liability; epigenetic
  reprogramming can later change how one chosen mutation is expressed, not remove it.
- **Decision test.** Before this branch, the player takes deterministic upgrades in a fixed best
  order; after it, the player decides which irreversible benefit and liability pair fits the
  current colony rather than chasing one universal upgrade order.

### Unlocking phenotypic plasticity

- **Mechanic.** The player assigns each eligible region a proliferative, migratory, or
  stress-tolerant phenotype. Each phenotype changes that region's production, route, and pressure
  behavior and has a switch cooldown.
- **Affected state.** `phenotypeByRegion`, `phenotypeCooldowns`, and `regionalModifiers`.
- **Unlock.** Metastatic burden and the L3 immortalization interface being available; it is not
  purchasable before the later-prestige gate.
- **Visible consequence.** Neighboring cells visibly vary in shape and density, and region badges
  show the active phenotype.
- **Class.** Phenotype switching.
- **Interaction.** It changes the value of signaling, angiogenesis, invasion, metabolism, and
  immune avoidance by making their advantages regional rather than global.
- **Decision test.** Before this branch, the player uses one colony-wide production posture;
  after it, the player decides which regions should grow, travel, or endure and when the cooldown
  makes a switch worth sacrificing immediate output.

### Nonmutational epigenetic reprogramming

- **Mechanic.** The player spends ATP and a long cooldown to select one acquired branch and swap
  its active operating rule from a small declared alternative, such as changing a signaling pulse
  from burst-biased to cycle-biased. It cannot create an unpurchased hallmark or erase a mutation.
- **Affected state.** A catalog-backed `ProgramOptionId` lists allowed options for every eligible
  `HallmarkId`; state stores the current selection by branch, the branch eligibility record, and
  a simulation-time `programCooldownDeadlineMs`. `reconfiguredBranch` is an event outcome, not
  the source of truth. The reducer rejects an option outside the acquired branch's allowed list.
- **Unlock.** Immortalized culture after phenotypic plasticity is active.
- **Visible consequence.** The affected branch icon and regional chromatin texture change, and
  its rule summary visibly updates.
- **Class.** Program editing.
- **Interaction.** It lets a run recover from a mutation draft or organ-specific strategy without
  making all earlier choices meaningless; plasticity supplies the most valuable target rules.
- **Decision test.** Before this branch, the player can only add upgrades or wait for a reset;
  after it, the player decides whether the current strategic posture warrants a costly, delayed
  reconfiguration of an existing branch.

### Polymorphic microbiomes

- **Mechanic.** The player fills two microbiome niches from a rotating set of communities. Each
  community changes substrate conversion, inflammatory duration, or immune visibility, and the
  two selected communities have an explicit compatibility result.
- **Affected state.** `microbiomePoolId`, `microbiomeOffers`, `microbiomeNiches`,
  `microbiomeCompatibility`, `microbiomeRotationCounter`, `microbiomeRotationDeadlineMs`, and
  `substrateModifiers`. The saved pending snapshot includes stable `OfferId` values, the
  compatibility result, and the seed/sequence position that produced it.
- **Unlock.** Global lab contamination after one dissemination route is stable; this late gate
  prevents it from being an early generic multiplier.
- **Visible consequence.** Niche badges and colony surface motifs change; incompatible selections
  display their active tradeoff.
- **Class.** Community composition.
- **Interaction.** It changes the metabolism-inflammation-immune triangle rather than boosting all
  production; a high-yield community can intensify inflammation or immune visibility.
- **Decision test.** Before this branch, the player can optimize each resource system separately;
  after it, the player decides which limited community combination best supports the current
  energy, inflammation, and concealment strategy.

### Senescent cells

- **Mechanic.** When a region reaches replicative or damage failure, the player either keeps it
  senescent for a local secretory effect or clears it to recover space and remove its maintenance
  burden. Kept senescent cells do not divide.
- **Affected state.** `senescentRegions`, `secretoryEffects`, `clearanceQueue`, and
  `regionalCapacity`. Each failure is a stable `EventId` linked to a `RegionId`, so keep versus
  clear actions survive save/load and replay.
- **Unlock.** Immortalized culture with a recorded division-limit or damage-failure event and the
  L3 interface available.
- **Visible consequence.** Senescent cells become enlarged and flattened; clearing creates a gap
  and removes their secretory halo.
- **Class.** Senescence management.
- **Interaction.** It directly tensions replicative immortality and cell-death resistance, while
  inflammation can make retained secretory effects useful or dangerously visible.
- **Decision test.** Before this branch, a failed region is only lost capacity; after it, the
  player decides whether its nondividing local effect is worth space, upkeep, and the pressure it
  creates.

## Synergy and tension network

Relations below are deliberate dependencies, not generic percentage bonuses. Balance calibration
evidence must demonstrate that their presence changes which branch or operation is selected.

| Relation                                              | Type                 | Game consequence                                                                                                                               |
| ----------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Metabolic deregulation -> proliferative signaling     | Enables and competes | ATP makes cycle allocation viable, but cycle acceleration consumes ATP needed by other sinks.                                                  |
| Angiogenesis -> proliferative signaling               | Amplifies            | Perfused regions can sustain cycle allocation without triggering oxygen failure.                                                               |
| Angiogenesis -> invasion and metastasis               | Enables              | A viable vessel link reveals an intravasation route.                                                                                           |
| Inflammation -> cell death resistance                 | Changes              | An episode creates triage opportunities that are not present in quiet tissue.                                                                  |
| Genome instability -> immune avoidance                | Tension              | Better mutation offers raise visibility, so concealment becomes more valuable.                                                                 |
| Genome instability -> epigenetic reprogramming        | Changes              | Reprogramming changes expression of one liability but cannot erase the draft.                                                                  |
| Replicative immortality -> senescent cells            | Tension              | Banking telomere reserve preserves future division capacity; retaining a senescent region preserves a local effect but occupies that capacity. |
| Plasticity -> signaling, angiogenesis, and invasion   | Changes              | A region's phenotype determines whether those branches favor output, perfusion, or movement.                                                   |
| Microbiomes -> metabolism, inflammation, and immunity | Competes             | Community selection changes all three systems, so the best energy choice can be the wrong detection choice.                                    |
| Growth suppressor evasion -> cell death resistance    | Enables              | Bypassing damage arrest opens output but creates damage that requires triage.                                                                  |

### Relation observability

Every relation has a stable `relationId`. Behavioral validation evaluates its predicate from saved
state and proves an action-order or feasibility difference; a changed tooltip or scalar rate alone
does not satisfy the relation.

| `relationId`             | Enabling predicate                                        | Competing actions                                   | Observable state or action-order difference                                                         |
| ------------------------ | --------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `metabolism_signaling`   | ATP budget exists and signaling is acquired               | Accelerate cycle; reserve ATP                       | The affordable action set changes when ATP is assigned to cycle rather than a vessel or draft.      |
| `angiogenesis_signaling` | A region has a vessel link                                | Cycle allocation; defer cycle                       | The perfused region avoids oxygen failure while the same allocation in an unlinked region does not. |
| `angiogenesis_invasion`  | A viable linked vessel reaches an invasive edge           | Place a vessel; commit a route parcel               | Route selection becomes feasible only after the qualifying link.                                    |
| `inflammation_triage`    | A timed inflammation episode is active                    | Trigger episode; defer it                           | The episode creates a named damage `EventId` and triage action that quiet tissue lacks.             |
| `genome_immune`          | A recorded mutation offer is pending                      | Take a liability; choose another card or conceal    | The selected card changes saved visibility and the following concealment feasibility/order.         |
| `genome_epigenetic`      | An acquired eligible branch has a selected program        | Edit program; keep current program                  | The chosen `ProgramOptionId` changes a branch rule without deleting the mutation record.            |
| `immortality_senescence` | A region has a recorded failure event                     | Bank reserve; keep or clear senescence              | Space, division capacity, and secretory-effect records differ after the same event.                 |
| `plasticity_regional`    | Plasticity is available and a region cooldown has expired | Select proliferative, migratory, or stress-tolerant | The selected phenotype changes regional route, production, and pressure operations.                 |
| `microbiome_triangle`    | A pending microbiome pair is compatible or incompatible   | Select one of two allowed pairs                     | The saved compatibility snapshot changes substrate, inflammation, and visibility together.          |
| `checkpoint_triage`      | Damage arrest is bypassed                                 | Bypass damage arrest; choose another checkpoint     | The bypass adds damage pressure and later exposes a triage event path.                              |

### Required opposing incentives

These are genuine tensions. Neither side is a globally correct purchase or toggle.

| Tension                                  | Incentive A                                           | Incentive B                                                                               | Evidence of a changed choice                                                                   |
| ---------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Metabolism and proliferation             | Spend ATP on cycle acceleration for current biomass   | Hold ATP for vessels, drafting, or control costs                                          | The optimizer changes ATP allocation when the next stage needs vessel links.                   |
| Angiogenesis, hypoxia, and necrosis      | Perfuse a region to preserve its high-capacity output | Leave a low-value region hypoxic, accept necrosis, and use its cleared space or substrate | Vessel placement differs from equal distribution when maintenance is scarce.                   |
| Genome instability and immune visibility | Take a high-value mutation with visibility liability  | Choose a lower-output mutation or spend on concealment                                    | The optimal mutation card changes with immune pressure.                                        |
| Senescence and immortality               | Bank telomere capacity and replace failed tissue      | Keep nondividing senescent tissue for a local effect                                      | The best action changes with regional space, inflammation, and failure pressure.               |
| Plasticity and local output              | Keep a region proliferative for immediate production  | Switch it to migration or stress tolerance for a route or survival window                 | A route or oxygen crisis changes phenotype assignment even when production rates favor growth. |

## Canonical stage ladder

Stage IDs and order are fixed by the stage catalog. The first nine are game-oriented
correspondences to biological progression, while the final three deliberately leave clinical
staging behind. Host collapse, immortalized culture, and global lab contamination are fictional
game modes or post-transition contexts, not oncology stage labels and not one linear clinical host
run. An ordinary host run stops at the host-collapse boundary; an L3-enabled transition enters
immortalized culture, from which global lab contamination is a later mode. Gates are semantic
conditions; balance calibration sets their numeric thresholds.

| ID and stage                                           | Gate concept                                             | New pressure                                                     | New opportunity or resource relationship                                                   | Retired prior assumption                         | UI mode               | Evidence play changes                                                                                    |
| ------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------- |
| `transformed_cell` Transformed cell                    | First manual division                                    | Manual-only scarcity                                             | Clicks create biomass and reveal signaling allocation                                      | One cell is enough for every action              | Cell focus            | The player times clicks for burst charge instead of saving for a nonexistent producer.                   |
| `microcolony` Microcolony                              | Cell count reaches the first local cluster               | Contact and nutrient pressure                                    | Producers occupy regions; checkpoint routing opens one constrained lane                    | All biomass comes from clicks                    | Colony grid           | The player compares producer lanes and selects a checkpoint to bypass.                                   |
| `avascular_lesion` Avascular lesion                    | Demand exceeds diffusion supply                          | Oxygen deficit and damage events                                 | Substrate converts to ATP with competing sinks                                             | One currency can buy every useful action         | Resource budget       | The player budgets ATP instead of purchasing only the next cheapest producer.                            |
| `hypoxic_lesion` Hypoxic lesion                        | A region remains under-supplied                          | Hypoxia, necrosis risk, and division-limit warnings              | Vessel links and telomere reserve target regions                                           | Regions are interchangeable                      | Region map            | The player chooses a region to perfuse or protect rather than maximizing the global rate.                |
| `angiogenic_primary` Angiogenic primary                | At least one viable vessel link                          | Immune recruitment and vessel upkeep                             | Perfusion enables high-capacity regions, route discovery, and immune visibility management | Vessels are only survival repairs                | Vascular overlay      | The player weighs a new vessel against concealment and maintenance ATP.                                  |
| `invasive_carcinoma` Invasive carcinoma                | Breach an invasion threshold with a perfused edge        | Transit loss and reduced primary biomass                         | Commit parcels to local growth or invasive fronts                                          | More local mass is always best                   | Route board           | The player delays a producer to seed an exit route.                                                      |
| `intravasation` Intravasation                          | Commit a parcel through a viable vessel route            | Route-specific detection and attrition                           | Select transit route and prepare phenotype or concealment for it                           | A route is a one-click payout                    | Transit panel         | The player chooses a lower-yield route because its immune and phenotype fit is safer.                    |
| `micrometastatic_seeding` Disseminated micrometastases | A surviving parcel establishes at a destination          | Multiple small sites compete for ATP and attention               | Site-specific regions create future allocation choices                                     | One colony has one optimal phenotype             | Site switcher         | The player sustains one seed while allowing another to remain dormant.                                   |
| `metastatic_burden` Metastatic burden                  | Multiple sites pass a burden threshold                   | System-wide immune and resource coupling                         | Phenotypic plasticity becomes strategically relevant to diverse site roles                 | Every region should use the same upgrade posture | Burden dashboard      | The player assigns growth, migration, and stress phenotypes by site.                                     |
| `host_collapse` Host collapse                          | Global burden exceeds host tolerance                     | Run termination is imminent; new purchases have opportunity cost | The run can cash out into the existing future reset interface when implemented             | The host is an infinite substrate container      | Collapse summary      | The player stops buying slow-payback producers and prepares the best end-of-host conversion.             |
| `immortalized_culture` Immortalized culture            | Host collapse is resolved through the later L3 interface | Passage maintenance, culture space, and program cooldowns        | No host resource limit; epigenetic and senescent management become available               | Ending a host ends meaningful play               | Culture bench         | The player reconfigures a program or clears senescence instead of pursuing a host-stage gate.            |
| `global_lab_contamination` Global lab contamination    | Culture crosses dissemination threshold                  | Network compatibility, node scaling, and community tradeoffs     | Microbiome niches and contamination nodes couple distant colonies                          | A culture is a single isolated environment       | Contamination network | The player chooses which node or community composition to develop, not merely the largest biomass total. |

## State and implementation implications

### State schema contract

The progression state schema encodes these concepts in `GameState` rather than inferring them from
DOM state or copy:

- `GameState.currentStage` is the sole canonical state field and contains a branded `StageId`.
  `stageId` may name a catalog property, event payload member, or local function parameter, but
  is never a competing saved-state field.
- `GameState.cells` is the sole canonical saved numeric resource. "Biomass" is player-facing or
  collective wording only and maps directly to `cells`; it is never a second numeric balance
  field. Save payloads, replay events, reducers, and migration names use `cells` and
  `currentStage`, while UI copy may say biomass.
- Per-stage gate progress and a stage-transition event record.
- `cells`, `substrate`, `atp`, region records, and named pressures for oxygen, damage, and immune
  visibility.
- Per-branch level or ownership plus the branch-specific decision state listed in each branch
  specification. Empty maps are valid before a branch unlocks.
- Stable branded identities at module boundaries: `RegionId`, `OfferId`, `EventId`, `RouteId`,
  `MutationId`, `ProgramOptionId`, `MicrobiomePoolId`, and existing catalog IDs. Serializable
  records store primitive ID values and are keyed or linked by those IDs rather than anonymous
  DOM maps.
- Region records with capacity, viability, phenotype, vessel-link, route, and senescence
  relations so the same state can feed economy, stage, and SVG morphology later.
- Mutation offers, chosen mutations, liabilities, offer-pool identity, and deterministic source
  data. A save preserves a pending choice exactly.
- `microbiomePoolId`, offer IDs, seed plus monotonic sequence, rotation counter and deadline,
  pending offer snapshot, selected niches, and compatibility snapshot. Offline accrual advances
  the same rotation representation.
- Catalog-backed program options: allowed `ProgramOptionId` values per branch, current selection,
  eligibility, and a deterministic simulation-time cooldown deadline.
- Timed inflammatory episodes, phenotype and program cooldowns, and simulation-time deadlines.
  The economy and offline-time model defines elapsed-time arithmetic, while every deadline remains
  in simulation time rather than wall-clock or UI time.
- A deterministic event model. State saves the seed and monotonic sequence, or the complete
  event outcome, for mutation offers, microbiome rotations, damage events, and route transit.
  Pending damage/transit events include their `EventId`, source `RegionId` or `RouteId`, and
  recorded outcome before player resolution. Reducers and offline ticks consume this data and
  never reroll it.
- A `progressionVersion` nested in the save payload so a later adjustment to a settled mechanic
  can migrate intentionally before public release.

The event funnel needs typed operations for allocation, checkpoint selection, triage, vessel and
route selection, ATP budgeting, mutation selection, phenotype switching, program editing,
microbiome selection, senescence action, and stage transition. Implementing them as ad hoc DOM
callbacks violates the replay and offline requirements.

### Prestige availability boundary

The progression schema establishes a declarative `PrestigeAvailability` record keyed by stable
`PrestigeId` values. It answers only whether a named L1-L4 interface is available to a catalog
row, handler, or test; it has no currency, reward, reset, or conversion semantics. Before an L3
availability is earned, ordinary play uses the real all-unavailable or earned-availability record
and stops at its appropriate host boundary. Deterministic fast-forward and handler validation may
inject an availability fixture to exercise every catalog row, including L3-gated culture behavior,
without fabricating a reset or reward. The prestige domain owns currencies, rewards, and reset
scopes.

### Module ownership boundaries

- The stage catalog and gates own all 12 `StageId` values, their gates, UI modes, retired
  assumptions, and the decision evidence in the stage table. Fast-forward validation supplies
  `PrestigeAvailability` fixtures where needed and reaches every stage.
- Core-six effects own the first six branch operations as operations, not rate-multiplier
  substitutes.
- Extended hallmark effects own ATP as stored resource with real sinks and persist visibility,
  inflammation, and mutation offers as game state rather than flavor popups.
- The late-hallmark catalog and handlers gate plasticity, epigenetic reprogramming, microbiomes,
  and senescent cells behind the later-stage and later-prestige interfaces specified above. Each
  writes at least one `MorphologyParams` input: phenotype variance, chromatin texture, surface
  motifs, or senescent cell shape respectively.
- Prestige projections own reset rules and currencies. The progression model exposes stable
  interfaces for L1 organ tags, L2 host traits, L3 availability, and L4 contamination nodes; it
  does not define their rewards or reset scope.

### Behavioral validation matrix

| Owner and behavior                      | Fixture or action                                                                                     | Deterministic oracle                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Stage catalog and gates                 | Fast-forward event log with explicit availability fixture                                             | All 12 `StageId` values occur in canonical order; every boundary changes a gate, available action set, or feasibility relation. |
| Core-six effects                        | One recorded core-six decision and its counterpart from the same baseline                             | Each handler changes its declared state and an operation relation, not only a production scalar.                                |
| Extended hallmark state and persistence | Save/load and coarse offline replay of ATP, visibility, inflammation, and mutation choices            | Event trace and final state match; a pending mutation `OfferId` persists without redraw.                                        |
| Late hallmark mechanics                 | Seeded or recorded fixtures for plasticity, program options, microbiome pairs, and senescence failure | Cooldowns, timers, offers, and compatibility replay exactly; each action changes persistent state and a nonvisual operation.    |

## Unresolved tuning

The following are parameters for evidence-based balance calibration. They remain data, not
implicit constants in branch handlers.

- Stage gate thresholds, target minutes, producer prices, and bulk-buy curve coefficients.
- ATP conversion yield, sink costs, vessel upkeep, and cap on concurrent vessel links.
- Pressure accumulation, decay, event cadence, and the numerical consequences of triage.
- Route loss probabilities, destination capacities, and phenotype-switch cooldowns.
- Mutation offer weights, benefit-liability magnitudes, and immune visibility response.
- Inflammatory duration, microbiome offer rotation, compatibility weights, and senescence upkeep.
- Exact L3 and L4 availability thresholds. Prestige projections decide identities and reset
  semantics; balance calibration verifies that these gates preserve distinct purchasing strategies.

## Acceptance mapping

| Requirement                           | Contract location                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------- |
| Fourteen canonical branches           | [Canonical vocabulary](#canonical-vocabulary)                                               |
| Distinct mechanic classes             | [Mechanic taxonomy](#mechanic-taxonomy) and [Branch specifications](#branch-specifications) |
| Player decision change                | Every branch `Decision test`                                                                |
| Synergies and tensions                | [Synergy and tension network](#synergy-and-tension-network)                                 |
| Twelve non-reskin stages              | [Canonical stage ladder](#canonical-stage-ladder)                                           |
| State, catalog, and effects ownership | [State and implementation implications](#state-and-implementation-implications)             |
| Tunable versus settled work           | [Unresolved tuning](#unresolved-tuning)                                                     |
