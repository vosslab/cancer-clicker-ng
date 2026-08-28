/**
 * The visual-first direct division surface. The canonical colony SVG remains
 * the only source of biological morphology, vessels, hypoxia, and invasion.
 */
import { Show, createMemo } from "solid-js";
import type { Accessor, JSX } from "solid-js";

import { Colony } from "../svg/colony.js";
import { StageTransitionEmphasis } from "../svg/stage_transition_emphasis.js";
import { TumorFeedback } from "../svg/tumor_feedback.js";
import type { ColonySceneRequest } from "../svg/render_types.js";
import { HelpTooltip } from "./action_tooltip.js";
import { RewardFeedback } from "./reward_feedback.js";

export type TumorArenaProps = Readonly<{
  disabled: boolean;
  scene: ColonySceneRequest;
  cellsLabel: string;
  magnitudeName: string | undefined;
  productionLabel: string;
  description: string;
  feedbackTarget: Accessor<Readonly<{ x: number; y: number }>>;
  feedbackSequence: Accessor<number>;
  onDivisionFeedback: (target: Readonly<{ x: number; y: number }>) => void;
  /** Acknowledges that the canonical click event was accepted and persisted. */
  onDivide: () => boolean;
}>;

function pathContainsPointer(path: SVGGeometryElement, event: MouseEvent): boolean {
  const matrix = path.getScreenCTM();
  if (matrix === null) return false;
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return path.isPointInFill(point) || path.isPointInStroke(point);
}

function divideActionForEvent(event: MouseEvent): HTMLButtonElement | undefined {
  const action =
    event.currentTarget instanceof HTMLButtonElement
      ? event.currentTarget
      : event.target instanceof Element
        ? event.target.closest("button[data-colony-action='divide']")
        : null;
  return action instanceof HTMLButtonElement ? action : undefined;
}

function pointerFallsOnVisibleColonyCell(event: MouseEvent): boolean {
  const action = divideActionForEvent(event);
  if (action === undefined) return false;
  // Chromium can retarget a compact SVG click to its root. Recheck actual
  // membrane/nucleus geometry so tissue, voids, and board whitespace stay inert.
  return [...action.querySelectorAll("[data-colony-cell]")].some((cell) =>
    [...cell.querySelectorAll(".colony-cell__membrane, .colony-cell__nucleus")].some(
      (candidate) =>
        candidate instanceof SVGGeometryElement && pathContainsPointer(candidate, event),
    ),
  );
}

/** Exposed semantic seam: only a rendered membrane or nucleus receives a pointer division. */
export function eventTargetsVisibleColonyCell(event: MouseEvent): boolean {
  const directTarget = event.target;
  if (directTarget instanceof Element && directTarget.closest("[data-colony-cell]") !== null) {
    return true;
  }
  if (
    event
      .composedPath()
      .some((candidate) => candidate instanceof Element && candidate.matches("[data-colony-cell]"))
  ) {
    return true;
  }
  return pointerFallsOnVisibleColonyCell(event);
}

/** Maps an accepted pointer position into the existing colony SVG coordinate system. */
export function colonyPointerLocation(
  event: MouseEvent,
): Readonly<{ x: number; y: number }> | undefined {
  const action = divideActionForEvent(event);
  if (action === undefined) return undefined;
  const figure = action.querySelector("svg.colony-figure");
  if (!(figure instanceof SVGSVGElement)) return undefined;
  const matrix = figure.getScreenCTM();
  if (matrix === null) return undefined;
  const location = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (
    !Number.isFinite(location.x) ||
    !Number.isFinite(location.y) ||
    location.x < 0 ||
    location.x > 1000 ||
    location.y < 0 ||
    location.y > 700
  ) {
    return undefined;
  }
  return Object.freeze({ x: location.x, y: location.y });
}

/**
 * Keeps one native accessible action while letting a player directly touch the
 * cell geometry they can see. Keyboard and virtual clicks use that same action.
 */
export function TumorArena(props: TumorArenaProps): JSX.Element {
  const focalPoint = createMemo(() => {
    const focalCell =
      props.scene.layout.slots.find((slot) => slot.depth === "surface") ??
      props.scene.layout.slots[0];
    if (focalCell === undefined) return { x: 500, y: 350 };
    return focalCell.centre;
  });
  function divideFromArena(event: MouseEvent): void {
    // Keyboard and assistive activation has detail 0. Pointer/touch intent must
    // originate from a rendered cell rather than the surrounding specimen well.
    if (event.detail !== 0 && !eventTargetsVisibleColonyCell(event)) return;
    // Prefer a real in-bounds pointer location even when a platform reports a
    // zero click-detail. Virtual keyboard/assistive activation has no such
    // location and therefore uses the predictable surface-cell focal point.
    const target = colonyPointerLocation(event);
    const accepted = props.onDivide();
    if (accepted) props.onDivisionFeedback(target ?? focalPoint());
  }

  return (
    <div class="tumor-arena">
      <div class="tumor-arena__hud">
        <Show when={props.magnitudeName}>
          {(name) => (
            <span class="tumor-arena__magnitude" aria-label={`Named magnitude ${name()}`}>
              {name()}
            </span>
          )}
        </Show>
        <output
          class="tumor-arena__metric tumor-arena__metric--cells"
          aria-label="Tumor biomass"
          aria-live="polite"
        >
          {props.cellsLabel}
        </output>
        <output class="tumor-arena__metric tumor-arena__metric--rate" aria-label="Arena output">
          {props.productionLabel}
        </output>
        <RewardFeedback sequence={props.feedbackSequence} />
      </div>
      <HelpTooltip tooltip="Divide a visible cell">
        {(tooltipBindings) => (
          <button
            {...tooltipBindings}
            id="divide-button"
            class="colony-panel__action tumor-arena__action"
            data-colony-action="divide"
            type="button"
            disabled={props.disabled}
            aria-label="Divide cell"
            aria-describedby={`${tooltipBindings["aria-describedby"]} colony-a11y-description`}
            on:click={divideFromArena}
          >
            <span class="tumor-arena__scene">
              <Colony scene={props.scene} decorative />
            </span>
          </button>
        )}
      </HelpTooltip>
      <StageTransitionEmphasis stageId={props.scene.stageId} />
      <TumorFeedback feedbackTarget={props.feedbackTarget} sequence={props.feedbackSequence} />
      <p id="colony-a11y-description" class="tumor-arena__a11y-description">
        {props.description} Click a visible cell to divide. Enter or Space also divides.
      </p>
    </div>
  );
}
