# Install

Cancer Clicker NG is a client-only SolidJS game. Installation prepares its Node dependencies to
build and serve the same static `dist/` artifact used by GitHub Pages; Python is needed for the
repository's optional developer verification commands.

## Requirements

- Node.js and npm are available on the command line. The repository has no declared minimum
  Node.js version or `engines` policy.
- A checkout contains `package.json` and the committed `package-lock.json`.
- A browser is available for local play.
- Python 3.12 is available for Python-based developer checks. Run Python through
  `source source_me.sh && python3`.

## Install dependencies

From the repository root, use the setup front door:

```bash
./devel/setup_typescript.sh
```

It runs `npm install` against the repository's dependency manifest. The equivalent direct command
is useful when inspecting installation output:

```bash
npm install
```

Install the repository's Python developer dependencies when you will run the candidate or Pages
workflow verifiers:

```bash
source source_me.sh && python3 -m pip install -r pip_requirements-dev.txt
```

Install browser binaries only for the Playwright validation lane:

```bash
./devel/setup_playwright.sh
```

## Verify install

Run the canonical TypeScript, lint, formatting, and deterministic Node behavior gate:

```bash
./check_codebase.sh
```

The command reports the Node and npm versions it found, then checks the application, wider test
and tool type configurations, ESLint, Prettier, and the Node/tsx suite. It does not build `dist/`
or start a browser.

## Build the Pages artifact

Build from the named production front door:

```bash
./build_github_pages.sh
```

It writes `dist/index.html`, `dist/main.js`, the owned stylesheets, and `dist/.nojekyll`.
`npm run build` invokes the same script. Use [USAGE.md](USAGE.md) to serve the artifact locally.

## Browser validation

Build and exercise the served production artifact with:

```bash
./run_playwright_tests.sh --build
```

This optional lane requires the Playwright browser setup above and complements the fast local
check rather than replacing it.

## Known gaps

- Confirm and declare a supported Node.js version before a public release.
