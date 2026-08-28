/**
 * One accessible, noninteractive SVG projection of an accepted M17 colony.
 *
 * This module deliberately consumes the frozen scene boundary: it makes no
 * placement, depth, morphology, or random decisions of its own.
 */
import { For } from "solid-js";
import type { JSX } from "solid-js";

import { createCellBlobPaths } from "./blob.js";
import { Cell } from "./cell.js";
import { createColonySvgDefinitions } from "./defs.js";
import type { SvgDefinition, SvgDefinitionNode } from "./defs.js";
import { describeColonyScene } from "./describe.js";
import { createCellRenderModel, createColonySceneRequest, sceneSvgId } from "./render_types.js";
import type {
  CellRenderModel,
  ColonySceneDescription,
  ColonySceneRequest,
} from "./render_types.js";

const VIEW_BOX = "0 0 1000 700";
const REPRESENTATIVE_NODE_BUDGET = 1050;
const STATIC_SCENE_NODES = 26;

export type ColonyProps = Readonly<{
  scene: ColonySceneRequest;
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
  if (scene.detail === "representative" && nodeEstimate > REPRESENTATIVE_NODE_BUDGET) {
    throw new Error("Representative colony SVG exceeds the M18 DOM budget.");
  }
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

/** Renders one meaningful inline image; all child drawing groups stay decorative. */
export function Colony(props: ColonyProps): JSX.Element {
  const scene = createColonySceneRequest(props.scene);
  const model = describeColonySvg(scene);
  const definitions = createColonySvgDefinitions(scene);
  const label = `${model.titleId} ${model.descriptionId}`;
  const points = silhouettePoints(scene);
  return (
    <svg
      class="colony-figure"
      role="img"
      viewBox={VIEW_BOX}
      preserveAspectRatio="xMidYMid meet"
      aria-labelledby={label}
    >
      <title id={model.titleId}>{model.description.title}</title>
      <desc id={model.descriptionId}>{model.description.description}</desc>
      <defs>
        <For each={definitions.definitions}>{renderDefinition}</For>
      </defs>
      <g class="colony-figure__backdrop" aria-hidden="true">
        <rect class="colony-figure__plate" x="0" y="0" width="1000" height="700" rx="32" />
      </g>
      <g class="colony-figure__regions" aria-hidden="true">
        <polygon class="colony-figure__silhouette" points={points} />
        <For each={scene.layout.regions}>
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
        <For each={scene.layout.voids}>
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
      <g class="colony-figure__cells" aria-hidden="true">
        <For each={model.cells}>
          {(cell) => <Cell cell={cell} definitionIds={definitions.ids} />}
        </For>
      </g>
      <g class="colony-figure__foreground" aria-hidden="true">
        <polygon class="colony-figure__outline" points={points} />
      </g>
    </svg>
  );
}
