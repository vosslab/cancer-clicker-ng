/**
 * One accessible, noninteractive SVG projection of an accepted M17 colony.
 *
 * This module deliberately consumes the frozen scene boundary: it makes no
 * placement, depth, morphology, or random decisions of its own.
 */
import { For, createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { createCellBlobPaths } from "./blob.js";
import { Cell } from "./cell.js";
import { createColonySvgDefinitions, localSvgReference } from "./defs.js";
import type { SvgDefinition, SvgDefinitionNode } from "./defs.js";
import { describeColonyScene } from "./describe.js";
import { EndingOverlay } from "./ending_overlay.js";
import {
  HallmarkOverlays,
  InvasionOverlays,
  OxygenOverlays,
  PerfusionOverlays,
} from "./colony_overlays.js";
import { createCellRenderModel, createColonySceneRequest, sceneSvgId } from "./render_types.js";
import type {
  CellRenderModel,
  ColonySceneDescription,
  ColonySceneRequest,
} from "./render_types.js";

const VIEW_BOX = "0 0 1000 700";
const STATIC_SCENE_NODES = 34;

export type ColonyProps = Readonly<{
  scene: ColonySceneRequest;
  /** The named button owns accessibility when the colony becomes its visual surface. */
  decorative?: boolean;
}>;

export type ColonySvgModel = Readonly<{
  titleId: string;
  descriptionId: string;
  description: ColonySceneDescription;
  cells: readonly CellRenderModel[];
  nodeEstimate: number;
}>;

function countCellNodes(cell: CellRenderModel): number {
  return cell.mitosis === undefined ? 3 : 4;
}

function estimateNodeCount(cells: readonly CellRenderModel[]): number {
  const cellNodes = cells.reduce((total, cell) => total + countCellNodes(cell), 0);
  const estimate = STATIC_SCENE_NODES + cellNodes;
  return estimate;
}

/**
 * Produces ordered renderer data without adding, moving, or otherwise changing
 * accepted M17 slots.  This pure model is also the structural-test seam.
 */
export function describeColonySvg(value: ColonySceneRequest): ColonySvgModel {
  const scene = createColonySceneRequest(value);
  const description = describeColonyScene(scene);
  const cells = scene.layout.slots.map((slot) => {
    const paths = createCellBlobPaths(slot, scene.morphology);
    return createCellRenderModel(scene, paths);
  });
  const nodeEstimate = estimateNodeCount(cells);
  return Object.freeze({
    titleId: sceneSvgId(scene, "title"),
    descriptionId: sceneSvgId(scene, "description"),
    description,
    cells: Object.freeze(cells),
    nodeEstimate,
  });
}

function renderDefinitionNode(node: SvgDefinitionNode): JSX.Element {
  if (node.element === "circle") return <circle {...node.attributes} />;
  if (node.element === "path") return <path {...node.attributes} />;
  if (node.element === "rect") return <rect {...node.attributes} />;
  return <stop {...node.attributes} />;
}

function renderDefinition(definition: SvgDefinition): JSX.Element {
  if (definition.element === "linearGradient") {
    return (
      <linearGradient id={definition.id} {...definition.attributes}>
        <For each={definition.children}>{renderDefinitionNode}</For>
      </linearGradient>
    );
  }
  if (definition.element === "radialGradient") {
    return (
      <radialGradient id={definition.id} {...definition.attributes}>
        <For each={definition.children}>{renderDefinitionNode}</For>
      </radialGradient>
    );
  }
  if (definition.element === "pattern") {
    return (
      <pattern id={definition.id} {...definition.attributes}>
        <For each={definition.children}>{renderDefinitionNode}</For>
      </pattern>
    );
  }
  return (
    <mask id={definition.id} {...definition.attributes}>
      <For each={definition.children}>{renderDefinitionNode}</For>
    </mask>
  );
}

function silhouettePoints(scene: ColonySceneRequest): string {
  const points = scene.layout.silhouette.vertices.map((point) => `${point.x},${point.y}`);
  return points.join(" ");
}

/** Renders the living colony as a meaningful image or a decorative named-button surface. */
export function Colony(props: ColonyProps): JSX.Element {
  const scene = createMemo(() => createColonySceneRequest(props.scene));
  const model = createMemo(() => describeColonySvg(scene()));
  const definitions = createMemo(() => createColonySvgDefinitions(scene()));
  const label = createMemo(() => `${model().titleId} ${model().descriptionId}`);
  const points = createMemo(() => silhouettePoints(scene()));
  const decorative = props.decorative === true;
  return (
    <svg
      class={`colony-figure colony-figure--${scene().visual.growthState}`}
      role={decorative ? undefined : "img"}
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={decorative ? "true" : undefined}
      aria-labelledby={decorative ? undefined : label()}
    >
      {decorative ? undefined : <title id={model().titleId}>{model().description.title}</title>}
      {decorative ? undefined : (
        <desc id={model().descriptionId}>{model().description.description}</desc>
      )}
      <defs>
        <For each={definitions().definitions}>{renderDefinition}</For>
      </defs>
      <g class="colony-figure__tissue" aria-hidden="true" pointer-events="none">
        <rect class="colony-figure__plate" x="0" y="0" width="1000" height="700" rx="32" />
        <path
          class="colony-figure__tissue-fascia"
          d="M 0 118 C 220 72 354 176 540 112 S 814 90 1000 154"
        />
        <path
          class="colony-figure__tissue-fascia"
          d="M 0 562 C 202 508 410 624 622 558 S 838 504 1000 584"
        />
      </g>
      <EndingOverlay scene={scene()} />
      <g class="colony-figure__silhouette-regions" aria-hidden="true" pointer-events="none">
        <polygon
          class="colony-figure__silhouette"
          points={points()}
          fill={localSvgReference(definitions().ids.tissueGradient)}
        />
        <For each={scene().layout.regions}>
          {(region) => (
            <ellipse
              class={`colony-figure__region colony-figure__region--${region.kind}`}
              cx={region.centre.x}
              cy={region.centre.y}
              rx={region.rx}
              ry={region.ry}
            />
          )}
        </For>
        <For each={scene().layout.voids}>
          {(voidFeature) => (
            <ellipse
              class={`colony-figure__void colony-figure__void--${voidFeature.kind}`}
              cx={voidFeature.centre.x}
              cy={voidFeature.centre.y}
              rx={voidFeature.rx}
              ry={voidFeature.ry}
            />
          )}
        </For>
      </g>
      <OxygenOverlays
        layout={scene().layout}
        visual={scene().visual}
        definitionIds={definitions().ids}
      />
      <PerfusionOverlays
        layout={scene().layout}
        visual={scene().visual}
        definitionIds={definitions().ids}
      />
      <g class="colony-figure__cells" aria-hidden="true">
        <For each={model().cells}>
          {(cell) => (
            <Cell
              cell={cell}
              definitionIds={definitions().ids}
              growthState={scene().visual.growthState}
            />
          )}
        </For>
      </g>
      <HallmarkOverlays
        layout={scene().layout}
        visual={scene().visual}
        definitionIds={definitions().ids}
      />
      <InvasionOverlays
        layout={scene().layout}
        visual={scene().visual}
        definitionIds={definitions().ids}
      />
      <g class="colony-figure__outline" aria-hidden="true" pointer-events="none">
        <polygon class="colony-figure__outline" points={points()} />
      </g>
    </svg>
  );
}
