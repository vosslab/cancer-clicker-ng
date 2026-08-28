import { expect, test } from "@playwright/test";

import { coreSixBrowserFixtureSave } from "../core_six_browser_fixture.mjs";

const SAVE_KEY = "cancer-clicker-ng.save.v2";

const BRANCHES = [
  {
    key: "proliferative_signaling",
    heading: "Sustaining proliferative signaling",
    action: "Cycle",
    saved: (state) => expect(state.signalingAllocation).toBe("cycle"),
  },
  {
    key: "growth_suppressor_evasion",
    heading: "Evading growth suppressors",
    action: "Nutrient arrest",
    saved: (state) => expect(state.bypassedCheckpoints).toEqual(["nutrient-arrest"]),
  },
  {
    key: "cell_death_resistance",
    heading: "Resisting cell death",
    action: "Repair",
    saved: (state) => {
      expect(state.pendingDamageEvents).toEqual([]);
      expect(state.damagePressure).toBe(1);
    },
  },
  {
    key: "replicative_immortality",
    heading: "Enabling replicative immortality",
    action: "Bank reserve floor",
    saved: (state) => {
      expect(state.telomeraseCharges).toBe(0);
      expect(state.reserveFloor).toBe(1);
    },
  },
  {
    key: "angiogenesis",
    heading: "Inducing angiogenesis",
    action: "Add vessel link",
    saved: (state) => {
      expect(state.vesselMaintenanceAtp).toBe(1);
      expect(state.regions[0].vesselLinkIds).toEqual(["vessel:core-six-perfusion"]);
    },
  },
  {
    key: "invasion_metastasis",
    heading: "Activating invasion and metastasis",
    action: "Commit to route 1",
    saved: (state) => {
      expect(state.committedCellCommitments).toEqual({ "core-six-route": 1 });
      expect(state.cells.exponent).toBe(1);
      expect(state.cells.mantissa).toBeCloseTo(1.1);
      expect(state.seededSites).toEqual([]);
    },
  },
];

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

function currentFixture(branch, options) {
  const envelope = JSON.parse(coreSixBrowserFixtureSave(branch, options));
  envelope.savedAtMs = Date.now();
  return JSON.stringify(envelope);
}

async function seedFixture(page, branch, options) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (window.sessionStorage.getItem("core-six-fixture-seeded") !== "1") {
        window.localStorage.setItem(key, raw);
        window.sessionStorage.setItem("core-six-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: currentFixture(branch, options) },
  );
}

async function savedGameState(page) {
  const raw = await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw).state;
}

function branchRow(page, heading) {
  return page.getByRole("listitem").filter({ has: page.getByRole("heading", { name: heading }) });
}

test("core-six core-six tree exposes headings, locked status, and native branch controls", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await seedFixture(page, "proliferative_signaling");
  await page.goto("/");
  const tree = page.getByRole("region", { name: "The core six capabilities" });
  const coreSixList = tree.locator(".hallmark-list").first();
  await expect(tree.getByRole("heading", { name: "The core six capabilities" })).toBeVisible();
  await expect(coreSixList.getByRole("listitem")).toHaveCount(6);
  await expect(coreSixList.locator(".hallmark-status.is-locked")).toHaveCount(5);
  await expect(coreSixList.getByRole("button", { name: "Acquire capability" })).toHaveCount(1);
  await expect(tree.getByText("Unlocks at Microcolony: Producer checkpoint.")).toBeVisible();

  const proliferative = branchRow(page, "Sustaining proliferative signaling");
  await proliferative.getByRole("button", { name: "Acquire capability" }).click();
  await expect(proliferative.locator(".hallmark-status")).toHaveText("Acquired");
  const fieldset = proliferative.getByRole("group", { name: /Division allocation/ });
  await expect(fieldset).toBeVisible();
  const cycle = fieldset.getByRole("button", { name: "Cycle" });
  await cycle.focus();
  await page.keyboard.press("Enter");
  await expect(fieldset).toContainText("Cycle");
  expect(diagnostics).toEqual([]);
});

