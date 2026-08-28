import { expect, test } from "@playwright/test";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const CORRUPT_RAW = "{save-recovery-save";

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

test("save recovery protects rejected raw storage until an accessible explicit replacement", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("save-recovery-seeded") !== "1") {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("save-recovery-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: CORRUPT_RAW },
  );
  await page.goto("/");

  const divide = page.getByRole("button", { name: "Divide cell" });
  const replace = page.getByRole("button", { name: "Replace unreadable save and start fresh" });
  const cells = page.getByLabel("Cell count");
  const initialCells = await cells.textContent();
  await expect(page.locator("#recovery-notice")).toHaveAttribute("role", "alert");
  await expect(replace).toBeVisible();
  await expect(divide).toBeDisabled();
  await expect(page.locator("#format-button")).toBeDisabled();
  await expect(page.locator(".purchase-controls button").first()).toBeDisabled();

  await divide.click({ force: true });
  await expect(cells).toHaveText(initialCells ?? "");
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(CORRUPT_RAW);

  await page.reload();
  await expect(page.locator("#recovery-notice")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)).toBe(CORRUPT_RAW);

  await replace.click();
  await expect(page.locator("#recovery-notice")).toHaveCount(0);
  await expect(divide).toBeEnabled();
  const validRaw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(validRaw).not.toBeNull();
  expect(validRaw).not.toBe(CORRUPT_RAW);
  expect(JSON.parse(validRaw)).toMatchObject({ version: 2, stateSchemaVersion: 8 });

  await divide.focus();
  await divide.press("Enter");
  const cellsAfterFirstSavedDivide = await cells.textContent();
  expect(cellsAfterFirstSavedDivide).not.toBe(initialCells);
  const savedRaw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(savedRaw).not.toBeNull();
  expect(JSON.parse(savedRaw)).toMatchObject({ version: 2, stateSchemaVersion: 8 });

  await page.reload();
  await expect(page.locator("#recovery-notice")).toHaveCount(0);
  await expect(divide).toBeEnabled();
  await expect(cells).toHaveText(cellsAfterFirstSavedDivide ?? "");
  const reloadedRaw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(reloadedRaw).not.toBeNull();
  expect(reloadedRaw).not.toBe(CORRUPT_RAW);
  expect(JSON.parse(reloadedRaw)).toMatchObject({ version: 2, stateSchemaVersion: 8 });

  await divide.focus();
  await divide.press("Enter");
  await expect(cells).not.toHaveText(cellsAfterFirstSavedDivide ?? "");
  expect(diagnostics).toEqual([]);
});

test("save recovery blocks a browser storage read fault until explicit fresh-start replacement", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.addInitScript((key) => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    globalThis.__saveRecoveryReadFaultActive = true;
    globalThis.__saveRecoveryWriteCount = 0;
    Storage.prototype.getItem = function getItemWithSaveRecoveryReadFault(candidateKey) {
      if (candidateKey === key && globalThis.__saveRecoveryReadFaultActive)
        throw new Error("read denied");
      return originalGetItem.call(this, candidateKey);
    };
    Storage.prototype.setItem = function countSaveRecoveryWrites(candidateKey, value) {
      if (candidateKey === key) globalThis.__saveRecoveryWriteCount += 1;
      return originalSetItem.call(this, candidateKey, value);
    };
  }, SAVE_KEY);
  await page.goto("/");

  const divide = page.getByRole("button", { name: "Divide cell" });
  const replace = page.getByRole("button", { name: "Start fresh and replace saved progress" });
  await expect(page.locator("#recovery-notice")).toContainText("could not be read");
  await expect(divide).toBeDisabled();
  await expect(replace).toBeVisible();
  await divide.click({ force: true });
  expect(await page.evaluate(() => globalThis.__saveRecoveryWriteCount)).toBe(0);

  await page.evaluate(() => {
    globalThis.__saveRecoveryReadFaultActive = false;
  });
  await replace.click();
  await expect(page.locator("#recovery-notice")).toHaveCount(0);
  await expect(divide).toBeEnabled();
  expect(await page.evaluate(() => globalThis.__saveRecoveryWriteCount)).toBe(1);
  await divide.focus();
  await divide.press("Enter");
  expect(await page.evaluate(() => globalThis.__saveRecoveryWriteCount)).toBe(2);
  expect(diagnostics).toEqual([]);
});
