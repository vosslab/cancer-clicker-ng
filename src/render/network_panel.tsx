import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { AUTHORED_NETWORK_EDGE_CATALOG } from "../prestige/network.js";
import { networkPresentation } from "../prestige/culture_network_presentation.js";
import { CultureNetworkProp } from "../svg/culture_network_props.js";
import type { DisseminationMandateId, NetworkNodeId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import { HelpTooltip } from "./action_tooltip.js";
import type { ApplyResult, GameController } from "./game_controller.js";

type NetworkPanelProps = Readonly<{ game: GameState; controller: GameController }>;
type Confirmation =
  | Readonly<{ kind: "mandate"; mandateId: DisseminationMandateId; title: string; summary: string }>
  | Readonly<{ kind: "containment"; nodeId: NetworkNodeId; title: string; summary: string }>;
type ActionStatus = Readonly<{ tone: "success" | "failure"; message: string }>;

function compactSiteName(label: string): string {
  return label.split(" ")[0] ?? label;
}

/** A compact contamination world; topology records and credits remain domain-owned. */
export function NetworkPanel(props: NetworkPanelProps): JSX.Element {
  const [pending, setPending] = createSignal<Confirmation>();
  const [actionStatus, setActionStatus] = createSignal<ActionStatus>();
  const presentation = createMemo(() => networkPresentation(props.game));
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
    const frontier = props.game.network.pendingFrontier;
    if (!action || props.controller.recoveryBlocked()) return;
    const result: ApplyResult =
      action.kind === "mandate"
        ? frontier
          ? props.controller.chooseDisseminationMandate(frontier.id, action.mandateId)
          : { ok: false, kind: "persistence", notices: [] }
        : props.controller.selectContainmentNode(action.nodeId);
    if (result.ok) {
      setPending(undefined);
      queueMicrotask(() => document.getElementById("network-summary")?.focus());
    }
  }
  function announceAction(result: ApplyResult, success: string, failure: string): void {
    if (result.ok) {
      setActionStatus({ tone: "success", message: success });
      return;
    }
    setActionStatus({
      tone: "failure",
      message: `${failure} ${props.controller.saveError() ?? "Try the action again."}`,
    });
  }

  function nodeAction(
    nodeId: NetworkNodeId,
    label: string,
    established: boolean,
    stable: boolean,
  ): void {
    if (!established) {
      announceAction(
        props.controller.establishDisseminationNode(nodeId),
        `${label} established.`,
        `${label} was not established.`,
      );
    } else if (!stable) {
      announceAction(
        props.controller.stabilizeNetworkNode(nodeId),
        `${label} stabilized.`,
        `${label} was not stabilized.`,
      );
    } else {
      announceAction(
        props.controller.collectTransmissionPressure(nodeId),
        `Pressure collected from ${label}.`,
        `Pressure was not collected from ${label}.`,
      );
    }
  }

  function edgeAction(edgeId: (typeof AUTHORED_NETWORK_EDGE_CATALOG)[number]["id"]): void {
    announceAction(
      props.controller.commitDisseminationEdge(edgeId),
      "Topology link committed.",
      "Topology link was not committed.",
    );
  }

  return (
    <section class="panel culture-network-panel network-panel" aria-labelledby="network-title">
      <div class="culture-network-board">
        <div class="culture-network-board__topline">
          <h2 id="network-title">Network</h2>
          <CultureNetworkProp
            kind="containment"
            state={presentation().available ? "ready" : "locked"}
          />
        </div>
        <p id="network-summary" class="culture-network-board__status" tabindex="-1">
          <span>tier {presentation().globalTier}</span>
          <span>pressure {presentation().pressure}</span>
        </p>
        <Show when={actionStatus()}>
          {(status) => (
            <p
              class="culture-network-action-status"
              data-tone={status().tone}
              role="status"
              aria-live="polite"
            >
              {status().message}
            </p>
          )}
        </Show>
        <ul class="culture-network-map" aria-label="Contamination node map">
          <For each={presentation().nodes}>
            {(node) => (
              <li>
                <HelpTooltip
                  tooltip={`Throughput x${node.throughput.toFixed(2)}; detection ${node.detection >= 0 ? "+" : ""}${node.detection.toFixed(2)}. ${node.stable ? "Stable." : node.established ? "Established." : "Unmapped."}${node.creditDetail ? ` Pressure credit ${node.credit}. ${node.creditDetail}` : ""}`}
                >
                  {(tooltip) => (
                    <button
                      {...tooltip}
                      class="culture-network-action"
                      type="button"
                      disabled={
                        props.controller.recoveryBlocked() ||
                        !presentation().available ||
                        !node.actionAvailable
                      }
                      onClick={() => nodeAction(node.id, node.label, node.established, node.stable)}
                    >
                      <CultureNetworkProp
                        kind="site"
                        state={node.stable ? "active" : node.established ? "ready" : "locked"}
                      />
                      <span class="culture-network-action__copy">
                        <span class="culture-network-action__name">
                          {compactSiteName(node.label)}
                        </span>
                        <span class="culture-network-action__count">
                          {node.stable
                            ? `+${node.credit ?? 0}`
                            : node.established
                              ? "stabilize"
                              : "establish"}
                        </span>
                      </span>
                    </button>
                  )}
                </HelpTooltip>
              </li>
            )}
          </For>
        </ul>
        <ul class="culture-network-compact-list" aria-label="Topology links">
          <For each={AUTHORED_NETWORK_EDGE_CATALOG}>
            {(edge) => {
              const committed = (): boolean =>
                props.game.network.edges.some(
                  (item) => item.id === edge.id && item.status === "committed",
                );
              const endpointsEstablished = (): boolean =>
                props.game.network.nodes.some((node) => node.id === edge.fromNodeId) &&
                props.game.network.nodes.some((node) => node.id === edge.toNodeId);
              return (
                <li>
                  <HelpTooltip
                    tooltip={`${edge.fromNodeId} to ${edge.toNodeId}. Commit only after both endpoints are established.`}
                  >
                    {(tooltip) => (
                      <button
                        {...tooltip}
                        class="culture-network-action"
                        type="button"
                        disabled={
                          props.controller.recoveryBlocked() ||
                          !presentation().available ||
                          committed() ||
                          !endpointsEstablished()
                        }
                        onClick={() => edgeAction(edge.id)}
                      >
                        <CultureNetworkProp
                          kind="route"
                          state={
                            committed() ? "active" : endpointsEstablished() ? "ready" : "locked"
                          }
                        />
                        <span class="culture-network-action__copy">
                          <span class="culture-network-action__name">link</span>
                          <span class="culture-network-action__count">
                            {committed() ? "committed" : "commit"}
                          </span>
                        </span>
                      </button>
                    )}
                  </HelpTooltip>
                </li>
              );
            }}
          </For>
          <For each={presentation().nodes.filter((node) => node.stable)}>
            {(node) => (
              <li>
                <HelpTooltip
                  tooltip={`Contain ${node.label}. ${presentation().containment.effect}`}
                >
                  {(tooltip) => (
                    <button
                      {...tooltip}
                      class="culture-network-action"
                      type="button"
                      aria-pressed={presentation().containment.selected === node.label}
                      disabled={props.controller.recoveryBlocked() || !presentation().available}
                      onClick={(event) =>
                        open(
                          {
                            kind: "containment",
                            nodeId: node.id,
                            title: "Select containment node",
                            summary: `Contain ${node.label}. This preserves the named local throughput and detection tradeoff.`,
                          },
                          event,
                        )
                      }
                    >
                      <CultureNetworkProp
                        kind="containment"
                        state={
                          presentation().containment.selected === node.label ? "selected" : "ready"
                        }
                      />
                      <span class="culture-network-action__copy">
                        <span class="culture-network-action__name">
                          contain {compactSiteName(node.label)}
                        </span>
                        <span class="culture-network-action__count">
                          {presentation().containment.selected === node.label
                            ? "selected"
                            : "select"}
                        </span>
                      </span>
                    </button>
                  )}
                </HelpTooltip>
              </li>
            )}
          </For>
        </ul>
        <Show when={presentation().activeCampaign}>
          {(campaign) => (
            <p class="culture-network-board__status">
              <span>{campaign().category}</span>
              <span>{campaign().progress}</span>
            </p>
          )}
        </Show>
        <Show when={presentation().frontier}>
          {(frontier) => (
            <ul class="culture-network-compact-list" aria-label="Renewable campaign frontier">
              <For each={frontier()}>
                {(mandate) => (
                  <li>
                    <HelpTooltip
                      tooltip={`${mandate.effects} Choosing this route starts its campaign and retires the two alternatives in the saved frontier.`}
                    >
                      {(tooltip) => (
                        <button
                          {...tooltip}
                          class="culture-network-action"
                          type="button"
                          disabled={props.controller.recoveryBlocked() || !presentation().available}
                          onClick={(event) =>
                            open(
                              {
                                kind: "mandate",
                                mandateId: mandate.id,
                                title: "Choose dissemination mandate",
                                summary: `Choose ${mandate.category}. This starts its campaign and retires the two alternatives in the saved frontier.`,
                              },
                              event,
                            )
                          }
                        >
                          <CultureNetworkProp kind="mandate" state="ready" />
                          <span class="culture-network-action__copy">
                            <span class="culture-network-action__name">{mandate.category}</span>
                            <span class="culture-network-action__count">route</span>
                          </span>
                        </button>
                      )}
                    </HelpTooltip>
                  </li>
                )}
              </For>
            </ul>
          )}
        </Show>
      </div>
      <dialog
        ref={(element) => {
          dialog = element;
        }}
        class="prestige-dialog"
        aria-labelledby="network-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          cancel();
        }}
      >
        <Show when={pending()}>
          {(action) => (
            <>
              <h2 id="network-dialog-title">{action().title}</h2>
              <p>{action().summary}</p>
              <Show when={props.controller.saveError()}>
                <p role="alert">{props.controller.saveError()}</p>
              </Show>
              <form method="dialog" class="culture-network-dialog__actions">
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" onClick={confirm}>
                  <CultureNetworkProp kind="mandate" state="ready" /> Confirm
                </button>
              </form>
            </>
          )}
        </Show>
      </dialog>
    </section>
  );
}
