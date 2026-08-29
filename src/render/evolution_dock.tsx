import type { JSX } from "solid-js";

import type { GameState } from "../types/state.js";
import type { GameController } from "./game_controller.js";
import { HallmarkTree } from "./hallmark_tree.js";
import type { HallmarkAcquisition } from "./hallmark_tree.js";
import { StagePanel } from "./stage_panel.js";

export type EvolutionDockProps = Readonly<{
  game: GameState;
  controller: GameController;
  disabled?: boolean;
  onAdvance: () => void;
  onHallmarkAcquired: (hallmark: HallmarkAcquisition) => void;
  activeView: "stage" | "hallmarks";
}>;

/** Shared central progression surface; child panels retain their established controller boundaries. */
export function EvolutionDock(props: EvolutionDockProps): JSX.Element {
  return (
    <section class="evolution-dock" aria-label="Evolution controls">
      {props.activeView === "stage" ? (
        <StagePanel game={props.game} disabled={props.disabled} onAdvance={props.onAdvance} />
      ) : (
        <HallmarkTree
          game={props.game}
          controller={props.controller}
          onHallmarkAcquired={props.onHallmarkAcquired}
        />
      )}
    </section>
  );
}
