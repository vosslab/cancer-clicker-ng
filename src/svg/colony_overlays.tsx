/**
 * Deterministic SVG overlay projection for a validated living-colony scene.
 * Geometry comes only from the accepted M17 layout; biological meaning comes
 * only from ColonySceneRequest.visual.
 */
import { For } from "solid-js";
import type { JSX } from "solid-js";

import { localSvgReference } from "./defs.js";
import type { ColonySvgDefinitionIds } from "./defs.js";
import type { ColonyLayout, PublicRegion } from "./colony_layout.js";
import type { ColonyVisualEffect, ColonyVisualState } from "./colony_visual_state.js";

type OverlayProps = Readonly<{
  layout: ColonyLayout;
  visual: ColonyVisualState;
  definitionIds: ColonySvgDefinitionIds;
}>;

type RegionalOverlay = Readonly<{
  region: PublicRegion;
  sourceRegionId: string;
}>;

function regionFor(layout: ColonyLayout, key: string): PublicRegion | undefined {
  return layout.regions.find((region) => region.key === key);
}

function overlaysFor(
  layout: ColonyLayout,
  visual: ColonyVisualState,
  condition: ColonyVisualState["overlays"][number]["condition"],
): readonly RegionalOverlay[] {
  return visual.overlays.flatMap((overlay) => {
    if (overlay.condition !== condition) return [];
    const region = regionFor(layout, overlay.layoutRegionKey);
    return region === undefined
      ? []
      : [Object.freeze({ region, sourceRegionId: overlay.sourceRegionId })];
  });
}

function hasEffect(visual: ColonyVisualState, id: ColonyVisualEffect["id"]): boolean {
  return visual.effects.some((effect) => effect.id === id);
}

function routeOverlays(
  layout: ColonyLayout,
  visual: ColonyVisualState,
): readonly RegionalOverlay[] {
  return visual.overlays.flatMap((overlay) => {
    if (!overlay.routeCommitted) return [];
    const region = regionFor(layout, overlay.layoutRegionKey);
    return region === undefined
      ? []
      : [Object.freeze({ region, sourceRegionId: overlay.sourceRegionId })];
  });
}

function seededOverlays(
  layout: ColonyLayout,
  visual: ColonyVisualState,
): readonly RegionalOverlay[] {
  return visual.overlays.flatMap((overlay) => {
    if (!overlay.seeded) return [];
    const region = regionFor(layout, overlay.layoutRegionKey);
    return region === undefined
      ? []
      : [Object.freeze({ region, sourceRegionId: overlay.sourceRegionId })];
  });
}

/** Renders condition-backed oxygen and necrosis interiors under individual cells. */
export function OxygenOverlays(props: OverlayProps): JSX.Element {
  const hypoxic = overlaysFor(props.layout, props.visual, "hypoxic");
  const necrotic = overlaysFor(props.layout, props.visual, "necrotic");
  return (
    <g class="colony-figure__hypoxia-necrosis" aria-hidden="true">
      <For each={hypoxic}>
        {(overlay) => (
          <ellipse
            class="colony-figure__hypoxic-core"
            data-region={overlay.sourceRegionId}
            cx={overlay.region.centre.x}
            cy={overlay.region.centre.y}
            rx={overlay.region.rx * 0.72}
            ry={overlay.region.ry * 0.72}
            fill={localSvgReference(props.definitionIds.hypoxiaGradient)}
          />
        )}
      </For>
      <For each={necrotic}>
        {(overlay) => (
          <ellipse
            class="colony-figure__necrotic-core"
            data-region={overlay.sourceRegionId}
            cx={overlay.region.centre.x}
            cy={overlay.region.centre.y}
            rx={overlay.region.rx * 0.58}
            ry={overlay.region.ry * 0.58}
          />
        )}
      </For>
    </g>
  );
}

