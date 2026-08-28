import { expect, test } from "@playwright/test";

import { passageUpgradeId, stageId } from "../../src/brands.ts";
import { generateNetworkFrontierV1 } from "../../src/prestige/network.ts";
import { createInitialGameState } from "../../src/state/game_state.ts";
import { serializeGameState } from "../../src/state/save_load.ts";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

function networkFixture() {
  const initial = createInitialGameState();
  const frontier = generateNetworkFrontierV1({
    networkSeed: 17,
    globalTier: 0,
    frontierSequence: 0,
    sourceEventSequence: 1,
  });
  const state = {
    ...initial,
    activeTimeMs: 100,
    eventSequence: 1,
    currentStage: stageId("global_lab_contamination"),
    prestigeAvailability: [
      { id: "L3", status: "earned" },
      { id: "L4", status: "earned" },
    ],
    lineageLedger: { ...initial.lineageLedger, networkSeed: 17 },
    network: { ...initial.network, pendingFrontier: frontier },
  };
  return serializeGameState(state, FIXED_CLOCK_MS);
}

function cultureFixture() {
  const initial = createInitialGameState();
  return serializeGameState(
    {
      ...initial,
      culture: {
        ...initial.culture,
        purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("cryobank"), rank: 1 }],
      },
    },
    FIXED_CLOCK_MS,
  );
}

async function seedSave(page, raw) {
  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: raw },
  );
}

async function expectCompactKeyboardAction(page, tab, actionName, dialogName) {
  await page.getByRole("button", { name: `${tab} evolution system` }).click();
  const action = page.getByRole("button", { name: actionName });
  await expect(action).toBeVisible();
  await expect(action).toBeEnabled();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) throw new Error(`${actionName} requires a bounding box.`);
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await action.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

test("the visible Deepen route owns its normal-pointer hit geometry at 1280x800", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.install({ time: FIXED_CLOCK_MS });
  await seedSave(page, networkFixture());
  await page.goto("/");
  await page.getByRole("button", { name: "Network evolution system" }).click();
  const route = page.getByRole("button", { name: "Deepen route" });
  await expect(route).toBeEnabled();
  const box = await route.boundingBox();
  expect(box).not.toBeNull();
  if (box === null) throw new Error("Visible Deepen route requires a bounding box.");
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  const ownsHitGrid = await route.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return [0.2, 0.5, 0.8].every((horizontal) =>
      [0.25, 0.5, 0.75].every((vertical) => {
        const hit = document.elementFromPoint(
          bounds.left + bounds.width * horizontal,
          bounds.top + bounds.height * vertical,
        );
        return hit === element || element.contains(hit);
      }),
    );
  });
  expect(ownsHitGrid).toBe(true);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const dialog = page.getByRole("dialog", { name: "Choose dissemination mandate" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(dialog).toBeHidden();
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(raw).not.toBeNull();
  const saved = JSON.parse(raw);
  expect(saved.state.network.activeCampaign.mandate.category).toBe("deepen");
  expect(saved.state.network.pendingFrontier).toBeNull();
});

test("Culture remains keyboard-operable without 360px overflow in reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: FIXED_CLOCK_MS });
    await seedSave(page, cultureFixture());
    await page.goto("/");
    await expectCompactKeyboardAction(page, "Culture", "Exploit select", "Select cryobank program");
    const saved = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY));
    expect(saved.state.culture.cryobankProgram).toBe("cryobank_exploit");
  } finally {
    await context.close();
  }
});

test("Network remains keyboard-operable without 360px overflow in reduced motion", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: FIXED_CLOCK_MS });
    await seedSave(page, networkFixture());
    await page.goto("/");
    await page.getByRole("button", { name: "Network evolution system" }).click();
    const action = page.getByRole("button", { name: "Primary establish" });
    await expect(action).toBeVisible();
    await expect(action).toBeEnabled();
    const box = await action.boundingBox();
    expect(box).not.toBeNull();
    if (box === null) throw new Error("Primary establish requires a bounding box.");
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await action.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".culture-network-action-status")).toHaveText(
      "Primary Lab established.",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const saved = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY));
    expect(saved.state.network.nodes[0].status).toBe("established");
  } finally {
    await context.close();
  }
});

test("Network names the recovery path when a node action cannot persist", async ({ page }) => {
  await page.clock.install({ time: FIXED_CLOCK_MS });
  await seedSave(page, networkFixture());
  await page.goto("/");
  await page.getByRole("button", { name: "Network evolution system" }).click();
  await page.evaluate((key) => {
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function blockedSave(storageKey, value) {
      if (storageKey === key) throw new Error("Test persistence failure.");
      nativeSetItem.call(this, storageKey, value);
    };
  }, SAVE_KEY);
  await page.getByRole("button", { name: "Primary establish" }).click();
  await expect(page.locator(".culture-network-action-status")).toHaveText(
    "Primary Lab was not established. Progress is not saved. Keep this tab open and try the action again.",
  );
});
