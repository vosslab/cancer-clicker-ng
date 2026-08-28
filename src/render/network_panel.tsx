import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import { AUTHORED_NETWORK_EDGE_CATALOG } from "../prestige/network.js";
import { networkPresentation } from "../prestige/culture_network_presentation.js";
import type { DisseminationMandateId, NetworkNodeId } from "../types/ids.js";
import type { GameState } from "../types/state.js";
import type { ApplyResult, GameController } from "./game_controller.js";
import { ActionIcon } from "./action_icon.js";

type NetworkPanelProps = Readonly<{ game: GameState; controller: GameController }>;
type Confirmation =
  | Readonly<{ kind: "mandate"; mandateId: DisseminationMandateId; title: string; summary: string }>
  | Readonly<{ kind: "containment"; nodeId: NetworkNodeId; title: string; summary: string }>;

/** A topology read surface: campaign records stay reducer-owned and alternatives retire on confirmation. */
export function NetworkPanel(props: NetworkPanelProps): JSX.Element {
  const [pending, setPending] = createSignal<Confirmation>();
  const presentation = createMemo(() => networkPresentation(props.game));
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

  function nodeAction(nodeId: NetworkNodeId, established: boolean, stable: boolean): void {
    if (!established) props.controller.establishDisseminationNode(nodeId);
    else if (!stable) props.controller.stabilizeNetworkNode(nodeId);
    else props.controller.collectTransmissionPressure(nodeId);
  }

  return (
    <section class="panel culture-network-panel network-panel" aria-labelledby="network-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Local dissemination topology</p>
          <h2 id="network-title">Contamination network</h2>
        </div>
        <p id="network-summary" class="section-note" tabindex="-1">
          Tier {presentation().globalTier}; Pressure {presentation().pressure}
        </p>
      </div>
      <fieldset class="hallmark-fieldset culture-network-fieldset">
        <legend>Authored node map</legend>
        <p>
          Each node changes local throughput and detection. Stabilize a node, then collect its one
          durable Pressure credit.
        </p>
        <ul class="culture-network-card-grid">
          <For each={presentation().nodes}>
            {(node) => (
              <li>
                <article class="culture-network-card">
                  <h3>
                    <ActionIcon name="network_node" /> {node.label}
                  </h3>
                  <p>
                    Throughput ×{node.throughput.toFixed(2)}; detection{" "}
                    {node.detection >= 0 ? "+" : ""}
                    {node.detection.toFixed(2)}.
                  </p>
                  <p>{node.stable ? "Stable" : node.established ? "Established" : "Unmapped"}.</p>
                  <Show when={node.credit !== null}>
                    <p>
                      Pressure credit {node.credit}. {node.creditDetail}
                    </p>
                  </Show>
                  <button
                    type="button"
                    disabled={
                      props.controller.recoveryBlocked() ||
                      !presentation().available ||
                      !node.actionAvailable
                    }
                    onClick={() => nodeAction(node.id, node.established, node.stable)}
                  >
                    <ActionIcon name="network_node" />{" "}
                    {node.stable
                      ? "Collect Pressure"
                      : node.established
                        ? "Stabilize node"
                        : "Establish node"}
                  </button>
                  <Show when={node.stable}>
                    <button
                      type="button"
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
                      <ActionIcon name="containment" /> Select containment
                    </button>
                  </Show>
                </article>
              </li>
            )}
          </For>
        </ul>
        <p class="culture-network-readout">
          Containment: {presentation().containment.selected ?? "none"}.{" "}
          {presentation().containment.effect}
        </p>
      </fieldset>
      <fieldset class="hallmark-fieldset culture-network-fieldset">
        <legend>Topology links</legend>
        <ul class="culture-network-link-list">
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
                  <span>
                    {edge.fromNodeId} → {edge.toNodeId}
                  </span>
                  <button
                    type="button"
                    disabled={
                      props.controller.recoveryBlocked() ||
                      !presentation().available ||
                      committed() ||
                      !endpointsEstablished()
                    }
                    onClick={() => props.controller.commitDisseminationEdge(edge.id)}
                  >
                    <ActionIcon name="network_edge" /> {committed() ? "Committed" : "Commit edge"}
                  </button>
                </li>
              );
            }}
          </For>
        </ul>
      </fieldset>
      <Show when={presentation().activeCampaign}>
        {(campaign) => (
          <fieldset class="hallmark-fieldset culture-network-fieldset">
            <legend>Active {campaign().category} campaign</legend>
            <p>{campaign().progress}</p>
            <p>{campaign().effects}</p>
            <p class="culture-network-readout">
              Retired alternatives: {campaign().retiredAlternatives}.
            </p>
            <ul class="culture-network-link-list">
              <For
                each={props.game.network.nodes.filter(
                  (node) =>
                    node.campaignId === props.game.network.activeCampaign?.mandate.campaignId,
                )}
              >
                {(node) => (
                  <li>
                    <span>
                      {node.id}: {node.status}
                    </span>
                    <button
                      type="button"
                      disabled={props.controller.recoveryBlocked() || node.status !== "established"}
                      onClick={() => props.controller.stabilizeNetworkNode(node.id)}
                    >
                      <ActionIcon name="network_node" /> Stabilize campaign node
                    </button>
                  </li>
                )}
              </For>
              <For
                each={props.game.network.edges.filter(
                  (edge) =>
                    edge.campaignId === props.game.network.activeCampaign?.mandate.campaignId &&
                    edge.status === "retired",
                )}
              >
                {(edge) => (
                  <li>
                    <span>
                      {edge.fromNodeId} → {edge.toNodeId}
                    </span>
                    <button
                      type="button"
                      onClick={() => props.controller.commitDisseminationEdge(edge.id)}
                    >
                      <ActionIcon name="network_edge" /> Commit campaign edge
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </fieldset>
        )}
      </Show>
      <Show when={presentation().frontier}>
        {(frontier) => (
          <fieldset class="hallmark-fieldset culture-network-fieldset">
            <legend>Renewable campaign frontier</legend>
            <p>
              Choose one deliberate route. The remaining Deepen, Widen, and Reroute alternatives
              retire from this saved frontier.
            </p>
            <ul class="culture-network-card-grid">
              <For each={frontier()}>
                {(mandate) => (
                  <li>
                    <article class="culture-network-card">
                      <h3>
                        <ActionIcon name="campaign" /> {mandate.category}
                      </h3>
                      <p>{mandate.effects}</p>
                      <button
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
                        <ActionIcon name="campaign" /> Choose {mandate.category}
                      </button>
                    </article>
                  </li>
                )}
              </For>
            </ul>
          </fieldset>
        )}
      </Show>
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
              <form method="dialog">
                <button type="button" onClick={cancel}>
                  Cancel
                </button>
                <button type="button" onClick={confirm}>
                  <ActionIcon name="campaign" /> Confirm {action().title}
                </button>
              </form>
            </>
          )}
        </Show>
      </dialog>
    </section>
  );
}
