# Release copy review

**Date:** 2026-08-28  
**Candidate version:** 26.08.0

## Verdict

**Revision required before release evidence is accepted.** The player-facing copy otherwise
supports the settled boundary: it treats the player as directing a fictional cell/colony system,
uses cancer biology as a teaching abstraction, supplies state and action feedback, and avoids
patient-directed mockery, clinical advice, prognosis, and treatment claims. One masthead phrase
needs a bounded replacement so the first interpretation of the game matches that boundary.

## Automated evidence

- `node --import tsx --test tests/test_svg_describe.mjs` exited 0 on 2026-08-28 (3 passed, 0
  failed). The permanent SVG-copy guard rejects diagnostic, prognostic, patient, clinical,
  survival, treatment, grade, and outcome language from every canonical colony description. It
  also requires the phrase `fictional game illustration`.
- The plan's broader `tests/test_copy_guard.mjs` is not present in the current repository. Its
  planned checks for slurs, patient mockery, treatment misinformation, second-person referents,
  and repeated affirmations therefore have no current permanent automated evidence.
- A focused source scan of `src/content/`, `src/render/`, and `src/svg/` found the one
  player-visible boundary conflict listed below. The remaining hits use `clinical` only in
  implementation comments or established visual-art terminology, while rendered scale language
  consistently says `modeled`, `fictional`, or `stylized`.

## Reviewer judgment

- The colony instruction in `src/render/colony_panel.tsx` makes the primary action concrete:
  players click a visible cell, while keyboard activation remains available. Its caption calls
  the scene a stylized game abstraction.
- `src/svg/describe.ts` frames every accessible colony description as a fictional game
  illustration and a stylized visual abstraction. This is clear, durable scale language for
  assistive technology as well as the rendered panel.
- `src/content/ending_copy.ts` calls the Chicago result a modeled volume and a city-sized
  metaphor. `docs/GAME_DESIGN.md` separately documents it as a transparent scale model rather
  than a measurement claim. The scale culmination therefore reads as a deliberate fiction,
  not a patient outcome or clinical assertion.
- `src/render/ending_view.tsx` gives direct feedback for availability, completion, dismissal,
  reopening, saved persistence, and continued play. `src/render/app.tsx` also keeps local-save,
  offline, recovery, and ready-to-divide status explicit. These messages communicate action
  consequences without promising health, diagnosis, prognosis, or treatment.
- The deadpan subtitle, `One transformed cell. No exit interview.`, directs the joke at the
  fictional transformed cell/system. It does not address or ridicule people with cancer.

## Required wording fix

| Owner | File and line | Current wording | Required replacement | Success criterion |
| --- | --- | --- | --- | --- |
| UI copy owner | `src/render/app.tsx:240` | `Clinical growth simulation` | `Fictional cancer-growth simulation` | The masthead explicitly identifies the game model as fictional while retaining its biology-learning context. |

After this replacement, add the planned permanent `tests/test_copy_guard.mjs` with the plan's
bounded language and referent checks, then rerun it and this focused SVG-copy test. The guard
should inspect player-facing copy sources rather than comments or implementation identifiers.

## Known limitations

- This is a source-level release review. It does not replace the planned rendered-browser review
  of line wrapping, focus announcements, or how the deadpan tone lands with human players.
- Existing permanent evidence covers colony descriptions only. The missing broader copy guard
  means this review should be refreshed after the required test is added and the masthead wording
  changes.
