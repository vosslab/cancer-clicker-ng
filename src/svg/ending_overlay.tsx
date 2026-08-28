/**
 * Editable, data-bound Chicago-scale overlay for the earned soft ending.
 * The street grid and lake are a fictional volume analogy; route starts always
 * come from accepted living-colony anchors rather than a separate city scene.
 */
import { For, Show } from "solid-js";
import type { JSX } from "solid-js";

import { sceneSvgId } from "./render_types.js";
import type { ColonySceneRequest } from "./render_types.js";

const CITY_SITES = [
  { x: 550, y: 188, width: 48, height: 138, cap: 18 },
  { x: 616, y: 236, width: 40, height: 104, cap: 12 },
  { x: 673, y: 142, width: 56, height: 184, cap: 22 },
  { x: 746, y: 216, width: 44, height: 118, cap: 14 },
  { x: 804, y: 164, width: 38, height: 164, cap: 20 },
  { x: 858, y: 252, width: 46, height: 92, cap: 10 },
  { x: 602, y: 390, width: 48, height: 132, cap: 16 },
  { x: 682, y: 404, width: 52, height: 120, cap: 15 },
] as const;

const STREET_LINES = [
  "M 506 124 L 914 124",
  "M 506 192 L 914 192",
  "M 506 260 L 914 260",
  "M 506 328 L 914 328",
  "M 506 396 L 914 396",
  "M 506 464 L 914 464",
  "M 526 96 L 526 546",
  "M 594 96 L 594 546",
  "M 662 96 L 662 546",
  "M 730 96 L 730 546",
  "M 798 96 L 798 546",
  "M 866 96 L 866 546",
] as const;

function cityRouteTarget(index: number): Readonly<{ x: number; y: number }> {
  const site = CITY_SITES[index % CITY_SITES.length]!;
  return { x: site.x + site.width / 2, y: site.y + site.height + 20 };
}

/**
 * Projects the reached-only ending semantics as a layered, static SVG group.
 * Existing colony cells and biological overlays render afterward and remain legible.
 */
export function EndingOverlay(props: Readonly<{ scene: ColonySceneRequest }>): JSX.Element {
  return (
    <Show
      when={
        props.scene.visual.ending.mode === "chicago-scale" ? props.scene.visual.ending : undefined
      }
    >
      {(endingState) => {
        const ending = endingState();
        const overlayId = sceneSvgId(props.scene, "chicago-overlay");
        const markerCount = Math.min(CITY_SITES.length, ending.connectedSiteCount);
        return (
          <g
            id={overlayId}
            class="colony-ending-overlay"
            data-ending-scene="chicago-scale"
            data-network-tier={ending.networkTier}
            data-connected-sites={ending.connectedSiteCount}
            aria-hidden="true"
            pointer-events="none"
          >
            <g class="colony-ending-overlay__lake" id={`${overlayId}-lake`}>
              <path d="M 920 48 C 970 118 970 236 934 346 S 972 548 920 652 L 1000 652 L 1000 48 Z" />
              <path
                class="colony-ending-overlay__shore"
                d="M 920 48 C 970 118 970 236 934 346 S 972 548 920 652"
              />
            </g>
            <g class="colony-ending-overlay__grid" id={`${overlayId}-grid`}>
              <For each={STREET_LINES}>{(d) => <path d={d} />}</For>
              <path
                class="colony-ending-overlay__river"
                d="M 518 90 C 606 166 578 232 662 290 S 718 424 832 552"
              />
            </g>
            <g class="colony-ending-overlay__routes" id={`${overlayId}-routes`}>
              <For each={ending.routeAnchors}>
                {(anchor, index) => {
                  const target = cityRouteTarget(index());
                  return (
                    <path
                      class="colony-ending-overlay__route"
                      data-route-anchor={index()}
                      d={`M ${anchor.x} ${anchor.y} C ${(anchor.x + target.x) / 2} ${anchor.y - 58}, ${(anchor.x + target.x) / 2} ${target.y + 50}, ${target.x} ${target.y}`}
                    />
                  );
                }}
              </For>
            </g>
            <g class="colony-ending-overlay__skyline" id={`${overlayId}-skyline`}>
              <For each={CITY_SITES}>
                {(site, index) => {
                  const isConnected = index() < markerCount;
                  return (
                    <g
                      class={`colony-ending-overlay__tower${isConnected ? " colony-ending-overlay__tower--connected" : ""}`}
                      data-connected-site={isConnected ? "true" : "false"}
                    >
                      <path
                        class="colony-ending-overlay__tower-side"
                        d={`M ${site.x + site.width} ${site.y} l ${site.cap} ${-site.cap} v ${site.height} l ${-site.cap} ${site.cap} Z`}
                      />
                      <path
                        class="colony-ending-overlay__tower-face"
                        d={`M ${site.x} ${site.y} l ${site.width} 0 v ${site.height} l ${-site.width} 0 Z`}
                      />
                      <path
                        class="colony-ending-overlay__tower-roof"
                        d={`M ${site.x} ${site.y} l ${site.cap} ${-site.cap} h ${site.width} l ${-site.cap} ${site.cap} Z`}
                      />
                      {isConnected ? (
                        <path
                          class="colony-ending-overlay__site-marker"
                          d={`M ${site.x + site.width / 2} ${site.y - 22} l 8 8 l -8 8 l -8 -8 Z`}
                        />
                      ) : undefined}
                    </g>
                  );
                }}
              </For>
            </g>
          </g>
        );
      }}
    </Show>
  );
}
