# Troubleshooting

## A cell click has no effect

- Click a visible membrane or nucleus in the tumor. Tissue background, voids, and board whitespace
  are inert by design.
- Focus the `Divide cell` control and press Enter or Space to use the same division action from a
  keyboard.
- When a saved-progress recovery notice is present, choose its explicit fresh-start replacement
  action before ordinary gameplay can write progress again. See [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md).

## A compact control is unclear

- Hover, focus, or activate the compact control to open its tooltip.
- Read its accessible label with a screen reader; nearby SVG marks are decorative.
- Open the specimen drawer from an available detail control for the optional biological explanation.

## The board changes on a narrow display

- Below 48rem, the layout stacks the tumor arena, evolution family, upgrade rack, and rewards to
  keep the controls readable.
- The 360px layout retains direct-cell keyboard activation, tooltips, the specimen drawer, and
  progress; it presents the same game in a narrower order.

## Motion is distracting

- Enable the operating system or browser reduced-motion preference.
- The board then uses static morphology, earned state, focus, and interaction cues without its
  animations.

## Local progress is missing

- Reopen the same browser origin printed by `npm run serve`; each port is a distinct local-storage
  origin.
- Read [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) for the protected unreadable-save path and its
  explicit fresh-replacement action.

## Local commands cannot start

- Run `npm install` from the repository root when `node_modules/` is missing.
- Run `npm run setup:playwright` after dependencies are installed when Playwright reports a missing
  browser executable.
- Use `./check_codebase.sh` for the TypeScript, lint, formatting, and Node behavior gate;
  `./run_playwright_tests.sh --build` rebuilds and tests the browser artifact. See
  [INSTALL.md](INSTALL.md) for the complete local setup route.

## Playwright cannot launch on managed macOS

- A managed macOS sandbox can deny Chromium's Mach-port launch before any browser assertion runs.
- Rerun the unchanged browser command in an environment that permits browser-process launch. The
  application source and test selectors are not implicated by this operating-system boundary.
