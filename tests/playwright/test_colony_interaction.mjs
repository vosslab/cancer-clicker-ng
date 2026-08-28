import { expect, test } from "@playwright/test";

// Selector contract: the direct divide action, visible cell targets, and saved cell count
// (src/render/tumor_arena.tsx:133; src/render/colony_panel.tsx:74; src/state/save_load.ts:152).
const SAVE_KEY = "cancer-clicker-ng.save.v2";

function savedCellCount(raw) {
  if (raw === null) return 0;
  const envelope = JSON.parse(raw);
  return envelope.state.cells.mantissa * 10 ** envelope.state.cells.exponent;
}

async function readSavedCellCount(page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  return savedCellCount(raw);
}

async function expectInViewport(page, selectors) {
  const visibility = await page.evaluate(
    (requestedSelectors) =>
      requestedSelectors.map((selector) => {
        const element = document.querySelector(selector);
        if (element === null) return { selector, visible: false };
        const box = element.getBoundingClientRect();
        return {
          selector,
          visible:
            box.width > 0 && box.height > 0 && box.top >= 0 && box.bottom <= window.innerHeight,
        };
      }),
    selectors,
  );
  expect(visibility).toEqual(selectors.map((selector) => ({ selector, visible: true })));
}

async function clickVisibleSvgPath(page, selector) {
  const point = await page.locator(selector).evaluate((node) => {
    if (!(node instanceof SVGPathElement)) throw new Error("Expected an SVG path.");
    const matrix = node.getScreenCTM();
    if (matrix === null) throw new Error("Visible SVG path requires a screen transform.");
    const bounds = node.getBBox();
    let local;
    for (let y = Math.ceil(bounds.y); y < bounds.y + bounds.height; y += 1) {
      for (let x = Math.ceil(bounds.x); x < bounds.x + bounds.width; x += 1) {
        const candidate = new DOMPoint(x, y);
        if (node.isPointInFill(candidate)) {
          local = candidate;
          break;
        }
      }
      if (local !== undefined) break;
    }
    if (local === undefined) throw new Error("Visible SVG path requires a painted interior.");
    const screen = new DOMPoint(local.x, local.y).matrixTransform(matrix);
    return { x: Math.floor(screen.x), y: Math.floor(screen.y) };
  });
  const targetsCell = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-colony-cell]") !== null,
    point,
  );
  const colonyPoint = await page.locator("svg.colony-figure").evaluate((figure, screenPoint) => {
    const matrix = figure.getScreenCTM();
    if (matrix === null) throw new Error("Expected colony SVG transform.");
    const mapped = new DOMPoint(screenPoint.x, screenPoint.y).matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }, point);
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  return { point, colonyPoint, targetsCell };
}

test("the 1280 by 800 colony board keeps its primary clicker surfaces visible and actionable", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Divide cell" })).toBeVisible();
    await expect(page.getByLabel("Cell count", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Cell production rate", { exact: true })).toBeVisible();
    await expect(page.locator('[aria-label="Tumor progression"]')).toBeVisible();
    await expect(page.locator('[aria-label="Division apparatus store"]')).toBeVisible();
    await expect(page.locator('[aria-label="Producer purchase quantity"]')).toBeVisible();
    await expect(page.locator("#stage-title")).toBeVisible();
    await expect(page.locator("#producers-title")).toBeVisible();
    await expect(page.locator("#save-status")).toBeVisible();

    const firstProducer = page.locator("[data-producer-id]").first();
    await expect(firstProducer).toContainText(/Owned level \d+/);
    await expect(firstProducer).toContainText(/\d+(?:\.\d+)? cells\/s/);
    await expect(firstProducer).toContainText(/Next 1 cost:/);
    await expect(firstProducer).toContainText(/affordable|unavailable/);

    await expectInViewport(page, [
      ".colony-panel__action",
      '[aria-label="Tumor progression"]',
      '[aria-label="Division apparatus store"]',
      '[aria-label="Producer purchase quantity"]',
      "#stage-title",
      "#producers-title",
      "#save-status",
    ]);
    const storeScrolling = await page.locator(".producers-panel").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      return {
        scrollable: element.scrollHeight > element.clientHeight,
        scrolled: element.scrollTop > 0,
      };
    });
    expect(storeScrolling.scrollable).toBe(true);
    expect(storeScrolling.scrolled).toBe(true);
    await expect(page.locator("[data-producer-id]").last()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
  } finally {
    await context.close();
  }
});

test("visible cells accept pointer division while tissue whitespace stays inert and keyboard uses one native action", async ({
  page,
}) => {
  await page.goto("/");
  const action = page.getByRole("button", { name: "Divide cell" });
  const cell = action.locator(".colony-cell__membrane").first();
  const whitespace = action.locator(".colony-figure__plate");

  await expect(cell).toBeVisible();
  await cell.click();
  expect(await readSavedCellCount(page)).toBe(1);

  await whitespace.click({ position: { x: 8, y: 8 } });
  expect(await readSavedCellCount(page)).toBe(1);

  await action.focus();
  await page.keyboard.press("Enter");
  expect(await readSavedCellCount(page)).toBe(2);
  await expect(action).toBeFocused();

  await page.keyboard.press("Space");
  expect(await readSavedCellCount(page)).toBe(3);
  await expect(action).toBeFocused();
});

