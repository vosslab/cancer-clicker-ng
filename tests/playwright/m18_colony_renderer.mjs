import { expect, test } from "@playwright/test";

import { createInitialGameState } from "../../src/state/game_state.ts";
import { STAGE_IDS } from "../../src/state/catalog.ts";
import { serializeGameState } from "../../src/state/save_load.ts";
import { stageGateFixture } from "../stage_fixture.mjs";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const SEED_FAMILIES = [17, 91, 2026];
const SCREENSHOT_WIDTH = 1000;
const SCREENSHOT_HEIGHT = 700;
const STAGE_TITLES = {
  transformed_cell: "Transformed cell",
  microcolony: "Microcolony",
  avascular_lesion: "Avascular lesion",
  hypoxic_lesion: "Hypoxic lesion",
  angiogenic_primary: "Angiogenic primary",
  invasive_carcinoma: "Invasive carcinoma",
  intravasation: "Intravasation",
  micrometastatic_seeding: "Disseminated micrometastases",
  metastatic_burden: "Metastatic burden",
  host_collapse: "Host collapse",
  immortalized_culture: "Immortalized culture",
  global_lab_contamination: "Global lab contamination",
};

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

function savedStageGate(stage, seed) {
  const state =
    stage === "transformed_cell"
      ? createInitialGameState()
      : stageGateFixture(stage, { earnedL3: true });
  return serializeGameState({ ...state, deterministicSeed: seed }, Date.now());
}

async function seedStageGate(page, stage, seed) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (window.sessionStorage.getItem("m18-fixture-seeded") !== "1") {
        window.localStorage.setItem(key, raw);
        window.sessionStorage.setItem("m18-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: savedStageGate(stage, seed) },
  );
}

