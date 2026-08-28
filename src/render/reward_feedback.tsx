/** Local presentation-only reward readout for a successful division gesture. */
import { Show } from "solid-js";
import type { Accessor, JSX } from "solid-js";

type RewardFeedbackProps = Readonly<{
  sequence: Accessor<number>;
}>;

/** Shows a bounded, non-authoritative reward flare beside the authoritative count. */
export function RewardFeedback(props: RewardFeedbackProps): JSX.Element {
  return (
    <span class="reward-feedback" data-reward-sequence={props.sequence()} aria-hidden="true">
      <Show when={props.sequence() > 0 ? props.sequence() : undefined} keyed>
        {(sequence) => (
          <span class="reward-feedback__burst" data-reward-burst={sequence}>
            <span class="reward-feedback__spark">+</span>
            <span class="reward-feedback__cell">cell</span>
          </span>
        )}
      </Show>
    </span>
  );
}
