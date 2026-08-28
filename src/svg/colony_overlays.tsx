/**
 * Deterministic SVG overlay projection for a validated living-colony scene.
 * Geometry comes only from the accepted colony layout; biological meaning comes
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

function effectRegions(
  layout: ColonyLayout,
  visual: ColonyVisualState,
  effectId: ColonyVisualEffect["id"],
): readonly RegionalOverlay[] {
  const effect = visual.effects.find((candidate) => candidate.id === effectId);
  if (effect === undefined) return [];
  const seen = new Set<string>();
  return effect.regionIds.flatMap((sourceRegionId) => {
    if (seen.has(sourceRegionId)) return [];
    seen.add(sourceRegionId);
    const overlay = visual.overlays.find(
      (candidate) => candidate.sourceRegionId === sourceRegionId,
    );
    if (overlay === undefined) return [];
    const region = regionFor(layout, overlay.layoutRegionKey);
    return region === undefined ? [] : [Object.freeze({ region, sourceRegionId })];
  });
}

function systemicInvasiveFront(layout: ColonyLayout): string {
  const edge = layout.silhouette.vertices.reduce((rightmost, point) =>
    point.x > rightmost.x ? point : rightmost,
  );
  const endX = Math.min(970, edge.x + 78);
  const endY = Math.max(30, Math.min(670, edge.y - 34));
  return `M ${edge.x} ${edge.y} C ${edge.x + 26} ${edge.y - 18}, ${endX - 26} ${endY + 16}, ${endX} ${endY}`;
}

/**
 * Counts presentation nodes from the same frozen state predicates that drive
 * the overlay components. This keeps renderer diagnostics honest without
 * introducing a frame-time budget as a gameplay invariant.
 */
export function colonyOverlayNodeCount(layout: ColonyLayout, visual: ColonyVisualState): number {
  const hypoxic = overlaysFor(layout, visual, "hypoxic");
  const necrotic = overlaysFor(layout, visual, "necrotic");
  const perfused = overlaysFor(layout, visual, "perfused");
  const masked = overlaysFor(layout, visual, "masked");
  const inflamed = overlaysFor(layout, visual, "inflamed");
  const phenotypeVariance = effectRegions(layout, visual, "phenotype-variance");
  const senescent = overlaysFor(layout, visual, "senescent");
  const routes = routeOverlays(layout, visual);
  const seeds = seededOverlays(layout, visual);
  const systemicFront = visual.invasion.routeCommitted && routes.length === 0;

  const activity =
    2 +
    (visual.growthState === "quiet" ? 0 : 1) +
    (hasEffect(visual, "viability-preservation") ? 1 : 0) +
    (hasEffect(visual, "replicative-reserve") ? 1 : 0) +
    (hasEffect(visual, "mutation-heterogeneity") ? 4 : 0);
  const oxygen = 1 + hypoxic.length * 3 + necrotic.length * 5;
  const perfusion = 1 + perfused.length * 6;
  const hallmarks =
    2 +
    masked.length +
    inflamed.length +
    (hasEffect(visual, "metabolic-state") ? 1 : 0) +
    (hasEffect(visual, "checkpoint-disorganization") ? 1 : 0) +
    phenotypeVariance.length * 3 +
    (hasEffect(visual, "chromatin-program") ? 4 : 0) +
    (hasEffect(visual, "microbiome-surface") ? 5 : 0) +
    senescent.length * 3;
  const invasion = 1 + routes.length * 2 + (systemicFront ? 4 : 0) + seeds.length;
  return activity + oxygen + perfusion + hallmarks + invasion;
}

/**
 * Projects whole-field activity from the frozen scene semantic ledger. These
 * are presentation cues only: their dimensions come from accepted layout
 * geometry and they never interpret mutable game state in the SVG layer.
 */