test("core-six acquires each core-six branch and persists its visible decision through reload", async ({
  browser,
}) => {
  for (const branch of BRANCHES) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      const diagnostics = installDiagnostics(page);
      await seedFixture(page, branch.key);
      await page.goto(branch.key === "angiogenesis" ? "/?debug=1" : "/");
      const row = branchRow(page, branch.heading);
      await expect(row.locator(".hallmark-status")).toHaveText("Available");
      await row.getByRole("button", { name: "Acquire capability" }).click();
      await expect(row.locator(".hallmark-status")).toHaveText("Acquired");
      await expect(row.getByRole("button", { name: branch.action })).toBeVisible();
      await row.getByRole("button", { name: branch.action }).click();
      branch.saved(await savedGameState(page));
      if (branch.key === "angiogenesis") {
        await page.getByRole("button", { name: "Fast-forward 60 seconds" }).click();
        const unpaid = await savedGameState(page);
        expect(unpaid.atp).toEqual({ mantissa: 0, exponent: 0 });
        expect(unpaid.vesselMaintenanceAtp).toBe(0);
        expect(unpaid.regions[0].vesselLinkIds).toEqual([]);
      }
      await page.reload();
      await expect(row.locator(".hallmark-status")).toHaveText("Acquired");
      const reloaded = await savedGameState(page);
      if (branch.key === "angiogenesis") {
        expect(reloaded.atp).toEqual({ mantissa: 0, exponent: 0 });
        expect(reloaded.vesselMaintenanceAtp).toBe(0);
        expect(reloaded.regions[0].vesselLinkIds).toEqual([]);
      } else branch.saved(reloaded);
      expect(diagnostics, `${branch.key}: browser diagnostics`).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("core-six keeps recovery-protected hallmark mutations disabled and leaves raw storage untouched", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  const corruptRaw = "{core-six-corrupt-save";
  await page.addInitScript(({ key, raw }) => window.localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: corruptRaw,
  });
  await page.goto("/");
  const allMutations = page.locator("button:not(#replace-unreadable-save)");
  const disabled = await allMutations.evaluateAll((buttons) =>
    buttons.every((button) => button instanceof HTMLButtonElement && button.disabled),
  );
  expect(disabled).toBe(true);
  const acquire = page.getByRole("button", { name: "Acquire capability" });
  await expect(acquire).toBeDisabled();
  await acquire.click({ force: true });
  expect(await page.evaluate((key) => window.localStorage.getItem(key), SAVE_KEY)).toBe(corruptRaw);
  expect(diagnostics).toEqual([]);
});

test("core-six hallmark controls remain reachable at 360px with reduced motion and touch targets", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const diagnostics = installDiagnostics(page);
    await seedFixture(page, "invasion_metastasis", { allBranches: true });
    await page.goto("/");
    const tree = page.getByRole("region", { name: "The core six capabilities" });
    for (const branch of BRANCHES) {
      const row = branchRow(page, branch.heading);
      await row.getByRole("button", { name: "Acquire capability" }).click();
    }
    await expect(tree.getByRole("group", { name: /Telomerase budget/ })).toBeVisible();
    await expect(tree.locator('input[type="number"]')).toHaveCount(2);
    await expect(tree.locator("select")).toHaveCount(1);
    const dimensions = await tree.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return { label: button.textContent?.trim(), width: box.width, height: box.height };
      }),
    );
    for (const control of dimensions) {
      expect(control.width, control.label).toBeGreaterThanOrEqual(44);
      expect(control.height, control.label).toBeGreaterThanOrEqual(44);
    }
    const viewport = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      transition: getComputedStyle(document.querySelector("button")).transitionDuration,
    }));
    expect(viewport.overflow).toBe(false);
    expect(viewport.reduced).toBe(true);
    expect(Number.parseFloat(viewport.transition)).toBeLessThanOrEqual(0.01);
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
