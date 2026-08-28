import type { JSX } from "solid-js";

/**
 * A compact decorative scale cue for the reached report. The skyline, shoreline,
 * and lake are an original volume analogy rather than a geographic map.
 */
export function ChicagoScaleGraphic(): JSX.Element {
  return (
    <svg
      class="chicago-scale-graphic"
      viewBox="0 0 260 132"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      tabindex="-1"
    >
      <defs>
        <linearGradient id="chicago-report-lake" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#77c7ca" stop-opacity="0.65" />
          <stop offset="1" stop-color="#17485d" stop-opacity="0.92" />
        </linearGradient>
        <linearGradient id="chicago-report-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#173f4c" />
          <stop offset="1" stop-color="#0a252c" />
        </linearGradient>
      </defs>
      <g class="chicago-scale-graphic__frame">
        <rect width="260" height="132" rx="11" fill="url(#chicago-report-sky)" />
        <path
          class="chicago-scale-graphic__shoreline"
          d="M 201 7 C 190 30 203 49 194 69 C 187 89 202 108 194 126"
        />
        <path
          class="chicago-scale-graphic__lake"
          d="M 201 0 C 190 30 203 49 194 69 C 187 89 202 108 194 132 H 260 V 0 Z"
        />
        <g class="chicago-scale-graphic__grid">
          <path d="M 12 102 H 201 M 12 114 H 197 M 24 77 V 126 M 52 70 V 126 M 80 70 V 126 M 108 70 V 126 M 136 70 V 126 M 164 70 V 126" />
        </g>
      </g>
      <g class="chicago-scale-graphic__skyline">
        <path class="chicago-scale-graphic__tower-side" d="M 23 69 l 9 -7 v 59 l -9 6 Z" />
        <rect class="chicago-scale-graphic__tower-face" x="14" y="69" width="9" height="57" />
        <path class="chicago-scale-graphic__tower-side" d="M 49 47 l 12 -10 v 84 l -12 6 Z" />
        <rect class="chicago-scale-graphic__tower-face" x="35" y="47" width="14" height="80" />
        <path class="chicago-scale-graphic__tower-side" d="M 83 23 l 15 -12 v 109 l -15 7 Z" />
        <path class="chicago-scale-graphic__spire" d="M 90 23 V 4 L 94 23" />
        <rect
          class="chicago-scale-graphic__tower-face chicago-scale-graphic__tower-face--landmark"
          x="65"
          y="23"
          width="18"
          height="104"
        />
        <path class="chicago-scale-graphic__tower-side" d="M 118 57 l 11 -8 v 72 l -11 6 Z" />
        <rect class="chicago-scale-graphic__tower-face" x="106" y="57" width="12" height="70" />
        <path class="chicago-scale-graphic__tower-side" d="M 151 36 l 13 -11 v 96 l -13 6 Z" />
        <rect class="chicago-scale-graphic__tower-face" x="136" y="36" width="15" height="91" />
        <path class="chicago-scale-graphic__tower-side" d="M 181 62 l 10 -8 v 67 l -10 6 Z" />
        <rect class="chicago-scale-graphic__tower-face" x="170" y="62" width="11" height="65" />
      </g>
      <g class="chicago-scale-graphic__signals">
        <path d="M 18 105 C 70 83 121 88 178 104" />
        <circle cx="94" cy="94" r="4" />
        <circle cx="150" cy="89" r="3" />
      </g>
    </svg>
  );
}
