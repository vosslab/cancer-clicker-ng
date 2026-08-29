/** Capture and verify the responsive whole-game visual-review corpus. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIRECTORY = path.join(ROOT, "dist");
// ASVS 5.3.2: generated files stay under one internally selected ignored directory.
const OUTPUT_DIRECTORY = path.join(ROOT, "output_visual", "game_visual_review");
const MANIFEST_PATH = path.join(OUTPUT_DIRECTORY, "manifest.json");
const INDEX_PATH = path.join(OUTPUT_DIRECTORY, "index.html");
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const VIEWPORTS = Object.freeze([
  Object.freeze({ name: "narrow_phone", width: 320, height: 900, fullPage: true }),
  Object.freeze({ name: "wide_phone", width: 480, height: 900, fullPage: true }),
  Object.freeze({ name: "tablet", width: 768, height: 1024, fullPage: true }),
  Object.freeze({ name: "target_desktop", width: 1280, height: 800, fullPage: false }),
  Object.freeze({ name: "wide_desktop", width: 1920, height: 1080, fullPage: false }),
]);
const LEGACY_CAPTURE_NAMES = Object.freeze([
  "phone_board.png",
  "desktop_board.png",
  "wide_board.png",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fileEvidence(filePath) {
  const data = await readFile(filePath);
  const info = await stat(filePath);
  return {
    path: path.relative(ROOT, filePath),
    bytes: info.size,
    sha256: sha256(data),
  };
}

async function availablePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  if (address === null || typeof address === "string")
    throw new Error("Unable to select a loopback port.");
  return address.port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The repository-owned loopback server has not bound yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Local production server did not respond at ${url}.`);
}

function collectDiagnostics(page) {
  const diagnostics = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      diagnostics.push(`console.${message.type()}: ${message.text()}`);
  });
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.message}`));
  return diagnostics;
}

async function pageEvidence(page, viewport) {
  return page.evaluate(
    ({ desktop, minimumTarget }) => {
      const browserDocument = globalThis.document;

      function box(selector) {
        const element = browserDocument.querySelector(selector);
        if (!(element instanceof globalThis.HTMLElement)) return undefined;
        const bounds = element.getBoundingClientRect();
        return {
          x: Math.round(bounds.x * 10) / 10,
          y: Math.round(bounds.y * 10) / 10,
          width: Math.round(bounds.width * 10) / 10,
          height: Math.round(bounds.height * 10) / 10,
          bottom: Math.round(bounds.bottom * 10) / 10,
        };
      }

      const regions = {
        hud: box(".game-hud"),
        arena: box(".game-board__arena"),
        evolution: box(".game-board__evolution"),
        rack: box(".game-board__rack"),
        rewards: box(".game-board__rewards"),
      };
      const evolutionTabs = box(".evolution-tabs");
      const evolutionBody = box(".game-board__evolution-content > *");
      const visibleButtons = [...browserDocument.querySelectorAll("button")].filter((button) => {
        const style = globalThis.getComputedStyle(button);
        const bounds = button.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && bounds.width > 0;
      });
      const undersizedTargets = visibleButtons
        .map((button) => {
          const bounds = button.getBoundingClientRect();
          return {
            name: button.getAttribute("aria-label") ?? button.textContent?.trim() ?? "unnamed",
            width: Math.round(bounds.width * 10) / 10,
            height: Math.round(bounds.height * 10) / 10,
          };
        })
        .filter((target) => target.width < minimumTarget || target.height < minimumTarget);
      const horizontalOverflow = Math.max(
        0,
        browserDocument.documentElement.scrollWidth - browserDocument.documentElement.clientWidth,
      );
      const desktopAlignment = desktop
        ? {
            topSpread:
              Math.max(regions.arena.y, regions.evolution.y, regions.rack.y) -
              Math.min(regions.arena.y, regions.evolution.y, regions.rack.y),
            bottomSpread:
              Math.max(regions.arena.bottom, regions.evolution.bottom, regions.rack.bottom) -
              Math.min(regions.arena.bottom, regions.evolution.bottom, regions.rack.bottom),
            columnOrder: regions.evolution.x < regions.arena.x && regions.arena.x < regions.rack.x,
            arenaIsDominant:
              regions.arena.width > regions.evolution.width &&
              regions.arena.width > regions.rack.width,
          }
        : undefined;
      const mobileOrder = desktop
        ? undefined
        : regions.arena.y < regions.evolution.y && regions.evolution.y < regions.rack.y;
      const mobileEvolutionDeadSpace = desktop
        ? undefined
        : Math.max(0, regions.evolution.height - evolutionTabs.height - evolutionBody.height - 2);
      return {
        regions,
        undersizedTargets,
        horizontalOverflow,
        desktopAlignment,
        mobileOrder,
        mobileEvolutionDeadSpace,
      };
    },
    { desktop: viewport.width > 960, minimumTarget: 44 },
  );
}

function rectanglesOverlap(first, second) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

async function describedTooltip(page, trigger) {
  const describedBy =
    (await trigger.getAttribute("aria-describedby")) ??
    (await trigger.locator("[aria-describedby]").first().getAttribute("aria-describedby"));
  if (describedBy === null) throw new Error("Tooltip trigger lacks aria-describedby.");
  for (const id of describedBy.split(/\s+/)) {
    const candidate = page.locator(`#${id}`);
    if ((await candidate.count()) === 1 && (await candidate.getAttribute("role")) === "tooltip")
      return candidate;
  }
  throw new Error(`No tooltip role matches aria-describedby=${describedBy}.`);
}

async function tooltipEvidence(page, trigger, options = {}) {
  await trigger.scrollIntoViewIfNeeded();
  const isWrapper = await trigger.evaluate((element) =>
    element.matches(".help-tooltip, .action-tooltip"),
  );
  if (isWrapper) await trigger.hover();
  else await trigger.focus();
  const tooltip = await describedTooltip(page, trigger);
  await tooltip.waitFor({ state: "visible" });
  const [bounds, triggerBounds] = await Promise.all([tooltip.boundingBox(), trigger.boundingBox()]);
  if (bounds === null || triggerBounds === null)
    throw new Error("Tooltip or trigger has no rendered bounds.");
  const viewport = page.viewportSize();
  if (viewport === null) throw new Error("Tooltip capture viewport is unavailable.");
  const insideViewport =
    bounds.x >= 8 &&
    bounds.y >= 8 &&
    bounds.x + bounds.width <= viewport.width - 8 &&
    bounds.y + bounds.height <= viewport.height - 8;
  const textFits = await tooltip.evaluate(
    (element) =>
      element.scrollWidth <= element.clientWidth + 1 &&
      element.scrollHeight <= element.clientHeight + 1,
  );
  const outsideRack =
    options.rackBounds === undefined || bounds.x + bounds.width <= options.rackBounds.x + 16;
  return {
    bounds,
    triggerBounds,
    insideViewport,
    textFits,
    overlapsTrigger: rectanglesOverlap(bounds, triggerBounds),
    outsideRack,
    side: await tooltip.getAttribute("data-side"),
    text: (await tooltip.textContent())?.trim() ?? "",
  };
}

function conciseViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  };
}

async function accessibilityAudit(page, state) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = result.violations.map(conciseViolation);
  const seriousOrCritical = violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  const unresolvedHighImpact = result.incomplete.filter(
    (finding) =>
      finding.id !== "color-contrast" &&
      (finding.impact === "serious" || finding.impact === "critical"),
  );
  const evidence = {
    state,
    testedUrl: result.url,
    ruleCounts: {
      passes: result.passes.length,
      violations: violations.length,
      incomplete: result.incomplete.length,
      inapplicable: result.inapplicable.length,
    },
    violationNodeCount: result.violations.reduce(
      (total, violation) => total + violation.nodes.length,
      0,
    ),
    seriousOrCriticalRuleCount: seriousOrCritical.length,
    violations,
    incomplete: result.incomplete.map(conciseViolation),
  };
  if (seriousOrCritical.length > 0)
    throw new Error(`${state} has serious or critical Axe findings: ${JSON.stringify(evidence)}`);
  if (unresolvedHighImpact.length > 0)
    throw new Error(
      `${state} has unresolved high-impact Axe checks: ${JSON.stringify(unresolvedHighImpact)}`,
    );
  return evidence;
}

async function ariaEvidence(state, entries) {
  const snapshots = [];
  for (const entry of entries) {
    if ((await entry.locator.count()) !== 1)
      throw new Error(`${state} ARIA target is not unique: ${entry.name}`);
    snapshots.push({ name: entry.name, snapshot: await entry.locator.ariaSnapshot() });
  }
  return { state, snapshots };
}

async function screenshotEvidence(page, name, fullPage = false) {
  const filePath = path.join(OUTPUT_DIRECTORY, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage });
  return fileEvidence(filePath);
}

async function captureViewport(browser, url, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const evidence = await pageEvidence(page, viewport);
    if (evidence.horizontalOverflow !== 0)
      throw new Error(`${viewport.name} has ${evidence.horizontalOverflow}px horizontal overflow.`);
    if (evidence.desktopAlignment?.columnOrder === false)
      throw new Error(`${viewport.name} desktop columns are out of order.`);
    if (evidence.desktopAlignment?.arenaIsDominant === false)
      throw new Error(`${viewport.name} arena is not the dominant column.`);
    if (evidence.desktopAlignment && evidence.desktopAlignment.topSpread > 1)
      throw new Error(`${viewport.name} column tops differ by more than 1px.`);
    if (evidence.mobileOrder === false)
      throw new Error(`${viewport.name} mobile panels are out of order.`);
    if (evidence.mobileEvolutionDeadSpace !== undefined && evidence.mobileEvolutionDeadSpace > 8)
      throw new Error(
        `${viewport.name} evolution panel has ${evidence.mobileEvolutionDeadSpace}px of dead space.`,
      );
    if (evidence.undersizedTargets.length > 0)
      throw new Error(
        `${viewport.name} has undersized controls: ${JSON.stringify(evidence.undersizedTargets)}`,
      );
    const filePath = path.join(OUTPUT_DIRECTORY, `${viewport.name}_board.png`);
    await page.screenshot({ path: filePath, fullPage: viewport.fullPage });
    return { ...viewport, evidence, diagnostics, file: await fileEvidence(filePath) };
  } finally {
    await context.close();
  }
}

async function capturePrimaryInteractions(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const accessibility = [await accessibilityAudit(page, "opening")];
    const screenReader = [
      await ariaEvidence("opening", [
        { name: "game", locator: page.getByRole("main", { name: "Cancer Clicker NG" }) },
        { name: "divide", locator: page.getByRole("button", { name: "Divide cell" }) },
        { name: "format", locator: page.locator("#format-button") },
        {
          name: "producer quantity",
          locator: page.locator('[aria-label="Producer purchase quantity"]'),
        },
        { name: "stage advance", locator: page.locator(".stage-advance-button") },
      ]),
    ];
    const tooltip = await tooltipEvidence(
      page,
      page.getByRole("button", { name: "Stage evolution system" }),
    );
    if (!tooltip.insideViewport) throw new Error("Evolution tooltip escapes the desktop viewport.");
    const tooltipPath = path.join(OUTPUT_DIRECTORY, "desktop_tooltip.png");
    await page.screenshot({ path: tooltipPath });
    await page.keyboard.press("Escape");
    if (await page.getByRole("tooltip").isVisible())
      throw new Error("Escape did not dismiss the focused tooltip.");

    await page.getByRole("button", { name: "Open specimen details" }).click();
    await page.getByRole("dialog").waitFor({ state: "visible" });
    const drawerPath = path.join(OUTPUT_DIRECTORY, "desktop_inspector.png");
    await page.screenshot({ path: drawerPath });
    const drawerBox = await page.getByRole("dialog").boundingBox();
    if (drawerBox === null) throw new Error("Inspector drawer has no rendered bounds.");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Open specimen details" }).waitFor({ state: "visible" });

    const beforeCells = await page.getByLabel("Cell count", { exact: true }).textContent();
    await page.locator(".colony-cell__membrane").first().click();
    await page.locator(".tumor-feedback__division").waitFor({ state: "visible" });
    if ((await page.getByLabel("Cell count", { exact: true }).textContent()) === beforeCells)
      throw new Error("Successful division did not update the visible cell count.");
    const successFile = await screenshotEvidence(page, "desktop_success_feedback");
    accessibility.push(await accessibilityAudit(page, "success feedback"));
    screenReader.push(
      await ariaEvidence("success feedback", [
        { name: "cell count", locator: page.getByLabel("Cell count", { exact: true }) },
        { name: "recent rewards", locator: page.getByLabel("Recent rewards") },
      ]),
    );
    return {
      tooltip,
      drawerBox,
      accessibility,
      screenReader,
      diagnostics,
      files: [await fileEvidence(tooltipPath), await fileEvidence(drawerPath), successFile],
    };
  } finally {
    await context.close();
  }
}

function fileSlug(value) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 46);
  return slug.length > 0 ? slug : "unnamed";
}

async function tooltipTriggerLabel(trigger, index) {
  const describedControl = trigger.locator("[aria-describedby]").first();
  const ariaLabel = await describedControl.getAttribute("aria-label");
  if (ariaLabel?.trim()) return ariaLabel.trim();
  const visibleText = (await trigger.textContent())?.replace(/\s+/g, " ").trim();
  return visibleText || `tooltip ${index + 1}`;
}

async function captureTooltipCorpus(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  const views = ["Stage", "Hallmarks", "Routes", "Resets", "Culture", "Network"];
  const entries = [];
  const viewFiles = [];
  const accessibility = [];
  let sequence = 0;
  try {
    await page.addInitScript(() => {
      const nativeSetInterval = globalThis.setInterval.bind(globalThis);
      globalThis.setInterval = (handler, timeout, ...args) =>
        timeout === 250
          ? nativeSetInterval(() => undefined, 2_147_483_647)
          : nativeSetInterval(handler, timeout, ...args);
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator(".colony-cell__membrane").first().click();
    for (const view of views) {
      if (view !== "Stage") {
        await page.getByRole("button", { name: `${view} evolution system` }).click();
        await page.mouse.move(2, 2);
      }
      viewFiles.push(await screenshotEvidence(page, `desktop_${fileSlug(view)}_evolution`));
      accessibility.push(await accessibilityAudit(page, `${view.toLowerCase()} evolution view`));
      const scope =
        view === "Stage"
          ? ".help-tooltip, .action-tooltip"
          : ".game-board__evolution-content .help-tooltip, .game-board__evolution-content .action-tooltip";
      const wrappers = page.locator(scope);
      const count = await wrappers.count();
      for (let index = 0; index < count; index += 1) {
        const trigger = wrappers.nth(index);
        if (!(await trigger.isVisible())) continue;
        const label = await tooltipTriggerLabel(trigger, index);
        const rackBounds = (await trigger.evaluate(
          (element) => element.closest(".producer-row") !== null,
        ))
          ? await page.locator(".game-board__rack").boundingBox()
          : undefined;
        let evidence;
        try {
          evidence = await tooltipEvidence(page, trigger, {
            rackBounds: rackBounds ?? undefined,
          });
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          throw new Error(`${view} tooltip '${label}' could not be captured: ${detail}`, {
            cause: error,
          });
        }
        if (!evidence.insideViewport)
          throw new Error(`${view} tooltip '${label}' escapes the viewport.`);
        if (!evidence.textFits)
          throw new Error(`${view} tooltip '${label}' clips or scrolls its text.`);
        if (evidence.overlapsTrigger)
          throw new Error(`${view} tooltip '${label}' overlaps its trigger.`);
        if (!evidence.outsideRack)
          throw new Error(`${view} tooltip '${label}' obscures the upgrade rack.`);
        sequence += 1;
        const name = `tooltip_${String(sequence).padStart(2, "0")}_${fileSlug(view)}_${fileSlug(label)}`;
        const file = await screenshotEvidence(page, name);
        entries.push({ view, label, ...evidence, file });
        await page.mouse.move(2, 2);
        await page.keyboard.press("Escape");
        await describedTooltip(page, trigger).then((tooltip) =>
          tooltip.waitFor({ state: "hidden" }),
        );
      }
    }
    if (entries.length < 12)
      throw new Error(`Tooltip corpus is unexpectedly small: ${entries.length} captures.`);
    return {
      state: "tooltip corpus",
      visitedViews: views,
      entries,
      accessibility,
      diagnostics,
      files: [...viewFiles, ...entries.map((entry) => entry.file)],
    };
  } finally {
    await context.close();
  }
}

async function captureHighContrast(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    forcedColors: "active",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.goto(url, { waitUntil: "networkidle" });
    const forcedColors = await page.evaluate(
      () => globalThis.matchMedia("(forced-colors: active)").matches,
    );
    if (!forcedColors) throw new Error("High-contrast fixture did not activate forced colors.");
    const evidence = await pageEvidence(page, VIEWPORTS[3]);
    if (evidence.horizontalOverflow !== 0)
      throw new Error("High-contrast fixture has horizontal overflow.");
    const file = await screenshotEvidence(page, "desktop_high_contrast");
    return { state: "high contrast", forcedColors, evidence, diagnostics, file };
  } finally {
    await context.close();
  }
}

async function capturePersistenceError(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.addInitScript((key) => {
      const originalSetItem = Storage.prototype.setItem;
      globalThis.__visualRejectPersistence = false;
      Storage.prototype.setItem = function rejectVisualPersistence(candidateKey, value) {
        if (candidateKey === key && globalThis.__visualRejectPersistence)
          throw new Error("visual review storage write denied");
        return originalSetItem.call(this, candidateKey, value);
      };
    }, SAVE_KEY);
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      globalThis.__visualRejectPersistence = true;
    });
    await page.getByRole("button", { name: "Divide cell" }).press("Enter");
    await page.locator("#save-status").filter({ hasText: "Unsaved changes" }).waitFor();
    await page.locator("#game-status").filter({ hasText: "Progress is not saved" }).waitFor();
    const file = await screenshotEvidence(page, "desktop_persistence_error");
    const accessibility = await accessibilityAudit(page, "persistence error");
    const screenReader = await ariaEvidence("persistence error", [
      { name: "save status", locator: page.locator("#save-status") },
      { name: "live error", locator: page.locator("#game-status") },
    ]);
    return { state: "persistence error", diagnostics, file, accessibility, screenReader };
  } finally {
    await context.close();
  }
}

async function captureRecovery(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), {
      key: SAVE_KEY,
      raw: "{visual-review-unreadable-save",
    });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#recovery-notice").waitFor({ state: "visible" });
    if (!(await page.getByRole("button", { name: "Divide cell" }).isDisabled()))
      throw new Error("Recovery fixture did not disable gameplay actions.");
    const file = await screenshotEvidence(page, "desktop_save_recovery");
    const accessibility = await accessibilityAudit(page, "save recovery");
    const screenReader = await ariaEvidence("save recovery", [
      { name: "recovery alert", locator: page.locator("#recovery-notice") },
      {
        name: "replacement action",
        locator: page.getByRole("button", { name: "Replace unreadable save and start fresh" }),
      },
      { name: "disabled divide", locator: page.getByRole("button", { name: "Divide cell" }) },
    ]);
    return { state: "save recovery", diagnostics, file, accessibility, screenReader };
  } finally {
    await context.close();
  }
}

async function captureOfflineReturn(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const diagnostics = collectDiagnostics(page);
  try {
    await page.goto(`${url}?debug=1`, { waitUntil: "networkidle" });
    for (let count = 0; count < 10; count += 1)
      await page.locator(".colony-cell__membrane").first().click();
    const buy = page
      .locator('[data-producer-id="producer"]')
      .getByRole("button", { name: /^Buy 1 Cyclin D machine/ });
    await buy.click();
    await page.getByRole("button", { name: "Prepare 2-minute offline reload" }).click();
    await page.locator("#debug-outcome").filter({ hasText: "Prepared a 2-minute" }).waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("heading", { name: "Offline progress" }).waitFor();
    const file = await screenshotEvidence(page, "desktop_offline_return");
    const accessibility = await accessibilityAudit(page, "offline return");
    const screenReader = await ariaEvidence("offline return", [
      { name: "offline panel", locator: page.locator(".offline-panel") },
      { name: "cell count", locator: page.getByLabel("Cell count", { exact: true }) },
    ]);
    return { state: "offline return", diagnostics, file, accessibility, screenReader };
  } finally {
    await context.close();
  }
}

async function captureInteractionStates(browser, url) {
  const primary = await capturePrimaryInteractions(browser, url);
  const tooltipCorpus = await captureTooltipCorpus(browser, url);
  const states = [
    await captureHighContrast(browser, url),
    await capturePersistenceError(browser, url),
    await captureRecovery(browser, url),
    await captureOfflineReturn(browser, url),
  ];
  return {
    primary,
    tooltipCorpus,
    states,
    files: [...primary.files, ...tooltipCorpus.files, ...states.map((state) => state.file)],
    diagnostics: [
      ...primary.diagnostics,
      ...tooltipCorpus.diagnostics,
      ...states.flatMap((state) => state.diagnostics),
    ],
    accessibility: [
      ...primary.accessibility,
      ...tooltipCorpus.accessibility,
      ...states.flatMap((state) => ("accessibility" in state ? [state.accessibility] : [])),
    ],
    screenReader: [
      ...primary.screenReader,
      ...states.flatMap((state) => ("screenReader" in state ? [state.screenReader] : [])),
    ],
  };
}

function greenHue(color) {
  const [red, green, blue] = color.map((channel) => channel / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const delta = maximum - minimum;
  if (delta === 0) return false;
  const rawHue =
    maximum === red
      ? ((green - blue) / delta) % 6
      : maximum === green
        ? (blue - red) / delta + 2
        : (red - green) / delta + 4;
  const hue = (((rawHue * 60 + 360) % 360) + 360) % 360;
  const lightness = (maximum + minimum) / 2;
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  return hue >= 85 && hue <= 165 && saturation >= 0.22;
}

function greenTokens(line) {
  const candidates = [];
  for (const match of line.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const digits = match[1];
    const channels = [0, 2, 4].map((offset) =>
      Number.parseInt(digits.slice(offset, offset + 2), 16),
    );
    if (greenHue(channels)) candidates.push(match[0]);
  }
  for (const match of line.matchAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)/g)) {
    const channels = match.slice(1, 4).map(Number);
    if (greenHue(channels)) candidates.push(match[0]);
  }
  return candidates;
}

async function servedPaletteEvidence() {
  const html = await readFile(path.join(DIST_DIRECTORY, "index.html"), "utf8");
  const stylesheets = [...html.matchAll(/href="([^"]+\.css)"/g)].map((match) => match[1]);
  const assets = [...stylesheets, "main.js"];
  const namedGreenCandidates = [];
  const greenHueCandidates = [];
  for (const asset of assets) {
    const source = await readFile(path.join(DIST_DIRECTORY, asset), "utf8");
    source.split("\n").forEach((line, index) => {
      if (/\bgreen\b/i.test(line)) namedGreenCandidates.push(`${asset}:${index + 1}`);
      const tokens = greenTokens(line);
      if (tokens.length > 0) greenHueCandidates.push(`${asset}:${index + 1}: ${tokens.join(", ")}`);
    });
  }
  return { assets, namedGreenCandidates, greenHueCandidates };
}

function contactSheetHtml(captures, interactions) {
  const cards = [...captures.map((capture) => capture.file), ...interactions.files]
    .map((file) => {
      const name = path.basename(file.path);
      return `<figure><img src="${name}" alt="${name.replaceAll("_", " ").replace(".png", "")}"><figcaption>${name}</figcaption></figure>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Cancer Clicker NG visual review</title><style>
body{margin:0;padding:1rem;color:#fff4ed;background:#180d12;font:16px/1.45 system-ui,sans-serif}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,24rem),1fr));gap:1rem}figure{margin:0;padding:.65rem;border:1px solid #925b64;border-radius:.8rem;background:#2b161d}img{display:block;width:100%;height:auto;border-radius:.45rem}figcaption{padding-top:.45rem;color:#d2b5ad;font-weight:700}</style></head>
<body><h1>Cancer Clicker NG visual review</h1><p>Responsive boards plus a complete rendered-tooltip corpus, drawer, success, error, recovery, offline, and forced-colors states. See <code>manifest.json</code> for geometry, clipping, ARIA-tree, Axe, and interaction evidence.</p><main>${cards}</main></body></html>\n`;
}

async function verifyExisting() {
  const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
  const files = [
    ...manifest.captures.map((capture) => capture.file),
    ...manifest.interactions.files,
  ];
  for (const expected of files) {
    const actual = await fileEvidence(path.join(ROOT, expected.path));
    if (actual.bytes !== expected.bytes || actual.sha256 !== expected.sha256)
      throw new Error(`Visual-review artifact changed: ${expected.path}`);
  }
  await access(INDEX_PATH);
  console.log(`Verified ${files.length} screenshots and the visual-review contact sheet.`);
}

async function capture() {
  await access(path.join(DIST_DIRECTORY, "index.html"));
  await access(path.join(DIST_DIRECTORY, "main.js"));
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  // ASVS 5.3.2: remove only obsolete filenames owned by this fixed output directory.
  for (const name of LEGACY_CAPTURE_NAMES)
    await rm(path.join(OUTPUT_DIRECTORY, name), { force: true });
  const port = await availablePort();
  const url = `http://127.0.0.1:${port}/`;
  const server = spawn(
    "bash",
    [
      "-lc",
      `source source_me.sh && exec python3 -m http.server ${port} --bind 127.0.0.1 --directory dist`,
    ],
    { cwd: ROOT, stdio: "ignore" },
  );
  const browser = await chromium.launch({ headless: true });
  try {
    await waitForServer(url);
    const captures = [];
    for (const viewport of VIEWPORTS) captures.push(await captureViewport(browser, url, viewport));
    const interactions = await captureInteractionStates(browser, url);
    const palette = await servedPaletteEvidence();
    if (palette.namedGreenCandidates.length > 0 || palette.greenHueCandidates.length > 0)
      throw new Error(`Served green palette candidates remain: ${JSON.stringify(palette)}`);
    const diagnostics = [
      ...captures.flatMap((capture) => capture.diagnostics),
      ...interactions.diagnostics,
    ];
    if (diagnostics.length > 0) throw new Error(`Browser diagnostics:\n${diagnostics.join("\n")}`);
    const manifest = {
      schemaVersion: 3,
      generatedAt: new Date().toISOString(),
      productionArtifact: "dist",
      coverage: {
        viewports: VIEWPORTS.map(({ name, width, height }) => ({ name, width, height })),
        visualStates: [
          "opening",
          "tooltip",
          "tooltip corpus across all six evolution surfaces",
          "inspector",
          "success feedback",
          "persistence error",
          "save recovery",
          "offline return",
          "high contrast",
        ],
        notApplicable: {
          loading: "Static client shell has no asynchronous startup loading state.",
          permission:
            "Client-only game requests no device, account, or operating-system permission.",
        },
      },
      captures,
      interactions,
      palette,
      diagnostics,
    };
    await writeFile(INDEX_PATH, contactSheetHtml(captures, interactions), "utf8");
    await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    console.log(`Captured ${captures.length + interactions.files.length} review screenshots.`);
    console.log(
      `Open ${path.relative(ROOT, INDEX_PATH)} and inspect ${path.relative(ROOT, MANIFEST_PATH)}.`,
    );
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }
}

// ASVS 2.2.1: accept only the two closed tool modes; paths are never supplied by callers.
const args = process.argv.slice(2);
if (args.length === 0) await capture();
else if (args.length === 1 && args[0] === "--verify-existing") await verifyExisting();
else throw new Error("Usage: node tools/capture_visual_review.mjs [--verify-existing]");