test("compact reduced-motion cell membranes and nuclei each divide once while tissue remains inert", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const action = page.getByRole("button", { name: "Divide cell" });
    const membrane = action.locator(".colony-cell__membrane").first();
    const nucleus = action.locator(".colony-cell__nucleus").first();
    const whitespace = action.locator(".colony-figure__plate");

    await expect(membrane).toBeVisible();
    await expect(nucleus).toBeVisible();
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
    expect((await clickVisibleSvgPath(page, ".colony-cell__membrane")).targetsCell).toBe(true);
    expect(await readSavedCellCount(page)).toBe(1);

    expect((await clickVisibleSvgPath(page, ".colony-cell__nucleus")).targetsCell).toBe(true);
    expect(await readSavedCellCount(page)).toBe(2);

    await whitespace.click({ position: { x: 8, y: 8 } });
    expect(await readSavedCellCount(page)).toBe(2);

    await action.focus();
    await page.keyboard.press("Enter");
    expect(await readSavedCellCount(page)).toBe(3);
    await page.keyboard.press("Space");
    expect(await readSavedCellCount(page)).toBe(4);
    await expect(action).toBeFocused();
  } finally {
    await context.close();
  }
});

test("recovery and failed persistence preserve the saved state and tell the player what happened", async ({
  browser,
}) => {
  const recovery = await browser.newContext();
  const persistence = await browser.newContext();
  try {
    const recoveryPage = await recovery.newPage();
    await recoveryPage.addInitScript(
      (key) => localStorage.setItem(key, "{unreadable-colony-save"),
      SAVE_KEY,
    );
    await recoveryPage.goto("/");
    const recoveryAction = recoveryPage.getByRole("button", { name: "Divide cell" });
    const recoveryCells = await recoveryPage
      .getByLabel("Cell count", { exact: true })
      .textContent();
    await expect(recoveryAction).toBeDisabled();
    await recoveryAction.click({ force: true });
    await expect(recoveryPage.getByLabel("Cell count", { exact: true })).toHaveText(
      recoveryCells ?? "",
    );
    expect(await recoveryPage.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(
      "{unreadable-colony-save",
    );

    const persistencePage = await persistence.newPage();
    await persistencePage.addInitScript((key) => {
      const originalSetItem = Storage.prototype.setItem;
      globalThis.__rejectColonyPersistence = false;
      Storage.prototype.setItem = function rejectColonyPersistence(candidateKey, value) {
        if (candidateKey === key && globalThis.__rejectColonyPersistence) {
          throw new Error("storage write denied");
        }
        return originalSetItem.call(this, candidateKey, value);
      };
    }, SAVE_KEY);
    await persistencePage.goto("/");
    const beforeRaw = await persistencePage.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
    const failedDivisionFeedback = persistencePage.locator(".tumor-feedback__division");
    const failedRewardFeedback = persistencePage.locator(".tumor-arena .reward-feedback");
    await expect(failedDivisionFeedback).toHaveCount(0);
    await expect(failedRewardFeedback).toHaveAttribute("data-reward-sequence", "0");
    await persistencePage.evaluate(() => {
      globalThis.__rejectColonyPersistence = true;
    });
    await persistencePage.getByRole("button", { name: "Divide cell" }).press("Enter");
    await expect(persistencePage.getByLabel("Cell count", { exact: true })).toHaveText(
      /0(?:\.0+)? cells/,
    );
    await expect(persistencePage.locator("#save-status")).toContainText("Unsaved changes");
    await expect(persistencePage.locator("#game-status")).toContainText("Progress is not saved");
    await expect(failedDivisionFeedback).toHaveCount(0);
    await expect(failedRewardFeedback).toHaveAttribute("data-reward-sequence", "0");
    expect(await persistencePage.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(
      beforeRaw,
    );
  } finally {
    await recovery.close();
    await persistence.close();
  }
});

test("a successful direct-cell gesture exposes bounded arena feedback while tissue stays inert", async ({
  page,
}) => {
  await page.goto("/");
  const action = page.getByRole("button", { name: "Divide cell" });
  const tissue = action.locator(".colony-figure__plate");

  await action.focus();
  await expect(page.locator(".tumor-arena .help-tooltip-content")).toHaveText(
    "Divide a visible cell",
  );
  const reward = page.locator(".tumor-arena .reward-feedback");
  const beforeRewardSequence = await reward.getAttribute("data-reward-sequence");
  const click = await clickVisibleSvgPath(page, ".colony-cell__membrane");
  expect(click.targetsCell).toBe(true);
  expect(await readSavedCellCount(page)).toBe(1);
  const feedback = page.locator(".tumor-arena .tumor-feedback__division");
  await expect(feedback).toHaveCount(1);
  const feedbackPoint = await feedback.evaluate((node) => {
    const transform = node.getAttribute("transform");
    const match = transform?.match(/^translate\(([^ ]+) ([^)]+)\)$/);
    if (match === null || match === undefined) throw new Error("Expected feedback translation.");
    return { x: Number(match[1]), y: Number(match[2]) };
  });
  // Map before activation: the authoritative count update can change the
  // specimen's post-division layout, but feedback belongs at the accepted
  // pre-division cell coordinate.
  expect(feedbackPoint.x).toBeCloseTo(click.colonyPoint.x, 3);
  expect(feedbackPoint.y).toBeCloseTo(click.colonyPoint.y, 3);
  const acceptedRewardSequence = await reward.getAttribute("data-reward-sequence");
  expect(acceptedRewardSequence).not.toBe(beforeRewardSequence);

  await tissue.click({ position: { x: 8, y: 8 } });
  await expect(reward).toHaveAttribute("data-reward-sequence", acceptedRewardSequence ?? "");
});
