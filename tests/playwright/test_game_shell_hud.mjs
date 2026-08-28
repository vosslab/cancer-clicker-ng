import { expect, test } from "@playwright/test";

// Selector contract: named HUD status, evolution-system controls, and board regions
// (src/render/game_hud.tsx:24; src/render/evolution_dock.tsx:19; src/render/game_board.tsx:13).
test("the 1280 by 800 shell keeps a compact scoreboard and one active evolution family", async ({
  browser,
}) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const page = await context.newPage();
    await page.goto("/");

    const hud = page.locator(".game-hud");
    await expect(hud).toBeVisible();
    await expect(page.getByRole("status", { name: "Cell count", exact: true })).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Cell production rate", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#save-status")).toBeVisible();
    await expect(page.getByRole("button", { name: "Use full number names" })).toBeVisible();

    await expect(page.getByRole("region", { name: "Living tumor arena" })).toBeVisible();
    await expect(page.locator('[aria-label="Tumor progression"]')).toBeVisible();
    await expect(page.locator('[aria-label="Division apparatus store"]')).toBeVisible();

    const hallmarks = page.getByRole("button", { name: "Hallmarks evolution system" });
    await hallmarks.click();
    await expect(hallmarks).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#hallmark-tree-title")).toBeVisible();
    await expect(page.locator("#stage-title")).toHaveCount(0);

    const stage = page.getByRole("button", { name: "Stage evolution system" });
    await stage.click();
    await expect(stage).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#stage-title")).toBeVisible();
    await expect(page.locator("#hallmark-tree-title")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("the HUD routes biology prose through a focus-restoring specimen drawer", async ({ page }) => {
  await page.goto("/");
  const inspectorButton = page.getByRole("button", { name: "Open specimen details" });
  await inspectorButton.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading")).toBeVisible();
  await drawer.getByRole("button", { name: "Close inspector" }).click();
  await expect(drawer).toHaveCount(0);
  await expect(inspectorButton).toBeFocused();
});

test("the HUD save glyph distinguishes saved and unsaved without relying on color", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    globalThis.__rejectHudSave = false;
    Storage.prototype.setItem = function rejectHudSave(key, value) {
      if (globalThis.__rejectHudSave) throw new Error(`Storage write denied: ${key}`);
      return originalSetItem.call(this, key, value);
    };
  });
  await page.goto("/");

  const status = page.locator("#save-status");
  const savedGlyph = status.locator(".game-hud__save-glyph");
  await expect(status).toHaveAttribute("data-save-state", "saved");
  await expect(savedGlyph).toHaveText("\u2713");

  await page.evaluate(() => {
    globalThis.__rejectHudSave = true;
  });
  await page.getByRole("button", { name: "Divide cell" }).press("Enter");
  await expect(status).toHaveAttribute("data-save-state", "unsaved");
  await expect(savedGlyph).toHaveText("!");
});

test("desktop centers the tumor while narrow screens retain task and DOM order", async ({
  browser,
}) => {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const narrow = await browser.newContext({ viewport: { width: 360, height: 800 } });
  try {
    const desktopPage = await desktop.newPage();
    await desktopPage.goto("/");
    const desktopLayout = await desktopPage.locator(".game-board").evaluate((board) => {
      function boxFor(selector) {
        const element = board.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing board region: ${selector}`);
        const box = element.getBoundingClientRect();
        return { left: box.left, width: box.width };
      }
      return {
        evolution: boxFor(".game-board__evolution"),
        arena: boxFor(".game-board__arena"),
        rack: boxFor(".game-board__rack"),
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(desktopLayout.evolution.left).toBeLessThan(desktopLayout.arena.left);
    expect(desktopLayout.arena.left).toBeLessThan(desktopLayout.rack.left);
    expect(desktopLayout.arena.width).toBeGreaterThan(desktopLayout.evolution.width);
    expect(desktopLayout.arena.width).toBeGreaterThan(desktopLayout.rack.width);
    expect(desktopLayout.overflows).toBe(false);

    const narrowPage = await narrow.newPage();
    await narrowPage.goto("/");
    const narrowLayout = await narrowPage.locator(".game-board").evaluate((board) => {
      function topFor(selector) {
        const element = board.querySelector(selector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing board region: ${selector}`);
        return element.getBoundingClientRect().top;
      }
      return {
        tops: [
          topFor(".game-board__arena"),
          topFor(".game-board__evolution"),
          topFor(".game-board__rack"),
          topFor(".game-board__rewards"),
        ],
        overflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(narrowLayout.tops).toEqual([...narrowLayout.tops].sort((left, right) => left - right));
    expect(narrowLayout.overflows).toBe(false);
  } finally {
    await desktop.close();
    await narrow.close();
  }
});