async function enterStage(page, stage, seed) {
  await seedStageGate(page, stage, seed);
  await page.goto("/?debug=1");
  if (stage !== "transformed_cell") {
    await page.getByRole("button", { name: `Advance to ${STAGE_TITLES[stage]}` }).click();
  }
  await expect(page.getByRole("heading", { name: STAGE_TITLES[stage] })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Colony morphology" })).toBeVisible();
}

async function inspectSvg(page) {
  const svg = page.locator("svg.colony-figure");
  await expect(svg).toHaveCount(1);
  await expect(svg).toHaveAttribute("role", "img");
  await expect(svg.locator("title")).toHaveCount(1);
  await expect(svg.locator("desc")).toHaveCount(1);
  await expect(page.locator(".colony-panel figcaption")).toBeVisible();
  const result = await svg.evaluate((element) => {
    const ids = [...element.querySelectorAll("[id]")].map((node) => node.id);
    const allNodes = [element, ...element.querySelectorAll("*")];
    const references = [];
    const localReference = /(?:url\(#|href=["']?#|aria-(?:labelledby|describedby)=)/;
    for (const node of allNodes) {
      for (const attribute of [...node.attributes]) {
        if (attribute.name === "id") continue;
        const value = attribute.value;
        if (/^(?:https?:|\/\/|data:)/i.test(value)) references.push({ external: value });
        if (localReference.test(`${attribute.name}=${value}`)) {
          const matches = value.match(/#([A-Za-z][\w:.-]*)/g) ?? [];
          const ariaIds =
            attribute.name === "aria-labelledby" || attribute.name === "aria-describedby"
              ? value.trim().split(/\s+/)
              : [];
          for (const match of matches) references.push({ local: match.slice(1) });
          for (const id of ariaIds) references.push({ local: id });
        }
      }
    }
    const boxes = allNodes.map((node) => {
      const box = node.getBoundingClientRect();
      return [box.x, box.y, box.width, box.height].every(Number.isFinite);
    });
    const focusable = element.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ).length;
    const handlers = allNodes.some((node) =>
      [...node.attributes].some((attribute) => attribute.name.toLowerCase().startsWith("on")),
    );
    const groups = [...element.querySelectorAll(":scope > g")].map(
      (node) => node.className.baseVal,
    );
    const box = element.getBoundingClientRect();
    return {
      ids,
      references,
      allFiniteBoxes: boxes.every(Boolean),
      focusable,
      handlers,
      groups,
      nodeCount: allNodes.length,
      serializedBytes: new TextEncoder().encode(element.outerHTML).length,
      box: { width: box.width, height: box.height },
    };
  });
  expect(new Set(result.ids).size).toBe(result.ids.length);
  expect(result.ids.every((id) => id.startsWith("ccng-"))).toBe(true);
  expect(result.references.filter((reference) => reference.external)).toEqual([]);
  for (const reference of result.references) {
    if (reference.local !== undefined) expect(result.ids).toContain(reference.local);
  }
  expect(result.allFiniteBoxes).toBe(true);
  expect(result.focusable).toBe(0);
  expect(result.handlers).toBe(false);
  expect(result.groups).toEqual([
    "colony-figure__backdrop",
    "colony-figure__regions",
    "colony-figure__cells",
    "colony-figure__foreground",
  ]);
  expect(result.nodeCount).toBeLessThanOrEqual(1050);
  expect(result.serializedBytes).toBeGreaterThan(1000);
  expect(result.box.width / result.box.height).toBeCloseTo(10 / 7, 3);
  return result;
}

test("M18 production renderer is an accessible, bounded static figure for every stage and seed family", async ({
  browser,
}, testInfo) => {
  const timings = [];
  for (const seed of SEED_FAMILIES) {
    for (const stage of STAGE_IDS) {
      const context = await browser.newContext({
        viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
        colorScheme: "dark",
      });
      try {
        const page = await context.newPage();
        const diagnostics = installDiagnostics(page);
        await page.addInitScript(() => {
          window.__m18LongTasks = [];
          if (typeof PerformanceObserver === "undefined") return;
          try {
            new PerformanceObserver((list) => {
              window.__m18LongTasks.push(
                ...list.getEntries().map((entry) => ({
                  duration: entry.duration,
                  startTime: entry.startTime,
                })),
              );
            }).observe({ type: "longtask", buffered: true });
          } catch {
            window.__m18LongTasks = undefined;
          }
        });
        const startedAt = performance.now();
        await enterStage(page, stage, seed);
        const inspection = await inspectSvg(page);
        const screenshotStartedAt = performance.now();
        await page.locator(".colony-panel").screenshot({
          path: testInfo.outputPath(`m18-${stage}-seed-${seed}.png`),
        });
        timings.push({
          stage,
          seed,
          renderMs: performance.now() - startedAt,
          screenshotMs: performance.now() - screenshotStartedAt,
          ...inspection,
          longTasks: await page.evaluate(() => window.__m18LongTasks ?? null),
        });
        expect(diagnostics, `${stage} seed ${seed}: browser diagnostics`).toEqual([]);
      } finally {
        await context.close();
      }
    }
  }
  const renderTimes = timings.map((entry) => entry.renderMs).sort((left, right) => left - right);
  const screenshotTimes = timings
    .map((entry) => entry.screenshotMs)
    .sort((left, right) => left - right);
  testInfo.attach("m18-render-timings.json", {
    body: JSON.stringify(
      {
        samples: timings,
        renderMedianMs: renderTimes[Math.floor(renderTimes.length / 2)],
        renderP95Ms: renderTimes[Math.floor(renderTimes.length * 0.95)],
        screenshotMedianMs: screenshotTimes[Math.floor(screenshotTimes.length / 2)],
        screenshotP95Ms: screenshotTimes[Math.floor(screenshotTimes.length * 0.95)],
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("M18 warm visible stage updates render within one frame without a long task", async ({
  browser,
}, testInfo) => {
  const samples = [];
  for (let repeat = 0; repeat < 5; repeat += 1) {
    const context = await browser.newContext({
      viewport: { width: SCREENSHOT_WIDTH, height: SCREENSHOT_HEIGHT },
      colorScheme: "dark",
    });
    try {
      const page = await context.newPage();
      const diagnostics = installDiagnostics(page);
      await page.addInitScript(() => {
        window.__m18LongTasks = [];
        if (typeof PerformanceObserver === "undefined") return;
        try {
          new PerformanceObserver((list) => {
            window.__m18LongTasks.push(
              ...list.getEntries().map((entry) => ({
                duration: entry.duration,
                startTime: entry.startTime,
              })),
            );
          }).observe({ type: "longtask", buffered: true });
        } catch {
          window.__m18LongTasks = undefined;
        }
      });
      await seedStageGate(page, "host_collapse", SEED_FAMILIES[repeat % SEED_FAMILIES.length]);
      await page.goto("/?debug=1");
      await expect(page.getByRole("heading", { name: "Metastatic burden" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Advance to Host collapse" })).toBeEnabled();
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))),
          ),
      );
      await page.evaluate(() => {
        window.__m18LongTasks = [];
        window.__m18WarmAction = undefined;
        function recordVisibleStageUpdate(event) {
          const target = event.target;
          if (!(target instanceof Element) || !target.closest(".stage-advance-button")) return;
          const startedAt = performance.now();
          queueMicrotask(() => {
            const finishedAt = performance.now();
            window.__m18WarmAction = {
              durationMs: finishedAt - startedAt,
              startedAt,
              finishedAt,
            };
          });
          window.removeEventListener("click", recordVisibleStageUpdate, true);
        }
        window.addEventListener("click", recordVisibleStageUpdate, true);
      });
      await page.getByRole("button", { name: "Advance to Host collapse" }).click();
      await expect(page.getByRole("heading", { name: "Host collapse" })).toBeVisible();
      const sample = await page.evaluate(() => {
        return {
          durationMs: window.__m18WarmAction?.durationMs ?? Number.NaN,
          startedAt: window.__m18WarmAction?.startedAt ?? Number.NaN,
          finishedAt: window.__m18WarmAction?.finishedAt ?? Number.NaN,
          longTasks: window.__m18LongTasks ?? null,
        };
      });
      samples.push(sample);
      expect(diagnostics, `warm repeat ${repeat}: browser diagnostics`).toEqual([]);
    } finally {
      await context.close();
    }
  }
  const durations = samples.map((sample) => sample.durationMs).sort((left, right) => left - right);
  const allLongTasks = samples.flatMap((sample) => sample.longTasks ?? []);
  testInfo.attach("m18-warm-render-timings.json", {
    body: JSON.stringify(
      {
        samples,
        medianMs: durations[Math.floor(durations.length / 2)],
        p95Ms: durations[Math.floor(durations.length * 0.95)],
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(durations.every(Number.isFinite)).toBe(true);
  expect(
    durations[Math.floor(durations.length / 2)],
    `M18 warm update durations (ms): ${JSON.stringify(durations)}`,
  ).toBeLessThan(16.7);
  expect(
    allLongTasks.every((entry) => entry.duration <= 50),
    `M18 warm-update long tasks: ${JSON.stringify(allLongTasks)}`,
  ).toBe(true);
});

test("M18 production renderer keeps the complete figure visible at 360px, in neutral light, and under reduced motion", async ({
  browser,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  try {
    const page = await context.newPage();
    const diagnostics = installDiagnostics(page);
    await enterStage(page, "metastatic_burden", 2026);
    await page
      .locator(".colony-panel")
      .evaluate((panel) => panel.classList.add("is-neutral-light"));
    const inspection = await inspectSvg(page);
    const responsive = await page.evaluate(() => {
      const figure = document.querySelector("svg.colony-figure");
      const computed = figure === null ? undefined : getComputedStyle(figure);
      const box = figure?.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        animation: computed?.animationName,
        transition: computed?.transitionDuration,
        width: box?.width,
        height: box?.height,
        visible: box !== undefined && box.width > 0 && box.height > 0,
      };
    });
    expect(responsive.overflow).toBe(false);
    expect(responsive.reduced).toBe(true);
    expect(responsive.animation).toBe("none");
    expect(Number.parseFloat(responsive.transition)).toBeLessThanOrEqual(0.01);
    expect(responsive.visible).toBe(true);
    expect(responsive.width / responsive.height).toBeCloseTo(10 / 7, 3);
    expect(inspection.box.width).toBeLessThanOrEqual(320);
    await page.locator(".colony-panel").screenshot({
      path: testInfo.outputPath("m18-responsive-neutral-light.png"),
    });
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
