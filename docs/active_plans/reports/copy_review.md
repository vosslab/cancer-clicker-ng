# Release copy review

**Date:** 2026-08-28
**Candidate version:** 26.08.0

## Verdict

**Accepted for release evidence.** The player-facing copy treats the player as directing a
fictional cell/colony system, uses cancer biology as a teaching abstraction, supplies state and
action feedback, and avoids patient-directed mockery, clinical advice, prognosis, and treatment
claims. The specimen drawer states that boundary directly when players request its details.

## Automated evidence

- `node --import tsx --test tests/test_svg_describe.mjs` exited 0 on 2026-08-28 (3 passed, 0
  failed). The permanent SVG-copy guard rejects diagnostic, prognostic, patient, clinical,
  survival, treatment, grade, and outcome language from every canonical colony description. It
  also requires the phrase `fictional game illustration`.
- `node --import tsx --test tests/test_copy_guard.mjs` exited 0 on 2026-08-28 (4 passed, 0
  failed). Its bounded semantic checks cover the canonical masthead, canonical ending copy,
  canonical colony description, and the subtitle's transformed-cell referent.

## Reviewer judgment

- The direct cell action keeps its concise instruction in a focus/hover/touch tooltip and its full
  fictional-game description in screen-reader-only copy. Players click a visible cell, while
  keyboard activation remains available without placing explanatory paragraphs on the board.
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
- `src/render/app.tsx` consumes the canonical boundary and subtitle values only when it creates
  the optional specimen-drawer entity. The persistent HUD and action tooltips stay focused on
  immediate game actions; the drawer supplies the fuller fictional-system context on request.
- The specimen-drawer subtitle, `One transformed cell. No exit interview.`, directs its deadpan
  joke at the fictional transformed cell/system rather than a person.

## Completed wording fix

| Owner                    | Canonical value                                        | Current consumer                                                                  | Success criterion                                                                                                            |
| ------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Player-facing copy owner | `src/content/game_copy.ts` `GAME_COPY.mastheadEyebrow` | `src/render/app.tsx` specimen-drawer `kind`, opened from the persistent HUD route | Requested specimen detail explicitly identifies a fictional cancer-growth simulation while the action surface stays concise. |

`src/content/game_copy.ts` owns the fictional boundary and transformed-cell subtitle values;
`src/render/app.tsx` passes them into the optional specimen drawer. `src/content/ending_copy.ts`
remains the Chicago-scale owner. The permanent guard imports these named values and the canonical
SVG description rather than snapshotting comments or all prose.

## Known limitations

- This source-level review complements a human rendered-browser reading of line wrapping, focus
  announcements, tooltip/drawer interaction, and how the deadpan tone lands with players.
