import { For, Show, createEffect, createMemo, onCleanup } from "solid-js";
import type { JSX } from "solid-js";

import type { FocusRestorationTarget, GameUiState, InspectableEntity } from "./game_ui_state.js";

export type InspectorDrawerProps = Readonly<{
  ui: GameUiState;
  renderVisual?: (entity: InspectableEntity) => JSX.Element;
}>;

function restoreFocus(target: FocusRestorationTarget | undefined): void {
  queueMicrotask(() => {
    if (target?.isConnected) target.focus();
  });
}

/** A non-persistent specimen drawer with a reliable Escape route back to its invoker. */
export function InspectorDrawer(props: InspectorDrawerProps): JSX.Element {
  let closeButton: HTMLButtonElement | undefined;
  const selectedEntity = createMemo(() => {
    const inspector = props.ui.inspector();
    return inspector.isOpen ? inspector.selectedEntity : undefined;
  });

  createEffect(() => {
    if (!selectedEntity()) return;
    queueMicrotask(() => closeButton?.focus());
  });

  function closeDrawer(): void {
    const invoker = props.ui.closeInspector();
    restoreFocus(invoker);
  }

  function handleDocumentKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    closeDrawer();
  }

  createEffect(() => {
    if (!selectedEntity() || typeof document === "undefined") return;
    document.addEventListener("keydown", handleDocumentKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleDocumentKeyDown));
  });

  return (
    <Show when={selectedEntity()}>
      {(entity) => (
        <aside class="inspector-drawer" role="dialog" aria-labelledby="inspector-drawer-title">
          <header class="inspector-drawer-header">
            <p class="inspector-drawer-kind">{entity().kind}</p>
            <button
              ref={(element) => {
                closeButton = element;
              }}
              class="inspector-drawer-close"
              type="button"
              aria-label="Close inspector"
              onClick={closeDrawer}
            >
              <span aria-hidden="true">x</span>
            </button>
          </header>
          <Show when={props.renderVisual}>{(renderVisual) => renderVisual()(entity())}</Show>
          <h2 id="inspector-drawer-title">{entity().title}</h2>
          <p>{entity().summary}</p>
          <Show when={(entity().details?.length ?? 0) > 0}>
            <dl class="inspector-drawer-details">
              <For each={entity().details ?? []}>
                {(detail) => (
                  <div>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                )}
              </For>
            </dl>
          </Show>
        </aside>
      )}
    </Show>
  );
}
