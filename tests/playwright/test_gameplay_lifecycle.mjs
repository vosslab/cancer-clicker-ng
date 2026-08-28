import { expect, test } from "@playwright/test";

const SAVE_KEY = "cancer-clicker-ng.save.v2";

// This walkthrough shares the production persistence story; keep its browser actions serial.
test.describe.configure({ mode: "serial" });

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

async function earnAndBuyCyclin(page) {
  const cell = page.locator("#divide-button [data-colony-cell]").first();
  for (let count = 0; count < 10; count += 1) await cell.click();
  const cyclin = page.locator('[data-producer-id="producer"]');
  const buyOne = cyclin.getByRole("button", { name: "Buy 1", exact: true });
  await expect(buyOne).toBeEnabled();
  await cyclin.evaluate((element) => {
    globalThis.__gameplayCyclinRow = element;
  });
  await buyOne.click();
  await expect
    .poll(() => cyclin.evaluate((element) => element === globalThis.__gameplayCyclinRow))
    .toBe(true);
  return { cyclin, buyOne };
}

async function measureVisibleActionTargets(page) {
  const controls = page.getByRole("main", { name: "Cancer Clicker NG" }).getByRole("button");
  const measurements = await controls.evaluateAll((elements) =>
    elements
      .map((element) => {
        const rectangle = element.getBoundingClientRect();
        return {
          label: element.textContent?.trim() ?? "",
          width: rectangle.width,
          height: rectangle.height,
          disabled: element instanceof HTMLButtonElement && element.disabled,
        };
      })
      .filter((measurement) => measurement.width > 0 && measurement.height > 0),
  );
  return measurements;
}

function expectAccessibleActionTargets(measurements, viewport) {
  expect(measurements.length, `${viewport}: visible action target count`).toBeGreaterThan(0);
  expect(
    measurements.some((measurement) => measurement.disabled),
    `${viewport}: disabled target`,
  ).toBe(true);
  expect(
    measurements.some((measurement) => !measurement.disabled),
    `${viewport}: enabled target`,
  ).toBe(true);
  for (const measurement of measurements) {
    expect(measurement.width, `${viewport}: ${measurement.label} width`).toBeGreaterThanOrEqual(44);
    expect(measurement.height, `${viewport}: ${measurement.label} height`).toBeGreaterThanOrEqual(
      44,
    );
  }
}

