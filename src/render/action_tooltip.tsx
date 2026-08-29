import { createEffect, createSignal, createUniqueId, onCleanup } from "solid-js";
import type { JSX } from "solid-js";
import { Portal } from "solid-js/web";

export type TooltipPlacement = "above" | "below" | "left" | "right";

type TooltipPosition = Readonly<{ left: number; top: number; side: TooltipPlacement }>;

const TOOLTIP_GAP = 8;
const VIEWPORT_MARGIN = 8;

function oppositePlacement(placement: TooltipPlacement): TooltipPlacement {
  if (placement === "above") return "below";
  if (placement === "below") return "above";
  if (placement === "left") return "right";
  return "left";
}

function placementOrder(preferred: TooltipPlacement): readonly TooltipPlacement[] {
  const crossAxis: readonly TooltipPlacement[] =
    preferred === "above" || preferred === "below" ? ["right", "left"] : ["below", "above"];
  return [preferred, oppositePlacement(preferred), ...crossAxis];
}

function candidatePosition(
  anchor: DOMRect,
  tooltip: DOMRect,
  side: TooltipPlacement,
): TooltipPosition {
  if (side === "above") {
    return {
      left: anchor.left + (anchor.width - tooltip.width) / 2,
      top: anchor.top - tooltip.height - TOOLTIP_GAP,
      side,
    };
  }
  if (side === "below") {
    return {
      left: anchor.left + (anchor.width - tooltip.width) / 2,
      top: anchor.bottom + TOOLTIP_GAP,
      side,
    };
  }
  if (side === "left") {
    return {
      left: anchor.left - tooltip.width - TOOLTIP_GAP,
      top: anchor.top + (anchor.height - tooltip.height) / 2,
      side,
    };
  }
  return {
    left: anchor.right + TOOLTIP_GAP,
    top: anchor.top + (anchor.height - tooltip.height) / 2,
    side,
  };
}

function fitsViewport(position: TooltipPosition, tooltip: DOMRect): boolean {
  return (
    position.left >= VIEWPORT_MARGIN &&
    position.top >= VIEWPORT_MARGIN &&
    position.left + tooltip.width <= window.innerWidth - VIEWPORT_MARGIN &&
    position.top + tooltip.height <= window.innerHeight - VIEWPORT_MARGIN
  );
}

function clampToViewport(position: TooltipPosition, tooltip: DOMRect): TooltipPosition {
  return {
    left: Math.max(
      VIEWPORT_MARGIN,
      Math.min(position.left, window.innerWidth - tooltip.width - VIEWPORT_MARGIN),
    ),
    top: Math.max(
      VIEWPORT_MARGIN,
      Math.min(position.top, window.innerHeight - tooltip.height - VIEWPORT_MARGIN),
    ),
    side: position.side,
  };
}

function resolveTooltipPosition(
  anchorElement: HTMLElement,
  tooltipElement: HTMLElement,
  preferred: TooltipPlacement,
): TooltipPosition {
  const anchor = anchorElement.getBoundingClientRect();
  const tooltip = tooltipElement.getBoundingClientRect();
  for (const side of placementOrder(preferred)) {
    const candidate = candidatePosition(anchor, tooltip, side);
    if (fitsViewport(candidate, tooltip)) return candidate;
  }
  return clampToViewport(candidatePosition(anchor, tooltip, preferred), tooltip);
}

function TooltipSurface(props: {
  id: string;
  kind: "action" | "help";
  visible: boolean;
  position: TooltipPosition | undefined;
  tooltip: JSX.Element;
  ref: (element: HTMLDivElement) => void;
}): JSX.Element {
  return (
    <Portal>
      <div
        ref={props.ref}
        id={props.id}
        class={`${props.kind}-tooltip-content tooltip-surface`}
        role="tooltip"
        data-positioned={props.position === undefined ? "false" : "true"}
        data-side={props.position?.side}
        style={{
          left: `${props.position?.left ?? 0}px`,
          top: `${props.position?.top ?? 0}px`,
        }}
        hidden={!props.visible}
      >
        {props.tooltip}
      </div>
    </Portal>
  );
}

/**
 * Owns the positioning and lifetime of one tooltip.  ActionTooltip and
 * HelpTooltip intentionally differ in markup, but they must never drift in
 * keyboard escape, viewport repositioning, or portal behavior.
 */
