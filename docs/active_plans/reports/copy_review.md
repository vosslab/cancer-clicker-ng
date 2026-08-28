# Release copy review

**Status:** PASS - dated independent copy review, 2026-08-28.

## Scope and revision

This review evaluates the player-facing fictional-system boundary, the canonical accessible colony
descriptions, the Chicago-scale copy, and the concise board and specimen-drawer copy. It covers
the M17 copy-review boundary in
[implementation_plan.md](../implementation_plan.md), rather than visual layout or live interaction
behavior.

The reviewed working-tree revision is `127aac26bc8b9ac388afb31940b7d43db649245e`. The report's
conclusions are limited to this dated source review. The fictional-system boundary is that the
player directs a fictional transformed cell or colony, not a patient; cancer biology remains a
teaching abstraction rather than clinical advice, prognosis, treatment, or an outcome claim.

## Exact inputs

The dated automated guard observations are:

```sh
node --import tsx --test tests/test_svg_describe.mjs
node --import tsx --test tests/test_copy_guard.mjs
```

On 2026-08-28, `tests/test_svg_describe.mjs` exited 0 with 3 passed and 0 failed.
`tests/test_copy_guard.mjs` exited 0 with 4 passed and 0 failed. These counts identify the
reviewed execution; they are not future test-count requirements.

The reviewer read the canonical values and their rendered consumers in:

- `src/content/game_copy.ts`
- `src/content/ending_copy.ts`
- `src/svg/describe.ts`
- `src/render/app.tsx`
- `src/render/ending_view.tsx`
- `docs/GAME_DESIGN.md`
- `docs/ART_DIRECTION.md`

## Criteria

- Canonical colony descriptions identify the image as a fictional game illustration and reject
  diagnostic, prognostic, patient, clinical, survival, treatment, grade, and outcome language.
- Canonical board and drawer copy identifies a fictional cancer-growth simulation and keeps the
  deadpan joke directed at the transformed cell or colony system.
- Chicago-scale copy treats the result as a modeled city-sized metaphor, preserves continued play,
  and makes no clinical or real-world outcome claim.
- Copy gives immediate state and action feedback without offering health, diagnosis, prognosis, or
  treatment promises.
- The optional specimen drawer owns fuller context while the persistent board remains concise and
  action-focused.

## Evidence paths

| Evidence | Path or command | Observed result |
| --- | --- | --- |
| Canonical SVG-copy guard | `node --import tsx --test tests/test_svg_describe.mjs` | Exit 0; 3 passed, 0 failed on 2026-08-28. |
| Canonical copy-boundary guard | `node --import tsx --test tests/test_copy_guard.mjs` | Exit 0; 4 passed, 0 failed on 2026-08-28. |
| Boundary and scale contract | `src/content/game_copy.ts`, `src/content/ending_copy.ts`, `docs/GAME_DESIGN.md`, and `docs/ART_DIRECTION.md` | The named owners frame a fictional transformed-cell system and modeled scale analogy. |
| Accessible colony descriptions | `src/svg/describe.ts` | Each description uses `fictional game illustration` and `stylized visual abstraction` framing. |
| Board, drawer, and ending consumers | `src/render/app.tsx` and `src/render/ending_view.tsx` | The app consumes canonical drawer values, while the ending surface presents modeled scale and continued play. |

## Criterion verdicts

| Criterion | Verdict | Evidence and judgment |
| --- | --- | --- |
| Fictional-system boundary is explicit | PASS | `GAME_COPY.mastheadEyebrow` is `Fictional cancer-growth simulation`; `tests/test_copy_guard.mjs` verifies that canonical value. |
| Canonical SVG descriptions stay non-clinical | PASS | `tests/test_svg_describe.mjs` rejects diagnostic, prognostic, patient, clinical, survival, treatment, grade, and outcome language and requires `fictional game illustration`; 3 passed, 0 failed. |
| Deadpan tone targets the transformed cell or colony | PASS | `GAME_COPY.mastheadSubtitle` is `One transformed cell. No exit interview.` The guard verifies that the subtitle names a transformed cell rather than a person. |
| Chicago scale remains modeled and recoverable | PASS | `ENDING_COPY` calls the result modeled and a city-sized metaphor, retains continuation copy, and `tests/test_copy_guard.mjs` verifies those canonical terms. |
| State and action feedback avoids clinical promises | PASS | `src/render/ending_view.tsx` supplies availability, completion, dismissal, reopening, saved persistence, and continued-play feedback; `src/render/app.tsx` exposes local-save, offline, recovery, and ready-to-divide state without health claims. |
| Longer biology context remains optional | PASS | `src/render/app.tsx` uses the canonical boundary and subtitle values for the optional specimen-drawer entity. The persistent HUD and action tooltips remain focused on immediate game actions. |

## Findings and remediation status

| Finding | Owner | Status |
| --- | --- | --- |
| The requested specimen detail explicitly identifies a fictional cancer-growth simulation while the action surface stays concise. | `src/content/game_copy.ts` and `src/render/app.tsx` | Resolved. `GAME_COPY.mastheadEyebrow` is the canonical boundary; `App` passes it into the optional specimen drawer. |
| The Chicago result needs a transparent modeled-scale framing rather than a measurement or patient outcome claim. | `src/content/ending_copy.ts` and `docs/GAME_DESIGN.md` | Resolved. The canonical ending copy names a modeled volume and city-sized metaphor; game design documents the transparent scale model. |
| Canonical accessible colony descriptions need a durable fiction boundary. | `src/svg/describe.ts` | Resolved. The SVG-copy guard imports canonical descriptions and requires the fictional-game-illustration framing instead of snapshotting comments or arbitrary prose. |
| Board feedback must remain clear without promising diagnosis, prognosis, or treatment. | `src/render/app.tsx` and `src/render/ending_view.tsx` | Resolved in the reviewed source. |

## Limitations

This source-level review proves the stated canonical-copy boundary and records its automated guard
results. It does not prove line wrapping, rendered visual hierarchy, focus announcements, tooltip
or drawer interaction, keyboard behavior, persistence behavior, or whether the deadpan tone is
clear in a live browser. Those claims belong to the independent rendered-browser and static-image
reviews, including
[visual_first_screenshot_review.md](visual_first_screenshot_review.md), and their production
browser evidence.

## Final verdict

PASS. The reviewed canonical copy treats the player as directing a fictional cell or colony system,
uses cancer biology as a teaching abstraction, supplies clear state and action feedback, and avoids
patient-directed mockery, clinical advice, prognosis, and treatment claims. Every required
criterion passes, and the identified wording and ownership findings are resolved.
