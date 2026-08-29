import { expect, test } from "@playwright/test";

// Selector contract: explicit progression goal and accessible mutation controls
// (src/render/evolution_dock.tsx:19; src/render/hallmark_tree.tsx:887).
test("evolution dock presents an explicit next goal and full hallmark names", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Transformed cell" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Build a microcolony" })).toBeVisible();
  await expect(page.locator("#stage-gate-label")).toContainText("Cells grown");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Advance to Microcolony" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Choose a growth trait" })).toHaveCount(0);

  await page.getByRole("button", { name: "Hallmarks evolution system" }).click();
  await expect(page.getByRole("heading", { name: "Choose a growth trait" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transformed cell" })).toHaveCount(0);
  await expect(page.locator(".evolution-hallmarks__active-heading")).toContainText("Available now");

  const availableSigil = page.getByRole("button", {
    name: "Sustaining proliferative signaling, available",
  });
  await availableSigil.focus();
  await expect(availableSigil).toContainText("Sustaining proliferative signaling");
  const nameFit = await availableSigil
    .locator(".evolution-hallmarks__name")
    .evaluate((element) => ({
      widthFits: element.scrollWidth <= element.clientWidth + 1,
      heightFits: element.scrollHeight <= element.clientHeight + 1,
      whiteSpace: getComputedStyle(element).whiteSpace,
    }));
  expect(nameFit.widthFits).toBe(true);
  expect(nameFit.heightFits).toBe(true);
  expect(nameFit.whiteSpace).not.toBe("nowrap");
  await expect(
    page.getByRole("tooltip", { name: /Sustaining proliferative signaling/ }),
  ).toHaveCount(0);
  await availableSigil.click();
  await expect(
    page.getByRole("heading", { name: "Sustaining proliferative signaling" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Acquire" })).toBeVisible();
});
