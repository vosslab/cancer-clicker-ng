import { Show, createSignal, createUniqueId } from "solid-js";
import type { JSX } from "solid-js";

export type TooltipPlacement = "above" | "below";

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
  const placement = (): TooltipPlacement => props.placement ?? "above";

  function showTooltip(): void {
    if (!props.disabled) setVisible(true);
  }

  function hideTooltip(): void {
    setVisible(false);
  }

  return (
    <span
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
        onPointerDown={showTooltip}
      >
        {props.children}
      </button>
      <Show when={visible()}>
        <span id={tooltipId} class="action-tooltip-content" role="tooltip">
          {props.tooltip}
        </span>
      </Show>
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
  const placement = (): TooltipPlacement => props.placement ?? "above";

  function showTooltip(): void {
    setVisible(true);
  }

  function hideTooltip(): void {
    setVisible(false);
  }

  const bindings: TooltipTriggerBindings = {
    "aria-describedby": tooltipId,
    onFocus: showTooltip,
    onBlur: hideTooltip,
    onPointerEnter: showTooltip,
    onPointerLeave: hideTooltip,
    onPointerDown: showTooltip,
  };

  return (
    <span
      class="help-tooltip"
      data-placement={placement()}
      tabIndex={props.disabled ? 0 : undefined}
      aria-label={props.disabled ? (props.disabledLabel ?? props.tooltip) : undefined}
      aria-describedby={props.disabled ? tooltipId : undefined}
      aria-disabled={props.disabled ? "true" : undefined}
      onPointerEnter={showTooltip}
      onPointerLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      onPointerDown={showTooltip}
    >
      {props.children(bindings)}
      <Show when={visible()}>
        <span id={tooltipId} class="help-tooltip-content" role="tooltip">
          {props.tooltip}
        </span>
      </Show>
    </span>
  );
}
