import { For, Show, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import {
  CORE_SIX_HALLMARK_CATALOG,
  hasReachedCoreSixUnlock,
} from "../hallmarks/core_six_catalog.js";
import {
  effectiveTelomereReserve,
  hasDivisionLimitWarning,
} from "../hallmarks/handlers/replicative_budget.js";
import {
  ATP_SINK_CATALOG,
  EXTENDED_HALLMARK_CATALOG,
  hasReachedExtendedHallmarkUnlock,
} from "../hallmarks/extended_hallmark_catalog.js";
import {
  LATE_HALLMARK_CATALOG,
  hasReachedLateHallmarkActivation,
} from "../hallmarks/late_hallmark_catalog.js";
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
import { stageDefinition } from "../stages/catalog.js";
import { formatQuantity } from "../bignum/format.js";
import type { CoreSixHallmarkDefinition } from "../hallmarks/core_six_types.js";
import type {
  CanonicalBigNumDto,
  ExtendedHallmarkDefinition,
} from "../hallmarks/extended_hallmark_types.js";
import type { LateHallmarkDefinition } from "../hallmarks/late_hallmark_types.js";
import type { GameController } from "./game_controller.js";
import { LateMicrobiomePanel } from "./late_microbiome_panel.js";
import { LatePlasticityPanel } from "./late_plasticity_panel.js";
import { LateProgramPanel } from "./late_program_panel.js";
import { LateSenescencePanel } from "./late_senescence_panel.js";
import type { CheckpointId, GameState, InflammationEpisode, TriageAction } from "../types/state.js";
import type { HallmarkId, MutationId, OfferId, RouteId } from "../types/ids.js";

type HallmarkTreeProps = Readonly<{
  game: GameState;
  controller: GameController;
}>;

type BranchStatus = "locked" | "available" | "acquired";

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

function mechanicSummary(definition: CoreSixHallmarkDefinition): string {
  switch (definition.mechanicClass) {
    case "division-allocation":
      return "Allocate division effort between an immediate burst and cycle fill.";
    case "checkpoint-routing":
      return "Bypass one named growth checkpoint and accept its visible pressure.";
    case "damage-triage":
      return "Resolve a pending damage event by absorbing, repairing, or losing its region.";
    case "replicative-budget":
      return "Spend telomerase charges to refill a threatened region or bank a reserve floor.";
    case "perfusion-layout":
      return "Link or unlink a viable region to trade ATP upkeep for regional perfusion.";
    case "route-commitment":
      return "Commit a bounded cell parcel to one revealed route.";
  }
}

function ownsHallmark(game: GameState, hallmarkId: HallmarkId): boolean {
  return game.hallmarkLevels.some((level) => level.id === hallmarkId && level.level >= 1);
}

function branchStatus(game: GameState, definition: CoreSixHallmarkDefinition): BranchStatus {
  if (ownsHallmark(game, definition.id)) return "acquired";
  return hasReachedCoreSixUnlock(game.currentStage, definition.key) ? "available" : "locked";
}

function extendedHallmarkBranchStatus(
  game: GameState,
  definition: ExtendedHallmarkDefinition,
): BranchStatus {
  if (ownsHallmark(game, definition.id)) return "acquired";
  return hasReachedExtendedHallmarkUnlock(game.currentStage, definition.key)
    ? "available"
    : "locked";
}

function lateHallmarkBranchStatus(
  game: GameState,
  definition: LateHallmarkDefinition,
): BranchStatus {
  if (ownsHallmark(game, definition.id)) return "acquired";
  return hasReachedLateHallmarkActivation(game.currentStage, definition.key)
    ? "available"
    : "locked";
}

function unlockExplanation(definition: CoreSixHallmarkDefinition): string {
  const stage = stageDefinition(definition.unlock.stageId);
  const capability = readableIdentifier(definition.unlock.capability);
  return `Unlocks at ${stage.title}: ${capability}.`;
}

function extendedHallmarkUnlockExplanation(definition: ExtendedHallmarkDefinition): string {
  const stage = stageDefinition(definition.unlock.stageId);
  const capability = readableIdentifier(definition.unlock.capability);
  return `Unlocks at ${stage.title}: ${capability}.`;
}

function lateHallmarkUnlockExplanation(definition: LateHallmarkDefinition): string {
  return `Unlocks at ${stageDefinition(definition.activation.stageId).title}: ${readableIdentifier(definition.activation.capability)}.`;
}

function lateMechanicSummary(definition: LateHallmarkDefinition): string {
  switch (definition.mechanicClass) {
    case "phenotype-switching":
      return "Assign an eligible region a durable phenotype with production, route-risk, and pressure tradeoffs.";
    case "program-editing":
      return "Spend ATP to assign a cooldown-limited program to an owned hallmark target.";
    case "community-composition":
      return "Install one exact saved two-niche composition from a rotating three-card offer.";
    case "senescence-management":
      return "Keep a nondividing secretory region or clear its complete local projection.";
  }
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

function controlExplanation(props: HallmarkTreeProps, status: BranchStatus): string | undefined {
  if (props.controller.recoveryBlocked()) {
    return "Saved-progress recovery protection must be resolved before this control can change play.";
  }
  if (status === "locked") return "Reach this branch's catalog stage unlock before acquiring it.";
  if (status === "available")
    return "Acquire this hallmark before its player decision becomes available.";
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
  const [mantissa, setMantissa] = createSignal(1);
  const [exponent, setExponent] = createSignal(0);
  const amount = (): CanonicalBigNumDto => ({ mantissa: mantissa(), exponent: exponent() });
  return (
    <fieldset class="hallmark-fieldset metabolism-controls">
      <legend>Substrate to ATP conversion</legend>
      <p class="hallmark-readout">
        ATP is a separate metabolic reserve. Conversion trades the exact substrate amount for the
        same ATP amount; it never creates cells.
      </p>
      <p class="hallmark-atp-meter">
        <span>ATP meter</span>
        <output aria-label="ATP meter">
          {formatQuantity(props.game.atp, props.game.numberFormat, 2, "ATP unit", "ATP units")}
        </output>
      </p>
      <div class="hallmark-input-grid">
        <label class="hallmark-input-label">
          Mantissa (1-9)
          <input
            type="number"
            min="1"
            max="9"
            step="1"
            value={mantissa()}
            disabled={interactionDisabled(props)}
            onInput={(event) =>
              setMantissa(controlledNatural(event.currentTarget.value, 9, 1) || 1)
            }
          />
        </label>
        <label class="hallmark-input-label">
          Exponent (0-300)
          <input
            type="number"
            min="0"
            max="300"
            step="1"
            value={exponent()}
            disabled={interactionDisabled(props)}
            onInput={(event) => setExponent(controlledNatural(event.currentTarget.value, 300, 0))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={interactionDisabled(props)}
        onClick={() => props.controller.convertSubstrate(amount())}
      >
        Convert substrate to ATP
      </button>
    </fieldset>
  );
}

function AtpBudgetControls(props: HallmarkTreeProps): JSX.Element {
  const total = (): number =>
    ATP_SINK_CATALOG.reduce((sum, sink) => sum + (props.game.atpBudget[sink.id] ?? 0), 0);
  return (
    <fieldset class="hallmark-fieldset atp-allocation-controls">
      <legend>ATP sink allocation</legend>
      <p class="hallmark-readout">
        Allocated {total()} / {MAX_TOTAL_ATP_BUDGET}. A reservation enables only the named sink when
        its own rule and ATP balance are satisfied.
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
                if (allocation() === 0) return "inactive: no acceleration reservation";
                else if (!vesselReservationSatisfied())
                  return "inactive: vessel maintenance must be reserved first";
                else
                  return isFunded()
                    ? "active: ATP can pay this second's acceleration after maintenance"
                    : "inactive: requires a nonzero reservation and enough ATP after maintenance";
              if (sink.id === "vessel-maintenance")
                return activeLinkCount() === 0
                  ? "no active vessel links require a reserve"
                  : isFunded()
                    ? "reserved for every active link"
                    : "insufficient reserve for all active links";
              return isFunded()
                ? "ready: a saved card can be selected"
                : "inactive: requires 25 reserved units and at least 1 ATP";
            };
            const rule = (): string => {
              if (sink.id === "vessel-maintenance")
                return `Reserve 25 units per ATP of current maintenance. This run debits ${vesselDebit()} ATP per second across ${activeLinkCount()} link${activeLinkCount() === 1 ? "" : "s"}. Required ${vesselRequired()}, allocated ${allocation()}.`;
              if (sink.id === "mutation-drafting")
                return "Reserve 25 units; choosing a saved card costs 1 ATP.";
              return "Any positive reservation may accelerate producers only when ATP can cover vessel maintenance first and the acceleration debit second.";
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

/** Catalog-driven core-six controls: rendering observes durable state; the controller owns all mutation. */
export function HallmarkTree(props: HallmarkTreeProps): JSX.Element {
  return (
    <section class="panel hallmark-tree" aria-labelledby="hallmark-tree-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Hallmark programs</p>
          <h2 id="hallmark-tree-title">The core six capabilities</h2>
        </div>
        <p class="section-note">
          Acquire a branch at its stage gate, then make its durable decision.
        </p>
      </div>
      <ol class="hallmark-list">
        <For each={CORE_SIX_HALLMARK_CATALOG}>
          {(definition, index) => {
            const status = (): BranchStatus => branchStatus(props.game, definition);
            const explanation = (): string | undefined => controlExplanation(props, status());
            return (
              <li class="hallmark-row">
                <div class="hallmark-copy">
                  <p class="hallmark-index">Branch {index() + 1}</p>
                  <h3>{definition.displayName}</h3>
                  <p>{mechanicSummary(definition)}</p>
                  <p class="hallmark-unlock">{unlockExplanation(definition)}</p>
                </div>
                <div class="hallmark-action">
                  <p class={`hallmark-status is-${status()}`}>{readableIdentifier(status())}</p>
                  <Show when={status() === "available"}>
                    <button
                      type="button"
                      disabled={interactionDisabled(props)}
                      onClick={() => props.controller.purchaseHallmark(definition.id)}
                    >
                      Acquire capability
                    </button>
                  </Show>
                  <Show when={status() === "acquired"}>{AcquiredControls(props, definition)}</Show>
                  <Show when={explanation()}>
                    {(message) => <p class="hallmark-disabled-note">{message()}</p>}
                  </Show>
                </div>
              </li>
            );
          }}
        </For>
      </ol>
      <div class="section-heading extended-hallmarks-heading">
        <div>
          <p class="eyebrow">2011 expansion</p>
          <h2>Metabolism, immunity, inflammation, and mutation</h2>
        </div>
        <p class="section-note">
          These branches create durable tradeoffs rather than passive bonuses.
        </p>
      </div>
      <ol class="hallmark-list" start="7">
        <For each={EXTENDED_HALLMARK_CATALOG}>
          {(definition, index) => {
            const status = (): BranchStatus => extendedHallmarkBranchStatus(props.game, definition);
            const explanation = (): string | undefined => controlExplanation(props, status());
            return (
              <li class="hallmark-row extended-hallmark-row">
                <div class="hallmark-copy">
                  <p class="hallmark-index">Branch {index() + 7}</p>
                  <h3>{definition.displayName}</h3>
                  <p>
                    {readableIdentifier(definition.mechanicClass)} with explicit costs and
                    consequences.
                  </p>
                  <p class="hallmark-unlock">{extendedHallmarkUnlockExplanation(definition)}</p>
                </div>
                <div class="hallmark-action">
                  <p class={`hallmark-status is-${status()}`}>{readableIdentifier(status())}</p>
                  <Show when={status() === "available"}>
                    <button
                      type="button"
                      disabled={interactionDisabled(props)}
                      onClick={() => props.controller.purchaseHallmark(definition.id)}
                    >
                      Acquire capability
                    </button>
                  </Show>
                  <Show when={status() === "acquired"}>
                    {ExtendedHallmarkAcquiredControls(props, definition)}
                  </Show>
                  <Show when={explanation()}>
                    {(message) => <p class="hallmark-disabled-note">{message()}</p>}
                  </Show>
                </div>
              </li>
            );
          }}
        </For>
      </ol>
      <div class="section-heading extended-hallmarks-heading late-hallmarks-heading">
        <div>
          <p class="eyebrow">2022 expansion</p>
          <h2>Plasticity, programs, microbiomes, and senescence</h2>
        </div>
        <p class="section-note">
          Late decisions persist as regional choices, saved offers, and explicit consequences.
        </p>
      </div>
      <ol class="hallmark-list" start="11">
        <For each={LATE_HALLMARK_CATALOG}>
          {(definition, index) => {
            const status = (): BranchStatus => lateHallmarkBranchStatus(props.game, definition);
            const explanation = (): string | undefined => controlExplanation(props, status());
            return (
              <li class="hallmark-row late-hallmark-row">
                <div class="hallmark-copy">
                  <p class="hallmark-index">Branch {index() + 11}</p>
                  <h3>{definition.displayName}</h3>
                  <p>{lateMechanicSummary(definition)}</p>
                  <p class="hallmark-unlock">{lateHallmarkUnlockExplanation(definition)}</p>
                </div>
                <div class="hallmark-action">
                  <p class={`hallmark-status is-${status()}`}>{readableIdentifier(status())}</p>
                  <Show when={status() === "available"}>
                    <button
                      type="button"
                      disabled={interactionDisabled(props)}
                      onClick={() => props.controller.purchaseHallmark(definition.id)}
                    >
                      Acquire capability
                    </button>
                  </Show>
                  <Show when={status() === "acquired"}>
                    {LateHallmarkAcquiredControls(props, definition)}
                  </Show>
                  <Show when={explanation()}>
                    {(message) => <p class="hallmark-disabled-note">{message()}</p>}
                  </Show>
                </div>
              </li>
            );
          }}
        </For>
      </ol>
    </section>
  );
}
