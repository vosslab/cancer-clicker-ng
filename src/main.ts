import type { GameEvent } from "./types/events.js";
import type { NumberFormat } from "./types/state.js";

function requireElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected #${id} in the application shell.`);
  }
  return element;
}

function describeUiEvent(event: GameEvent): string {
  switch (event.type) {
    case "click-divide":
      return "division signal received";
    case "purchase-producer":
      return "producer purchase queued";
    case "purchase-hallmark":
      return "hallmark purchase queued";
    case "advance-stage":
      return "stage transition queued";
    case "perform-prestige-reset":
      return "prestige reset queued";
    case "apply-offline-accrual":
      return "offline accrual queued";
    case "set-number-format":
      return `number format set to ${event.numberFormat}`;
    case "set-signaling-allocation":
      return "signaling allocation queued";
    case "select-checkpoint":
      return "checkpoint selected";
    case "resolve-triage":
      return "triage response queued";
    case "set-vessel-link":
      return "vessel link update queued";
    case "commit-route":
      return "route commitment queued";
    case "set-atp-budget":
      return "ATP budget update queued";
    case "select-mutation":
      return "mutation selection queued";
    case "switch-phenotype":
      return "phenotype switch queued";
    case "edit-program":
      return "program edit queued";
    case "select-microbiome":
      return "microbiome selection queued";
    case "resolve-senescence":
      return "senescence response queued";
    default: {
      const exhaustiveEvent: never = event;
      return exhaustiveEvent;
    }
  }
}

function createFormatEvent(numberFormat: NumberFormat): GameEvent {
  const event: GameEvent = {
    type: "set-number-format",
    numberFormat,
    atMs: Date.now(),
  };
  return event;
}

function bootstrap(): void {
  const divideButton = requireElement("divide-button");
  const status = requireElement("game-status");
  const formatButton = requireElement("format-button");
  let divisions = 0;
  let numberFormat: NumberFormat = "short";

  function renderStatus(event: GameEvent): void {
    const eventLabel = describeUiEvent(event);
    status.textContent = `M1 contract probe: ${divisions} divisions; ${eventLabel}.`;
  }

  function handleDivision(): void {
    divisions += 1;
    const event: GameEvent = { type: "click-divide", atMs: Date.now() };
    renderStatus(event);
  }

  function handleFormatToggle(): void {
    numberFormat = numberFormat === "short" ? "full" : "short";
    const event = createFormatEvent(numberFormat);
    renderStatus(event);
  }

  divideButton.addEventListener("click", handleDivision);
  formatButton.addEventListener("click", handleFormatToggle);
  renderStatus(createFormatEvent(numberFormat));
}

bootstrap();
