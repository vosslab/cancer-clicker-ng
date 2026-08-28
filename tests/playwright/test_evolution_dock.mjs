import { expect, test } from "@playwright/test";

// Selector contract: accessible evolution controls and the hallmark program heading
// (src/render/evolution_dock.tsx:19; src/render/hallmark_tree.tsx:887).
test("evolution dock presents one compact decision family with focusable visual help", async ({
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
  await expect(
    page.getByRole("tooltip", { name: /Sustaining proliferative signaling/ }),
  ).toContainText("Unlocks at Transformed cell");
  await availableSigil.click();
  await expect(
    page.getByRole("heading", { name: "Sustaining proliferative signaling" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Acquire" })).toBeVisible();
});
