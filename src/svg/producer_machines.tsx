/**
 * Editable molecular-machine illustrations for the compact upgrade rack.
 * Each machine uses a shared 64 by 64 viewBox and remains decorative because
 * its adjacent upgrade button supplies the accessible name and state.
 */
import { For } from "solid-js";
import type { JSX } from "solid-js";

import { producerId } from "../brands.js";
import type { ProducerId } from "../types/ids.js";

type ProducerMachineProps = Readonly<{
  id: ProducerId;
  level: number;
}>;

/** The machine-art family is deliberately closed over the canonical producer catalog. */
export const PRODUCER_MACHINE_IDS = [
  producerId("producer"),
  producerId("cdk4"),
  producerId("myc"),
  producerId("ras"),
  producerId("telomerase"),
  producerId("egfr"),
  producerId("pi3k"),
  producerId("replication_fork"),
] as const satisfies readonly ProducerId[];

export const PRODUCER_MACHINE_VISUAL_BANDS = [
  "dormant",
  "primed",
  "networked",
  "amplified",
] as const;

export type ProducerMachineVisualBand = (typeof PRODUCER_MACHINE_VISUAL_BANDS)[number];

export type ProducerMachineVisualModel = Readonly<{
  id: ProducerId;
  level: number;
  band: ProducerMachineVisualBand;
  moduleCount: number;
  outputCueCount: number;
}>;

export type ProducerMachineSvgStructure = Readonly<{
  model: ProducerMachineVisualModel;
  accumulationClass: string;
  modules: readonly Readonly<{ x: number; y: number }>[];
  outputCues: readonly Readonly<{ cx: number; cy: number }>[];
}>;

const ACCUMULATION_POSITIONS = [
  { x: 4, y: 4 },
  { x: 46, y: 5 },
  { x: 46, y: 42 },
] as const;

const OUTPUT_CUE_POSITIONS = [
  { cx: 53, cy: 18 },
  { cx: 54, cy: 29 },
  { cx: 53, cy: 40 },
] as const;

function requireOwnedLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 0)
    throw new Error("Producer machine level must be a nonnegative safe integer.");
}

/** Bounded ownership bands make upgrade growth visible without rendering one sprite per level. */
export function producerMachineVisualBand(level: number): ProducerMachineVisualBand {
  requireOwnedLevel(level);
  if (level === 0) return "dormant";
  if (level < 10) return "primed";
  if (level < 50) return "networked";
  return "amplified";
}

function accumulationCount(band: ProducerMachineVisualBand): number {
  return PRODUCER_MACHINE_VISUAL_BANDS.indexOf(band);
}

/** Pure visual contract shared by SVG structure tests and the rack renderer. */
export function describeProducerMachine(id: ProducerId, level: number): ProducerMachineVisualModel {
  const band = producerMachineVisualBand(level);
  const accumulation = accumulationCount(band);
  const model: ProducerMachineVisualModel = {
    id,
    level,
    band,
    moduleCount: accumulation,
    outputCueCount: accumulation,
  };
  return Object.freeze(model);
}

function structureForModel(model: ProducerMachineVisualModel): ProducerMachineSvgStructure {
  const modules = Object.freeze(ACCUMULATION_POSITIONS.slice(0, model.moduleCount));
  const outputCues = Object.freeze(OUTPUT_CUE_POSITIONS.slice(0, model.outputCueCount));
  const structure: ProducerMachineSvgStructure = {
    model,
    accumulationClass: `producer-machine__accumulation--${model.band}`,
    modules,
    outputCues,
  };
  return Object.freeze(structure);
}

/** Returns the exact semantic accumulation group projected into every machine SVG. */
export function describeProducerMachineSvgStructure(
  id: ProducerId,
  level: number,
): ProducerMachineSvgStructure {
  const model = describeProducerMachine(id, level);
  return structureForModel(model);
}

function MachineAccumulation(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  const structure = structureForModel(props.model);
  return (
    <g
      class={`producer-machine__accumulation ${structure.accumulationClass}`}
      data-machine-band={props.model.band}
      data-machine-level={props.model.level}
      data-module-count={props.model.moduleCount}
      data-output-cue-count={props.model.outputCueCount}
    >
      <For each={structure.modules}>
        {(position) => (
          <rect
            class="producer-machine__module"
            x={position.x}
            y={position.y}
            width="6"
            height="6"
            rx="1.5"
          />
        )}
      </For>
      <For each={structure.outputCues}>
        {(position) => (
          <circle class="producer-machine__output-cue" cx={position.cx} cy={position.cy} r="2" />
        )}
      </For>
    </g>
  );
}

function MachineFrame(
  props: Readonly<{ children: JSX.Element; model: ProducerMachineVisualModel }>,
): JSX.Element {
  return (
    <svg class="producer-machine" viewBox="0 0 64 64" aria-hidden="true" tabIndex={-1}>
      <g class="producer-machine__shadow" transform="translate(4 6)">
        {props.children}
        <MachineAccumulation model={props.model} />
      </g>
    </svg>
  );
}

