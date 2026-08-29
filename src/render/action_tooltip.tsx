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
  tooltip: string;
  ref: (element: HTMLSpanElement) => void;
}): JSX.Element {
  return (
    <Portal>
      <span
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
      </span>
    </Portal>
  );
}

export type ActionTooltipProps = Readonly<{
  label: string;
  tooltip: string;
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
  tooltip: string;
  children: (bindings: TooltipTriggerBindings) => JSX.Element;
  disabled?: boolean;
  disabledLabel?: string;
  placement?: TooltipPlacement;
}>;

/** An icon-first action button whose concise help is available to pointer and keyboard users. */
export function ActionTooltip(props: ActionTooltipProps): JSX.Element {
  const tooltipId = createUniqueId();
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal<TooltipPosition>();
  const placement = (): TooltipPlacement => props.placement ?? "above";
  let anchorElement: HTMLSpanElement | undefined;
  let tooltipElement: HTMLSpanElement | undefined;

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

  function showTooltip(): void {
    if (props.disabled) return;
    setPosition(undefined);
    setVisible(true);
  }

  function hideTooltip(): void {
    setVisible(false);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    hideTooltip();
  }

  return (
    <span
      ref={(element) => {
        anchorElement = element;
      }}
      class={`action-tooltip${props.class ? ` ${props.class}` : ""}`}
      data-placement={placement()}
      onPointerEnter={showTooltip}
      onPointerLeave={hideTooltip}
    >
      <button
        class="action-tooltip-trigger"
        type="button"
        aria-label={props.label}
        aria-describedby={tooltipId}
        disabled={props.disabled}
        onClick={props.onClick}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        onKeyDown={handleKeyDown}
        onPointerDown={showTooltip}
      >
        {props.children}
      </button>
      <TooltipSurface
        id={tooltipId}
        kind="action"
        visible={visible()}
        position={position()}
        tooltip={props.tooltip}
        ref={(element) => {
          tooltipElement = element;
        }}
      />
    </span>
  );
}

/**
 * Attaches concise help to an existing native button without changing its click behavior.
 * Spread the supplied bindings onto the button that already owns the gameplay mutation.
 */
export function HelpTooltip(props: HelpTooltipProps): JSX.Element {
  const tooltipId = createUniqueId();
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal<TooltipPosition>();
  const placement = (): TooltipPlacement => props.placement ?? "above";
  let anchorElement: HTMLSpanElement | undefined;
  let tooltipElement: HTMLSpanElement | undefined;

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

  function showTooltip(): void {
    setPosition(undefined);
    setVisible(true);
  }

  function hideTooltip(): void {
    setVisible(false);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") return;
    event.preventDefault();
    hideTooltip();
  }

  const bindings: TooltipTriggerBindings = {
    "aria-describedby": tooltipId,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onKeyDown: handleKeyDown,
    onPointerEnter: showTooltip,
    onPointerLeave: hideTooltip,
    onPointerDown: showTooltip,
  };

  return (
    <span
      ref={(element) => {
        anchorElement = element;
      }}
      class="help-tooltip"
      data-placement={placement()}
      role={props.disabled ? "group" : undefined}
      tabIndex={props.disabled ? 0 : undefined}
      aria-label={props.disabled ? (props.disabledLabel ?? props.tooltip) : undefined}
      aria-describedby={props.disabled ? tooltipId : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      onPointerEnter={showTooltip}
      onPointerLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onKeyDown={handleKeyDown}
      onPointerDown={showTooltip}
    >
      {props.children(bindings)}
      <TooltipSurface
        id={tooltipId}
        kind="help"
        visible={visible()}
        position={position()}
        tooltip={props.tooltip}
        ref={(element) => {
          tooltipElement = element;
        }}
      />
    </span>
  );
}
