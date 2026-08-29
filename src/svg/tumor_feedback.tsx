/**
 * Editable SVG feedback marks for the direct tumor action.
 *
 * This layer deliberately adds no biological state: it is local UI feedback
 * over the accepted living-tumor scene rendered by Colony.
 */
import { Show } from "solid-js";
import type { Accessor, JSX } from "solid-js";

export type TumorFeedbackProps = Readonly<{
  feedbackTarget: Accessor<Readonly<{ x: number; y: number }>>;
  sequence: Accessor<number>;
}>;

export type HallmarkAcquisitionFeedbackProps = Readonly<{
  feedbackTarget: Accessor<Readonly<{ x: number; y: number }>>;
  sequence: Accessor<number>;
}>;

/** Renders a click-local biological division burst after durable cell growth. */
export function TumorFeedback(props: TumorFeedbackProps): JSX.Element {
  const feedbackTarget = (): Readonly<{ x: number; y: number }> => props.feedbackTarget();
  return (
    <svg
      class="tumor-feedback"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <Show when={props.sequence() > 0 ? props.sequence() : undefined} keyed>
        {(sequence) => (
          <g
            class="tumor-feedback__division"
            data-feedback-sequence={sequence}
            transform={`translate(${feedbackTarget().x} ${feedbackTarget().y})`}
          >
            <text class="tumor-feedback__reward" text-anchor="middle" y="-31">
              +1 cell
            </text>
            <circle class="tumor-feedback__ripple tumor-feedback__ripple--wide" r="19" />
            <circle class="tumor-feedback__ripple tumor-feedback__ripple--near" r="13" />
            <ellipse class="tumor-feedback__constriction" rx="20" ry="15" />
            <path class="tumor-feedback__cleavage" d="M 0 -13 C -5 -7 -5 7 0 13" />
            <g class="tumor-feedback__daughter tumor-feedback__daughter--left">
              <circle class="tumor-feedback__daughter-membrane" r="9" />
              <circle class="tumor-feedback__daughter-nucleus" r="3.4" />
            </g>
            <g class="tumor-feedback__daughter tumor-feedback__daughter--right">
              <circle class="tumor-feedback__daughter-membrane" r="9" />
              <circle class="tumor-feedback__daughter-nucleus" r="3.4" />
            </g>
            <circle class="tumor-feedback__mote tumor-feedback__mote--north" r="3.8" />
            <circle class="tumor-feedback__mote tumor-feedback__mote--east" r="3.2" />
            <circle class="tumor-feedback__mote tumor-feedback__mote--south" r="3.5" />
            <circle class="tumor-feedback__mote tumor-feedback__mote--west" r="3" />
          </g>
        )}
      </Show>
    </svg>
  );
}

/** Signals a durable new hallmark from the active cell toward the Evolution rail. */
export function HallmarkAcquisitionFeedback(props: HallmarkAcquisitionFeedbackProps): JSX.Element {
  return (
    <svg
      class="tumor-feedback tumor-feedback--hallmark"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <Show when={props.sequence() > 0 ? props.sequence() : undefined} keyed>
        {(sequence) => (
          <g
            class="hallmark-feedback__signal"
            data-hallmark-feedback-sequence={sequence}
            transform={`translate(${props.feedbackTarget().x} ${props.feedbackTarget().y})`}
          >
            <circle class="hallmark-feedback__ring hallmark-feedback__ring--near" r="18" />
            <circle class="hallmark-feedback__ring hallmark-feedback__ring--far" r="31" />
            <path
              class="hallmark-feedback__trail hallmark-feedback__trail--outer"
              d="M -18 -10 C -66 -42 -132 -66 -236 -88"
            />
            <path
              class="hallmark-feedback__trail hallmark-feedback__trail--inner"
              d="M -16 7 C -82 -16 -150 -40 -222 -49"
            />
            <ellipse class="hallmark-feedback__core" rx="10" ry="15" />
            <path
              class="hallmark-feedback__helix"
              d="M -7 -9 C 8 -4 8 4 -7 9 M 7 -9 C -8 -4 -8 4 7 9"
            />
          </g>
        )}
      </Show>
    </svg>
  );
}