test("gameplay lifecycle production dist is playable, persistent, accessible, and free of browser errors", async ({
  page,
}, testInfo) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/");

  await expect(page.getByRole("main", { name: "Cancer Clicker NG" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cancer Clicker NG" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeVisible();
  await expect(page.locator("#debug-controls")).toHaveCount(0);
  await expect(page.locator("#save-status")).toHaveText("Progress saved locally");

  const initialCells = await page.getByLabel("Cell count").textContent();
  await page.getByRole("button", { name: "Divide cell" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Cell count")).not.toHaveText(initialCells ?? "");
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeFocused();

  const { cyclin, buyOne } = await earnAndBuyCyclin(page);
  await expect(cyclin).toContainText("Level 1");
  await expect(buyOne).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Offline progress" })).toHaveCount(0);
  await expect(page.locator('[data-producer-id="producer"]')).toContainText("Level 1");
  await expect(page.getByRole("button", { name: "Buy 1", exact: true }).first()).toBeEnabled();

  const storage = await page.evaluate(
    (key) => ({
      keys: Object.keys(window.localStorage),
      value: window.localStorage.getItem(key),
    }),
    SAVE_KEY,
  );
  expect(storage.value).not.toBeNull();
  const envelope = JSON.parse(storage.value);
  expect(envelope).toMatchObject({ version: 2, progressionVersion: 4 });
  expect(storage.keys).toEqual([SAVE_KEY]);
  expect(JSON.stringify(envelope)).not.toContain('"password"');
  expect(JSON.stringify(envelope)).not.toContain('"token"');
  await page.screenshot({ path: testInfo.outputPath("gameplay_lifecycle.png"), fullPage: true });
  expect(diagnostics).toEqual([]);
});

test("gameplay lifecycle production dist exposes debug mutation controls only on the explicit URL flag", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/?debug=1");

  const debug = page.getByRole("region", { name: "Debug controls" });
  await expect(debug).toBeVisible();
  await expect(debug.getByRole("button", { name: "Fast-forward 60 seconds" })).toBeVisible();
  await expect(
    debug.getByRole("button", { name: "Prepare 2-minute offline reload" }),
  ).toBeVisible();
  await expect(debug.getByRole("button", { name: "Reverse producer order" })).toBeVisible();
  await expect(debug.getByRole("button", { name: "Toggle lifecycle probe" })).toBeVisible();
  await expect(debug.getByRole("button", { name: "Run hostile event check" })).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("min-width", "320px");

  const beforeHostile = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  await debug.getByRole("button", { name: "Run hostile event check" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Hostile event rejected" }),
  ).toBeVisible();
  await expect(page.locator("#save-status")).toHaveText("Progress saved locally");
  await expect
    .poll(() => page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY))
    .toEqual(beforeHostile);

  const lifecycle = page.getByRole("button", { name: "Toggle lifecycle probe" });
  await expect(page.locator("#debug-lifecycle-probe")).toBeVisible();
  await lifecycle.click();
  await expect(page.locator("#debug-lifecycle-probe")).toHaveCount(0);
  await expect(page.locator("#debug-cleanup-count")).toContainText("1");

  await earnAndBuyCyclin(page);
  const cyclinBuy = page
    .locator('[data-producer-id="producer"]')
    .getByRole("button", { name: "Buy 1", exact: true });
  await cyclinBuy.focus();
  await page.keyboard.press("Alt+R");
  await expect(cyclinBuy).toBeFocused();
  await expect(page.locator("#producer-list li").first()).toHaveAttribute(
    "data-producer-id",
    "replication_fork",
  );

  const beforeIdle = await page.getByLabel("Cell count").textContent();
  await debug.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
  await expect(page.getByLabel("Cell count")).not.toHaveText(beforeIdle ?? "");
  expect(diagnostics).toEqual([]);
});

test("gameplay lifecycle production dist awards meaningful offline production through the debug reload control", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/?debug=1");
  const { cyclin } = await earnAndBuyCyclin(page);
  const beforeOffline = await page.getByLabel("Cell count").textContent();
  await page.getByRole("button", { name: "Prepare 2-minute offline reload" }).click();
  await expect(page.locator("#debug-outcome")).toContainText("Prepared a 2-minute offline reload");
  await page.reload();

  const offlinePanel = page.locator(".offline-panel");
  await expect(page.getByRole("heading", { name: "Offline progress" })).toBeVisible();
  await expect(offlinePanel).toContainText(/Applied 1[2-9]\d{4,} ms/);
  await expect(page.getByLabel("Cell count")).not.toHaveText(beforeOffline ?? "");
  await expect(cyclin).toContainText("Level 1");
  expect(diagnostics).toEqual([]);
});

test("gameplay lifecycle production dist reports clock skew separately and visibly protects corrupt storage", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/");
  await page.locator("#divide-button [data-colony-cell]").first().click();
  const saved = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  expect(saved).not.toBeNull();
  const skewed = JSON.parse(saved);
  skewed.savedAtMs = Date.now() + 60_000;
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: JSON.stringify(skewed),
  });
  await page.goto("/?debug=1");
  await expect(page.getByRole("heading", { name: "Offline progress" })).toBeVisible();
  await expect(page.locator(".offline-panel")).toContainText("Clock skew");

  await page.addInitScript((key) => window.localStorage.setItem(key, "{not-json"), SAVE_KEY);
  await page.goto("/?debug=1");
  await expect(page.locator("#recovery-notice")).toBeVisible();
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Replace unreadable save and start fresh" }),
  ).toBeVisible();
  expect(diagnostics).toEqual([]);
});

test("gameplay lifecycle production dist remains usable at a narrow reduced-motion viewport", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const diagnostics = installDiagnostics(page);
  await page.goto("/");

  const divide = page.getByRole("button", { name: "Divide cell" });
  await expect(divide).toBeVisible();
  await page.locator("#divide-button [data-colony-cell]").first().click();
  await expect(page.getByLabel("Cell count")).toContainText("1");
  await expect(page.locator(".game-board")).toBeVisible();
  await expect(page.locator("#producer-list")).toBeVisible();
  expect(diagnostics).toEqual([]);
  await context.close();
});

test("gameplay lifecycle production action targets meet the 44px contract without narrow overflow", async ({
  browser,
}) => {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const narrow = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    for (const [name, context] of [
      ["desktop", desktop],
      ["narrow", narrow],
    ]) {
      const page = await context.newPage();
      await page.goto("/");
      await earnAndBuyCyclin(page);
      const measurements = await measureVisibleActionTargets(page);
      expectAccessibleActionTargets(measurements, name);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflows, `${name}: document must not horizontally overflow`).toBe(false);
      if (name === "narrow") {
        await expect(page.getByRole("button", { name: "Divide cell" })).toBeVisible();
        await expect(page.locator("#producer-list")).toBeVisible();
      }
    }
  } finally {
    await desktop.close();
    await narrow.close();
  }
});
