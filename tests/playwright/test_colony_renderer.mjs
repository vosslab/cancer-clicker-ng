import { expect, test } from "@playwright/test";

// Selector contract: the accessible divide action and its decorative inline SVG
// (src/render/tumor_arena.tsx:133; src/render/colony_panel.tsx:74).
function installDiagnostics(page) {
  const failures = [];
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console: ${message.text()}`);
  });
  return failures;
}

async function inspectColonyFigure(page) {
  const svg = page.locator("svg.colony-figure");
  await expect(svg).toHaveCount(1);
  await expect(svg).toHaveAttribute("aria-hidden", "true");
  await expect(svg.locator("title")).toHaveCount(0);
  await expect(svg.locator("desc")).toHaveCount(0);
  await expect(page.locator("#colony-a11y-description")).toContainText(
    "Click a cell or just beside it",
  );
  return svg.evaluate((element) => {
    const allNodes = [element, ...element.querySelectorAll("*")];
    const ids = new Set([...element.querySelectorAll("[id]")].map((node) => node.id));
    const externalReferences = [];
    const unresolvedReferences = [];
    for (const node of allNodes) {
      for (const attribute of [...node.attributes]) {
        const value = attribute.value;
        if (/^(?:https?:|\/\/|data:)/i.test(value)) externalReferences.push(value);
        const references = [
          ...value.matchAll(/url\(#([A-Za-z][\w:.-]*)\)/g),
          ...(attribute.name === "href" ? value.matchAll(/^#([A-Za-z][\w:.-]*)$/g) : []),
        ];
        for (const match of references) {
          if (!ids.has(match[1])) unresolvedReferences.push(match[1]);
        }
      }
    }
    return {
      externalReferences,
      unresolvedReferences,
      focusable: element.querySelectorAll(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ).length,
      inlineHandlers: allNodes.some((node) =>
        [...node.attributes].some((attribute) => attribute.name.toLowerCase().startsWith("on")),
      ),
    };
  });
}

test("the production colony action keeps its decorative SVG local and reference-safe", async ({
  page,
}) => {
  const diagnostics = installDiagnostics(page);
  await page.goto("/");
  const action = page.getByRole("button", { name: "Divide cell" });
  await expect(action).toBeVisible();
  await expect(action.locator("svg.colony-figure")).toHaveCount(1);
  const inspection = await inspectColonyFigure(page);
  expect(inspection.externalReferences).toEqual([]);
  expect(inspection.unresolvedReferences).toEqual([]);
  expect(inspection.focusable).toBe(0);
  expect(inspection.inlineHandlers).toBe(false);
  expect(diagnostics).toEqual([]);
});

test("the colony figure remains visible without horizontal overflow in compact reduced-motion view", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 720 },
    reducedMotion: "reduce",
    colorScheme: "light",
  });
  try {
    const page = await context.newPage();
    const diagnostics = installDiagnostics(page);
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Living tumor arena" })).toBeVisible();
    await inspectColonyFigure(page);
    const responsive = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    }));
    expect(responsive.reduced).toBe(true);
    expect(responsive.overflow).toBe(false);
    await expect(page.getByRole("button", { name: "Divide cell" })).toBeVisible();
    expect(diagnostics).toEqual([]);
  } finally {
    await context.close();
  }
});
