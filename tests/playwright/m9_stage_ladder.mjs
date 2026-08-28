import { expect, test } from "@playwright/test";

import { stageGateFixtureSave } from "../stage_fixture.mjs";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const STAGES = [
  ["microcolony", "Microcolony", "Colony grid", "Colony grid metrics"],
  ["avascular_lesion", "Avascular lesion", "Resource budget", "Resource budget metrics"],
  ["hypoxic_lesion", "Hypoxic lesion", "Region map", "Region map metrics"],
  ["angiogenic_primary", "Angiogenic primary", "Vascular overlay", "Vascular overlay metrics"],
  ["invasive_carcinoma", "Invasive carcinoma", "Route board", "Route board metrics"],
  ["intravasation", "Intravasation", "Transit panel", "Transit panel metrics"],
  [
    "micrometastatic_seeding",
    "Disseminated micrometastases",
    "Site switcher",
    "Site switcher metrics",
  ],
  ["metastatic_burden", "Metastatic burden", "Burden dashboard", "Burden dashboard metrics"],
  ["host_collapse", "Host collapse", "Collapse summary", "Collapse summary metrics"],
  ["immortalized_culture", "Immortalized culture", "Culture bench", "Culture bench metrics"],
  [
    "global_lab_contamination",
    "Global lab contamination",
    "Contamination network",
    "Contamination network metrics",
  ],
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
  envelope.savedAtMs = Date.now();
  return JSON.stringify(envelope);
}

async function seedStageGate(page, targetStageId, options) {
  const raw = currentSaveForFixture(targetStageId, options);
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
    key: SAVE_KEY,
    value: raw,
  });
}

test("M9 stage panel turns the early gate into an accessible persisted transition", async ({
  page,
}, testInfo) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/");

  const stage = page.getByRole("region", { name: "Transformed cell" });
  await expect(page.locator(".stage-mode")).toHaveText("Cell focus");
  await expect(page.locator(".stage-mode-readout")).toHaveAttribute(
    "data-stage-mode",
    "cell-focus",
  );
  await expect(page.getByRole("heading", { name: "Cell focus metrics" })).toBeVisible();
  await expect(page.locator(".stage-mode-readout")).toContainText("Manual charge: 0");
  await expect(stage).toContainText("Manual-only scarcity");
  await expect(stage).toContainText("Manual burst and cycle timing");
  await expect(stage).toContainText("One cell is enough for every action");
  const advance = page.getByRole("button", { name: "Advance to Microcolony" });
  await expect(advance).toBeDisabled();
  const divide = page.getByRole("button", { name: "Divide cell" });
  for (let count = 0; count < 10; count += 1) await divide.click();
  await expect(advance).toBeEnabled();
  await advance.click();
  await expect(page.getByRole("heading", { name: "Microcolony" })).toBeVisible();
  await expect(page.locator(".stage-mode")).toHaveText("Colony grid");
  await expect(page.getByRole("heading", { name: "Colony grid metrics" })).toBeVisible();
  await expect(page.locator(".stage-mode-readout")).toContainText("Producer levels:");
  await expect(page.locator(".stage-economy")).toContainText("Production runs at 1.05x");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Microcolony" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("m9_stage_ladder.png"), fullPage: true });
  expect(diagnostics).toEqual([]);
});

test("M9 production stage control reaches every seeded gate through its real event funnel", async ({
  browser,
}) => {
  for (const [stageId, title, modeLabel, readoutHeading] of STAGES) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const diagnostics = installDiagnostics(page);
      await seedStageGate(page, stageId);
      await page.goto("/?debug=1");
      const advance = page.getByRole("button", { name: `Advance to ${title}` });
      await expect(advance).toBeEnabled();
      await advance.click();
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(page.locator(".stage-mode")).toHaveText(modeLabel);
      await expect(page.getByRole("heading", { name: readoutHeading })).toBeVisible();
      expect(diagnostics, `${title}: browser diagnostics`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("M9 requires earned L3 before host collapse can enter immortalized culture", async ({
  browser,
}) => {
  const unavailable = await browser.newContext();
  const earned = await browser.newContext({ viewport: { width: 360, height: 720 } });
  try {
    const unavailablePage = await unavailable.newPage();
    await seedStageGate(unavailablePage, "immortalized_culture", { earnedL3: false });
    await unavailablePage.goto("/");
    await expect(
      unavailablePage.getByRole("button", { name: "Advance to Immortalized culture" }),
    ).toBeDisabled();

    const page = await earned.newPage();
    const diagnostics = installDiagnostics(page);
    await seedStageGate(page, "immortalized_culture", { earnedL3: true });
    await page.goto("/");
    const advance = page.getByRole("button", { name: "Advance to Immortalized culture" });
    await expect(advance).toBeEnabled();
    const box = await advance.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await advance.click();
    await expect(page.getByRole("heading", { name: "Immortalized culture" })).toBeVisible();
    await expect(page.locator(".stage-mode-readout")).toContainText("L3 availability: earned");
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
