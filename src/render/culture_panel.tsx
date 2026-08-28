import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { culturePresentation } from "../prestige/m15_presentation.js";
import type { CryobankProgramId, PassageUpgradeId, ProducerId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { ApplyResult, GameController } from "./game_controller.js";

type CulturePanelProps = Readonly<{ game: GameState; controller: GameController }>;
type Confirmation =
  | Readonly<{ kind: "immortalize"; programId: CryobankProgramId; title: string; summary: string }>
  | Readonly<{ kind: "upgrade"; upgradeId: PassageUpgradeId; title: string; summary: string }>
  | Readonly<{ kind: "program"; programId: CryobankProgramId; title: string; summary: string }>
  | Readonly<{ kind: "assay"; producerId: ProducerId; title: string; summary: string }>;

/** Culture choices are all confirmed durable events; this component owns no passage arithmetic. */
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
  onCleanup(() => {
    if (dialog?.open) dialog.close();
  });

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
    <section class="panel m15-panel culture-panel" aria-labelledby="culture-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">L3 durable culture</p>
          <h2 id="culture-title">Culture bench</h2>
        </div>
        <p id="culture-summary" class="section-note" tabindex="-1">
          {presentation().passages} Passages
        </p>
      </div>
      <fieldset class="hallmark-fieldset m15-fieldset">
        <legend>Immortalization translation</legend>
        <p class="m15-readout">Current culture state: Immortalized culture.</p>
        <p>
          An L3 choice clears host-local history, converts the active niche into one cryobank
          program, and debits that cryobank rank from the new award in the same accepted event.
        </p>
        <Show
          when={presentation().activeProgramLabel}
          fallback={
            <p class="hallmark-disabled-note">An active niche program is required for L3.</p>
          }
        >
          {(active) => <p class="m15-readout">Active niche translation: {active()}.</p>}
        </Show>
        <ul class="m15-card-grid">
          <For each={presentation().programs}>
            {(program) => (
              <li>
                <article class="m15-card">
                  <h3>{program.label}</h3>
                  <p>{program.detail}</p>
                  <button
                    type="button"
                    disabled={props.controller.recoveryBlocked() || !program.available}
                    onClick={(event) =>
                      open(
                        {
                          kind: "immortalize",
                          programId: program.id,
                          title: "Perform immortalization",
                          summary: `Choose ${program.label}. The accepted L3 reset clears host-local state and records its atomic cryobank debit.`,
                        },
                        event,
                      )
                    }
                  >
                    Perform immortalization
                  </button>
                </article>
              </li>
            )}
          </For>
        </ul>
      </fieldset>
      <fieldset class="hallmark-fieldset m15-fieldset">
        <legend>Passage upgrades</legend>
        <ul class="m15-card-grid">
          <For each={presentation().upgrades}>
            {(upgrade) => (
              <li>
                <article class="m15-card">
                  <h3>{upgrade.label}</h3>
                  <p>
                    Rank {upgrade.rank}/{upgrade.maximumRank}; {upgrade.detail}.
                  </p>
                  <p>Next debit: {upgrade.cost ?? "complete"} Passages.</p>
                  <button
                    type="button"
                    disabled={props.controller.recoveryBlocked() || !upgrade.available}
                    onClick={(event) =>
                      open(
                        {
                          kind: "upgrade",
                          upgradeId: upgrade.id,
                          title: "Purchase passage upgrade",
                          summary: `Spend ${upgrade.cost ?? 0} Passages on ${upgrade.label}.`,
                        },
                        event,
                      )
                    }
                  >
                    Purchase passage upgrade
                  </button>
                </article>
              </li>
            )}
          </For>
        </ul>
        <Show when={presentation().upgrades.some((entry) => entry.id === "cryobank")}>
          <div class="m15-choices" aria-label="Cryobank program choices">
            <p>Choose a purchased cryobank program for future culture translation.</p>
            <For each={presentation().programs}>
              {(program) => (
                <button
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
                  {program.selected ? `${program.label} selected` : `Select ${program.label}`}
                </button>
              )}
            </For>
          </div>
        </Show>
      </fieldset>
      <Show when={presentation().queuedAction}>
        {(queue) => (
          <fieldset class="hallmark-fieldset m15-fieldset" aria-live="polite">
            <legend>Assay discipline</legend>
            <p>
              Queued {queue().producerLabel}: next cost {queue().cost};{" "}
              {queue().affordable
                ? "its accepted assay event is reconciling."
                : "waiting for an affordable balance."}
            </p>
          </fieldset>
        )}
      </Show>
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
              <form method="dialog">
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" onClick={confirm}>
                  Confirm {action().title}
                </button>
              </form>
            </>
          )}
        </Show>
      </dialog>
    </section>
  );
}
