/**
 * The colony is the single direct division control. It projects the accepted
 * living-tumor scene and delegates pointer intent only from rendered cells;
 * keyboard activation stays on this one native button.
 */
import { ErrorBoundary, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum } from "../bignum/format.js";
import { cellProductionRate } from "../economy/production.js";
import type { GameState } from "../types/state.js";
import { Colony } from "../svg/colony.js";
import { createGameColonyScene } from "../svg/colony_visual_state.js";
import { describeColonyScene } from "../svg/describe.js";
import type { ColonySceneRequest } from "../svg/render_types.js";
import { NumberDisplay } from "./number_display.js";

type ColonyPanelProps = Readonly<{
  game: GameState;
  disabled?: boolean;
  onDivide: () => void;
}>;

type ReadyPanelScene = Readonly<{
  kind: "ready";
  scene: ColonySceneRequest;
  caption: string;
}>;

type UnavailablePanelScene = Readonly<{ kind: "unavailable" }>;
type ColonyPanelScene = ReadyPanelScene | UnavailablePanelScene;

/** Creates the one immutable game-derived scene consumed by both panel and SVG layers. */
export function createRepresentativeColonyScene(game: GameState): ColonySceneRequest {
  return createGameColonyScene(game);
}

function derivePanelScene(game: GameState): ColonyPanelScene {
  try {
    const scene = createRepresentativeColonyScene(game);
    return {
      kind: "ready",
      scene,
      caption: describeColonyScene(scene).caption,
    };
  } catch {
    return { kind: "unavailable" };
  }
}

function unavailablePanelState(): JSX.Element {
  return (
    <p class="colony-panel__unavailable" role="status">
      The specimen view is temporarily unavailable. Gameplay continues normally.
    </p>
  );
}

function targetIsVisibleColonyCell(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("[data-colony-cell]") !== null;
}

/** Shows the visual cell field as one accessible action without per-cell tab stops. */
export function ColonyPanel(props: ColonyPanelProps): JSX.Element {
  const panelScene = createMemo(() => derivePanelScene(props.game));
  const readyScene = createMemo(() => {
    const result = panelScene();
    return result.kind === "ready" ? result : undefined;
  });
  const productionRate = createMemo(() => cellProductionRate(props.game));

  function divideFromColony(event: MouseEvent): void {
    // Keyboard and assistive activation has detail 0. Pointer/touch intent must
    // originate from a rendered cell rather than the surrounding plate.
    if (event.detail === 0 || targetIsVisibleColonyCell(event.target)) props.onDivide();
  }

  return (
    <section
      class="panel colony-panel"
      data-growth-state={readyScene()?.scene.visual.growthState ?? "quiet"}
      aria-labelledby="colony-panel-title"
    >
      <div class="colony-panel__heading">
        <div>
          <p class="eyebrow">Primary culture</p>
          <h2 id="colony-panel-title">Your colony</h2>
        </div>
        <p class="colony-panel__growth-state">
          {readyScene()?.scene.visual.growthState ?? "quiet"} growth state
        </p>
      </div>
      <div class="colony-panel__count-rate">
        <NumberDisplay
          class="cell-count"
          value={props.game.cells}
          format={props.game.numberFormat}
          label="Cell count"
        />
        <output class="colony-panel__rate" aria-label="Cell production rate">
          {formatBigNum(productionRate(), props.game.numberFormat, 2)} cells/s
        </output>
      </div>
      <Show when={readyScene()} fallback={unavailablePanelState()}>
        {(ready) => (
          <>
            <button
              id="divide-button"
              class="colony-panel__action"
              data-colony-action="divide"
              type="button"
              disabled={props.disabled}
              aria-label="Divide cell"
              aria-describedby="colony-instruction colony-caption"
              onClick={divideFromColony}
            >
              <ErrorBoundary fallback={unavailablePanelState()}>
                <Colony scene={ready().scene} decorative />
              </ErrorBoundary>
            </button>
            <p id="colony-instruction" class="colony-panel__instruction">
              Click a visible cell to divide. Enter or Space also divides.
            </p>
            <p id="colony-caption" class="colony-panel__caption">
              {ready().caption} Stylized game abstraction.
            </p>
          </>
        )}
      </Show>
    </section>
  );
}
