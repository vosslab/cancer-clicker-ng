import { For } from "solid-js";
import type { JSX } from "solid-js";

import { svgIconModel } from "../svg/icons.js";
import type { SvgIconName, SvgIconPrimitive } from "../svg/icons.js";

type ActionIconProps = Readonly<{
  name: SvgIconName;
  class?: string;
}>;

function IconPrimitive(props: Readonly<{ primitive: SvgIconPrimitive }>): JSX.Element {
  const attributes = props.primitive.attributes;
  switch (props.primitive.element) {
    case "circle":
      return <circle {...attributes} />;
    case "line":
      return <line {...attributes} />;
    case "path":
      return <path {...attributes} />;
    case "polyline":
      return <polyline {...attributes} />;
    case "rect":
      return <rect {...attributes} />;
  }
}

/** Decorative biological glyph used beside an HTML action label. */
export function ActionIcon(props: ActionIconProps): JSX.Element {
  const model = svgIconModel(props.name);
  return (
    <svg
      class={`action-icon${props.class ? ` ${props.class}` : ""}`}
      viewBox={model.viewBox}
      aria-hidden="true"
      tabIndex={-1}
    >
      <For each={model.primitives}>{(primitive) => <IconPrimitive primitive={primitive} />}</For>
    </svg>
  );
}
