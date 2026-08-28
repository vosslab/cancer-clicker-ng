import type { JSX } from "solid-js";

export const CULTURE_NETWORK_PROP_KINDS = [
  "dish",
  "cryobank",
  "assay",
  "passage",
  "site",
  "route",
  "containment",
  "mandate",
] as const;

export type CultureNetworkPropKind = (typeof CULTURE_NETWORK_PROP_KINDS)[number];
export type CultureNetworkPropState = "idle" | "ready" | "active" | "locked" | "selected";

export type CultureNetworkPropProps = Readonly<{
  kind: CultureNetworkPropKind;
  state?: CultureNetworkPropState;
  class?: string;
}>;

/**
 * Small, editable scene props for the culture and dissemination boards.
 * Native buttons own the accessible action; these SVGs deliberately stay decorative.
 */
export function CultureNetworkProp(props: CultureNetworkPropProps): JSX.Element {
  const state = props.state ?? "idle";
  return (
    <svg
      class={`culture-network-prop culture-network-prop--${props.kind} culture-network-prop--${state}${props.class ? ` ${props.class}` : ""}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g class="culture-network-prop__shadow">
        <ellipse cx="32" cy="53" rx="21" ry="5" />
      </g>
      <g class="culture-network-prop__body">{propGeometry(props.kind)}</g>
      <g class="culture-network-prop__state">{stateGeometry(state)}</g>
    </svg>
  );
}

function propGeometry(kind: CultureNetworkPropKind): JSX.Element {
  switch (kind) {
    case "dish":
      return (
        <>
          <ellipse cx="32" cy="31" rx="24" ry="15" />
          <ellipse cx="32" cy="27" rx="20" ry="10" />
          <path d="M12 31v8c0 8 40 8 40 0v-8" />
          <circle cx="25" cy="27" r="3" />
          <circle cx="36" cy="24" r="2.5" />
          <circle cx="41" cy="31" r="3" />
        </>
      );
    case "cryobank":
      return (
        <>
          <path d="M16 17h32v30H16z" />
          <path d="M20 17v-5h24v5m-20 6h16m-16 8h16m-16 8h16" />
          <path d="M27 47v5m10-5v5" />
          <circle cx="46" cy="21" r="5" />
        </>
      );
    case "assay":
      return (
        <>
          <path d="M18 13h28v36H18z" />
          <path d="M23 13v-4h18v4m-15 10h12m-12 8h12m-12 8h12" />
          <circle cx="32" cy="42" r="5" />
          <path d="M32 37v10m-5-5h10" />
        </>
      );
    case "passage":
      return (
        <>
          <path d="M32 10v16m0 0-13 9m13-9 13 9m-13-3v12m-13-9v11m26-11v11" />
          <circle cx="32" cy="10" r="5" />
          <circle cx="19" cy="35" r="5" />
          <circle cx="45" cy="35" r="5" />
          <circle cx="19" cy="50" r="5" />
          <circle cx="32" cy="44" r="5" />
          <circle cx="45" cy="50" r="5" />
        </>
      );
    case "site":
      return (
        <>
          <path d="M32 9c-10 0-17 7-17 16 0 13 17 30 17 30s17-17 17-30c0-9-7-16-17-16z" />
          <circle cx="32" cy="25" r="7" />
          <path d="m32 21 3 4-3 4-3-4z" />
        </>
      );
    case "route":
      return (
        <>
          <circle cx="15" cy="44" r="6" />
          <circle cx="49" cy="17" r="6" />
          <path d="M20 40C31 38 31 22 43 20m-8-4 8 4-4 8" />
          <path d="M12 32h8M44 29h8" />
        </>
      );
    case "containment":
      return (
        <>
          <path d="M32 9 50 16v14c0 12-7 20-18 25-11-5-18-13-18-25V16z" />
          <circle cx="32" cy="31" r="10" />
          <path d="M27 31h10m-5-5v10" />
        </>
      );
    case "mandate":
      return (
        <>
          <path d="M13 16h38v32H13z" />
          <path d="M19 23h19m-19 8h14m-14 8h20" />
          <path d="m42 37 5 5 9-12" />
        </>
      );
  }
}

function stateGeometry(state: CultureNetworkPropState): JSX.Element {
  switch (state) {
    case "ready":
      return <path d="m46 13 4 4 7-8" />;
    case "active":
      return <circle cx="51" cy="13" r="5" />;
    case "locked":
      return (
        <>
          <path d="M47 15v-3a4 4 0 0 1 8 0v3" />
          <path d="M45 15h12v9H45z" />
        </>
      );
    case "selected":
      return <path d="m45 16 4 4 8-9" />;
    case "idle":
      return <circle cx="51" cy="13" r="2" />;
  }
}
