/**
 * Decorative, non-stateful glyph geometry for adjacent HTML labels.
 * The glyphs have no embedded color, title, IDs, events, or focus behavior.
 */
export const SVG_ICON_NAMES = [
  "proliferative_signaling",
  "growth_suppressor_evasion",
  "cell_death_resistance",
  "replicative_immortality",
  "angiogenesis",
  "invasion_metastasis",
  "metabolic_deregulation",
  "immune_destruction_avoidance",
  "tumor_promoting_inflammation",
  "genome_instability_mutation",
  "producer",
  "buy",
  "assay",
  "stage_advance",
  "acquire",
  "lineage_reset",
  "organ_site",
  "boon",
  "host_transfer",
  "culture",
  "cryobank",
  "network_node",
  "network_edge",
  "containment",
  "campaign",
  "transit",
  "scale_report",
  "cdk4",
  "myc",
  "ras",
  "telomerase",
  "egfr",
  "pi3k",
  "replication_fork",
] as const;

export type SvgIconName = (typeof SVG_ICON_NAMES)[number];
export type SvgIconPrimitiveElement = "circle" | "line" | "path" | "polyline" | "rect";

export type SvgIconPrimitive = Readonly<{
  element: SvgIconPrimitiveElement;
  attributes: Readonly<Record<string, number | string>>;
}>;

export type SvgIconModel = Readonly<{
  name: SvgIconName;
  viewBox: "0 0 24 24";
  primitives: readonly SvgIconPrimitive[];
}>;

function primitive(
  element: SvgIconPrimitiveElement,
  attributes: Record<string, number | string>,
): SvgIconPrimitive {
  return Object.freeze({ element, attributes: Object.freeze(attributes) });
}

function icon(name: SvgIconName, primitives: readonly SvgIconPrimitive[]): SvgIconModel {
  return Object.freeze({ name, viewBox: "0 0 24 24", primitives: Object.freeze([...primitives]) });
}

const STROKE = Object.freeze({
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
});

function stroked(attributes: Record<string, number | string>): Record<string, number | string> {
  return { ...STROKE, ...attributes };
}

