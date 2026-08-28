import { render } from "solid-js/web";

import { App } from "./render/app.js";

function requireMount(): HTMLElement {
  const mount = document.getElementById("app");
  if (!(mount instanceof HTMLElement)) throw new Error("Expected #app application mount.");
  return mount;
}

function debugEnabled(): boolean {
  const parameters = new URLSearchParams(window.location.search);
  return parameters.get("debug") === "1";
}

render(() => <App debug={debugEnabled()} />, requireMount());
