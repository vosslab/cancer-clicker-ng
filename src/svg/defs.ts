/**
 * Scene-local SVG definitions for the colony renderer colony illustration.
 *
 * The renderer projects these immutable data models once per named inline SVG.
 * Cell nodes consume their paint and mask references but never create definitions.
 */
import {
  createColonySceneRequest,
  sceneSvgId,
  type ColonySceneRequest,
  type SceneSvgId,
} from "./render_types.js";

export type SvgDefinitionAttributeValue = number | string;

export type SvgDefinitionNode = Readonly<{
  element: "circle" | "path" | "rect" | "stop";
  attributes: Readonly<Record<string, SvgDefinitionAttributeValue>>;
}>;

export type SvgDefinition = Readonly<{
  element: "linearGradient" | "radialGradient" | "mask" | "pattern";
  id: SceneSvgId;
  attributes: Readonly<Record<string, SvgDefinitionAttributeValue>>;
  children: readonly SvgDefinitionNode[];
}>;

export type ColonySvgDefinitionIds = Readonly<{
  tissueGradient: SceneSvgId;
  cytoplasmGradient: SceneSvgId;
  nucleusGradient: SceneSvgId;
  hypoxiaGradient: SceneSvgId;
  vesselGradient: SceneSvgId;
  membranePattern: SceneSvgId;
  plateMask: SceneSvgId;
}>;

export type ColonySvgDefinitions = Readonly<{
  ids: ColonySvgDefinitionIds;
  definitions: readonly SvgDefinition[];
}>;

function frozenAttributes(
  attributes: Record<string, SvgDefinitionAttributeValue>,
): Readonly<Record<string, SvgDefinitionAttributeValue>> {
  return Object.freeze(attributes);
}

function definitionNode(
  element: SvgDefinitionNode["element"],
  attributes: Record<string, SvgDefinitionAttributeValue>,
): SvgDefinitionNode {
  return Object.freeze({ element, attributes: frozenAttributes(attributes) });
}

function definition(
  element: SvgDefinition["element"],
  id: SceneSvgId,
  attributes: Record<string, SvgDefinitionAttributeValue>,
  children: readonly SvgDefinitionNode[],
): SvgDefinition {
  return Object.freeze({
    element,
    id,
    attributes: frozenAttributes(attributes),
    children: Object.freeze([...children]),
  });
}

/** Formats a trusted scene-local SVG paint, mask, or pattern reference. */
export function localSvgReference(id: SceneSvgId): string {
  const reference = `url(#${id})`;
  return reference;
}

/** Counts definition elements and their direct child nodes for descriptive diagnostics. */
export function sharedDefinitionNodeCount(definitions: ColonySvgDefinitions): number {
  const childCount = definitions.definitions.reduce(
    (count, item) => count + item.children.length,
    0,
  );
  const total = definitions.definitions.length + childCount;
  return total;
}

/**
 * Creates the small, scene-local definition inventory for one colony SVG.
 * There is intentionally no SVG filter: depth and volume are conveyed by paths,
 * shared gradients, and CSS rather than an unreviewed raster-like treatment.
 */
export function createColonySvgDefinitions(scene: ColonySceneRequest): ColonySvgDefinitions {
  const trustedScene = createColonySceneRequest(scene);
  const ids = Object.freeze({
    tissueGradient: sceneSvgId(trustedScene, "tissue-gradient"),
    cytoplasmGradient: sceneSvgId(trustedScene, "cytoplasm-gradient"),
    nucleusGradient: sceneSvgId(trustedScene, "nucleus-gradient"),
    hypoxiaGradient: sceneSvgId(trustedScene, "hypoxia-gradient"),
    vesselGradient: sceneSvgId(trustedScene, "vessel-gradient"),
    membranePattern: sceneSvgId(trustedScene, "membrane-pattern"),
    plateMask: sceneSvgId(trustedScene, "plate-mask"),
  });
  const definitions = Object.freeze([
    definition("radialGradient", ids.tissueGradient, { cx: "42%", cy: "35%", r: "76%" }, [
      definitionNode("stop", { offset: "0%", stopColor: "#6f9d92", stopOpacity: 0.94 }),
      definitionNode("stop", { offset: "66%", stopColor: "#25555a", stopOpacity: 0.98 }),
      definitionNode("stop", { offset: "100%", stopColor: "#102f37", stopOpacity: 1 }),
    ]),
    definition(
      "linearGradient",
      ids.cytoplasmGradient,
      { x1: "16%", y1: "8%", x2: "84%", y2: "92%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#9abec0", stopOpacity: 0.96 }),
        definitionNode("stop", { offset: "56%", stopColor: "#527d83", stopOpacity: 0.94 }),
        definitionNode("stop", { offset: "100%", stopColor: "#284b56", stopOpacity: 0.98 }),
      ],
    ),
    definition(
      "linearGradient",
      ids.nucleusGradient,
      { x1: "20%", y1: "12%", x2: "80%", y2: "88%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#9664a2", stopOpacity: 0.98 }),
        definitionNode("stop", { offset: "100%", stopColor: "#452859", stopOpacity: 1 }),
      ],
    ),
    definition("radialGradient", ids.hypoxiaGradient, { cx: "50%", cy: "50%", r: "60%" }, [
      definitionNode("stop", { offset: "0%", stopColor: "#210f1e", stopOpacity: 0.88 }),
      definitionNode("stop", { offset: "62%", stopColor: "#7c3450", stopOpacity: 0.54 }),
      definitionNode("stop", { offset: "100%", stopColor: "#bb7560", stopOpacity: 0.08 }),
    ]),
    definition(
      "linearGradient",
      ids.vesselGradient,
      { x1: "0%", y1: "0%", x2: "100%", y2: "100%" },
      [
        definitionNode("stop", { offset: "0%", stopColor: "#571e2b", stopOpacity: 0.58 }),
        definitionNode("stop", { offset: "50%", stopColor: "#d97364", stopOpacity: 0.96 }),
        definitionNode("stop", { offset: "100%", stopColor: "#5c2331", stopOpacity: 0.66 }),
      ],
    ),
    definition(
      "pattern",
      ids.membranePattern,
      { width: 8, height: 8, patternUnits: "userSpaceOnUse" },
      [definitionNode("circle", { cx: 2, cy: 2, r: 0.7, fill: "#d7e7df", opacity: 0.18 })],
    ),
    definition(
      "mask",
      ids.plateMask,
      { x: 0, y: 0, width: 1000, height: 700, maskUnits: "userSpaceOnUse" },
      [definitionNode("rect", { x: 0, y: 0, width: 1000, height: 700, fill: "#ffffff" })],
    ),
  ]);
  return Object.freeze({ ids, definitions });
}
