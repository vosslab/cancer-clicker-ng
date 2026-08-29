/**
 * The colony is the single direct division control. It projects the accepted
 * living-tumor scene and delegates pointer intent only from rendered cells;
 * keyboard activation stays on this one native button.
 */
import { ErrorBoundary, Show, createMemo, createSignal } from "solid-js";
import type { JSX } from "solid-js";

import { formatMagnitudeName } from "../bignum/format.js";
import { cellProductionRate } from "../economy/production.js";
import type { GameState } from "../types/state.js";
import { createGameColonyScene } from "../svg/colony_visual_state.js";
import { describeColonyScene } from "../svg/describe.js";
import type { ColonySceneRequest } from "../svg/render_types.js";
import { TumorArena } from "./tumor_arena.js";
import { formatCellInventory, formatCellRate, nextCellProgress } from "./cell_metrics.js";

type ColonyPanelProps = Readonly<{
  game: GameState;
  disabled?: boolean;
  /** True only after the canonical click event becomes durable player progress. */
  onDivide: () => boolean;
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

/** Shows the visual cell field as one accessible action without per-cell tab stops. */
export function ColonyPanel(props: ColonyPanelProps): JSX.Element {
  const [feedbackTarget, setFeedbackTarget] = createSignal<Readonly<{ x: number; y: number }>>({
    x: 500,
    y: 350,
  });
  const [feedbackSequence, setFeedbackSequence] = createSignal(0);
  const panelScene = createMemo(() => {
    const currentStage = props.game.currentStage;
    const resolved = derivePanelScene(props.game);
    if (resolved.kind === "ready" && resolved.scene.stageId !== currentStage) {
      throw new Error("Colony scene must match the authoritative current stage.");
    }
    return resolved;
  });
  const readyScene = createMemo(() => {
    const result = panelScene();
    return result.kind === "ready" ? result : undefined;
  });
  const productionRate = createMemo(() => cellProductionRate(props.game));

  return (
    <section
      class="panel colony-panel"
      data-growth-state={readyScene()?.scene.visual.growthState ?? "quiet"}
      aria-label="Living tumor arena"
    >
      <Show when={readyScene()} fallback={unavailablePanelState()}>
        {(ready) => (
          <ErrorBoundary fallback={unavailablePanelState()}>
            <TumorArena
              disabled={props.disabled === true}
              scene={ready().scene}
              cellsLabel={formatCellInventory(props.game.cells, props.game.numberFormat)}
              growthProgress={nextCellProgress(props.game.cells)}
              magnitudeName={formatMagnitudeName(props.game.cells, 2)}
              productionLabel={formatCellRate(productionRate(), props.game.numberFormat)}
              description={`${ready().caption} Stylized game abstraction.`}
              feedbackTarget={feedbackTarget}
              feedbackSequence={feedbackSequence}
              onDivisionFeedback={(target) => {
                setFeedbackTarget(target);
                setFeedbackSequence((sequence) => sequence + 1);
              }}
              onDivide={props.onDivide}
            />
          </ErrorBoundary>
        )}
      </Show>
    </section>
  );
}
