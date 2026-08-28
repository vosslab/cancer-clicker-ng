/**
 * Transient, presentation-only emphasis for a newly rendered tumor stage.
 *
 * The keyed stage group is recreated when the accepted scene changes stage, so
 * CSS owns the one-shot arrival choreography without a timer or game-state
 * field. Its static geometry remains visible for reduced-motion players.
 */
import { Show } from "solid-js";
import type { JSX } from "solid-js";

import type { StageId } from "../types/ids.js";

export type StageTransitionEmphasisProps = Readonly<{ stageId: StageId }>;

function transitionFamily(stageId: StageId): "early" | "perfused" | "invasive" | "systemic" {
  if (
    stageId === "invasive_carcinoma" ||
    stageId === "intravasation" ||
    stageId === "micrometastatic_seeding" ||
    stageId === "metastatic_burden"
  ) {
    return "invasive";
  }
  if (stageId === "host_collapse" || stageId === "global_lab_contamination") return "systemic";
  if (stageId === "angiogenic_primary") return "perfused";
  return "early";
}

function arrivalClass(stageId: StageId): string {
  const family = transitionFamily(stageId);
  return `stage-transition-emphasis__arrival stage-transition-emphasis__arrival--${family}`;
}

/** Renders a keyed whole-board arrival cue around the accepted tumor scene. */
export function StageTransitionEmphasis(props: StageTransitionEmphasisProps): JSX.Element {
  return (
    <svg
      class="stage-transition-emphasis"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <Show when={props.stageId} keyed>
        {(stageId) => (
          <g class={arrivalClass(stageId)} data-stage-transition={stageId}>
            <ellipse
              class="stage-transition-emphasis__ring stage-transition-emphasis__ring--outer"
              cx="500"
              cy="350"
              rx="360"
              ry="242"
            />
            <ellipse
              class="stage-transition-emphasis__ring stage-transition-emphasis__ring--inner"
              cx="500"
              cy="350"
              rx="228"
              ry="154"
            />
            <path
              class="stage-transition-emphasis__front"
              d="M 122 384 C 266 286 364 478 500 362 S 734 270 882 390"
            />
            <g class="stage-transition-emphasis__beacons">
              <circle cx="462" cy="350" r="4.5" />
              <circle cx="538" cy="350" r="4.5" />
              <circle cx="500" cy="310" r="3.5" />
            </g>
          </g>
        )}
      </Show>
    </svg>
  );
}
