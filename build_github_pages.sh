#!/usr/bin/env bash
# build_github_pages.sh - canonical production build for GitHub Pages.
#
# Front door: run this directly as ./build_github_pages.sh. It is the
# interface for everyone, no npm knowledge required. The npm run build
# alias is an optional mirror that points right back at this script.
#
# Contract:
#   - Wipes dist/ from scratch.
#   - Type-checks via 'tsc --noEmit -p tsconfig.json'.
#   - Uses src/main.tsx as the required Solid bundle entry.
#     Aborts with an actionable error when it is missing.
#   - Verifies source HTML and named game stylesheets exist before copying;
#     aborts with an actionable error if missing.
#   - Verifies src/index.html references dist/main.js with a module script
#     tag (warns if missing -- the page will load but main.js is dead).
#   - Bundles the entry into dist/main.js with esbuild (ESM, es2020,
#     browser, minified, with sourcemap).
#   - Copies src/index.html and named game stylesheets into dist/.
#   - Writes dist/.nojekyll so GitHub Pages serves files starting with _.
#   - Asserts dist/index.html and dist/main.js exist before exiting.
#
# Hard rule: never produces single-file output. ESM only.

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# The Solid bootstrap is the authoritative bundle entry. This front door keeps
# the static-asset and GitHub Pages responsibilities around that one bundle.
ENTRY="src/main.tsx"
if [ ! -f "$ENTRY" ]; then
	echo "ERROR: required Solid bundle entry missing: $ENTRY" >&2
	echo "  Create src/main.tsx with the Solid application bootstrap." >&2
	exit 1
fi

# Verify required static assets before any destructive step.
STATIC_STYLES=(
	"tissue_text_palette.css"
	"style.css"
	"game_ui.css"
	"tumor_arena.css"
	"tumor_arena_motion.css"
	"tumor_arena_neutral_light.css"
	"evolution_dock.css"
	"upgrade_rack.css"
	"prestige.css"
	"culture_network_ui.css"
	"prestige_route_ui.css"
	"ending.css"
)

for required in src/index.html "${STATIC_STYLES[@]/#/src/}"; do
	if [ ! -f "$required" ]; then
		echo "ERROR: required source file missing: $required" >&2
		case "$required" in
			src/index.html)
				echo "  Create src/index.html with a <script type=\"module\" src=\"main.js\"></script> tag." >&2 ;;
			src/style.css)
				echo "  Create src/style.css (empty file is fine)." >&2 ;;
			src/prestige.css)
				echo "  Create src/prestige.css for the prestige and transit presentation layer." >&2 ;;
			src/game_ui.css)
				echo "  Create src/game_ui.css for the shared game-canvas composition." >&2 ;;
			src/ending.css)
				echo "  Create src/ending.css for the Chicago scale report presentation layer." >&2 ;;
		esac
		exit 1
	fi
done

# Soft-warn if index.html does not reference main.js as an ES module.
if ! grep -Eq '<script[^>]+type="module"[^>]+src="(\./)?main\.js"' src/index.html; then
	echo "WARNING: src/index.html does not appear to load main.js as an ES module." >&2
	echo "  Expected tag: <script type=\"module\" src=\"main.js\"></script>" >&2
	echo "  Build will proceed; the page may render but main.js will not run." >&2
fi

rm -rf dist
mkdir -p dist

npx tsc --noEmit -p tsconfig.json

node tools/build_solid.mjs "$ENTRY"

cp src/index.html dist/index.html
for stylesheet in "${STATIC_STYLES[@]}"; do
	cp "src/$stylesheet" "dist/$stylesheet"
done
touch dist/.nojekyll

test -f dist/index.html
test -f dist/main.js
for stylesheet in "${STATIC_STYLES[@]}"; do
	test -f "dist/$stylesheet"
done

echo "Built dist/ (GitHub Pages-ready)."
