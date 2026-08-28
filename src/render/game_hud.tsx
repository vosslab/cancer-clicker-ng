import { createMemo } from "solid-js";
import type { JSX } from "solid-js";

import { formatBigNum, formatQuantity } from "../bignum/format.js";
import { cellProductionRate } from "../economy/production.js";
import { stageDefinition } from "../stages/catalog.js";
import type { GameState } from "../types/state.js";
import { ActionIcon } from "./action_icon.js";
import { ActionTooltip, HelpTooltip } from "./action_tooltip.js";

type GameHudProps = Readonly<{
  game: GameState;
  disabled: boolean;
  saveError: string | undefined;
  onToggleNumberFormat: () => void;
  onOpenInspector: (invoker: HTMLElement) => void;
}>;

function saveLabel(saveError: string | undefined): string {
  return saveError === undefined ? "Progress saved locally" : "Unsaved changes";
}

/** Compact persistent scoreboard; explanation enters through tooltip and drawer routes. */
export function GameHud(props: GameHudProps): JSX.Element {
  const stage = createMemo(() => stageDefinition(props.game.currentStage));
  const rate = createMemo(() => cellProductionRate(props.game));
  const status = createMemo(() => saveLabel(props.saveError));
  const saveState = createMemo(() => (props.saveError === undefined ? "saved" : "unsaved"));
  const nextFormat = createMemo(() => (props.game.numberFormat === "short" ? "full" : "short"));

  return (
    <header class="game-hud" aria-label="Game scoreboard">
      <h1 id="game-title" class="sr-only">
        Cancer Clicker NG
      </h1>
      <div class="game-hud__mark" aria-label="Cancer Clicker Next Generation">
        <span aria-hidden="true">NG</span>
      </div>
      <output class="game-hud__metric" aria-label="Cell count">
        <strong>
          {formatQuantity(props.game.cells, props.game.numberFormat, 2, "cell", "cells")}
        </strong>
      </output>
      <output class="game-hud__metric game-hud__metric--rate" aria-label="Cell production rate">
        <strong>{formatBigNum(rate(), props.game.numberFormat, 2)}</strong>
        <span>cells/s</span>
      </output>
      <span class="game-hud__stage" title={`Active stage: ${stage().title}`}>
        <ActionIcon name="stage_advance" />
        <span>{stage().title}</span>
      </span>
      <p
        id="save-status"
        class="game-hud__save"
        classList={{ "is-unsaved": saveState() === "unsaved" }}
        data-save-state={saveState()}
        title={status()}
      >
        <span aria-hidden="true" class="game-hud__save-glyph">
          <span class="game-hud__save-symbol">{saveState() === "saved" ? "\u2713" : "!"}</span>
        </span>
        <span class="sr-only">{status()}</span>
      </p>
      <HelpTooltip tooltip={`Use ${nextFormat()} number names`}>
        {(tooltipBindings) => (
          <button
            {...tooltipBindings}
            id="format-button"
            class="game-hud__utility"
            type="button"
            disabled={props.disabled}
            aria-label={`Use ${nextFormat()} number names`}
            onClick={props.onToggleNumberFormat}
          >
            <span aria-hidden="true">#</span>
          </button>
        )}
      </HelpTooltip>
      <ActionTooltip
        class="game-hud__utility-tooltip"
        label="Open specimen details"
        tooltip="Open specimen details"
        placement="below"
        onClick={(event) => props.onOpenInspector(event.currentTarget)}
      >
        <span aria-hidden="true">i</span>
      </ActionTooltip>
    </header>
  );
}