function createTooltipController(
  placement: () => TooltipPlacement,
  canShow: () => boolean = () => true,
): Readonly<{
  tooltipId: string;
  visible: () => boolean;
  position: () => TooltipPosition | undefined;
  setAnchor: (element: HTMLSpanElement) => void;
  setTooltip: (element: HTMLDivElement) => void;
  show: () => void;
  hide: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
}> {
  const tooltipId = createUniqueId();
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal<TooltipPosition>();
  let anchorElement: HTMLSpanElement | undefined;
  let tooltipElement: HTMLDivElement | undefined;

  function updatePosition(): void {
    if (!visible() || anchorElement === undefined || tooltipElement === undefined) return;
    setPosition(resolveTooltipPosition(anchorElement, tooltipElement, placement()));
  }

  createEffect(() => {
    if (!visible()) return;
    const animationFrame = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    onCleanup(() => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    });
  });

  function show(): void {
    if (!canShow()) return;
    setPosition(undefined);
    setVisible(true);
  }

  function hide(): void {
    setVisible(false);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    hide();
  }

  return {
    tooltipId,
    visible,
    position,
    setAnchor: (element): void => {
      anchorElement = element;
    },
    setTooltip: (element): void => {
      tooltipElement = element;
    },
    show,
    hide,
    onKeyDown,
  };
}

export type ActionTooltipProps = Readonly<{
  label: string;
  tooltip: JSX.Element;
  children: JSX.Element;
  class?: string;
  disabled?: boolean;
  placement?: TooltipPlacement;
  onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent>;
}>;

export type TooltipTriggerBindings = Readonly<{
  "aria-describedby": string;
  onFocus: JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent>;
  onBlur: JSX.EventHandlerUnion<HTMLButtonElement, FocusEvent>;
  onKeyDown: JSX.EventHandlerUnion<HTMLButtonElement, KeyboardEvent>;
  onPointerEnter: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent>;
  onPointerLeave: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent>;
  onPointerDown: JSX.EventHandlerUnion<HTMLButtonElement, PointerEvent>;
}>;

export type HelpTooltipProps = Readonly<{
  tooltip: JSX.Element;
  children: (bindings: TooltipTriggerBindings) => JSX.Element;
  disabled?: boolean;
  disabledLabel?: string;
  placement?: TooltipPlacement;
}>;

/** An icon-first action button whose concise help is available to pointer and keyboard users. */
export function ActionTooltip(props: ActionTooltipProps): JSX.Element {
  const placement = (): TooltipPlacement => props.placement ?? "above";
  const tooltip = createTooltipController(placement, () => props.disabled !== true);

  return (
    <span
      ref={tooltip.setAnchor}
      class={`action-tooltip${props.class ? ` ${props.class}` : ""}`}
      data-placement={placement()}
      onPointerEnter={tooltip.show}
      onPointerLeave={tooltip.hide}
    >
      <button
        class="action-tooltip-trigger"
        type="button"
        aria-label={props.label}
        aria-describedby={tooltip.tooltipId}
        disabled={props.disabled}
        onClick={props.onClick}
        onFocus={tooltip.show}
        onBlur={tooltip.hide}
        onKeyDown={tooltip.onKeyDown}
        onPointerDown={tooltip.show}
      >
        {props.children}
      </button>
      <TooltipSurface
        id={tooltip.tooltipId}
        kind="action"
        visible={tooltip.visible()}
        position={tooltip.position()}
        tooltip={props.tooltip}
        ref={tooltip.setTooltip}
      />
    </span>
  );
}

/**
 * Attaches concise help to an existing native button without changing its click behavior.
 * Spread the supplied bindings onto the button that already owns the gameplay mutation.
 */
export function HelpTooltip(props: HelpTooltipProps): JSX.Element {
  const placement = (): TooltipPlacement => props.placement ?? "above";
  const tooltip = createTooltipController(placement);

  const bindings: TooltipTriggerBindings = {
    "aria-describedby": tooltip.tooltipId,
    onFocus: tooltip.show,
    onBlur: tooltip.hide,
    onKeyDown: tooltip.onKeyDown,
    onPointerEnter: tooltip.show,
    onPointerLeave: tooltip.hide,
    onPointerDown: tooltip.show,
  };

  return (
    <span
      ref={tooltip.setAnchor}
      class="help-tooltip"
      data-placement={placement()}
      role={props.disabled ? "group" : undefined}
      tabIndex={props.disabled ? 0 : undefined}
      aria-label={props.disabled ? (props.disabledLabel ?? "Unavailable action") : undefined}
      aria-describedby={props.disabled ? tooltip.tooltipId : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      onPointerEnter={tooltip.show}
      onPointerLeave={tooltip.hide}
      onFocus={tooltip.show}
      onBlur={tooltip.hide}
      onKeyDown={tooltip.onKeyDown}
      onPointerDown={tooltip.show}
    >
      {props.children(bindings)}
      <TooltipSurface
        id={tooltip.tooltipId}
        kind="help"
        visible={tooltip.visible()}
        position={tooltip.position()}
        tooltip={props.tooltip}
        ref={tooltip.setTooltip}
      />
    </span>
  );
}