function CyclinD(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <circle class="producer-machine__shell" cx="28" cy="26" r="17" />
      <circle class="producer-machine__core" cx="28" cy="26" r="8" />
      <path class="producer-machine__pipe" d="M13 27h7M36 26h8l5-7M44 26l6 7" />
      <circle class="producer-machine__spark" cx="51" cy="18" r="3" />
      <circle class="producer-machine__spark" cx="52" cy="34" r="2.5" />
    </MachineFrame>
  );
}

function Cdk4(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="M10 28 19 14h19l11 14-11 16H19z" />
      <path class="producer-machine__facet" d="m19 14 10 10 9-10M10 28h39M19 44l10-11 9 11" />
      <circle class="producer-machine__core" cx="29" cy="28" r="7" />
      <path class="producer-machine__pipe" d="M7 28h5M49 28h6M29 7v7M29 44v8" />
    </MachineFrame>
  );
}

function Myc(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="M13 40 20 14h10l5 11 9-5 7 9-13 18H20z" />
      <path class="producer-machine__facet" d="m20 14 9 12 6-1 3 22M13 40l16-14 9 21" />
      <path class="producer-machine__core" d="m28 16 4 8 8 2-6 6 1 8-7-4-7 4 2-8-6-6 8-2z" />
      <path class="producer-machine__pipe" d="M10 45h8M41 46h9" />
    </MachineFrame>
  );
}

function Ras(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <rect class="producer-machine__shell" x="12" y="17" width="34" height="25" rx="6" />
      <path
        class="producer-machine__facet"
        d="M18 17v-6h10v6M30 17v-6h10v6M18 42v7h10v-7M30 42v7h10v-7"
      />
      <path class="producer-machine__core" d="M20 24h18v11H20z" />
      <path class="producer-machine__pipe" d="M12 25H7M12 35H7M46 25h6M46 35h6" />
      <circle class="producer-machine__spark" cx="29" cy="29.5" r="2.5" />
    </MachineFrame>
  );
}

function Telomerase(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="M18 12c20 9 20 29 0 39M40 12C20 21 20 41 40 51" />
      <path class="producer-machine__facet" d="M20 18h18M15 26h28M14 35h29M18 44h20" />
      <circle class="producer-machine__core" cx="29" cy="31" r="5.5" />
      <path class="producer-machine__pipe" d="M11 12h7M40 12h8M11 51h7M40 51h8" />
    </MachineFrame>
  );
}

function Egfr(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="M17 13h24v25H17z" />
      <path class="producer-machine__facet" d="m17 13 12 8 12-8M29 21v17" />
      <circle class="producer-machine__core" cx="29" cy="31" r="6" />
      <path
        class="producer-machine__pipe"
        d="M29 4v9M29 38v14M8 18l9 5M8 44l9-5M41 23l10-5M41 39l10 5"
      />
    </MachineFrame>
  );
}

function Pi3k(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="m29 10 17 10v19L29 50 12 39V20z" />
      <path class="producer-machine__facet" d="m12 20 17 10 17-10M29 30v20" />
      <circle class="producer-machine__core" cx="29" cy="30" r="7" />
      <path class="producer-machine__pipe" d="m8 17 4 3M8 42l4-3M46 20l5-3M46 39l5 3" />
    </MachineFrame>
  );
}

function ReplicationFork(props: Readonly<{ model: ProducerMachineVisualModel }>): JSX.Element {
  return (
    <MachineFrame model={props.model}>
      <path class="producer-machine__shell" d="M15 13c16 4 16 17 17 19 2 2 4 13 17 19" />
      <path class="producer-machine__shell" d="M49 13c-16 4-16 17-17 19-2 2-4 13-17 19" />
      <path class="producer-machine__facet" d="M18 21h10M36 21h10M23 39h18" />
      <circle class="producer-machine__core" cx="32" cy="32" r="7" />
      <path class="producer-machine__pipe" d="M11 12h7M46 12h7M11 52h7M46 52h7" />
    </MachineFrame>
  );
}

/** Selects one distinctive, editable molecular-machine silhouette per catalog entry. */
export function ProducerMachine(props: ProducerMachineProps): JSX.Element {
  const model = describeProducerMachine(props.id, props.level);
  switch (props.id) {
    case "producer":
      return <CyclinD model={model} />;
    case "cdk4":
      return <Cdk4 model={model} />;
    case "myc":
      return <Myc model={model} />;
    case "ras":
      return <Ras model={model} />;
    case "telomerase":
      return <Telomerase model={model} />;
    case "egfr":
      return <Egfr model={model} />;
    case "pi3k":
      return <Pi3k model={model} />;
    case "replication_fork":
      return <ReplicationFork model={model} />;
  }
  throw new Error("Producer machine requires a catalog producer identifier.");
}
