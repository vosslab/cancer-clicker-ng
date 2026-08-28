import type { JSX } from "solid-js";

export const PRESTIGE_ROUTE_PROP_KINDS = [
  "metastasis",
  "host-transfer",
  "cryobank",
  "network",
  "transit",
  "organ",
] as const;

export type PrestigeRoutePropKind = (typeof PRESTIGE_ROUTE_PROP_KINDS)[number];

export type PrestigeRoutePropProps = Readonly<{
  kind: PrestigeRoutePropKind;
  class?: string;
}>;

/**
 * A small, text-free lineage prop. Its recognizable silhouette carries the layer before a player
 * reads a label: branching cell, transferred host, frozen culture vial, network, or blood route.
 */
export function PrestigeRouteProp(props: PrestigeRoutePropProps): JSX.Element {
  return (
    <svg
      class={`prestige-route-prop prestige-route-prop-${props.kind}${props.class ? ` ${props.class}` : ""}`}
      viewBox="0 0 96 96"
      aria-hidden="true"
    >
      {props.kind === "metastasis" && <MetastasisProp />}
      {props.kind === "host-transfer" && <HostTransferProp />}
      {props.kind === "cryobank" && <CryobankProp />}
      {props.kind === "network" && <NetworkProp />}
      {props.kind === "transit" && <TransitProp />}
      {props.kind === "organ" && <OrganProp />}
    </svg>
  );
}

function MetastasisProp(): JSX.Element {
  return (
    <g class="route-prop-metastasis">
      <path class="route-prop-trail" d="M11 53 C25 48 28 30 45 36 S61 65 84 43" />
      <path class="route-prop-trail route-prop-trail-faint" d="M22 76 C42 64 51 78 76 71" />
      <circle class="route-prop-core" cx="45" cy="41" r="16" />
      <circle class="route-prop-nucleus" cx="45" cy="41" r="6" />
      <circle class="route-prop-bud" cx="77" cy="45" r="9" />
      <circle class="route-prop-bud" cx="23" cy="74" r="6" />
      <path class="route-prop-arrow" d="m79 37 8 6-9 4" />
    </g>
  );
}

function HostTransferProp(): JSX.Element {
  return (
    <g class="route-prop-host">
      <path
        class="route-prop-host-shell"
        d="M12 45 C12 25 31 14 49 21 C67 15 84 27 84 45 V74 H12Z"
      />
      <circle class="route-prop-host-cell" cx="34" cy="48" r="11" />
      <circle class="route-prop-host-cell" cx="63" cy="48" r="11" />
      <path class="route-prop-transfer-arrow" d="M39 67 H64 M57 59 l8 8-8 8" />
      <path class="route-prop-host-line" d="M24 28 C33 37 61 37 73 28" />
    </g>
  );
}

function CryobankProp(): JSX.Element {
  return (
    <g class="route-prop-cryobank">
      <path class="route-prop-vial-cap" d="M33 14 H63 V26 H33Z" />
      <path
        class="route-prop-vial"
        d="M38 25 V44 L22 73 Q19 82 29 84 H67 Q77 82 74 73 L58 44 V25Z"
      />
      <path class="route-prop-frost" d="m48 37 0 35 M34 47 l28 16 M62 47 34 63" />
      <circle class="route-prop-cryocell" cx="48" cy="61" r="9" />
      <path class="route-prop-snow" d="M77 20 V34 M70 27 H84 M72 22 L82 32 M82 22 72 32" />
    </g>
  );
}

function NetworkProp(): JSX.Element {
  return (
    <g class="route-prop-network">
      <path class="route-prop-network-link" d="M20 66 45 48 70 25 M45 48 76 68 M20 66 33 26" />
      <circle class="route-prop-network-node" cx="20" cy="66" r="10" />
      <circle class="route-prop-network-node" cx="33" cy="26" r="8" />
      <circle class="route-prop-network-core" cx="45" cy="48" r="13" />
      <circle class="route-prop-network-node" cx="70" cy="25" r="9" />
      <circle class="route-prop-network-node" cx="76" cy="68" r="10" />
      <path class="route-prop-network-pulse" d="M45 28 V18 M64 48 H77 M45 68 V78" />
    </g>
  );
}

function TransitProp(): JSX.Element {
  return (
    <g class="route-prop-transit">
      <path class="route-prop-vessel" d="M8 50 C28 17 45 79 88 43" />
      <path class="route-prop-vessel-inner" d="M9 56 C28 23 46 85 89 49" />
      <circle class="route-prop-circulating-cell" cx="31" cy="41" r="9" />
      <circle class="route-prop-circulating-cell" cx="57" cy="58" r="7" />
      <path class="route-prop-flow-arrow" d="m73 37 12 6-11 7" />
    </g>
  );
}

function OrganProp(): JSX.Element {
  return (
    <g class="route-prop-organ">
      <path
        class="route-prop-organ-body"
        d="M15 52 C14 30 31 17 48 24 C62 16 82 28 80 49 C78 69 61 82 39 77 C24 74 16 64 15 52Z"
      />
      <path
        class="route-prop-organ-vein"
        d="M21 55 C35 47 44 56 53 42 C61 30 69 37 74 31 M36 77 C37 63 44 58 53 42"
      />
      <circle class="route-prop-organ-site" cx="53" cy="42" r="6" />
    </g>
  );
}
