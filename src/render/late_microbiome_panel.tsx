import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { microbiomeOfferQuote } from "../hallmarks/late_hallmark_effects.js";
import type {
  MicrobiomeOfferQuote,
  MicrobiomeOfferReason,
} from "../hallmarks/late_hallmark_effects.js";
import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";

type LateMicrobiomePanelProps = Readonly<{ game: GameState; controller: GameController }>;

function offerReasonText(reason: MicrobiomeOfferReason | null): string | undefined {
  switch (reason) {
    case "microbiome-inactive":
      return "Acquire and activate polymorphic microbiomes before installing a saved composition.";
    case "no-offer":
      return "No saved microbiome offer is pending. Continue simulation time until the next rotation.";
    case "offer-expired":
      return "This saved offer has expired. Continue simulation time for its replacement.";
    default:
      return undefined;
  }
}

function effectSummary(effects: {
  substrateConversionMultiplier: number;
  inflammationDurationMultiplier: number;
  immuneVisibilityDelta: number;
}): string {
  return `${effects.substrateConversionMultiplier}x substrate conversion; ${effects.inflammationDurationMultiplier}x inflammation duration; immune visibility ${effects.immuneVisibilityDelta >= 0 ? "+" : ""}${effects.immuneVisibilityDelta}.`;
}

function displayName(id: string): string {
  const words = id.split("-").join(" ");
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
}

/** Shows one durable three-card offer exactly as saved, with no client-side redraw. */
export function LateMicrobiomePanel(props: LateMicrobiomePanelProps): JSX.Element {
  const quote = (): MicrobiomeOfferQuote =>
    microbiomeOfferQuote(props.game, props.game.activeTimeMs);
  return (
    <fieldset class="hallmark-fieldset late-hallmark-panel">
      <legend>Microbiome composition</legend>
      <Show when={quote().activeComposition}>
        {(active) => (
          <p class="hallmark-readout" role="status">
            Active composition: {active().composition.id}; installed from saved offer{" "}
            {active().offerId}.
          </p>
        )}
      </Show>
      <Show
        when={quote().offer}
        fallback={<p class="hallmark-empty">{offerReasonText(quote().reason)}</p>}
      >
        {(offer) => (
          <>
            <p class="hallmark-readout">
              Saved three-card offer; rotation expires in {quote().remainingOfferMs} ms.
            </p>
            <div class="late-microbiome-cards" aria-label="Saved microbiome offer">
              <For each={offer().compositions}>
                {(composition) => {
                  const cardId = `microbiome-composition-${composition.id}`;
                  return (
                    <article class="late-option-card late-microbiome-card" aria-labelledby={cardId}>
                      <div class="late-microbiome-card__heading">
                        <p class="hallmark-index">Saved composition</p>
                        <h4 id={cardId}>{displayName(composition.id)}</h4>
                      </div>
                      <dl class="late-microbiome-card__niches">
                        <For each={composition.niches}>
                          {(niche) => (
                            <div>
                              <dt>{displayName(niche.nicheId)} niche</dt>
                              <dd>
                                <strong>{niche.label}</strong>
                                <span>{effectSummary(niche.effects)}</span>
                              </dd>
                            </div>
                          )}
                        </For>
                      </dl>
                      <p class="late-microbiome-card__compatibility">
                        <strong>{composition.compatibility.label}:</strong>{" "}
                        {effectSummary(composition.compatibility.effects)}
                      </p>
                      <button
                        type="button"
                        disabled={props.controller.recoveryBlocked() || !quote().available}
                        onClick={() =>
                          props.controller.installMicrobiomeComposition(offer().id, composition.id)
                        }
                      >
                        Install {displayName(composition.id)} composition
                      </button>
                    </article>
                  );
                }}
              </For>
            </div>
          </>
        )}
      </Show>
      <Show when={offerReasonText(quote().reason)}>
        {(message) => <p class="hallmark-disabled-note">{message()}</p>}
      </Show>
      <Show when={props.controller.recoveryBlocked()}>
        <p class="hallmark-disabled-note">
          Recovery protection must be resolved before installation.
        </p>
      </Show>
    </fieldset>
  );
}
