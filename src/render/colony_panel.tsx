/**
 * Read-only M18 presentation boundary for the current representative colony.
 *
 * The panel derives its stable scene identity from the controller's current
 * stage. It never writes game state, records events, or asks the SVG layer to
 * make a second layout decision.
 */
import { ErrorBoundary, Show, createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { stageDefinition } from "../stages/catalog.js";
import type { GameState } from "../types/state.js";
import { Colony } from "../svg/colony.js";
import { createColonyLayout } from "../svg/colony_layout.js";
import { describeColonyScene } from "../svg/describe.js";
import { resolve_stage_morphology } from "../svg/morphology.js";
import type { StageVisualId } from "../svg/morphology.js";
import { hash_seed } from "../svg/noise.js";
import { createColonySceneRequest } from "../svg/render_types.js";
import type { ColonySceneRequest } from "../svg/render_types.js";

const REPRESENTATIVE_DETAIL = "representative" as const;
const PANEL_SEED_NAMESPACE = "ccng-panel-scene-v1";

type ColonyPanelProps = Readonly<{
  game: GameState;
}>;

type ReadyPanelScene = Readonly<{
  kind: "ready";
  scene: ColonySceneRequest;
  stageTitle: string;
  caption: string;
}>;

type UnavailablePanelScene = Readonly<{
  kind: "unavailable";
}>;

type ColonyPanelScene = ReadyPanelScene | UnavailablePanelScene;

/** Stable per-stage identity keeps a replayed representative specimen recognizable. */
export function representativeSceneSeed(stageId: GameState["currentStage"]): number {
  const seed = hash_seed([PANEL_SEED_NAMESPACE, stageId]);
  return seed;
}

/** Narrows the state boundary to the closed M16 stage-fixture vocabulary. */
function morphologyStageId(stageId: GameState["currentStage"]): StageVisualId {
  switch (stageId) {
    case "transformed_cell":
      return "transformed_cell";
    case "microcolony":
      return "microcolony";
    case "avascular_lesion":
      return "avascular_lesion";
    case "hypoxic_lesion":
      return "hypoxic_lesion";
    case "angiogenic_primary":
      return "angiogenic_primary";
    case "invasive_carcinoma":
      return "invasive_carcinoma";
    case "intravasation":
      return "intravasation";
    case "micrometastatic_seeding":
      return "micrometastatic_seeding";
    case "metastatic_burden":
      return "metastatic_burden";
    case "host_collapse":
      return "host_collapse";
    case "immortalized_culture":
      return "immortalized_culture";
    case "global_lab_contamination":
      return "global_lab_contamination";
  }
  throw new Error("Current stage has no M16 morphology fixture.");
}

/** Constructs one frozen M16/M17/M18 representative scene without altering game state. */
export function createRepresentativeColonyScene(
  stageId: GameState["currentStage"],
): ColonySceneRequest {
  const sceneSeed = representativeSceneSeed(stageId);
  const morphology = resolve_stage_morphology(sceneSeed, morphologyStageId(stageId));
  const layout = createColonyLayout({
    stageId,
    sceneSeed,
    morphology,
    detail: REPRESENTATIVE_DETAIL,
  });
  const scene = createColonySceneRequest(
    Object.freeze({
      layout,
      morphology,
      stageId,
      sceneSeed,
      detail: REPRESENTATIVE_DETAIL,
    }),
  );
  return scene;
}

function derivePanelScene(stageId: GameState["currentStage"]): ColonyPanelScene {
  try {
    const scene = createRepresentativeColonyScene(stageId);
    const description = describeColonyScene(scene);
    const stageTitle = stageDefinition(stageId).title;
    const ready: ReadyPanelScene = {
      kind: "ready",
      scene,
      stageTitle,
      caption: description.caption,
    };
    return ready;
  } catch {
    const unavailable: UnavailablePanelScene = { kind: "unavailable" };
    return unavailable;
  }
}

function unavailablePanelState(): JSX.Element {
  return (
    <p class="colony-panel__unavailable" role="status">
      The specimen view is temporarily unavailable. Gameplay continues normally.
    </p>
  );
}

/** Shows one noninteractive SVG specimen beside its brief, stage-aware game caption. */
export function ColonyPanel(props: ColonyPanelProps): JSX.Element {
  const panelScene = createMemo(() => derivePanelScene(props.game.currentStage));
  const readyScene = createMemo(() => {
    const result = panelScene();
    return result.kind === "ready" ? result : undefined;
  });
  return (
    <section class="panel colony-panel" aria-labelledby="colony-panel-title">
      <div class="colony-panel__heading">
        <p class="eyebrow">Current specimen</p>
        <h2 id="colony-panel-title">Colony morphology</h2>
      </div>
      <Show when={readyScene()} fallback={unavailablePanelState()}>
        {(ready) => (
          <figure class="colony-panel__figure" aria-labelledby="colony-panel-title">
            <ErrorBoundary fallback={unavailablePanelState()}>
              <Colony scene={ready().scene} />
            </ErrorBoundary>
            <figcaption>
              <strong>{ready().stageTitle}:</strong> {ready().caption} Stylized game abstraction.
            </figcaption>
          </figure>
        )}
      </Show>
    </section>
  );
}
