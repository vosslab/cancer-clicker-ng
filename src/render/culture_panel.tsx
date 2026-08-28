import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { culturePresentation } from "../prestige/culture_network_presentation.js";
import { CultureNetworkProp } from "../svg/culture_network_props.js";
import type { CryobankProgramId, PassageUpgradeId, ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { HelpTooltip } from "./action_tooltip.js";
import type { ApplyResult, GameController } from "./game_controller.js";

type CulturePanelProps = Readonly<{ game: GameState; controller: GameController }>;
type Confirmation =
  | Readonly<{ kind: "immortalize"; programId: CryobankProgramId; title: string; summary: string }>
  | Readonly<{ kind: "upgrade"; upgradeId: PassageUpgradeId; title: string; summary: string }>
  | Readonly<{ kind: "program"; programId: CryobankProgramId; title: string; summary: string }>
  | Readonly<{ kind: "assay"; producerId: ProducerId; title: string; summary: string }>;

/** A small playable culture bench; accepted culture events remain controller-owned. */
export function CulturePanel(props: CulturePanelProps): JSX.Element {
  const [pending, setPending] = createSignal<Confirmation>();
  const presentation = createMemo(() => culturePresentation(props.game));
  let dialog: HTMLDialogElement | undefined;
  let origin: HTMLElement | undefined;

  createEffect(() => {
    if (!dialog) return;
    if (pending() && !dialog.open) dialog.showModal();
    if (!pending() && dialog.open) dialog.close();
  });
  onCleanup(() => dialog?.open && dialog.close());

  function open(next: Confirmation, event: MouseEvent): void {
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
    if (!action || props.controller.recoveryBlocked()) return;
    const result: ApplyResult = ((): ApplyResult => {
      switch (action.kind) {
        case "immortalize":
          return props.controller.performImmortalization(action.programId);
        case "upgrade":
          return props.controller.purchasePassageUpgrade(action.upgradeId);
        case "program":
          return props.controller.selectCryobankProgram(action.programId);
        case "assay":
          return props.controller.queueAssayProducerAction(action.producerId);
      }
    })();
    if (result.ok) {
      setPending(undefined);
      queueMicrotask(() => document.getElementById("culture-summary")?.focus());
    }
  }

  return (
    <section class="panel culture-network-panel culture-panel" aria-labelledby="culture-title">
      <div class="culture-network-board">
        <div class="culture-network-board__topline">
          <h2 id="culture-title">Culture</h2>
          <CultureNetworkProp kind="dish" state={presentation().l3Ready ? "ready" : "locked"} />
        </div>
        <p id="culture-summary" class="culture-network-board__status" tabindex="-1">
          <span>{presentation().passages} passages</span>
          <span>{presentation().activeProgramLabel ?? "niche needed"}</span>
        </p>
        <ul class="culture-network-action-grid" aria-label="Immortalization programs">
          <For each={presentation().programs}>
            {(program) => (
              <li>
                <HelpTooltip tooltip={program.detail}>
                  {(tooltip) => (
                    <button
                      {...tooltip}
                      class="culture-network-action"
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !program.available}
                      onClick={(event) =>
                        open(
                          {
                            kind: "immortalize",
                            programId: program.id,
                            title: "Immortalize",
                            summary: `Choose ${program.label}. The accepted L3 reset clears host-local state and records its atomic cryobank debit.`,
                          },
                          event,
                        )
                      }
                    >
                      <CultureNetworkProp
                        kind="dish"
                        state={program.available ? "ready" : "locked"}
                      />
                      <span class="culture-network-action__copy">
                        <span class="culture-network-action__name">{program.label}</span>
                        <span class="culture-network-action__count">
                          {program.available ? "immortalize" : "locked"}
                        </span>
                      </span>
                    </button>
                  )}
                </HelpTooltip>
              </li>
            )}
          </For>
        </ul>
        <ul class="culture-network-compact-list" aria-label="Passage upgrades">
          <For each={presentation().upgrades}>
            {(upgrade) => (
              <li>
                <HelpTooltip
                  tooltip={`Rank ${upgrade.rank}/${upgrade.maximumRank}. ${upgrade.detail}. Next debit: ${upgrade.cost ?? "complete"} Passages.`}
                >
                  {(tooltip) => (
                    <button
                      {...tooltip}
                      class="culture-network-action"
                      type="button"
                      disabled={props.controller.recoveryBlocked() || !upgrade.available}
                      onClick={(event) =>
                        open(
                          {
                            kind: "upgrade",
                            upgradeId: upgrade.id,
                            title: "Acquire passage upgrade",
                            summary: `Spend ${upgrade.cost ?? 0} Passages on ${upgrade.label}.`,
                          },
                          event,
                        )
                      }
                    >
                      <CultureNetworkProp
                        kind="passage"
                        state={upgrade.available ? "ready" : upgrade.rank > 0 ? "active" : "locked"}
                      />
                      <span class="culture-network-action__copy">
                        <span class="culture-network-action__name">{upgrade.label}</span>
                        <span class="culture-network-action__count">
                          {upgrade.rank}/{upgrade.maximumRank} | {upgrade.cost ?? "done"}
                        </span>
                      </span>
                    </button>
                  )}
                </HelpTooltip>
              </li>
            )}
          </For>
        </ul>
        <Show when={presentation().upgrades.some((entry) => entry.id === "cryobank")}>
          <ul class="culture-network-compact-list" aria-label="Cryobank program selection">
            <For each={presentation().programs}>
              {(program) => (
                <li>
                  <HelpTooltip
                    tooltip={`Record ${program.label} as the current cryobank program for future culture translation.`}
                  >
                    {(tooltip) => (
                      <button
                        {...tooltip}
                        class="culture-network-action"
                        type="button"
                        aria-pressed={program.selected}
                        disabled={
                          props.controller.recoveryBlocked() ||
                          !program.selectionAvailable ||
                          program.selected
                        }
                        onClick={(event) =>
                          open(
                            {
                              kind: "program",
                              programId: program.id,
                              title: "Select cryobank program",
                              summary: `Record ${program.label} as the current cryobank program.`,
                            },
                            event,
                          )
                        }
                      >
                        <CultureNetworkProp
                          kind="cryobank"
                          state={
                            program.selected
                              ? "selected"
                              : program.selectionAvailable
                                ? "ready"
                                : "locked"
                          }
                        />
                        <span class="culture-network-action__copy">
                          <span class="culture-network-action__name">{program.label}</span>
                          <span class="culture-network-action__count">
                            {program.selected ? "selected" : "select"}
                          </span>
                        </span>
                      </button>
                    )}
                  </HelpTooltip>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={presentation().queuedAction}>
          {(queue) => (
            <p class="culture-network-board__status" aria-live="polite">
              <CultureNetworkProp kind="assay" state={queue().affordable ? "ready" : "locked"} />
              <span>primed: {queue().producerLabel}</span>
              <span>{queue().cost}</span>
            </p>
          )}
        </Show>
      </div>
      <dialog
        ref={(element) => {
          dialog = element;
        }}
        class="prestige-dialog"
        aria-labelledby="culture-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          cancel();
        }}
      >
        <Show when={pending()}>
          {(action) => (
            <>
              <h2 id="culture-dialog-title">{action().title}</h2>
              <p>{action().summary}</p>
              <Show when={props.controller.saveError()}>
                <p role="alert">{props.controller.saveError()}</p>
              </Show>
              <form method="dialog" class="culture-network-dialog__actions">
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" onClick={confirm}>
                  <CultureNetworkProp kind="dish" state="ready" /> Confirm
                </button>
              </form>
            </>
          )}
        </Show>
      </dialog>
    </section>
  );
}
