# Install

Cancer Clicker NG is a client-only SolidJS browser game. Installing this repository means
installing its Node dependencies so it can build the same static `dist/` artifact used by GitHub
Pages and local preview.

## Requirements

- Node.js and npm are available on your command line. The repository verifies their presence
  before its build, check, and browser-test entry points.
- A current checkout includes `package.json` and `package-lock.json`.
- A browser is available for play. Chromium and Firefox are needed only for the optional
  Playwright browser-validation lane.

## Install dependencies

From the repository root, install the dependency manifest:

```bash
npm install
```

The equivalent setup helper is available when a project-local setup command is more convenient:

```bash
npm run setup
```

Install Playwright's browser binaries when you plan to run the production-browser lane:

```bash
npm run setup:playwright
```

## Verify install

Run the canonical TypeScript, lint, formatting, and Node behavior gate:

```bash
./check_codebase.sh
```

The command reports the installed Node and npm versions, then checks source and wider test/tool
TypeScript configurations, ESLint, Prettier, and the offline Node/tsx behavior suite. It does not
build `dist/` or run a browser.

## Build the Pages artifact

Create a fresh GitHub Pages-ready artifact with:

```bash
./build_github_pages.sh
```

This command type-checks the SolidJS application and writes `dist/index.html`, `dist/main.js`,
the owned stylesheets, and `dist/.nojekyll`. `npm run build` invokes the same build front door.

## Browser validation

Build and test the served `dist/` artifact with Playwright:

```bash
./run_playwright_tests.sh --build
```

The browser lane owns page-load, direct-cell interaction, persistence, responsive, and related
rendered behaviors. It complements `./check_codebase.sh`; each command answers a different
question about the project.

## Known gaps

- Confirm the minimum supported Node.js version before publishing a release; the manifest currently
  declares package ranges rather than an `engines` policy.
