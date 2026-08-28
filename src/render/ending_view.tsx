import { Match, Show, Switch, createEffect, createMemo, createSignal, on } from "solid-js";
import type { JSX } from "solid-js";

import { formatQuantity } from "../bignum/format.js";
import { ENDING_COPY } from "../content/ending_copy.js";
import { endingPresentation } from "../ending/sequence.js";
import { CHICAGO_SKYSCRAPER_CELL_EQUIVALENT, softEndingEligibility } from "../ending/trigger.js";
import type { GameState } from "../types/state.js";
import type { ApplyResult } from "./game_controller.js";
import { NumberDisplay } from "./number_display.js";
import { ActionIcon } from "./action_icon.js";
import { ChicagoScaleGraphic } from "./chicago_scale_graphic.js";

type EndingViewProps = Readonly<{
  game: GameState;
  disabled: boolean;
  acceptedSourceEventSequence: number | undefined;
  onAcceptedFocusHandled: () => void;
  onReach: () => ApplyResult;
}>;

function progressLine(game: GameState): string {
  const eligibility = softEndingEligibility(game);
  if (eligibility.available) return "All report conditions are met.";
  if (eligibility.reason === "already-reached") return "The report is saved with this experiment.";
  if (eligibility.reason === "stage") return "Advance to the global laboratory stage.";
  if (eligibility.reason === "network-tier") return "Complete one dissemination campaign tier.";
  return `Grow from ${formatQuantity(game.cells, game.numberFormat, 2, "cell", "cells")} to ${formatQuantity(CHICAGO_SKYSCRAPER_CELL_EQUIVALENT, game.numberFormat, 2, "cell", "cells")}.`;
}

/**
 * Leaf consumer for the saved scale presentation. It owns ephemeral focus and
 * announcement behavior while the reducer remains the only ending-state writer.
 */
export function EndingView(props: EndingViewProps): JSX.Element {
  const presentation = createMemo(() => endingPresentation(props.game));
  const progress = createMemo(() => progressLine(props.game));
  const [dismissed, setDismissed] = createSignal(false);
  const [announcement, setAnnouncement] = createSignal("");
  let reachedHeading: HTMLHeadingElement | undefined;
  let reopenButton: HTMLButtonElement | undefined;
  let focusedSourceEventSequence: number | undefined;

  createEffect(
    on(
      () => props.acceptedSourceEventSequence,
      (sourceEventSequence) => {
        if (sourceEventSequence === undefined || sourceEventSequence === focusedSourceEventSequence)
          return;
        setDismissed(false);
        if (
          props.game.ending.phase !== "reached" ||
          props.game.ending.sourceEventSequence !== sourceEventSequence
        )
          return;
        focusedSourceEventSequence = sourceEventSequence;
        setAnnouncement("Chicago scale report opened. Continued play is available.");
        queueMicrotask(() => {
          reachedHeading?.focus();
          props.onAcceptedFocusHandled();
        });
      },
    ),
  );

  function dismissReport(): void {
    setDismissed(true);
    queueMicrotask(() => reopenButton?.focus());
  }

  function reopenReport(): void {
    setDismissed(false);
  }

  const reportVisible = createMemo(() => presentation().mode !== "reached" || !dismissed());
  const reportRelevant = createMemo(() => softEndingEligibility(props.game).reason !== "stage");

  return (
    <Show when={reportRelevant()} fallback={<></>}>
      <Show
        when={reportVisible()}
        fallback={
          <section class="ending-view ending-view--minimized" aria-label="Chicago scale report">
            <p>Chicago scale report is saved with this experiment.</p>
            <button
              id="reopen-chicago-report"
              ref={(element) => {
                reopenButton = element;
              }}
              type="button"
              onClick={reopenReport}
            >
              <ActionIcon name="scale_report" /> Show Chicago scale report
            </button>
          </section>
        }
      >
        <section
          class="ending-view"
          classList={{ "ending-view--reached": presentation().mode === "reached" }}
          aria-labelledby="ending-title"
        >
          <div class="ending-view__copy">
            <p class="eyebrow">Scale report</p>
            <Switch>
              <Match when={presentation().mode === "unavailable"}>
                <h2 id="ending-title">Chicago scale report</h2>
                <p>{ENDING_COPY.unavailableLead}</p>
                <p class="ending-view__progress">{progress()}</p>
              </Match>
              <Match when={presentation().mode === "available"}>
                <h2 id="ending-title">{presentation().headline}</h2>
                <p>{ENDING_COPY.availableLead}</p>
                <p class="ending-view__progress">
                  {presentation().cellCount}. {progress()}
                </p>
              </Match>
              <Match when={presentation().mode === "reached"}>
                <h2
                  id="ending-title"
                  ref={(element) => {
                    reachedHeading = element;
                  }}
                  tabindex="-1"
                >
                  {presentation().headline}
                </h2>
                <p>{ENDING_COPY.reachedLead}</p>
                <dl class="ending-view__metrics">
                  <div>
                    <dt>Live cell count</dt>
                    <dd>{presentation().cellCount}</dd>
                  </div>
                  <div>
                    <dt>Modeled cell volume</dt>
                    <dd>
                      <NumberDisplay
                        value={props.game.cells}
                        format={props.game.numberFormat}
                        label="Modeled cell volume"
                        unitPresentation={{
                          singular: "m3 of cell volume",
                          plural: "m3 of cell volume",
                        }}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>Chicago high-rise volumes</dt>
                    <dd>{presentation().chicagoHighRiseVolumes}</dd>
                  </div>
                </dl>
                <p class="ending-view__continuation">{ENDING_COPY.continuation}</p>
                <p class="ending-view__next">Next: {presentation().nextNetworkAction}</p>
                <button
                  id="dismiss-chicago-report"
                  class="text-button"
                  type="button"
                  onClick={dismissReport}
                >
                  <ActionIcon name="scale_report" /> Hide scale report
                </button>
              </Match>
            </Switch>
          </div>
          <Show when={presentation().mode === "reached"}>
            <div class="ending-view__graphic" aria-hidden="true">
              <ChicagoScaleGraphic />
            </div>
          </Show>
          <Show when={presentation().mode === "available"}>
            <button
              id="open-chicago-report"
              class="ending-view__action"
              type="button"
              disabled={props.disabled}
              aria-describedby="ending-title"
              onClick={() => props.onReach()}
            >
              <ActionIcon name="scale_report" /> Open the Chicago scale report
            </button>
          </Show>
          <p class="sr-status" aria-live="polite">
            {announcement()}
          </p>
        </section>
      </Show>
    </Show>
  );
}
