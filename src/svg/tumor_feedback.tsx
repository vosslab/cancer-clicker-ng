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
