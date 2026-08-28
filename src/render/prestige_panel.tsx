import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import {
  activeHostTraitBoonPresentation,
  colonizationProgramPresentation,
  hostDraftPresentation,
  hostTransferPresentation,
  lineageBoonPresentation,
  metastasisPresentation,
  organAllocationPresentation,
} from "../prestige/presentation.js";
import type { PrestigeReason } from "../prestige/presentation.js";
import { COLONIZATION_PROGRAM_CATALOG, ORGAN_SITE_CATALOG } from "../prestige/seeding.js";
import { lineageBoonId } from "../brands.js";
import type {
  ColonizationProgramId,
  HostCardId,
  HostDraftId,
  HostTraitId,
  OrganSiteId,
} from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { ApplyResult, GameController } from "./game_controller.js";
import { ActionIcon } from "./action_icon.js";

type PrestigePanelProps = Readonly<{ game: GameState; controller: GameController }>;
const PRE_DRAFT_BOON_IDS = ["extra_card_reveal", "protected_route_affinity"] as const;
type ConfirmationBase = Readonly<{ title: string; summary: string; revision: number }>;
type PendingConfirmation =
  | (ConfirmationBase & Readonly<{ kind: "metastasis"; siteId: OrganSiteId }>)
  | (ConfirmationBase & Readonly<{ kind: "allocation"; siteId: OrganSiteId }>)
  | (ConfirmationBase &
      Readonly<{
        kind: "program";
        siteId: OrganSiteId;
        programId: ColonizationProgramId;
      }>)
  | (ConfirmationBase &
      Readonly<{ kind: "boon"; boonId: "extra_card_reveal" | "protected_route_affinity" }>)
  | (ConfirmationBase & Readonly<{ kind: "targeted-boon"; targetTraitId: HostTraitId }>)
  | (ConfirmationBase & Readonly<{ kind: "transfer" }>)
  | (ConfirmationBase &
      Readonly<{
        kind: "host-card";
        draftId: HostDraftId;
        cardId: HostCardId;
      }>);

function reasonText(reason: PrestigeReason): string {
  switch (reason) {
    case "not-host-collapse":
      return "Reach host collapse before this terminal decision becomes available.";
    case "l1-not-earned":
      return "Earn L1 metastasis availability through progression first.";
    case "l2-not-earned":
      return "Earn L2 host-transfer availability through progression first.";
    case "no-viable-seeded-site":
      return "A viable seeded site is required for a metastasis reset.";
    case "no-prepared-site":
      return "Allocate an organ site and choose its niche program before this reset.";
    case "insufficient-resets":
      return "Complete three L1 resets before Host Transfer.";
    case "insufficient-diversity":
      return "Establish at least two organ tags before Host Transfer.";
    case "not-affordable":
      return "The current persistent balance cannot pay this option.";
    case "requires-allocation":
      return "Allocate this organ site before selecting its irreversible program.";
    case "requires-active-host":
      return "Select an active host before targeting one of its saved traits.";
    case "already-selected":
      return "This durable option is already selected or has reached its final rank.";
    case "draft-unavailable":
      return "No saved host draft is currently available for selection.";
    case "draft-consumed":
      return "This saved host draft has already started its selected host run.";
    case "available":
      return "This decision is ready for deliberate confirmation.";
  }
  const exhaustive: never = reason;
  return exhaustive;
}

