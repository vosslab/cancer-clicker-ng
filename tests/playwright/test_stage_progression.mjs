import { expect, test } from "@playwright/test";

import { stageGateFixtureSave } from "../stage_fixture.mjs";

// Selector contract: stage navigation uses its accessible Advance control and durable game storage
// (src/render/stage_panel.tsx:177; src/state/save_load.ts:152).
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

async function installFixedClock(page) {
  await page.clock.install({ time: FIXED_CLOCK_MS });
}
const STAGES = [
  ["microcolony", "Microcolony"],
  ["avascular_lesion", "Avascular lesion"],
  ["hypoxic_lesion", "Hypoxic lesion"],
  ["angiogenic_primary", "Angiogenic primary"],
  ["invasive_carcinoma", "Invasive carcinoma"],
  ["intravasation", "Intravasation"],
  ["micrometastatic_seeding", "Disseminated micrometastases"],
  ["metastatic_burden", "Metastatic burden"],
  ["host_collapse", "Host collapse"],
  ["immortalized_culture", "Immortalized culture"],
  ["global_lab_contamination", "Global lab contamination"],
];

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

function currentSaveForFixture(targetStageId, options) {
  const envelope = JSON.parse(stageGateFixtureSave(targetStageId, options));
  envelope.savedAtMs = FIXED_CLOCK_MS;
  return JSON.stringify(envelope);
}

async function rewardSequence(page) {
  const feedback = page.locator(".tumor-arena .reward-feedback");
  const value = await feedback.getAttribute("data-reward-sequence");
  if (value === null) throw new Error("Division feedback sequence is unavailable.");
  return Number(value);
}

async function seedStageGate(page, targetStageId, options) {
  const raw = currentSaveForFixture(targetStageId, options);
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: raw,
  });
}

test("stage progression stage panel turns the early gate into an accessible persisted transition", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await page.goto("/");

  const stage = page.locator(".evolution-stage");
  await expect(stage.getByRole("heading", { name: "Transformed cell" })).toBeVisible();
  await expect(stage.getByRole("progressbar")).toBeVisible();
  const advance = stage.getByRole("button", { name: "Advance" });
  await expect(advance).toBeDisabled();
  const divide = page.getByRole("button", { name: "Divide cell" });
  await divide.focus();
  for (let count = 0; count < 10; count += 1) await page.keyboard.press("Enter");
  await expect(advance).toBeEnabled();
  const transformedProjectionCount = await page.locator(".colony-cell__membrane").count();
  await advance.click();
  await expect(page.getByRole("heading", { name: "Microcolony" })).toBeVisible();
  await expect
    .poll(() => page.locator(".colony-cell__membrane").count())
    .toBeGreaterThan(transformedProjectionCount);
  await expect(
    page.locator(".stage-transition-emphasis [data-stage-transition='microcolony']"),
  ).toHaveCount(1);
  const rewardFeedback = page.locator(".tumor-arena .reward-feedback");
  await expect(rewardFeedback).toHaveAttribute("data-reward-sequence", "10");
  await page.locator(".colony-cell__membrane").first().click();
  await expect(rewardFeedback).toHaveAttribute("data-reward-sequence", "11");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Microcolony" })).toBeVisible();
  expect(diagnostics).toEqual([]);
});

test("stage progression production stage control reaches every seeded gate through its real event funnel", async ({
  browser,
}) => {
  for (const [stageId, title] of STAGES) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await installFixedClock(page);
      const diagnostics = installDiagnostics(page);
      await seedStageGate(page, stageId);
      await page.goto("/?debug=1");
      const advance = page.locator(".evolution-stage").getByRole("button", { name: "Advance" });
      await expect(advance).toBeEnabled();
      await advance.click();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      const livingCell = page
        .getByRole("button", { name: "Divide cell" })
        .locator("[data-colony-cell]")
        .first();
      await expect(livingCell).toBeVisible();
      const sequenceBeforeDivision = await rewardSequence(page);
      await livingCell.locator(".colony-cell__membrane").click();
      await expect.poll(() => rewardSequence(page)).toBeGreaterThan(sequenceBeforeDivision);
      await expect(page.locator(".tumor-feedback__division")).toBeVisible();
      expect(diagnostics, `${title}: browser diagnostics`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("stage progression requires earned L3 before host collapse can enter immortalized culture", async ({
  browser,
}) => {
  const unavailable = await browser.newContext();
  const earned = await browser.newContext({ viewport: { width: 360, height: 720 } });
  try {
    const unavailablePage = await unavailable.newPage();
    await installFixedClock(unavailablePage);
    await seedStageGate(unavailablePage, "immortalized_culture", { earnedL3: false });
    await unavailablePage.goto("/");
    await expect(
      unavailablePage.locator(".evolution-stage").getByRole("button", { name: "Advance" }),
    ).toBeDisabled();

    const page = await earned.newPage();
    await installFixedClock(page);
    const diagnostics = installDiagnostics(page);
    await seedStageGate(page, "immortalized_culture", { earnedL3: true });
    await page.goto("/");
    const advance = page.locator(".evolution-stage").getByRole("button", { name: "Advance" });
    await expect(advance).toBeEnabled();
    const box = await advance.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await advance.click();
    await expect(page.getByRole("heading", { name: "Immortalized culture" })).toBeVisible();
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
    expect(diagnostics).toEqual([]);
  } finally {
    await unavailable.close();
    await earned.close();
  }
});