/** Renders a stylized supply corridor only for authoritative vessel-linked regions. */
export function PerfusionOverlays(props: OverlayProps): JSX.Element {
  const perfused = overlaysFor(props.layout, props.visual, "perfused");
  return (
    <g class="colony-figure__perfusion" aria-hidden="true">
      <For each={perfused}>
        {(overlay) => {
          const startX = Math.max(24, overlay.region.centre.x - overlay.region.rx * 1.9);
          const startY = overlay.region.centre.y + overlay.region.ry * 0.58;
          const endX = overlay.region.centre.x - overlay.region.rx * 0.22;
          const endY = overlay.region.centre.y + overlay.region.ry * 0.12;
          return (
            <g class="colony-figure__vessel" data-region={overlay.sourceRegionId}>
              <path
                class="colony-figure__vessel-trunk"
                d={`M ${startX} ${startY} C ${startX + (endX - startX) * 0.42} ${startY - overlay.region.ry * 0.8}, ${endX - overlay.region.rx * 0.25} ${endY + overlay.region.ry * 0.46}, ${endX} ${endY}`}
                fill="none"
                stroke={localSvgReference(props.definitionIds.vesselGradient)}
              />
              <path
                class="colony-figure__vessel-branch"
                d={`M ${endX} ${endY} L ${overlay.region.centre.x + overlay.region.rx * 0.38} ${overlay.region.centre.y - overlay.region.ry * 0.26}`}
                fill="none"
              />
            </g>
          );
        }}
      </For>
    </g>
  );
}

/** Projects named hallmark conditions as restrained, non-quantitative tissue cues. */
export function HallmarkOverlays(props: OverlayProps): JSX.Element {
  const masked = overlaysFor(props.layout, props.visual, "masked");
  const inflamed = overlaysFor(props.layout, props.visual, "inflamed");
  const hasMetabolicCue = hasEffect(props.visual, "metabolic-state");
  const hasCheckpointCue = hasEffect(props.visual, "checkpoint-disorganization");
  return (
    <g class="colony-figure__hallmark-accents" aria-hidden="true">
      <For each={masked}>
        {(overlay) => (
          <ellipse
            class="colony-figure__immune-veil"
            data-region={overlay.sourceRegionId}
            cx={overlay.region.centre.x}
            cy={overlay.region.centre.y}
            rx={overlay.region.rx * 1.08}
            ry={overlay.region.ry * 1.08}
          />
        )}
      </For>
      <For each={inflamed}>
        {(overlay) => (
          <ellipse
            class="colony-figure__inflammation"
            data-region={overlay.sourceRegionId}
            cx={overlay.region.centre.x}
            cy={overlay.region.centre.y}
            rx={overlay.region.rx * 1.16}
            ry={overlay.region.ry * 1.16}
          />
        )}
      </For>
      {hasMetabolicCue ? (
        <path
          class="colony-figure__metabolic-cue"
          d="M 76 78 h 30 l 16 20 -16 20 h -30 l -16 -20 z"
        />
      ) : undefined}
      {hasCheckpointCue ? (
        <path class="colony-figure__checkpoint-cue" d="M 132 84 l 20 26 -20 26" fill="none" />
      ) : undefined}
    </g>
  );
}

/** Adds invasive protrusions and remote anchors only after the authoritative route condition exists. */
export function InvasionOverlays(props: OverlayProps): JSX.Element {
  if (!hasEffect(props.visual, "invasive-route"))
    return <g class="colony-figure__invasion" aria-hidden="true" />;
  const routes = routeOverlays(props.layout, props.visual);
  const seeds = seededOverlays(props.layout, props.visual);
  return (
    <g class="colony-figure__invasion" aria-hidden="true">
      <For each={routes}>
        {(overlay) => {
          const { centre, rx, ry } = overlay.region;
          const routeEndX = Math.min(964, centre.x + rx * 2.05);
          const routeEndY = Math.max(26, Math.min(674, centre.y - ry * 1.15));
          return (
            <g data-region={overlay.sourceRegionId}>
              <path
                class="colony-figure__invasive-front"
                d={`M ${centre.x + rx * 0.65} ${centre.y} C ${centre.x + rx * 1.2} ${centre.y - ry * 0.7}, ${routeEndX - rx * 0.5} ${routeEndY + ry * 0.4}, ${routeEndX} ${routeEndY}`}
                fill="none"
              />
            </g>
          );
        }}
      </For>
      <For each={seeds}>
        {(overlay) => {
          const { centre, rx, ry } = overlay.region;
          const anchorX = Math.min(964, centre.x + rx * 2.45);
          const anchorY = Math.max(26, Math.min(674, centre.y - ry * 1.38));
          return (
            <circle
              class="colony-figure__seed-anchor"
              data-region={overlay.sourceRegionId}
              cx={anchorX}
              cy={anchorY}
              r="8"
            />
          );
        }}
      </For>
    </g>
  );
}
