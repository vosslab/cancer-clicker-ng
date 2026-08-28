import type { JSX } from "solid-js";

export type GameBoardSlots = Readonly<{
  arena: JSX.Element;
  tabs: JSX.Element;
  evolution: JSX.Element;
  rack: JSX.Element;
  rewards: JSX.Element;
  inspector: JSX.Element;
}>;

/** Layout-only owner for replaceable arena, evolution, upgrade, and reward surfaces. */
export function GameBoard(props: GameBoardSlots): JSX.Element {
  return (
    <section class="game-board" aria-label="Tumor growth board">
      <section class="game-board__arena" aria-label="Arena frame">
        {props.arena}
      </section>
      <section class="game-board__evolution" aria-label="Tumor progression">
        {props.tabs}
        <div class="game-board__evolution-content">{props.evolution}</div>
      </section>
      <aside class="game-board__rack" aria-label="Division apparatus store">
        {props.rack}
      </aside>
      <section class="game-board__rewards" aria-label="Rewards and status">
        {props.rewards}
      </section>
      {props.inspector}
    </section>
  );
}
