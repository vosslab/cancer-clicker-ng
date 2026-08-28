# Troubleshooting

This guide helps local players and contributors distinguish an expected game state from a setup,
browser-storage, build, or validation problem. It complements [INSTALL.md](INSTALL.md) and
[USAGE.md](USAGE.md); [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) is authoritative for saves.

## Start and build problems

| Symptom                                                | Cause to check                                             | Practical next step                                                                               |
| ------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `npm install` cannot run                               | Node.js or npm is unavailable in the shell.                | Install Node.js with npm, reopen the terminal, then run `npm install` from the repository root.   |
| The local page is blank or lacks the current interface | The static `dist/` artifact is stale or a build failed.    | Run `./build_github_pages.sh`, read its first error if it stops, then run `npm run serve`.        |
| A stylesheet or `main.js` is missing from `dist/`      | The required source asset or SolidJS bundle did not build. | Run `./build_github_pages.sh`; it names the missing required source asset or type-check failure.  |
| A browser test reports a missing browser executable    | Playwright's browser binaries are not installed.           | Run `npm run setup:playwright`, then rerun `./run_playwright_tests.sh --build`.                   |
| The browser test behaves differently from a local tab  | The test lane serves a rebuilt production-shaped artifact. | Rebuild with `./build_github_pages.sh` and use `npm run serve` to inspect the same `dist/` shape. |

`npm run serve` rebuilds `dist/`, prints a local URL, and keeps the server in the foreground. Use
`Ctrl-C` in that terminal when the local session is finished.

## Progress and save problems

| Symptom                                            | Expected behavior or cause                                                                                 | Practical next step                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Reload starts a new game                           | The browser has no save for that exact origin. A different port is a different origin.                     | Return to the same local URL that holds the progress, or begin a new local experiment.                                          |
| The page says `Unsaved changes`                    | Browser-local storage could not be written. The current tab retains its in-memory state.                   | Keep the tab open, check browser storage permissions or quota for that local URL, then retry an action.                         |
| The recovery panel appears                         | Saved bytes could not be safely read, or storage could not be read.                                        | Read the panel before choosing its replacement action. Replacement starts a validated fresh save only when that is appropriate. |
| A saved value seems unexpected after a manual edit | Browser storage is treated as untrusted input and malformed structural data is rejected.                   | Restore a known valid browser profile or use the recovery panel to begin fresh; use the game's controls for normal progress.    |
| Offline progress is absent or small                | Absence is measured from the last successful local save and is bounded. Clock skew produces no gain.       | Make an in-game change, allow the saved status to return, then revisit the same local origin after time away.                   |
| The Offline progress panel mentions a cap or clock | The game recorded a safe bounded absence result. It does not spend cells or choose progression while away. | Continue with the presented cell balance and make the next stage, hallmark, or prestige choice explicitly.                      |

The current save key is `cancer-clicker-ng.save.v2`. It is browser-local game data, not an account
or cloud-save format. The strict current-schema contract and recovery vocabulary are defined in
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md).

## Gameplay and interface questions

| Symptom                                          | Expected behavior or cause                                                                           | Practical next step                                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Clicking the background does not add cells       | Only painted cancer-cell geometry is the direct division action. Tissue and whitespace remain inert. | Click a visible cancer cell in **Your colony** or focus the colony action and press Enter or Space.    |
| A purchase or biological decision is disabled    | Its displayed cells, ATP, stage, prerequisite, or saved-state condition is not yet met.              | Read the control's cost and gate text, then use the currently available producer or growth action.     |
| A future layer is visible but cannot be selected | The interface deliberately shows upcoming biology and its unlock condition.                          | Continue the current loop; the control becomes available only after its stated condition is true.      |
| A returned game did not auto-buy or auto-advance | Offline replay grants bounded economics only. Player decisions remain explicit.                      | Review the new balance and choose the next producer, stage, hallmark, or prestige action.              |
| The Chicago-scale presentation is unavailable    | It requires the displayed late-stage, dissemination, and modeled-cell conditions.                    | Use its prerequisite readout as the next long-term objective; reaching it does not end ordinary play.  |
| Motion is distracting                            | The game honors reduced-motion preferences for its completion presentation.                          | Enable reduced motion in the operating system or browser accessibility settings, then reload the page. |

For the intended first loop and the local debug panel, see [USAGE.md](USAGE.md). The biological
model, offline promise, and player-facing progression are explained in [GAME_DESIGN.md](GAME_DESIGN.md).

## Contributor validation

Run the lane that answers the question at hand:

```bash
./check_codebase.sh
./build_github_pages.sh
./run_playwright_tests.sh --build
```

- `./check_codebase.sh` is the canonical permanent TypeScript gate: type checks, lint, formatting,
  and deterministic Node behavior tests.
- `./build_github_pages.sh` proves that the static deployment artifact can be generated.
- `./run_playwright_tests.sh --build` exercises the rebuilt artifact in a browser, including local
  storage and direct-cell interaction.

Rendered screenshots, contact sheets, manual accessibility review, and balance-simulator reports
are one-time investigation or acceptance evidence. They complement the permanent gates above and
remain useful when a visual or tuning change needs direct review. See [PLAYWRIGHT_USAGE.md](PLAYWRIGHT_USAGE.md)
for browser-test setup and artifacts.

## Diagnostic boundaries

- The local `?debug=1` panel exists for development inspection and automated browser evidence. It
  is absent from normal play and should not be used as a player progression route.
- Development semantic replay checks accepted event histories against normalized durable state and
  visible progression. It is distinct from the browser save and from offline economic replay.
- The balance simulator accepts tracked scenarios and writes ignored reports below `output_balance/`.
  Treat a report as a reproducible observation for a tuning question, then retain any settled
  conclusion in the appropriate design or release evidence.

See [USAGE.md](USAGE.md) for the current balance-simulator command and
[STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) for semantic replay ownership.