/** A deliberate UI shell over trusted prestige quotes; reset formulae and draft generation stay domain-owned. */
export function PrestigePanel(props: PrestigePanelProps): JSX.Element {
  const [pending, setPending] = createSignal<PendingConfirmation>();
  const [resetSiteId, setResetSiteId] = createSignal<OrganSiteId>();
  let dialog: HTMLDialogElement | undefined;
  let origin: HTMLElement | undefined;
  const metastasis = createMemo(() => metastasisPresentation(props.game));
  const transfer = createMemo(() => hostTransferPresentation(props.game));
  const draft = createMemo(() => hostDraftPresentation(props.game));

  createEffect(() => {
    const requested = pending();
    if (!dialog) return;
    if (requested && !dialog.open) dialog.showModal();
    if (!requested && dialog.open) dialog.close();
  });
  onCleanup(() => {
    if (dialog?.open) dialog.close();
  });

  function openConfirmation(next: PendingConfirmation, event: MouseEvent): void {
    if (props.controller.recoveryBlocked()) return;
    origin = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
    setPending(next);
  }
  function cancel(): void {
    setPending(undefined);
    queueMicrotask(() => origin?.focus());
  }
  function confirm(): void {
    const action = pending();
    if (!action) return;
    if (props.controller.recoveryBlocked()) {
      cancel();
      return;
    }
    const result = ((): ApplyResult => {
      switch (action.kind) {
        case "metastasis":
          return props.controller.performMetastasisReset(action.siteId);
        case "allocation":
          return props.controller.allocateOrganSite(action.siteId);
        case "program":
          return props.controller.selectColonizationProgram(action.siteId, action.programId);
        case "boon":
          return props.controller.purchaseLineageBoon(action.boonId);
        case "targeted-boon":
          return props.controller.purchaseLineageBoon(
            "reduced_trait_liability",
            action.targetTraitId,
          );
        case "transfer":
          return props.controller.performHostTransfer();
        case "host-card":
          return props.controller.selectHostCard(action.draftId, action.cardId);
      }
    })();
    if (result.ok) {
      setPending(undefined);
      queueMicrotask(() => focusResult(action));
    }
  }
  function focusResult(action: PendingConfirmation): void {
    const targetId = ((): string => {
      switch (action.kind) {
        case "metastasis":
          return "metastasis-summary";
        case "allocation":
          return `organ-site-${action.siteId}-status`;
        case "program":
          return `organ-site-${action.siteId}-program-${action.programId}-status`;
        case "boon":
          return `lineage-boon-${action.boonId}-status`;
        case "targeted-boon":
          return `active-host-trait-${action.targetTraitId}-status`;
        case "transfer":
          return "host-draft-summary";
        case "host-card":
          return "active-host-summary";
      }
    })();
    document.getElementById(targetId)?.focus();
  }

  return (
    <section class="panel prestige-panel" aria-labelledby="prestige-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Lineage strategy</p>
          <h2 id="prestige-title">Prestige layers</h2>
        </div>
        <p id="prestige-summary" class="section-note" tabindex="-1">
          Potential {metastasis().potential}; Imprints {transfer().imprints}.
        </p>
      </div>
      <fieldset id="metastasis-summary" class="hallmark-fieldset prestige-summary" tabindex="-1">
        <legend>Metastasis terminal</legend>
        <p>
          Gain {metastasis().gainedPotential} Metastatic Potential from this trusted terminal
          snapshot.
        </p>
        <ul>
          <For each={metastasis().formulaInputs}>{(input) => <li>{input}</li>}</For>
        </ul>
        <p class="prestige-tradeoff">Reset clears: {metastasis().clearedFields.join("; ")}.</p>
        <Show when={metastasis().activeNiche}>
          {(niche) => (
            <p class="hallmark-readout">
              Active niche: {niche().siteTitle}, rank {niche().rank}, {niche().programTitle}.
            </p>
          )}
        </Show>
        <Show when={metastasis().preparedSites.length > 0}>
          <div aria-label="Prepared metastasis site">
            <p>Choose the prepared site that will define this run.</p>
            <For each={metastasis().preparedSites}>
              {(site) => (
                <label>
                  <input
                    type="radio"
                    name="prepared-metastasis-site"
                    value={site.siteId}
                    checked={resetSiteId() === site.siteId}
                    onChange={() => setResetSiteId(site.siteId)}
                  />
                  {site.title}: rank {site.rank}, {site.programTitle}
                </label>
              )}
            </For>
          </div>
        </Show>
        <Show
          when={metastasis().available}
          fallback={<p class="hallmark-disabled-note">{reasonText(metastasis().reason)}</p>}
        >
          <button
            type="button"
            disabled={props.controller.recoveryBlocked() || resetSiteId() === undefined}
            onClick={(event) => {
              const siteId = resetSiteId();
              if (!siteId) return;
              openConfirmation(
                {
                  kind: "metastasis",
                  title: "Begin metastasis reset",
                  summary: `Gain ${metastasis().gainedPotential} Potential and start the prepared ${siteId} run.`,
                  revision: metastasis().sourceEventSequence,
                  siteId,
                },
                event,
              );
            }}
          >
            <ActionIcon name="lineage_reset" /> Begin metastasis reset
          </button>
        </Show>
      </fieldset>
      <fieldset class="hallmark-fieldset">
        <legend>Lineage portfolio</legend>
        <p>Choose an organ allocation, then one irreversible niche program for that site.</p>
        <ul class="prestige-card-grid">
          <For each={ORGAN_SITE_CATALOG}>
            {(site) => {
              const allocation = createMemo(() => organAllocationPresentation(props.game, site.id));
              return (
                <li>
                  <article class="prestige-card">
                    <h3>
                      <ActionIcon name="organ_site" /> {allocation().title}
                    </h3>
                    <p id={`organ-site-${site.id}-status`} tabindex="-1">
                      Rank {allocation().rank}; next debit {allocation().nextCost ?? "complete"}{" "}
                      Potential.
                    </p>
                    <p class="prestige-tradeoff">
                      Benefit: {allocation().relation.benefit}. Liability:{" "}
                      {allocation().relation.liability}.
                    </p>
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !allocation().available}
                      onClick={(event) =>
                        openConfirmation(
                          {
                            kind: "allocation",
                            title: `Allocate ${allocation().title}`,
                            summary: `Spend ${allocation().nextCost} Potential for the next ${allocation().title} rank.`,
                            revision: props.game.eventSequence,
                            siteId: site.id,
                          },
                          event,
                        )
                      }
                    >
                      <ActionIcon name="organ_site" /> Allocate rank
                    </button>
                    <Show when={!allocation().available}>
                      <p class="hallmark-disabled-note">{reasonText(allocation().reason)}</p>
                    </Show>
                    <div class="prestige-card-grid">
                      <For each={COLONIZATION_PROGRAM_CATALOG}>
                        {(program) => {
                          const quote = createMemo(() =>
                            colonizationProgramPresentation(props.game, site.id, program.id),
                          );
                          return (
                            <>
                              <p
                                id={`organ-site-${site.id}-program-${program.id}-status`}
                                tabindex="-1"
                              >
                                {quote().selected
                                  ? `${quote().title} is the durable niche program.`
                                  : `Program status: ${reasonText(quote().reason)}`}
                              </p>
                              <button
                                type="button"
                                disabled={props.controller.recoveryBlocked() || !quote().available}
                                onClick={(event) =>
                                  openConfirmation(
                                    {
                                      kind: "program",
                                      title: `Choose ${quote().title}`,
                                      summary: `Irreversibly assign ${quote().title}: benefit ${quote().relation.benefit}; liability ${quote().relation.liability}.`,
                                      revision: props.game.eventSequence,
                                      siteId: site.id,
                                      programId: program.id,
                                    },
                                    event,
                                  )
                                }
                              >
                                <ActionIcon name="culture" /> Choose {quote().title}
                              </button>
                              <Show when={!quote().available}>
                                <p class="hallmark-disabled-note">{reasonText(quote().reason)}</p>
                              </Show>
                            </>
                          );
                        }}
                      </For>
                    </div>
                  </article>
                </li>
              );
            }}
          </For>
        </ul>
      </fieldset>
      <fieldset class="hallmark-fieldset">
        <legend>Host transfer</legend>
        <p>
          Host Imprints: {transfer().imprints}. A transfer gains {transfer().gainedImprints}{" "}
          Imprints and clears: {transfer().clearedFields.join("; ")}.
        </p>
        <Show
          when={transfer().available}
          fallback={<p class="hallmark-disabled-note">{reasonText(transfer().reason)}</p>}
        >
          <button
            type="button"
            disabled={props.controller.recoveryBlocked()}
            onClick={(event) =>
              openConfirmation(
                {
                  kind: "transfer",
                  title: "Perform host transfer",
                  summary: `Gain ${transfer().gainedImprints} Host Imprints and clear the active host run.`,
                  revision: transfer().sourceEventSequence,
                },
                event,
              )
            }
          >
            <ActionIcon name="host_transfer" /> Perform host transfer
          </button>
        </Show>
        <ul class="prestige-card-grid">
          <For each={PRE_DRAFT_BOON_IDS}>
            {(boonId) => {
              const quote = createMemo(() =>
                lineageBoonPresentation(props.game, lineageBoonId(boonId)),
              );
              return (
                <li>
                  <article class="prestige-card">
                    <h3>
                      <ActionIcon name="boon" /> {quote().title}
                    </h3>
                    <p id={`lineage-boon-${boonId}-status`} tabindex="-1">
                      {quote().available
                        ? `Debit ${quote().cost} Imprints.`
                        : reasonText(quote().reason)}
                    </p>
                    <p class="prestige-tradeoff">
                      Benefit: {quote().relation.benefit}. Liability: {quote().relation.liability}.
                    </p>
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !quote().available}
                      onClick={(event) =>
                        openConfirmation(
                          {
                            kind: "boon",
                            title: `Purchase ${quote().title}`,
                            summary: `Spend ${quote().cost} Host Imprints for ${quote().title}.`,
                            revision: props.game.eventSequence,
                            boonId,
                          },
                          event,
                        )
                      }
                    >
                      <ActionIcon name="boon" /> Purchase boon
                    </button>
                    <Show when={!quote().available}>
                      <p class="hallmark-disabled-note">{reasonText(quote().reason)}</p>
                    </Show>
                  </article>
                </li>
              );
            }}
          </For>
        </ul>
        <Show when={draft().draftId}>
          <section class="prestige-draft" aria-labelledby="host-draft-title">
            <h3 id="host-draft-title">Saved host draft</h3>
            <p id="host-draft-summary" tabindex="-1">
              Saved draft revision {draft().sourceEventSequence}; cards remain in their revealed
              order after reload.
            </p>
            <Show
              when={draft().consumedCardId}
              fallback={
                <ul class="prestige-card-grid">
                  <For each={draft().cards}>
                    {(card) => (
                      <li>
                        <article class="prestige-card">
                          <h4>{card.title}</h4>
                          <Show
                            when={card.revealed}
                            fallback={
                              <p>
                                Locked under the saved {draft().revealPolicy ?? "standard"} reveal
                                policy.
                              </p>
                            }
                          >
                            <ul>
                              <For each={card.traits}>
                                {(trait) => (
                                  <li>
                                    Benefit: {trait.benefit}; liability: {trait.liability}.
                                  </li>
                                )}
                              </For>
                            </ul>
                            <button
                              type="button"
                              disabled={props.controller.recoveryBlocked() || !draft().draftId}
                              onClick={(event) => {
                                const draftId = draft().draftId;
                                if (draftId)
                                  openConfirmation(
                                    {
                                      kind: "host-card",
                                      title: "Choose this host",
                                      summary: `Choose saved ${card.title} for the next host run.`,
                                      revision:
                                        draft().sourceEventSequence ?? props.game.eventSequence,
                                      draftId,
                                      cardId: card.cardId,
                                    },
                                    event,
                                  );
                              }}
                            >
                              <ActionIcon name="host_transfer" /> Choose this host
                            </button>
                          </Show>
                        </article>
                      </li>
                    )}
                  </For>
                </ul>
              }
            >
              {(consumedCardId) => (
                <p class="hallmark-readout" role="status">
                  Consumed draft: {draft().consumedCardTitle ?? String(consumedCardId())}; reveal
                  policy {draft().revealPolicy}; saved revision {draft().sourceEventSequence}.
                </p>
              )}
            </Show>
          </section>
        </Show>
      </fieldset>
      <Show when={props.game.hostTransfer.activeHost}>
        {(activeHost) => (
          <section id="active-host-summary" class="hallmark-readout" role="status" tabindex="-1">
            <p>Active host: {String(activeHost().card.id)}.</p>
            <Show when={metastasis().activeNiche}>
              {(niche) => (
                <p>
                  Active niche: {niche().siteTitle}, rank {niche().rank}, {niche().programTitle}.
                </p>
              )}
            </Show>
            <h3>Target a host-trait liability</h3>
            <ul>
              <For
                each={[
                  activeHost().card.immuneRegime,
                  activeHost().card.tissueEcology,
                  activeHost().card.hostHorizon,
                ]}
              >
                {(traitId) => {
                  const quote = createMemo(() =>
                    activeHostTraitBoonPresentation(props.game, traitId),
                  );
                  return (
                    <li>
                      <p id={`active-host-trait-${traitId}-status`} tabindex="-1">
                        {quote().traitTitle}: liability {quote().liability}.
                      </p>
                      <button
                        type="button"
                        disabled={props.controller.recoveryBlocked() || !quote().available}
                        onClick={(event) =>
                          openConfirmation(
                            {
                              kind: "targeted-boon",
                              title: `Reduce ${quote().traitTitle} liability`,
                              summary: `Spend ${quote().cost} Imprints to reduce ${quote().liability}.`,
                              revision: props.game.eventSequence,
                              targetTraitId: traitId,
                            },
                            event,
                          )
                        }
                      >
                        <ActionIcon name="boon" /> Reduce liability
                      </button>
                      <Show when={!quote().available}>
                        <p class="hallmark-disabled-note">{reasonText(quote().reason)}</p>
                      </Show>
                    </li>
                  );
                }}
              </For>
            </ul>
          </section>
        )}
      </Show>
      <dialog
        ref={(element) => {
          dialog = element;
        }}
        class="prestige-dialog"
        aria-labelledby="prestige-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          cancel();
        }}
      >
        <Show when={pending()}>
          {(action) => (
            <>
              <h2 id="prestige-dialog-title">{action().title}</h2>
              <p>{action().summary}</p>
              <p>Quote revision {action().revision}.</p>
              <Show when={props.controller.saveError()}>
                {(message) => <p role="alert">{message()}</p>}
              </Show>
              <form method="dialog">
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" onClick={confirm}>
                  <ActionIcon name="lineage_reset" /> Confirm {action().title}
                </button>
              </form>
            </>
          )}
        </Show>
      </dialog>
    </section>
  );
}
