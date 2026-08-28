import { expect, test } from "@playwright/test";

import { bigNum, passageUpgradeId, producerId, regionId, stageId } from "../../src/brands.ts";
import { createInitialGameState } from "../../src/state/game_state.ts";
import { serializeGameState } from "../../src/state/save_load.ts";
import { generateNetworkFrontierV1 } from "../../src/prestige/network.ts";

const SAVE_KEY = "cancer-clicker-ng.save.v2";
const FIXED_CLOCK_MS = 1_750_000_000_000;

async function installFixedClock(page) {
  await page.clock.install({ time: FIXED_CLOCK_MS });
}

function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

function hostCollapseState({
  l1 = false,
  l2 = false,
  completedL1ResetCount = 0,
  tags = [],
  preparedLung = false,
  hostImprints = 0,
} = {}) {
  const initial = createInitialGameState();
  const seed = {
    id: regionId("prestige-browser-seed"),
    capacity: 6,
    viability: 1,
    phenotype: "proliferative",
    vesselLinkIds: [],
    routeIds: [],
  };
  return {
    ...initial,
    activeTimeMs: 100,
    currentStage: stageId("host_collapse"),
    cells: bigNum(1, 4),
    regions: [seed],
    seededSites: [seed.id],
    prestigeAvailability: [
      ...(l1 ? [{ id: "L1", status: "earned" }] : []),
      ...(l2 ? [{ id: "L2", status: "earned" }] : []),
    ],
    lineageLedger: {
      ...initial.lineageLedger,
      completedL1ResetCount,
      organTagsSeen: tags,
    },
    metastasis: {
      ...initial.metastasis,
      metastaticPotential: bigNum(2, 0),
      allocations: preparedLung ? [{ siteId: "lung", rank: 1 }] : [],
      programs: preparedLung ? [{ siteId: "lung", programId: "exploit_niche" }] : [],
      activeNicheContext: preparedLung
        ? { siteId: "lung", allocationRank: 1, programId: "exploit_niche" }
        : null,
    },
    hostTransfer: { ...initial.hostTransfer, hostImprints },
  };
}

function currentFixture(options) {
  const envelope = JSON.parse(serializeGameState(hostCollapseState(options), FIXED_CLOCK_MS));
  envelope.savedAtMs = FIXED_CLOCK_MS;
  return JSON.stringify(envelope);
}

async function seedFixture(page, options) {
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("prestige-browser-fixture-seeded") !== "1") {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("prestige-browser-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: currentFixture(options) },
  );
}

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
  const savedAtMs = FIXED_CLOCK_MS;
  const envelope = JSON.parse(serializeGameState(state, savedAtMs));
  envelope.savedAtMs = savedAtMs;
  return JSON.stringify(envelope);
}

async function seedNetworkFixture(page) {
  const raw = networkFixture();
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem("network-browser-fixture-seeded") !== "1") {
        localStorage.setItem(key, value);
        sessionStorage.setItem("network-browser-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, value: raw },
  );
}

async function seedQueuedAssayFixture(page) {
  const initial = createInitialGameState();
  const state = {
    ...initial,
    cells: bigNum(100, 0),
    activeTimeMs: 1,
    eventSequence: 1,
    culture: {
      ...initial.culture,
      purchasedPassageUpgrades: [{ upgradeId: passageUpgradeId("assay_discipline"), rank: 1 }],
      queuedProducerAction: {
        producerId: producerId("replication_fork"),
        queuedAtEventSequence: 0,
        queuedAtActiveMs: 1,
      },
    },
  };
  const envelope = JSON.parse(serializeGameState(state, FIXED_CLOCK_MS));
  envelope.savedAtMs = FIXED_CLOCK_MS;
  await page.addInitScript(
    ({ key, raw }) => {
      if (sessionStorage.getItem("queued-assay-browser-fixture-seeded") !== "1") {
        localStorage.setItem(key, raw);
        sessionStorage.setItem("queued-assay-browser-fixture-seeded", "1");
      }
    },
    { key: SAVE_KEY, raw: JSON.stringify(envelope) },
  );
}

async function savedEnvelope(page) {
  const raw = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
  expect(raw).not.toBeNull();
  return { raw, envelope: JSON.parse(raw) };
}

function prestigePanel(page) {
  return page.getByRole("region", { name: "Prestige layers" });
}

async function confirm(page, title) {
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: new RegExp(`^Confirm ${title}$`) }).click();
}