const ICONS: Readonly<Record<SvgIconName, SvgIconModel>> = Object.freeze({
  proliferative_signaling: icon("proliferative_signaling", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 3 })),
    primitive("path", stroked({ d: "M12 3v4M12 17v4M3 12h4M17 12h4" })),
  ]),
  growth_suppressor_evasion: icon("growth_suppressor_evasion", [
    primitive("path", stroked({ d: "M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" })),
    primitive("path", stroked({ d: "m8 12 2.4 2.4L16 9" })),
  ]),
  cell_death_resistance: icon("cell_death_resistance", [
    primitive(
      "path",
      stroked({ d: "M12 21s-7-4.3-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.7-7 10-7 10z" }),
    ),
    primitive("line", stroked({ x1: 4, y1: 4, x2: 20, y2: 20 })),
  ]),
  replicative_immortality: icon("replicative_immortality", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 8 })),
    primitive("polyline", stroked({ points: "12 7 12 12 16 14" })),
  ]),
  angiogenesis: icon("angiogenesis", [
    primitive("path", stroked({ d: "M4 19c5-1 4-10 9-10 3 0 3 4 7 3" })),
    primitive("path", stroked({ d: "M8 15c2 0 2-4 4-5M14 10c1 0 2-2 2-4" })),
  ]),
  invasion_metastasis: icon("invasion_metastasis", [
    primitive("circle", stroked({ cx: 6, cy: 12, r: 2.5 })),
    primitive("circle", stroked({ cx: 18, cy: 6, r: 2.5 })),
    primitive("path", stroked({ d: "M8.5 11 15.5 7M14 4h4v4" })),
  ]),
  metabolic_deregulation: icon("metabolic_deregulation", [
    primitive("path", stroked({ d: "M8 3v7l-3 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-3-8V3" })),
    primitive("line", stroked({ x1: 8, y1: 3, x2: 16, y2: 3 })),
  ]),
  immune_destruction_avoidance: icon("immune_destruction_avoidance", [
    primitive("path", stroked({ d: "M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" })),
    primitive("path", stroked({ d: "M7 12c2-2 5-2 10 0M7 12c2 2 5 2 10 0" })),
  ]),
  tumor_promoting_inflammation: icon("tumor_promoting_inflammation", [
    primitive(
      "path",
      stroked({ d: "M12 3c2 4-2 5 1 8 2 2 4 3 2 7-1 2-3 3-5 3-4 0-7-3-7-7 0-4 3-6 5-9" }),
    ),
    primitive("path", stroked({ d: "M11 21c-2-3 1-5 1-7 2 2 3 4 1 7" })),
  ]),
  genome_instability_mutation: icon("genome_instability_mutation", [
    primitive("path", stroked({ d: "M8 3c5 4 3 8 8 12M16 3c-5 4-3 8-8 12M7 6h10M7 18h10" })),
  ]),
  producer: icon("producer", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 7 })),
    primitive("path", stroked({ d: "M12 8v8M8 12h8" })),
  ]),
  buy: icon("buy", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 8 })),
    primitive(
      "path",
      stroked({
        d: "M12 7v10M8.5 10.2c.4-1.3 1.5-2.2 3.5-2.2 2.2 0 3.5 1 3.5 2.5 0 3.7-7 1.8-7 5.2 0 1.4 1.3 2.3 3.5 2.3 1.9 0 3.2-.8 3.6-2.1",
      }),
    ),
  ]),
  assay: icon("assay", [
    primitive("circle", stroked({ cx: 8, cy: 12, r: 4 })),
    primitive("circle", stroked({ cx: 16, cy: 8, r: 2.25 })),
    primitive("circle", stroked({ cx: 16, cy: 16, r: 2.25 })),
    primitive("path", stroked({ d: "M12 12h7m-2.5-2.5L19 12l-2.5 2.5" })),
  ]),
  stage_advance: icon("stage_advance", [
    primitive("path", stroked({ d: "M4 12h14M13 6l6 6-6 6" })),
    primitive("circle", stroked({ cx: 5, cy: 12, r: 2 })),
  ]),
  acquire: icon("acquire", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 8 })),
    primitive("path", stroked({ d: "M12 7v10M7 12h10" })),
  ]),
  lineage_reset: icon("lineage_reset", [
    primitive("path", stroked({ d: "M19 8a8 8 0 1 0 1 6" })),
    primitive("polyline", stroked({ points: "19 3 19 8 14 8" })),
  ]),
  organ_site: icon("organ_site", [
    primitive(
      "path",
      stroked({ d: "M12 21s7-5.1 7-11a4 4 0 0 0-7-2.7A4 4 0 0 0 5 10c0 5.9 7 11 7 11z" }),
    ),
    primitive("circle", stroked({ cx: 12, cy: 11, r: 1.8 })),
  ]),
  boon: icon("boon", [
    primitive("path", stroked({ d: "m12 3 1.9 5.5L20 10l-6.1 1.5L12 17l-1.9-5.5L4 10l6.1-1.5z" })),
  ]),
  host_transfer: icon("host_transfer", [
    primitive("circle", stroked({ cx: 7, cy: 12, r: 3 })),
    primitive("circle", stroked({ cx: 17, cy: 12, r: 3 })),
    primitive("path", stroked({ d: "M10 9h6M14 6l3 3-3 3M14 15l3 3-3 3" })),
  ]),
  culture: icon("culture", [
    primitive("circle", stroked({ cx: 12, cy: 12, r: 8 })),
    primitive("circle", stroked({ cx: 9, cy: 10, r: 1.3 })),
    primitive("circle", stroked({ cx: 15, cy: 13, r: 2.2 })),
  ]),
  cryobank: icon("cryobank", [
    primitive("rect", stroked({ x: 6, y: 5, width: 12, height: 15, rx: 2 })),
    primitive("path", stroked({ d: "M12 8v9M9 10h6M9 14h6" })),
  ]),
  network_node: icon("network_node", [
    primitive("circle", stroked({ cx: 6, cy: 12, r: 2.5 })),
    primitive("circle", stroked({ cx: 17, cy: 6, r: 2.5 })),
    primitive("circle", stroked({ cx: 17, cy: 18, r: 2.5 })),
    primitive("path", stroked({ d: "M8.2 10.7 14.8 7.3M8.2 13.3l6.6 3.4" })),
  ]),
  network_edge: icon("network_edge", [
    primitive("circle", stroked({ cx: 5, cy: 12, r: 2.2 })),
    primitive("circle", stroked({ cx: 19, cy: 12, r: 2.2 })),
    primitive("path", stroked({ d: "M7.5 12h9" })),
  ]),
  containment: icon("containment", [
    primitive("path", stroked({ d: "M12 3 20 7v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" })),
    primitive("circle", stroked({ cx: 12, cy: 12, r: 2.4 })),
  ]),
  campaign: icon("campaign", [primitive("path", stroked({ d: "M5 20V5m0 1h10l-1.5 3L15 12H5" }))]),
  transit: icon("transit", [
    primitive("path", stroked({ d: "M4 12h13M13 6l6 6-6 6" })),
    primitive("circle", stroked({ cx: 5, cy: 12, r: 2 })),
  ]),
  scale_report: icon("scale_report", [
    primitive("rect", stroked({ x: 5, y: 4, width: 14, height: 16, rx: 2 })),
    primitive("path", stroked({ d: "M8 16v-3M12 16V9M16 16v-5M8 8h8" })),
  ]),
  cdk4: icon("cdk4", [
    primitive("circle", stroked({ cx: 9, cy: 12, r: 4 })),
    primitive("circle", stroked({ cx: 16, cy: 12, r: 3 })),
  ]),
  myc: icon("myc", [
    primitive("polyline", stroked({ points: "4 16 9 11 13 14 20 6" })),
    primitive("path", stroked({ d: "M16 6h4v4" })),
  ]),
  ras: icon("ras", [primitive("path", stroked({ d: "M5 7h14v10H5zM8 10h8M8 14h5" }))]),
  telomerase: icon("telomerase", [
    primitive("path", stroked({ d: "M8 3c5 4 3 8 8 12M16 3c-5 4-3 8-8 12M8 20h8" })),
  ]),
  egfr: icon("egfr", [
    primitive("rect", stroked({ x: 7, y: 7, width: 10, height: 10, rx: 2 })),
    primitive("path", stroked({ d: "M12 3v4M12 17v4M3 12h4M17 12h4" })),
  ]),
  pi3k: icon("pi3k", [
    primitive("path", stroked({ d: "m12 3 8 5v8l-8 5-8-5V8z" })),
    primitive("circle", stroked({ cx: 12, cy: 12, r: 2 })),
  ]),
  replication_fork: icon("replication_fork", [
    primitive("path", stroked({ d: "M5 5c6 1 6 5 7 7 2 2 3 5 7 7M19 5c-6 1-6 5-7 7" })),
  ]),
});

/** Returns immutable geometry for a decorative adjacent-label glyph. */
export function svgIconModel(name: SvgIconName): SvgIconModel {
  const model = ICONS[name];
  return model;
}
