import type { JSX } from "solid-js";

type GameShellProps = Readonly<{ children: JSX.Element }>;

export function GameShell(props: GameShellProps): JSX.Element {
  return (
    <main class="application-shell" aria-labelledby="game-title">
      {props.children}
    </main>
  );
}
