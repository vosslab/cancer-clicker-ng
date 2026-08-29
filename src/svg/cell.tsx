/**
 * Decorative projection for one accepted morphology and colony-layout cell model.
 *
 * The parent colony group owns accessibility and scene ordering. This component
 * only maps trusted local paths and inline-scene shared definitions to SVG nodes.
 */
import type { JSX } from "solid-js";

import { localSvgReference } from "./defs.js";
import type { ColonySvgDefinitionIds } from "./defs.js";
import type { CellRenderModel, MitosisRenderModel } from "./render_types.js";
import type { ColonyVisualState } from "./colony_visual_state.js";

export type CellProps = Readonly<{
  cell: CellRenderModel;
  definitionIds: ColonySvgDefinitionIds;
  growthState: ColonyVisualState["growthState"];
}>;

export type CellSvgPath = Readonly<{
  className: string;
  d: string;
  fill: string;
  stroke?: string;
  transform?: string;
}>;

export type CellSvgStructure = Readonly<{
  className: string;
  transform: string;
  membrane: CellSvgPath;
  nucleus: CellSvgPath;
  mitosis: CellSvgPath | undefined;
}>;

function mitosisTransform(mitosis: MitosisRenderModel): string | undefined {
  const transform =
    mitosis.placement === "central"
      ? undefined
      : mitosis.placement === "offset"
        ? "translate(2 -1)"
        : "translate(3 -2)";
  return transform;
}

function mitosisPath(mitosis: MitosisRenderModel): string {
  if (mitosis.motif === "paired_nuclei") return "M -4 0 a 2.4 2.4 0 1 0 0.01 0";
  if (mitosis.motif === "bipolar_spindle") return "M -6 0 H 6 M -3 -3 L 0 0 L -3 3";
  return "M -6 -3 L 6 3 M -6 3 L 6 -3 M 0 -5 V 5";
}

function groupClass(cell: CellRenderModel, growthState: ColonyVisualState["growthState"]): string {
  const mitosisClass = cell.mitosis === undefined ? "" : " colony-cell--mitotic";
  return `colony-cell colony-cell--depth-${cell.depth} colony-cell--region-${cell.regionKey} colony-cell--${growthState}${mitosisClass}`;
}

/**
 * Produces the narrow semantic SVG description used by Cell and its Node oracle.
 * Definition IDs are generated once by the scene owner and remain inline-scene local.
 */
export function describeCellSvg(props: CellProps): CellSvgStructure {
  const membrane: CellSvgPath = Object.freeze({
    className: "colony-cell__membrane",
    d: props.cell.membranePath,
    fill: localSvgReference(props.definitionIds.cytoplasmPattern),
    stroke: "#f6c2b8",
  });
  const nucleus: CellSvgPath = Object.freeze({
    className: "colony-cell__nucleus",
    d: props.cell.nucleusPath,
    fill: localSvgReference(props.definitionIds.nucleusGradient),
  });
  const mitosis =
    props.cell.mitosis === undefined
      ? undefined
      : Object.freeze({
          className: `colony-cell__mitosis colony-cell__mitosis--${props.cell.mitosis.motif}`,
          d: mitosisPath(props.cell.mitosis),
          fill: "none",
          transform: mitosisTransform(props.cell.mitosis),
        });
  return Object.freeze({
    className: groupClass(props.cell, props.growthState),
    transform: props.cell.transform,
    membrane,
    nucleus,
    mitosis,
  });
}

/** Renders one noninteractive cell from immutable paths, depth, region, and mitosis state. */
export function Cell(props: CellProps): JSX.Element {
  const structure = describeCellSvg(props);
  return (
    <g
      class={structure.className}
      data-colony-cell={props.cell.key}
      transform={structure.transform}
    >
      <g class="colony-cell__visual">
        <path
          class={structure.membrane.className}
          d={structure.membrane.d}
          fill={structure.membrane.fill}
          stroke={structure.membrane.stroke}
          pointer-events="all"
        />
        <path
          class={structure.nucleus.className}
          d={structure.nucleus.d}
          fill={structure.nucleus.fill}
          pointer-events="all"
        />
        {structure.mitosis === undefined ? undefined : (
          <path
            class={structure.mitosis.className}
            d={structure.mitosis.d}
            fill={structure.mitosis.fill}
            transform={structure.mitosis.transform}
          />
        )}
      </g>
    </g>
  );
}
