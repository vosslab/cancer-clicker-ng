import { For, Show, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { CORE_SIX_HALLMARK_CATALOG } from "../hallmarks/core_six_catalog.js";
import {
  effectiveTelomereReserve,
  hasDivisionLimitWarning,
} from "../hallmarks/handlers/replicative_budget.js";
import {
  ATP_SINK_CATALOG,
  EXTENDED_HALLMARK_CATALOG,
} from "../hallmarks/extended_hallmark_catalog.js";
import { LATE_HALLMARK_CATALOG } from "../hallmarks/late_hallmark_catalog.js";
import { MAX_TOTAL_ATP_BUDGET } from "../hallmarks/extended_hallmark_catalog.js";
import { atpBudgetForSink, hasFundedAtpAcceleration } from "../hallmarks/atp_allocation.js";
import { perfusionMaintenanceAtpDebit } from "../hallmarks/handlers/perfusion_layout.js";
import { regionalVisibilityEfficiency } from "../hallmarks/inflammation_timeline.js";
import {
  effectiveExtendedHallmarkPressures,
  extendedHallmarkMaskTokenCost,
  extendedHallmarkRouteDiscoveryGainPerSecond,
} from "../hallmarks/extended_hallmark_effects.js";
import { compare, fromSafeInteger } from "../bignum/bignum.js";
import { formatQuantity } from "../bignum/format.js";
import type { CoreSixHallmarkDefinition } from "../hallmarks/core_six_types.js";
import type { ExtendedHallmarkDefinition } from "../hallmarks/extended_hallmark_types.js";
import type { LateHallmarkDefinition } from "../hallmarks/late_hallmark_types.js";
import type { GameController } from "./game_controller.js";
import { LateMicrobiomePanel } from "./late_microbiome_panel.js";
import { LatePlasticityPanel } from "./late_plasticity_panel.js";
import { LateProgramPanel } from "./late_program_panel.js";
import { LateSenescencePanel } from "./late_senescence_panel.js";
import type { CheckpointId, GameState, InflammationEpisode, TriageAction } from "../types/state.js";
import type { HallmarkId, MutationId, OfferId, RouteId } from "../types/ids.js";
import { HallmarkSigil } from "../svg/evolution_sigils.js";
import { hallmarkPurchaseEligibility } from "../hallmarks/purchase_eligibility.js";

type HallmarkTreeProps = Readonly<{
  game: GameState;
  controller: GameController;
  onHallmarkAcquired?: (hallmark: HallmarkAcquisition) => void;
}>;

type BranchStatus = "locked" | "available" | "acquired";

export type HallmarkAcquisition = Readonly<{
  id: HallmarkId;
  displayName: string;
}>;

type HallmarkBranch =
  | Readonly<{
      family: "core";
      number: number;
      definition: CoreSixHallmarkDefinition;
      status: BranchStatus;
    }>
  | Readonly<{
      family: "extended";
      number: number;
      definition: ExtendedHallmarkDefinition;
      status: BranchStatus;
    }>
  | Readonly<{
      family: "late";
      number: number;
      definition: LateHallmarkDefinition;
      status: BranchStatus;
    }>;

const CHECKPOINTS = [
  "contact-inhibition",
  "nutrient-arrest",
  "damage-arrest",
] as const satisfies readonly CheckpointId[];
const TRIAGE_ACTIONS = [
  "absorb",
  "repair",
  "lose-region",
] as const satisfies readonly TriageAction[];

function readableIdentifier(value: string): string {
  const words = value.replace(/[-_]/g, " ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

function ownsHallmark(game: GameState, hallmarkId: HallmarkId): boolean {
  return game.hallmarkLevels.some((level) => level.id === hallmarkId && level.level >= 1);
}

function branchStatus(
  game: GameState,
  definition: CoreSixHallmarkDefinition | ExtendedHallmarkDefinition | LateHallmarkDefinition,
): BranchStatus {
  if (ownsHallmark(game, definition.id)) return "acquired";
  return hallmarkPurchaseEligibility(game, definition.id).available ? "available" : "locked";
}

function LateHallmarkAcquiredControls(
  props: HallmarkTreeProps,
  definition: LateHallmarkDefinition,
): JSX.Element {
  switch (definition.mechanicClass) {
    case "phenotype-switching":
      return <LatePlasticityPanel {...props} />;
    case "program-editing":
      return <LateProgramPanel {...props} />;
    case "community-composition":
      return <LateMicrobiomePanel {...props} />;
    case "senescence-management":
      return <LateSenescencePanel {...props} />;
  }
}

function interactionDisabled(props: HallmarkTreeProps): boolean {
  return props.controller.recoveryBlocked();
}

function controlExplanation(props: HallmarkTreeProps, branch: HallmarkBranch): string | undefined {
  if (props.controller.recoveryBlocked()) {
    return "Saved-progress recovery protection must be resolved before this control can change play.";
  }
  if (branch.status === "locked") {
    const eligibility = hallmarkPurchaseEligibility(props.game, branch.definition.id);
    if (!eligibility.available && eligibility.reason === "culture-interface") {
      return "Purchase high-throughput culture before acquiring this hallmark.";
    }
    return "Reach this branch's catalog stage unlock before acquiring it.";
  }
  if (branch.status === "available") return "Acquire this growth trait to unlock its decision.";
  return undefined;
}

function TriageControls(props: HallmarkTreeProps): JSX.Element {
  return (
    <Show
      when={props.game.pendingDamageEvents.length > 0}
      fallback={<p class="hallmark-empty">No pending damage events need triage.</p>}
    >
      <div class="hallmark-control-stack">
        <For each={props.game.pendingDamageEvents}>
          {(damage, index) => (
            <fieldset class="hallmark-fieldset">
              <legend>
                Damage event {index() + 1}: {readableIdentifier(damage.outcome)}
              </legend>
              <div class="hallmark-choice-grid">
                <For each={TRIAGE_ACTIONS}>
                  {(action) => (
                    <button
                      type="button"
                      disabled={interactionDisabled(props)}
                      onClick={() => props.controller.resolveTriage(damage.id, action)}
                    >
                      {readableIdentifier(action)}
                    </button>
                  )}
                </For>
              </div>
            </fieldset>
          )}
        </For>
      </div>
    </Show>
  );
}

function TelomeraseControls(props: HallmarkTreeProps): JSX.Element {
  const [selectedRegionIndex, setSelectedRegionIndex] = createSignal(0);
  const [charges, setCharges] = createSignal(1);
  const warnedRegions = createMemo(() =>
    props.game.regions.filter((region) => hasDivisionLimitWarning(props.game, region)),
  );
  function hasAffordableCharges(): boolean {
    return (
      Number.isSafeInteger(props.game.telomeraseCharges) &&
      charges() <= props.game.telomeraseCharges
    );
  }
  function selectedRegion(): (typeof props.game.regions)[number] | undefined {
    return warnedRegions()[selectedRegionIndex()];
  }
  function refillDisabled(): boolean {
    return interactionDisabled(props) || !hasAffordableCharges() || selectedRegion() === undefined;
  }
  function bankDisabled(): boolean {
    return (
      interactionDisabled(props) ||
      !hasAffordableCharges() ||
      props.game.reserveFloor !== 0 ||
      warnedRegions().length === 0
    );
  }
  function refillExplanation(): string | undefined {
    if (interactionDisabled(props))
      return "Recovery protection must be resolved before telomerase can be spent.";
    if (!hasAffordableCharges())
      return "Choose no more telomerase charges than the current budget.";
    if (selectedRegion() === undefined)
      return "Choose an unprotected division-limit warning to refill.";
    return undefined;
  }
  function bankExplanation(): string | undefined {
    if (interactionDisabled(props))
      return "Recovery protection must be resolved before telomerase can be spent.";
    if (!hasAffordableCharges())
      return "Choose no more telomerase charges than the current budget.";
    if (props.game.reserveFloor !== 0) return "The reserve floor is already banked for this run.";
    if (warnedRegions().length === 0)
      return "Banking requires an unprotected division-limit warning.";
    return undefined;
  }
  function setChargeInput(event: InputEvent & { currentTarget: HTMLInputElement }): void {
    const next = Number(event.currentTarget.value);
    setCharges(Number.isSafeInteger(next) && next > 0 ? Math.min(next, 3) : 1);
  }
  function refill(): void {
    const region = selectedRegion();
    if (region !== undefined) {
      props.controller.spendTelomerase({
        target: "refill-region",
        regionId: region.id,
        charges: charges(),
      });
    }
  }
  function bank(): void {
    props.controller.spendTelomerase({ target: "bank-reserve-floor", charges: charges() });
  }
  return (
    <fieldset class="hallmark-fieldset">
      <legend>Telomerase budget: {props.game.telomeraseCharges} charges</legend>
      <label class="hallmark-input-label">
        Charges to spend (1-3)
        <input
          type="number"
          min="1"
          max="3"
          value={charges()}
          disabled={interactionDisabled(props)}
          onInput={setChargeInput}
        />
      </label>
      <Show
        when={warnedRegions().length > 0}
        fallback={<p class="hallmark-empty">No region currently has a division-limit warning.</p>}
      >
        <label class="hallmark-input-label">
          Threatened region
          <select
            value={selectedRegionIndex()}
            disabled={interactionDisabled(props)}
            onChange={(event) => setSelectedRegionIndex(Number(event.currentTarget.value))}
          >
            <For each={warnedRegions()}>
              {(region, index) => (
                <option value={index()}>
                  Region {index() + 1} (effective reserve{" "}
                  {effectiveTelomereReserve(props.game, region.id)})
                </option>
              )}
            </For>
          </select>
        </label>
      </Show>
      <div class="hallmark-choice-grid">
        <button type="button" disabled={refillDisabled()} onClick={refill}>
          Refill selected region
        </button>
        <button type="button" disabled={bankDisabled()} onClick={bank}>
          Bank reserve floor
        </button>
      </div>
      <Show when={refillExplanation()}>
        {(message) => <p class="hallmark-disabled-note">{message()}</p>}
      </Show>
      <Show when={bankExplanation()}>
        {(message) => <p class="hallmark-disabled-note">{message()}</p>}
      </Show>
    </fieldset>
  );
}

function PerfusionControls(props: HallmarkTreeProps): JSX.Element {
  return (
    <Show
      when={props.game.regions.length > 0}
      fallback={<p class="hallmark-empty">No viable region is available for a vessel link.</p>}
    >
      <div class="hallmark-control-stack">
        <For each={props.game.regions}>
          {(region, index) => {
            const linked = (): boolean => region.vesselLinkIds.length > 0;
            return (
              <fieldset class="hallmark-fieldset">
                <legend>
                  Region {index() + 1}: capacity {region.capacity}
                </legend>
                <button
                  type="button"
                  disabled={interactionDisabled(props) || region.viability <= 0}
                  onClick={() => props.controller.setVesselLink(region.id, !linked())}
                >
                  {linked() ? "Remove vessel link" : "Add vessel link"}
                </button>
              </fieldset>
            );
          }}
        </For>
      </div>
    </Show>
  );
}

function revealedRoutes(game: GameState): readonly RouteId[] {
  const routes: RouteId[] = [];
  for (const region of game.regions) {
    for (const route of region.routeIds) {
      if (!routes.includes(route)) routes.push(route);
    }
  }
  return routes;
}

function routeCommitted(game: GameState, route: RouteId): boolean {
  return Object.prototype.hasOwnProperty.call(game.committedCellCommitments, route);
}

function RouteControls(props: HallmarkTreeProps): JSX.Element {
  const [cells, setCells] = createSignal(1);
  const routes = createMemo(() => revealedRoutes(props.game));
  function setCellInput(event: InputEvent & { currentTarget: HTMLInputElement }): void {
    const next = Number(event.currentTarget.value);
    setCells(Number.isSafeInteger(next) && next > 0 ? next : 1);
  }
  return (
    <fieldset class="hallmark-fieldset">
      <legend>Route commitment</legend>
      <label class="hallmark-input-label">
        Cells to commit
        <input
          type="number"
          min="1"
          value={cells()}
          disabled={interactionDisabled(props)}
          onInput={setCellInput}
        />
      </label>
      <Show
        when={routes().length > 0}
        fallback={<p class="hallmark-empty">No revealed routes are ready for commitment.</p>}
      >
        <div class="hallmark-choice-grid">
          <For each={routes()}>
            {(route, index) => (
              <button
                type="button"
                disabled={interactionDisabled(props) || routeCommitted(props.game, route)}
                onClick={() => props.controller.commitRoute(route, cells())}
              >
                {routeCommitted(props.game, route)
                  ? `Route ${index() + 1} committed`
                  : `Commit to route ${index() + 1}`}
              </button>
            )}
          </For>
        </div>
      </Show>
    </fieldset>
  );
}

function AcquiredControls(
  props: HallmarkTreeProps,
  definition: CoreSixHallmarkDefinition,
): JSX.Element {
  switch (definition.mechanicClass) {
    case "division-allocation":
      return (
        <fieldset class="hallmark-fieldset">
          <legend>Division allocation: {readableIdentifier(props.game.signalingAllocation)}</legend>
          <div class="hallmark-choice-grid">
            <button
              type="button"
              disabled={interactionDisabled(props) || props.game.signalingAllocation === "burst"}
              onClick={() => props.controller.setSignalingAllocation("burst")}
            >
              Burst
            </button>
            <button
              type="button"
              disabled={interactionDisabled(props) || props.game.signalingAllocation === "cycle"}
              onClick={() => props.controller.setSignalingAllocation("cycle")}
            >
              Cycle
            </button>
          </div>
        </fieldset>
      );
    case "checkpoint-routing":
      return (
        <fieldset class="hallmark-fieldset">
          <legend>Checkpoint routing</legend>
          <div class="hallmark-choice-grid">
            <For each={CHECKPOINTS}>
              {(checkpoint) => (
                <button
                  type="button"
                  disabled={
                    interactionDisabled(props) ||
                    props.game.bypassedCheckpoints.includes(checkpoint)
                  }
                  onClick={() => props.controller.selectCheckpoint(checkpoint)}
                >
                  {readableIdentifier(checkpoint)}
                </button>
              )}
            </For>
          </div>
        </fieldset>
      );
    case "damage-triage":
      return <TriageControls {...props} />;
    case "replicative-budget":
      return <TelomeraseControls {...props} />;
    case "perfusion-layout":
      return <PerfusionControls {...props} />;
    case "route-commitment":
      return <RouteControls {...props} />;
  }
}

function controlledNatural(value: string, maximum: number, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : fallback;
}

function MetabolismControls(props: HallmarkTreeProps): JSX.Element {
  const conversionChoices = [1, 5, 25] as const;
  const canConvert = (amount: number): boolean =>
    !interactionDisabled(props) && compare(props.game.substrate, fromSafeInteger(amount)) >= 0;
  return (
    <fieldset class="hallmark-fieldset metabolism-controls">
      <legend>Fuel ATP</legend>
      <p class="hallmark-readout">
        Convert spare substrate into ATP for later programs. It never creates cells.
      </p>
      <p class="hallmark-atp-meter">
        <span>ATP</span>
        <output aria-label="ATP meter">
          {formatQuantity(props.game.atp, props.game.numberFormat, 1, "ATP unit", "ATP units")}
        </output>
      </p>
      <div class="hallmark-choice-grid metabolism-controls__choices" aria-label="ATP conversion">
        <For each={conversionChoices}>
          {(amount) => (
            <button
              type="button"
              disabled={!canConvert(amount)}
              onClick={() => props.controller.convertSubstrate({ mantissa: amount, exponent: 0 })}
            >
              Convert {amount} substrate
            </button>
          )}
        </For>
      </div>
    </fieldset>
  );
}

function AtpBudgetControls(props: HallmarkTreeProps): JSX.Element {
  const total = (): number =>
    ATP_SINK_CATALOG.reduce((sum, sink) => sum + (props.game.atpBudget[sink.id] ?? 0), 0);
  return (
    <fieldset class="hallmark-fieldset atp-allocation-controls">
      <legend>Reserve ATP</legend>
      <p class="hallmark-readout">
        {total()} / {MAX_TOTAL_ATP_BUDGET} reserved. Reserve only for the program you are using.
      </p>
      <div class="atp-sink-grid">
        <For each={ATP_SINK_CATALOG}>
          {(sink) => {
            const allocation = (): number => props.game.atpBudget[sink.id] ?? 0;
            const remainingForSink = (): number => MAX_TOTAL_ATP_BUDGET - (total() - allocation());
            const maximum = (): number => Math.min(sink.maximumBudget, remainingForSink());
            const activeLinkCount = (): number =>
              props.game.regions.filter((region) => region.vesselLinkIds.length > 0).length;
            const vesselDebit = (): number =>
              perfusionMaintenanceAtpDebit(props.game, activeLinkCount());
            const vesselRequired = (): number => vesselDebit() * 25;
            const vesselReservationSatisfied = (): boolean =>
              activeLinkCount() === 0 ||
              atpBudgetForSink(props.game, "vessel-maintenance") >= vesselRequired();
            const isFunded = (): boolean => {
              switch (sink.id) {
                case "acceleration":
                  return (
                    allocation() > 0 &&
                    vesselReservationSatisfied() &&
                    hasFundedAtpAcceleration(props.game)
                  );
                case "vessel-maintenance":
                  return activeLinkCount() > 0 && allocation() >= vesselRequired();
                case "mutation-drafting":
                  return allocation() >= 25 && compare(props.game.atp, fromSafeInteger(1)) >= 0;
              }
            };
            const status = (): string => {
              if (sink.id === "acceleration")
                if (allocation() === 0) return "inactive";
                else if (!vesselReservationSatisfied()) return "reserve vessels first";
                else return isFunded() ? "active" : "needs ATP";
              if (sink.id === "vessel-maintenance")
                return activeLinkCount() === 0
                  ? "no vessels need this"
                  : isFunded()
                    ? "active"
                    : "reserve more";
              return isFunded() ? "ready" : "reserve 25 + 1 ATP";
            };
            const rule = (): string => {
              if (sink.id === "vessel-maintenance")
                return `Reserve 25 units per ATP of current maintenance. This run debits ${vesselDebit()} ATP per second across ${activeLinkCount()} link${activeLinkCount() === 1 ? "" : "s"}. Required ${vesselRequired()}, allocated ${allocation()}.`;
              if (sink.id === "mutation-drafting")
                return "Reserve 25 units; choosing a saved card costs 1 ATP.";
              return "Boosts producers while ATP can cover each second.";
            };
            return (
              <label class="hallmark-input-label atp-sink-row">
                <span>
                  {sink.displayName}: {status()}
                </span>
                <small>{rule()}</small>
                <input
                  aria-label={`${sink.displayName} ATP allocation`}
                  type="number"
                  min={sink.minimumBudget}
                  max={maximum()}
                  step="1"
                  value={allocation()}
                  disabled={interactionDisabled(props)}
                  onChange={(event) =>
                    props.controller.setAtpBudget(
                      sink.id,
                      controlledNatural(event.currentTarget.value, maximum(), allocation()),
                    )
                  }
                />
              </label>
            );
          }}
        </For>
      </div>
    </fieldset>
  );
}

function ImmuneVisibilityControls(props: HallmarkTreeProps): JSX.Element {
  const pressures = (): ReturnType<typeof effectiveExtendedHallmarkPressures> =>
    effectiveExtendedHallmarkPressures(props.game);
  return (
    <fieldset class="hallmark-fieldset">
      <legend>Immune visibility</legend>
      <p class="hallmark-readout">
        Concealment tokens: {props.game.concealmentTokens}. Effective immune pressure:{" "}
        {pressures().immune}.
      </p>
      <div class="hallmark-control-stack">
        <For each={props.game.regions}>
          {(region, index) => {
            const masked = (): boolean => props.game.maskedRegions.includes(region.id);
            return (
              <div class="regional-hallmark-control">
                <p>
                  Region {index() + 1}: {masked() ? "concealed" : "immune-visible"}; local producer
                  contribution {regionalVisibilityEfficiency(props.game, region.id).toFixed(1)}x.{" "}
                  Masking costs {extendedHallmarkMaskTokenCost(props.game)} token
                  {extendedHallmarkMaskTokenCost(props.game) === 1 ? "" : "s"} and lowers effective
                  immune pressure by one while the region remains masked.
                </p>
                <button
                  type="button"
                  disabled={interactionDisabled(props) || region.viability <= 0}
                  onClick={() => props.controller.setRegionMask(region.id, !masked())}
                >
                  {masked() ? "Restore immune visibility" : "Spend token to conceal"}
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </fieldset>
  );
}

function InflammationControls(props: HallmarkTreeProps): JSX.Element {
  const activeFor = (id: string): InflammationEpisode | undefined =>
    props.game.inflammationEpisodes.find((episode) => episode.regionId === id);
  return (
    <fieldset class="hallmark-fieldset">
      <legend>Inflammatory episodes</legend>
      <p class="hallmark-readout">
        Active episodes use a 1.2x regional producer contribution and add one route-discovery
        progress per second. Effective pressure:{" "}
        {effectiveExtendedHallmarkPressures(props.game).damage} damage /{" "}
        {effectiveExtendedHallmarkPressures(props.game).immune} immune; current route gain:{" "}
        {extendedHallmarkRouteDiscoveryGainPerSecond(props.game)} per second.
      </p>
      <For each={props.game.regions}>
        {(region, index) => {
          const episode = (): InflammationEpisode | undefined => activeFor(region.id);
          const eligible = (): boolean =>
            region.viability > 0 &&
            region.vesselLinkIds.length > 0 &&
            !props.game.maskedRegions.includes(region.id);
          return (
            <div class="regional-hallmark-control inflammation-control">
              <p>
                Region {index() + 1}:{" "}
                {episode() ? `active through ${episode()?.deadlineMs} ms` : "no active episode"}.{" "}
                Active episodes add +1 route discovery per second and +1 each to effective damage
                and immune pressure.
              </p>
              <button
                type="button"
                disabled={interactionDisabled(props) || !eligible() || episode() !== undefined}
                onClick={() => props.controller.activateInflammation(region.id)}
              >
                Activate inflammation
              </button>
            </div>
          );
        }}
      </For>
    </fieldset>
  );
}

function MutationOfferControls(props: HallmarkTreeProps): JSX.Element {
  const offer = (): GameState["mutationOffers"][number] | undefined => props.game.mutationOffers[0];
  const budget = (): number => atpBudgetForSink(props.game, "mutation-drafting");
  const canSelect = (): boolean =>
    !interactionDisabled(props) &&
    budget() >= 25 &&
    compare(props.game.atp, fromSafeInteger(1)) >= 0;
  const selectionReason = (): string | undefined => {
    if (interactionDisabled(props))
      return "Recovery protection must be resolved before selecting a mutation.";
    if (budget() < 25)
      return "Reserve 25 ATP budget units for mutation drafting before selecting a card.";
    if (compare(props.game.atp, fromSafeInteger(1)) < 0)
      return "At least 1 ATP is required to select a saved card.";
    return undefined;
  };
  function select(offerId: OfferId, mutationId: MutationId): void {
    props.controller.selectMutation(offerId, mutationId);
    queueMicrotask(() => {
      document.getElementById("mutation-offer-title")?.focus();
    });
  }
  return (
    <fieldset class="hallmark-fieldset">
      <legend id="mutation-offer-title" tabindex="-1">
        Mutation draft
      </legend>
      <Show
        when={offer()}
        fallback={
          <p class="hallmark-empty">
            No funded mutation offer is pending. Allocate ATP to mutation drafting and continue
            production.
          </p>
        }
      >
        {(currentOffer) => (
          <>
            <p class="hallmark-readout">
              Budget {budget()} / 25 required; selecting one saved card costs 1 ATP and consumes
              this offer.
            </p>
            <Show when={selectionReason()}>
              {(reason) => <p class="hallmark-disabled-note">{reason()}</p>}
            </Show>
            <div class="mutation-offer-cards" aria-label="Deterministic mutation offer">
              <For each={currentOffer().cards}>
                {(card) => (
                  <article class="mutation-offer-card">
                    <h4>{card.displayName}</h4>
                    <p>
                      <strong>{card.benefit.label}:</strong> {card.benefit.effect}
                    </p>
                    <p>
                      <strong>{card.liability.label}:</strong> {card.liability.effect}
                    </p>
                    <button
                      type="button"
                      disabled={!canSelect()}
                      onClick={() => select(currentOffer().id, card.id)}
                    >
                      Select {card.displayName}
                    </button>
                  </article>
                )}
              </For>
            </div>
          </>
        )}
      </Show>
    </fieldset>
  );
}

function ExtendedHallmarkAcquiredControls(
  props: HallmarkTreeProps,
  definition: ExtendedHallmarkDefinition,
): JSX.Element {
  switch (definition.mechanicClass) {
    case "energy-budgeting":
      return (
        <>
          <MetabolismControls {...props} />
          <AtpBudgetControls {...props} />
        </>
      );
    case "visibility-management":
      return <ImmuneVisibilityControls {...props} />;
    case "event-cultivation":
      return <InflammationControls {...props} />;
    case "mutation-drafting":
      return <MutationOfferControls {...props} />;
  }
}

function branchCatalog(game: GameState): readonly HallmarkBranch[] {
  const core = CORE_SIX_HALLMARK_CATALOG.map((definition, index) => ({
    family: "core" as const,
    number: index + 1,
    definition,
    status: branchStatus(game, definition),
  }));
  const extended = EXTENDED_HALLMARK_CATALOG.map((definition, index) => ({
    family: "extended" as const,
    number: index + 7,
    definition,
    status: branchStatus(game, definition),
  }));
  const late = LATE_HALLMARK_CATALOG.map((definition, index) => ({
    family: "late" as const,
    number: index + 11,
    definition,
    status: branchStatus(game, definition),
  }));
  // The mutation deck grows with actual capability; future catalog rows never impersonate choices.
  return [...core, ...extended, ...late].filter((branch) => branch.status !== "locked");
}

function BranchControls(props: HallmarkTreeProps, branch: HallmarkBranch): JSX.Element {
  switch (branch.family) {
    case "core":
      return AcquiredControls(props, branch.definition);
    case "extended":
      return ExtendedHallmarkAcquiredControls(props, branch.definition);
    case "late":
      return LateHallmarkAcquiredControls(props, branch.definition);
  }
}

function acquisitionPrompt(branch: HallmarkBranch): string {
  switch (branch.definition.mechanicClass) {
    case "division-allocation":
      return "Choose a division allocation to express this signaling program.";
    case "checkpoint-routing":
      return "Choose a checkpoint response when one becomes relevant.";
    case "damage-triage":
      return "Damage events can now be triaged instead of passively resolved.";
    case "replicative-budget":
      return "Use telomerase charges when a region reaches its division limit.";
    case "perfusion-layout":
      return "Link a viable region to a vessel to establish its blood supply.";
    case "route-commitment":
      return "Commit cells to a discovered route when you are ready to disseminate.";
    case "energy-budgeting":
      return "Use the metabolism and ATP controls below to direct this new program.";
    case "visibility-management":
      return "Conceal eligible regions when immune pressure makes it worthwhile.";
    case "event-cultivation":
      return "Activate an inflammatory episode in an eligible vascularized region.";
    case "mutation-drafting":
      return "Fund mutation drafting to reveal a saved biological tradeoff.";
    case "phenotype-switching":
      return "Assign an eligible region's phenotype to express this plasticity program.";
    case "program-editing":
      return "Choose a culture program to direct this epigenetic state.";
    case "community-composition":
      return "Choose from the saved microbiome composition offer when it is available.";
    case "senescence-management":
      return "Use the senescence controls to retain or clear qualifying regions.";
  }
}

const ACQUISITION_NOTICE_DURATION_MS = 5_000;

/** Catalog-driven mutation deck keeps a selected branch, or the nearest actionable one, open. */
export function HallmarkTree(props: HallmarkTreeProps): JSX.Element {
  const [selectedId, setSelectedId] = createSignal<HallmarkId | undefined>(undefined);
  const [recentlyAcquiredId, setRecentlyAcquiredId] = createSignal<HallmarkId | undefined>(
    undefined,
  );
  let acquisitionNotice: HTMLParagraphElement | undefined;
  let acquisitionNoticeTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (acquisitionNoticeTimer !== undefined) clearTimeout(acquisitionNoticeTimer);
  });
  const branches = createMemo(() => branchCatalog(props.game));
  const activeBranch = createMemo(() => {
    const selected = selectedId();
    const selectedBranch = branches().find((branch) => branch.definition.id === selected);
    if (selectedBranch) return selectedBranch;
    return (
      branches().find((branch) => branch.status === "available") ??
      branches().find((branch) => branch.status === "acquired") ??
      branches()[0]
    );
  });
  function acquire(branch: HallmarkBranch, event: MouseEvent): void {
    const result = props.controller.purchaseHallmark(branch.definition.id);
    if (!result.ok) return;
    setSelectedId(branch.definition.id);
    setRecentlyAcquiredId(branch.definition.id);
    if (acquisitionNoticeTimer !== undefined) clearTimeout(acquisitionNoticeTimer);
    acquisitionNoticeTimer = setTimeout(
      () => setRecentlyAcquiredId(undefined),
      ACQUISITION_NOTICE_DURATION_MS,
    );
    props.onHallmarkAcquired?.({
      id: branch.definition.id,
      displayName: branch.definition.displayName,
    });
    // Pointer users retain spatial context; keyboard activation moves to the new status notice.
    if (event.detail === 0) queueMicrotask(() => acquisitionNotice?.focus());
  }

  return (
    <section class="hallmark-tree evolution-hallmarks" aria-labelledby="hallmark-tree-title">
      <header class="evolution-hallmarks__heading">
        <div>
          <p class="evolution-hallmarks__kicker">Tumor mutations</p>
          <h2 id="hallmark-tree-title">Choose a growth trait</h2>
        </div>
      </header>
      <ol class="evolution-hallmarks__constellation" aria-label="Hallmark mutation programs">
        <For each={branches()}>
          {(branch) => {
            const isActive = (): boolean => activeBranch()?.definition.id === branch.definition.id;
            return (
              <li data-state={branch.status}>
                <button
                  class="evolution-hallmarks__sigil-button"
                  classList={{
                    "is-active": isActive(),
                    "is-just-acquired": recentlyAcquiredId() === branch.definition.id,
                  }}
                  type="button"
                  aria-pressed={isActive()}
                  aria-label={`${branch.definition.displayName}, ${branch.status}`}
                  onClick={() => setSelectedId(branch.definition.id)}
                >
                  <HallmarkSigil name={branch.definition.id} state={branch.status} />
                  <span class="evolution-hallmarks__name">{branch.definition.displayName}</span>
                  <span class="evolution-hallmarks__state">
                    {readableIdentifier(branch.status)}
                  </span>
                </button>
              </li>
            );
          }}
        </For>
      </ol>
      <Show when={activeBranch()}>
        {(branch) => {
          return (
            <section
              class="evolution-hallmarks__active"
              classList={{ "is-just-acquired": recentlyAcquiredId() === branch().definition.id }}
              data-state={branch().status}
              aria-live="polite"
            >
              <div class="evolution-hallmarks__active-heading">
                <HallmarkSigil name={branch().definition.id} state={branch().status} />
                <div>
                  <p>
                    {branch().status === "available" ? "Available now" : "Growth trait acquired"}
                  </p>
                  <h3>{branch().definition.displayName}</h3>
                </div>
              </div>
              <Show when={branch().status === "available"}>
                <button
                  class="evolution-hallmarks__acquire"
                  type="button"
                  disabled={interactionDisabled(props)}
                  onClick={(event) => acquire(branch(), event)}
                >
                  <HallmarkSigil name={branch().definition.id} state="available" />
                  <span>Acquire</span>
                </button>
              </Show>
              <Show
                when={
                  branch().status === "acquired" && recentlyAcquiredId() === branch().definition.id
                }
              >
                <p
                  ref={(element) => {
                    acquisitionNotice = element;
                  }}
                  class="evolution-hallmarks__acquisition-notice"
                  role="status"
                  tabindex="-1"
                >
                  <strong>Growth trait acquired.</strong> {acquisitionPrompt(branch())}
                </p>
              </Show>
              <Show when={branch().status === "acquired"}>{BranchControls(props, branch())}</Show>
              <Show when={controlExplanation(props, branch())}>
                {(message) => <p class="hallmark-empty">{message()}</p>}
              </Show>
            </section>
          );
        }}
      </Show>
    </section>
  );
}
