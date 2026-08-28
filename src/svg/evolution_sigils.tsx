import type { JSX } from "solid-js";

type HallmarkSigilProps = Readonly<{
  name: string;
  state: "locked" | "available" | "acquired";
}>;

type StageSigilProps = Readonly<{
  index: number;
  terminal: boolean;
}>;

function mutationPath(name: string): JSX.Element {
  switch (name) {
    case "proliferative_signaling":
      return <path d="M32 12v12M12 32h12M40 32h12M32 40v12" />;
    case "growth_suppressor_evasion":
      return <path d="M32 11 51 20v12c0 12-8 18-19 21-11-3-19-9-19-21V20zM23 32l6 6 12-13" />;
    case "cell_death_resistance":
      return (
        <path d="M32 51S14 40 14 27a10 10 0 0 1 18-6 10 10 0 0 1 18 6c0 13-18 24-18 24zM18 18l28 28" />
      );
    case "replicative_immortality":
      return (
        <>
          <circle cx="32" cy="32" r="19" />
          <path d="M32 20v13l9 5" />
        </>
      );
    case "angiogenesis":
      return (
        <path d="M12 47c12-2 8-20 20-20 8 0 8 10 20 6M21 40c5 0 4-8 10-11M39 27c3 0 5-4 5-8" />
      );
    case "invasion_metastasis":
      return (
        <>
          <circle cx="18" cy="36" r="6" />
          <circle cx="47" cy="17" r="6" />
          <path d="m23 33 18-12m-6-5h7v7" />
        </>
      );
    case "metabolic_deregulation":
      return (
        <path d="M25 12v16l-9 18a5 5 0 0 0 5 7h22a5 5 0 0 0 5-7l-9-18V12m-14 0h14m-17 27h20" />
      );
    case "immune_destruction_avoidance":
      return (
        <path d="M32 11 51 20v12c0 12-8 18-19 21-11-3-19-9-19-21V20zM21 32c6-6 16-6 22 0m-22 0c6 6 16 6 22 0" />
      );
    case "tumor_promoting_inflammation":
      return (
        <path d="M34 12c5 10-4 14 3 21 5 5 7 12 2 18-4 5-12 7-19 3-10-6-10-18-4-26 5-6 9-9 10-16m7 41c-4-6 2-10 0-15 5 4 7 10 0 15" />
      );
    case "genome_instability_mutation":
      return <path d="M22 12c17 12 3 22 20 40M42 12C25 24 39 34 22 52M19 19h26M19 45h26" />;
    case "phenotypic_plasticity":
      return (
        <>
          <circle cx="24" cy="29" r="12" />
          <circle cx="41" cy="38" r="12" />
          <path d="m25 16 6-5m8 15 8-3" />
        </>
      );
    case "epigenetic_reprogramming":
      return (
        <>
          <path d="M18 20h28v28H18z" />
          <path d="M24 16v8m8-8v8m8-8v8M24 40h16" />
        </>
      );
    case "polymorphic_microbiomes":
      return (
        <>
          <circle cx="19" cy="34" r="7" />
          <circle cx="35" cy="19" r="7" />
          <circle cx="46" cy="42" r="7" />
          <path d="m24 30 6-6m8 1 4 11m-16 4 13 1" />
        </>
      );
    case "senescent_cells":
      return (
        <>
          <circle cx="32" cy="32" r="19" />
          <path d="M21 32h22M32 21v22" />
          <path d="m17 17 30 30" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="18" />;
  }
}

/** A compact editable mutation glyph; the owning button supplies its accessible name. */
export function HallmarkSigil(props: HallmarkSigilProps): JSX.Element {
  return (
    <svg
      class={`evolution-sigil evolution-sigil--${props.state}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      tabIndex={-1}
    >
      <g class="evolution-sigil__halo">
        <circle cx="32" cy="32" r="28" />
      </g>
      <g class="evolution-sigil__mark">{mutationPath(props.name)}</g>
      <g class="evolution-sigil__state">
        {props.state === "locked" ? <path d="M27 34v-4a5 5 0 0 1 10 0v4m-12 0h14v10H25z" /> : null}
        {props.state === "available" ? <path d="m25 34 5 5 10-12" /> : null}
        {props.state === "acquired" ? <path d="m23 34 6 6 13-15" /> : null}
      </g>
    </svg>
  );
}

/** Stage position glyph with a closed progression ring for the terminal state. */
export function StageSigil(props: StageSigilProps): JSX.Element {
  const dash = `${Math.min(100, Math.max(8, props.index * 8))} 100`;
  return (
    <svg class="stage-sigil" viewBox="0 0 64 64" aria-hidden="true" tabIndex={-1}>
      <circle class="stage-sigil__track" cx="32" cy="32" r="24" pathLength="100" />
      <circle
        class="stage-sigil__progress"
        cx="32"
        cy="32"
        r="24"
        pathLength="100"
        stroke-dasharray={props.terminal ? "100 0" : dash}
      />
      <path class="stage-sigil__core" d="M32 18 43 25v14l-11 7-11-7V25z" />
    </svg>
  );
}
