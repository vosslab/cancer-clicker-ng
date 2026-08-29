import { expect, test } from "@playwright/test";

// Selector contract: accessible evolution controls and the hallmark program heading
// (src/render/evolution_dock.tsx:19; src/render/hallmark_tree.tsx:887).
test("evolution dock presents full hallmark names without overlapping tooltip prose", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Transformed cell" })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "Local cluster cells" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Advance" })).toBeDisabled();
  await expect(page.getByRole("heading", { name: "Hallmark programs" })).toHaveCount(0);

  await page.getByRole("button", { name: "Hallmarks evolution system" }).click();
  await expect(page.getByRole("heading", { name: "Hallmark programs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Transformed cell" })).toHaveCount(0);

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
