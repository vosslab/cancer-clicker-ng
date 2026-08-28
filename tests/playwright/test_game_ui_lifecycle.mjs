import { expect, test } from "@playwright/test";

// Selector contract: disabled advancement help, reward status, and the specimen drawer
// (src/render/stage_panel.tsx:177; src/render/reward_feedback.tsx:12; src/render/app.tsx:313).
test("reduced-motion reward feedback appears and a non-modal inspector closes from outside focus", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto("/");

    const lockedAdvanceHelp = page.locator('.evolution-stage .help-tooltip[aria-disabled="true"]');
    await expect(lockedAdvanceHelp).toBeVisible();
    await lockedAdvanceHelp.focus();
    await expect(lockedAdvanceHelp).toBeFocused();
    await expect(page.getByRole("button", { name: "Advance" })).toBeDisabled();
    await expect(lockedAdvanceHelp.locator(".help-tooltip-content")).toContainText(
      /Local cluster cells|Advance unavailable/,
    );

    await page.getByRole("button", { name: "Divide cell" }).click();
    const feedback = page.locator(".game-reward-dock__item");
    await expect(feedback).toHaveText("+1 cell");

    const invoker = page.getByRole("button", { name: "Open specimen details" });
    await invoker.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Divide cell" }).focus();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(invoker).toBeFocused();
  } finally {
    await context.close();
  }
});
