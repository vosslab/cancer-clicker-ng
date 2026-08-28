import { expect, test } from "@playwright/test";

import { coreSixBrowserFixtureSave } from "../core_six_browser_fixture.mjs";

// Selector contract: hallmark actions use accessible tab, program, and native action controls
// (src/render/evolution_dock.tsx:19; src/render/hallmark_tree.tsx:887).
const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

async function installFixedClock(page) {
  await page.clock.install({ time: FIXED_CLOCK_MS });
}

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
  envelope.savedAtMs = FIXED_CLOCK_MS;
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

function hallmarksTab(page) {
  return page.getByRole("button", { name: "Hallmarks evolution system" });
}

function hallmarkPanel(page) {
  return page.getByRole("region", { name: "Tumor progression" }).locator(".hallmark-tree");
}

async function openHallmarks(page) {
  await hallmarksTab(page).click();
  await expect(hallmarkPanel(page)).toBeVisible();
}

async function selectBranch(page, heading, status) {
  const panel = hallmarkPanel(page);
  await panel.getByRole("button", { name: `${heading}, ${status}` }).click();
  const active = panel.locator(".evolution-hallmarks__active");
  await expect(active.getByRole("heading", { name: heading })).toBeVisible();
  return active;
}

test("core-six icon deck selects one active hallmark and exposes its compact native action", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedFixture(page, "proliferative_signaling");
  await page.goto("/");
  await openHallmarks(page);
  const tree = hallmarkPanel(page);
  await expect(tree.getByRole("list", { name: "Hallmark mutation programs" })).toBeVisible();
  await expect(tree.locator(".evolution-hallmarks__sigil-button")).toHaveCount(14);
  const proliferative = await selectBranch(page, "Sustaining proliferative signaling", "available");
  await proliferative.getByRole("button", { name: "Acquire" }).click();
  const fieldset = proliferative.getByRole("group", { name: /Division allocation/ });
  await expect(fieldset).toBeVisible();
  const cycle = fieldset.getByRole("button", { name: "Cycle" });
  await cycle.focus();
  await page.keyboard.press("Enter");
  expect((await savedGameState(page)).signalingAllocation).toBe("cycle");
  expect(diagnostics).toEqual([]);
});

test("core-six acquires each core-six branch and persists its visible decision through reload", async ({
  browser,
}) => {
  for (const branch of BRANCHES) {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await installFixedClock(page);
      const diagnostics = installDiagnostics(page);
      await seedFixture(page, branch.key);
      await page.goto(branch.key === "angiogenesis" ? "/?debug=1" : "/");
      await openHallmarks(page);
      const row = await selectBranch(page, branch.heading, "available");
      await row.getByRole("button", { name: "Acquire" }).click();
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
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  const corruptRaw = "{core-six-corrupt-save";
  await page.addInitScript(({ key, raw }) => window.localStorage.setItem(key, raw), {
    key: SAVE_KEY,
    raw: corruptRaw,
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Divide cell" })).toBeDisabled();
  await openHallmarks(page);
  const active = await selectBranch(page, "Sustaining proliferative signaling", "available");
  await expect(active.getByRole("button", { name: "Acquire" })).toBeDisabled();
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
    await installFixedClock(page);
    const diagnostics = installDiagnostics(page);
    await seedFixture(page, "invasion_metastasis", { allBranches: true });
    await page.goto("/");
    await openHallmarks(page);
    const tree = hallmarkPanel(page);
    const dimensions = await tree
      .locator(".evolution-hallmarks__sigil-button")
      .evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect();
          return { label: button.textContent?.trim(), width: box.width, height: box.height };
        }),
      );
    for (const control of dimensions) {
      expect(control.width, control.label).toBeGreaterThanOrEqual(44);
      expect(control.height, control.label).toBeGreaterThanOrEqual(44);
    }
    await tree.locator(".evolution-hallmarks__sigil-button").first().focus();
    await page.keyboard.press("Enter");
    const viewport = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    expect(viewport.overflow).toBe(false);
    expect(viewport.reduced).toBe(true);
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