test("prestige metastasis confirmation cancels safely then persists one deliberate L1 reset", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedFixture(page, { l1: true, preparedLung: true });
  await page.goto("/");

  const panel = prestigePanel(page);
  const reset = panel.getByRole("button", { name: "Begin metastasis reset", exact: true });
  await expect(panel).toContainText("Viable seeded sites: 1");
  await expect(panel).toContainText("Reset clears:");
  await panel.getByRole("radio", { name: /Lung: rank 1, Exploit Niche/ }).check();
  await expect(reset).toBeEnabled();
  const before = await savedEnvelope(page);

  await reset.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Begin metastasis reset" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(reset).toBeFocused();
  expect((await savedEnvelope(page)).raw).toBe(before.raw);

  await reset.click();
  await confirm(page, "Begin metastasis reset");
  const after = await savedEnvelope(page);
  expect(after.envelope.state.currentStage).toBe("transformed_cell");
  expect(after.envelope.state.lineageLedger.completedL1ResetCount).toBe(1);
  expect(after.envelope.state.metastasis.metastaticPotential.mantissa).toBeGreaterThan(0);
  expect(after.envelope.state.metastasis.activeNicheContext).toEqual({
    siteId: "lung",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  await expect(panel.locator("#metastasis-summary")).toBeFocused();
  await page.reload();
  expect((await savedEnvelope(page)).envelope.state.metastasis.activeNicheContext).toEqual({
    siteId: "lung",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  expect(diagnostics).toEqual([]);
});

test("prestige host transfer preserves a revealed deterministic draft through reload and keyboard choice", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedFixture(page, {
    l2: true,
    completedL1ResetCount: 3,
    tags: ["hepatic", "pulmonary"],
    hostImprints: 3,
    preparedLung: true,
  });
  await page.goto("/");

  const panel = prestigePanel(page);
  const transfer = panel.getByRole("button", { name: "Perform host transfer", exact: true });
  await expect(panel.getByRole("heading", { name: "Extra Card Reveal" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Protected Route Affinity" })).toBeVisible();
  await expect(panel.getByRole("heading", { name: "Reduced Trait Liability" })).toHaveCount(0);
  await expect(transfer).toBeVisible();
  await transfer.click();
  await confirm(page, "Perform host transfer");
  await expect(panel.getByRole("heading", { name: "Saved host draft" })).toBeVisible();

  const firstSaved = await savedEnvelope(page);
  const firstDraft = firstSaved.envelope.state.hostTransfer.pendingDraft;
  expect(firstDraft.cards).toHaveLength(4);
  expect(firstDraft.revealedCardIds).toHaveLength(3);
  expect(firstDraft.available).toBe(true);
  const revealedIds = [...firstDraft.revealedCardIds];

  await page.reload();
  const reloaded = await savedEnvelope(page);
  const reloadedDraft = reloaded.envelope.state.hostTransfer.pendingDraft;
  expect(reloadedDraft.cards.map((card) => card.id)).toEqual(
    firstDraft.cards.map((card) => card.id),
  );
  expect(reloadedDraft.revealedCardIds).toEqual(revealedIds);
  const firstCard = panel.getByRole("button", { name: "Choose this host" }).first();
  const selectedCardTitle = await firstCard
    .locator("xpath=ancestor::article")
    .getByRole("heading")
    .textContent();
  expect(selectedCardTitle).not.toBeNull();
  await firstCard.focus();
  await page.keyboard.press("Enter");
  const selectionDialog = page.getByRole("dialog", { name: "Choose this host" });
  await expect(selectionDialog).toBeVisible();
  await selectionDialog.getByRole("button", { name: "Confirm Choose this host" }).focus();
  await page.keyboard.press("Enter");

  const selected = await savedEnvelope(page);
  expect(selected.envelope.state.hostTransfer.pendingDraft.available).toBe(false);
  expect(selected.envelope.state.hostTransfer.pendingDraft.consumedCardId).toBe(revealedIds[0]);
  expect(selected.envelope.state.hostTransfer.activeHost.card.id).toBe(revealedIds[0]);
  expect(selected.envelope.state.metastasis.activeNicheContext).toEqual({
    siteId: "lung",
    allocationRank: 1,
    programId: "exploit_niche",
  });
  const targetTraitId = selected.envelope.state.hostTransfer.activeHost.card.immuneRegime;
  const activeHost = panel.locator("#active-host-summary");
  await expect(
    activeHost.getByRole("heading", { name: "Target a host-trait liability" }),
  ).toBeVisible();
  await expect(activeHost).toContainText("Active niche: Lung, rank 1, Exploit Niche.");
  const targetRow = activeHost.locator(`#active-host-trait-${targetTraitId}-status`).locator("..");
  await targetRow.getByRole("button", { name: "Reduce liability" }).focus();
  await page.keyboard.press("Enter");
  const liabilityDialog = page.getByRole("dialog");
  await expect(liabilityDialog).toBeVisible();
  await liabilityDialog.getByRole("button", { name: /^Confirm Reduce .+ liability$/ }).focus();
  await page.keyboard.press("Enter");
  const reduced = await savedEnvelope(page);
  expect(reduced.envelope.state.lineageLedger.lineageBoonApplications).toContainEqual({
    boonId: "reduced_trait_liability",
    kind: "targeted-active-host",
    draftId: firstDraft.id,
    hostRunId: selected.envelope.state.hostTransfer.activeHost.hostRunId,
    cardId: revealedIds[0],
    targetTraitId,
  });
  await page.reload();
  await expect(panel.locator("#active-host-summary")).toContainText(revealedIds[0]);
  await expect(panel.locator("#active-host-summary")).toContainText(
    "Active niche: Lung, rank 1, Exploit Niche.",
  );
  await expect(panel.getByRole("button", { name: "Choose this host" })).toHaveCount(0);
  const consumedDraft = panel.getByRole("status").filter({ hasText: "Consumed draft:" });
  await expect(consumedDraft).toContainText(`Consumed draft: ${selectedCardTitle};`);
  await expect(consumedDraft).toContainText(`reveal policy ${firstDraft.revealPolicy};`);
  await expect(consumedDraft).toContainText(`saved revision ${firstDraft.sourceEventSequence}.`);
  expect(diagnostics).toEqual([]);
});

test("prestige confirmation keeps on-screen and raw state retryable after a scoped storage write fault", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await page.addInitScript((key) => {
    const originalSetItem = Storage.prototype.setItem;
    globalThis.__prestigeWriteFaultActive = false;
    Storage.prototype.setItem = function setItemWithPrestigeWriteFault(candidateKey, value) {
      if (candidateKey === key && globalThis.__prestigeWriteFaultActive)
        throw new Error("prestige save write denied");
      return originalSetItem.call(this, candidateKey, value);
    };
  }, SAVE_KEY);
  await seedFixture(page, { l1: true, preparedLung: true });
  await page.goto("/");

  const panel = prestigePanel(page);
  const reset = panel.getByRole("button", { name: "Begin metastasis reset", exact: true });
  await panel.getByRole("radio", { name: /Lung: rank 1, Exploit Niche/ }).check();
  const before = await savedEnvelope(page);
  await page.evaluate(() => {
    globalThis.__prestigeWriteFaultActive = true;
  });
  await reset.click();
  const dialog = page.getByRole("dialog", { name: "Begin metastasis reset" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Confirm Begin metastasis reset" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog).toBeVisible();
  expect((await savedEnvelope(page)).raw).toBe(before.raw);
  await expect(reset).toBeEnabled();
  await expect(
    dialog.getByRole("button", { name: "Confirm Begin metastasis reset" }),
  ).toBeEnabled();
  expect(diagnostics).toEqual([]);
});

test("prestige terminal confirmation remains reachable at 360px with reduced motion", async ({
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
    await seedFixture(page, { l1: true, preparedLung: true });
    await page.goto("/");
    const reset = prestigePanel(page).getByRole("button", {
      name: "Begin metastasis reset",
      exact: true,
    });
    await prestigePanel(page)
      .getByRole("radio", { name: /Lung: rank 1, Exploit Niche/ })
      .check();
    await reset.scrollIntoViewIfNeeded();
    const box = await reset.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    ).toBe(false);
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
      true,
    );
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});

test("network frontier confirms one saved campaign and retires its alternatives", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedNetworkFixture(page);
  await page.goto("/");
  const panel = page.getByRole("region", { name: "Contamination network", exact: true });
  await expect(panel).toContainText("Renewable campaign frontier");
  const choice = panel.getByRole("button", { name: "Choose Deepen" });
  await choice.click();
  await confirm(page, "Choose dissemination mandate");
  const confirmation = page.getByRole("dialog", { name: "Choose dissemination mandate" });
  await expect(confirmation).toBeHidden();
  const saved = await savedEnvelope(page);
  expect(saved.envelope.state.network.activeCampaign.mandate.category).toBe("deepen");
  expect(saved.envelope.state.network.pendingFrontier).toBeNull();
  expect(saved.envelope.state.network.activeCampaign.sourceFrontier.id).toMatch(
    /^network-frontier-v1:/,
  );
  await expect(panel).toContainText("Active Deepen campaign");
  await expect(panel).toContainText("Retired alternatives: Widen, Reroute.");
  expect(diagnostics).toEqual([]);
});

test("producer rail labels a queued assay target and its explicit replacement", async ({
  page,
}) => {
  await installFixedClock(page);
  const diagnostics = installDiagnostics(page);
  await seedQueuedAssayFixture(page);
  await page.goto("/");
  const queued = page.locator('[data-assay-queue-target="replication_fork"]');
  await expect(queued).toHaveText("Queued assay purchase");
  const replacement = page.locator('[data-assay-queue-target="cdk4"]');
  await expect(replacement).toHaveText("Replace assay target with CDK4");
  await expect(replacement).toHaveAttribute(
    "aria-label",
    "Replace assay target from Replication Fork to CDK4",
  );
  expect(diagnostics).toEqual([]);
});