export function ActivityOverlays(props: OverlayProps): JSX.Element {
  const { centre, baseRadius } = props.layout.silhouette;
  const cycling = props.visual.growthState !== "quiet";
  const energized = props.visual.growthState === "energized";
  const hasRepair = hasEffect(props.visual, "viability-preservation");
  const hasMutation = hasEffect(props.visual, "mutation-heterogeneity");
  const hasReserve = hasEffect(props.visual, "replicative-reserve");
  const outerRx = Math.min(458, baseRadius * 1.2 + 44);
  const outerRy = Math.min(306, baseRadius * 0.88 + 34);
  return (
    <g
      class="colony-figure__activity"
      data-growth-state={props.visual.growthState}
      data-stage={props.layout.stageId}
      aria-hidden="true"
      pointer-events="none"
    >
      <ellipse
        class="colony-figure__activity-aura"
        cx={centre.x}
        cy={centre.y}
        rx={outerRx}
        ry={outerRy}
      />
      {cycling ? (
        <ellipse
          class={`colony-figure__cycle-wave${energized ? " colony-figure__cycle-wave--energized" : ""}`}
          cx={centre.x}
          cy={centre.y}
          rx={Math.max(36, baseRadius * 0.72)}
          ry={Math.max(26, baseRadius * 0.53)}
        />
      ) : undefined}
      {hasRepair ? (
        <path
          class="colony-figure__repair-arc"
          d={`M ${centre.x - outerRx * 0.7} ${centre.y + outerRy * 0.48} A ${outerRx * 0.82} ${outerRy * 0.86} 0 0 1 ${centre.x + outerRx * 0.78} ${centre.y + outerRy * 0.26}`}
          fill="none"
        />
      ) : undefined}
      {hasReserve ? (
        <path
          class="colony-figure__reserve-arc"
          d={`M ${centre.x - outerRx * 0.5} ${centre.y - outerRy * 0.68} Q ${centre.x} ${centre.y - outerRy * 1.08} ${centre.x + outerRx * 0.5} ${centre.y - outerRy * 0.68}`}
          fill="none"
        />
      ) : undefined}
      {hasMutation ? (
        <g class="colony-figure__mutation-shards" data-effect="mutation-heterogeneity">
          <path d={`M ${centre.x - 26} ${centre.y - outerRy - 18} l 11 -18 l 10 18 z`} />
          <path d={`M ${centre.x + outerRx + 13} ${centre.y - 10} l 17 11 l -17 10 z`} />
          <path d={`M ${centre.x - outerRx - 13} ${centre.y + 14} l -17 -11 l 17 -10 z`} />
        </g>
      ) : undefined}
    </g>
  );
}

/** Renders condition-backed oxygen and necrosis interiors under individual cells. */
export function OxygenOverlays(props: OverlayProps): JSX.Element {
  const hypoxic = overlaysFor(props.layout, props.visual, "hypoxic");
  const necrotic = overlaysFor(props.layout, props.visual, "necrotic");
  return (
    <g class="colony-figure__hypoxia-necrosis" aria-hidden="true" pointer-events="none">
      <For each={hypoxic}>
        {(overlay) => (
          <g class="colony-figure__hypoxic-region" data-region={overlay.sourceRegionId}>
            <ellipse
              class="colony-figure__hypoxic-core"
              cx={overlay.region.centre.x}
              cy={overlay.region.centre.y}
              rx={overlay.region.rx * 0.72}
              ry={overlay.region.ry * 0.72}
              fill={localSvgReference(props.definitionIds.hypoxiaGradient)}
            />
            <path
              class="colony-figure__hypoxic-contour"
              d={`M ${overlay.region.centre.x - overlay.region.rx * 0.5} ${overlay.region.centre.y} q ${overlay.region.rx * 0.24} ${-overlay.region.ry * 0.26} ${overlay.region.rx * 0.48} 0 t ${overlay.region.rx * 0.48} 0`}
              fill="none"
            />
          </g>
        )}
      </For>
      <For each={necrotic}>
        {(overlay) => {
          const { centre, rx, ry } = overlay.region;
          return (
            <g class="colony-figure__necrotic-region" data-region={overlay.sourceRegionId}>
              <ellipse
                class="colony-figure__necrotic-core"
                cx={centre.x}
                cy={centre.y}
                rx={rx * 0.58}
                ry={ry * 0.58}
              />
              <circle
                class="colony-figure__necrotic-debris"
                cx={centre.x - rx * 0.21}
                cy={centre.y + ry * 0.1}
                r="4"
              />
              <circle
                class="colony-figure__necrotic-debris"
                cx={centre.x + rx * 0.16}
                cy={centre.y - ry * 0.18}
                r="3"
              />
              <circle
                class="colony-figure__necrotic-debris"
                cx={centre.x + rx * 0.3}
                cy={centre.y + ry * 0.22}
                r="2.5"
              />
            </g>
          );
        }}
      </For>
    </g>
  );
}

/** Renders a stylized supply corridor only for authoritative vessel-linked regions. */
export function PerfusionOverlays(props: OverlayProps): JSX.Element {
  const perfused = overlaysFor(props.layout, props.visual, "perfused");
  return (
    <g class="colony-figure__perfusion" aria-hidden="true" pointer-events="none">
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
              <path
                class="colony-figure__vessel-branch"
                d={`M ${endX} ${endY} L ${overlay.region.centre.x + overlay.region.rx * 0.18} ${overlay.region.centre.y + overlay.region.ry * 0.42}`}
                fill="none"
              />
              <circle
                class="colony-figure__vessel-terminal"
                cx={overlay.region.centre.x + overlay.region.rx * 0.38}
                cy={overlay.region.centre.y - overlay.region.ry * 0.26}
                r="4"
              />
              <circle
                class="colony-figure__vessel-terminal"
                cx={overlay.region.centre.x + overlay.region.rx * 0.18}
                cy={overlay.region.centre.y + overlay.region.ry * 0.42}
                r="3"
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
  const phenotypeVariance = effectRegions(props.layout, props.visual, "phenotype-variance");
  const senescent = overlaysFor(props.layout, props.visual, "senescent");
  const hasChromatinProgram = hasEffect(props.visual, "chromatin-program");
  const hasMicrobiomeSurface = hasEffect(props.visual, "microbiome-surface");
  return (
    <g class="colony-figure__hallmark-accents" aria-hidden="true" pointer-events="none">
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
      <g class="colony-figure__late-hallmark-accents" aria-hidden="true">
        <For each={phenotypeVariance}>
          {(overlay) => (
            <g data-effect="phenotype-variance" data-region={overlay.sourceRegionId}>
              <ellipse
                class="colony-figure__phenotype-variance"
                cx={overlay.region.centre.x}
                cy={overlay.region.centre.y}
                rx={overlay.region.rx * 0.88}
                ry={overlay.region.ry * 0.88}
                fill="none"
                stroke="#d39c54"
                stroke-width="2.25"
                stroke-dasharray="3 6"
              />
              <path
                class="colony-figure__phenotype-variance-mark"
                d={`M ${overlay.region.centre.x - overlay.region.rx * 0.34} ${overlay.region.centre.y} q ${overlay.region.rx * 0.22} ${-overlay.region.ry * 0.24} ${overlay.region.rx * 0.44} 0`}
                fill="none"
                stroke="#f1d49a"
                stroke-width="2"
              />
            </g>
          )}
        </For>
        {hasChromatinProgram ? (
          <g class="colony-figure__chromatin-program" data-effect="chromatin-program">
            <path d="M 76 142 q 13 -18 27 0 t 27 0" fill="none" stroke="#cf9cc4" stroke-width="3" />
            <circle cx="91" cy="142" r="3.5" fill="#f0cde8" />
            <circle cx="119" cy="142" r="3.5" fill="#f0cde8" />
          </g>
        ) : undefined}
        {hasMicrobiomeSurface ? (
          <g class="colony-figure__microbiome-surface" data-effect="microbiome-surface">
            <path d="M 74 186 q 18 -14 36 0 t 36 0" fill="none" stroke="#a5d0aa" stroke-width="3" />
            <circle cx="86" cy="181" r="3" fill="#d6ecd3" />
            <circle cx="110" cy="190" r="3" fill="#d6ecd3" />
            <circle cx="136" cy="181" r="3" fill="#d6ecd3" />
          </g>
        ) : undefined}
        <For each={senescent}>
          {(overlay) => (
            <g data-effect="senescent-region" data-region={overlay.sourceRegionId}>
              <ellipse
                class="colony-figure__senescent-retained"
                cx={overlay.region.centre.x}
                cy={overlay.region.centre.y}
                rx={overlay.region.rx * 1.13}
                ry={overlay.region.ry * 1.13}
                fill="none"
                stroke="#d8bd73"
                stroke-width="3"
                stroke-dasharray="7 5"
              />
              <path
                class="colony-figure__senescent-nondivision"
                d={`M ${overlay.region.centre.x - 4} ${overlay.region.centre.y - 7} v 14 M ${overlay.region.centre.x + 4} ${overlay.region.centre.y - 7} v 14`}
                fill="none"
                stroke="#f2d99a"
                stroke-width="2.5"
              />
            </g>
          )}
        </For>
      </g>
    </g>
  );
}

/** Adds invasive protrusions and remote anchors only after the authoritative route condition exists. */
export function InvasionOverlays(props: OverlayProps): JSX.Element {
  const routes = routeOverlays(props.layout, props.visual);
  const seeds = seededOverlays(props.layout, props.visual);
  const needsSystemicFront = props.visual.invasion.routeCommitted && routes.length === 0;
  if (!needsSystemicFront && routes.length === 0 && seeds.length === 0)
    return <g class="colony-figure__invasion" aria-hidden="true" pointer-events="none" />;
  return (
    <g class="colony-figure__invasion" aria-hidden="true" pointer-events="none">
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
      {needsSystemicFront ? (
        <g data-scope="systemic">
          <path
            class="colony-figure__invasive-front colony-figure__invasive-front--systemic"
            d={systemicInvasiveFront(props.layout)}
            fill="none"
          />
          <circle class="colony-figure__detached-cell" cx="948" cy="286" r="8" />
          <circle
            class="colony-figure__detached-cell colony-figure__detached-cell--small"
            cx="916"
            cy="314"
            r="4.5"
          />
        </g>
      ) : undefined}
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
