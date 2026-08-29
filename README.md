# Cancer Clicker NG

A SolidJS browser game for biology learners who want to explore cancer as a living system of growth, scarcity, adaptation, and tradeoffs through direct cell clicking.

## Next Gen, under pressure

NG means **Next Gen**: a superified, more ambitious cancer clicker where the biology changes each
decision instead of merely decorating larger numbers. It is for learners, educators, and curious
builders who want systems thinking to be the game. The work is a stylized teaching abstraction,
not clinical advice or a depiction of patients.

Its signature promise is a recognizable incremental-game rhythm with a genuinely changing world:
click cells that you can see, spend the cells you earn on a permanent upgrade surface, and watch a
single transformed cell become a vascularized, hypoxic, invasive tumor with decisions that remain
meaningful as the system grows.

**Play locally:** follow the two-command [first-loop path](#play-the-first-loop) to open the
current game in your browser. The checked-in Pages workflow is ready to distribute a verified
artifact; the pre-production candidate does not claim a published live site yet.

## A living clicker board

The primary 1280 x 800 (16:10) view is a visual game canvas:

- **Living tumor arena:** the tumor is the largest object and the direct action. Click rendered
  cells, see the division pulse at the cell you touched, and watch vessels, hypoxia, necrosis,
  invasion, and new sites change the same tissue world.
- **Scoreboard HUD:** automatic growth, stage, save state, and compact utilities stay in one
  shallow instrument strip. The live cell total appears once, anchored to the tumor arena.
- **Evolution dock:** play begins with only Stage and Hallmarks. Routes, resets, culture, and
  network enter only after their durable prerequisites make them relevant.
- **Upgrade rack:** molecular targets reveal only after their achieved discovery condition. Each
  known row names **Owned**, **Output**, **Buy**, **Cost**, and **Adds** in place; there are no
  inaccessible placeholder rows to decode.

Core economics never depend on a tooltip. Extended biology help remains available to pointer and
keyboard users through viewport-aware tooltips, optional specimen notes, and a focus-restoring
specimen drawer. The permanent canvas stays focused on art, numbers, state, and the next action.

The board takes inspiration from the satisfying always-upgradable structure of Cookie Clicker, but
uses an original, editable SVG tumor vocabulary and a scientific, nonclinical art direction.

<!-- screenshots:begin (managed by screenshot-docs) -->
![Opening playthrough with a revealed second molecular machine and explicit purchase facts](docs/screenshots/opening_playthrough.png)
![Hallmark acquisition feedback leading from the tumor to its newly enabled decision](docs/screenshots/hallmark_acquisition.png)
<!-- screenshots:end -->

## What you can explore

- Drive the core loop with direct visible-cell clicks, eight data-defined producers, and purchases
  in `1`, `10`, `100`, or maximum-affordable quantities.
- Make decisions across all 14 cancer hallmark branches, including allocation, checkpoints,
  damage, replicative reserve, perfusion, routes, ATP, immune visibility, inflammation, mutation,
  phenotype, programs, microbiomes, and senescence.
- Progress through Metastasis, Host Transfer, Immortalization, and Dissemination. Culture choices
  retain auditable producer provenance; dissemination renews saved topology campaigns with
  node-local containment and transparent pressure credit.
- Save anonymous local progress, reload it through the exact current state-schema contract, and
  receive an honest offline-gain report without automatic spending or progression choices.
- Use development semantic replay to re-run accepted event histories against normalized durable
  state and visible progression. This diagnostic tool is separate from offline economic replay and
  from the player save format.
- Reach an optional, explicitly earned Chicago-scale presentation after the required stage,
  dissemination tier, and modeled cell-scale conditions. It preserves the live colony and lets play
  continue; it is a transparent fictional volume analogy, not a real-world measurement claim.

## Play the first loop

Prerequisite: a current Node.js installation with npm. From the repository root:

```bash
npm install
npm run serve
```

Open the local URL printed by the server. Click a visible cancer cell in the tumor arena, then buy
the first revealed illustrated machine from the upgrade rack. The header shows automatic growth,
the arena shows the one live cell total, and the next machine appears only when it has been earned.
Reload after a little play to confirm local persistence. When time away produces a bounded gain,
the **Offline progress** report explains it. Stop the foreground server with `Ctrl-C`.

Build the GitHub Pages-shaped artifact without serving it:

```bash
npm run build
```

## Verify the local game

Run the canonical TypeScript, formatting, lint, and domain-test gate:

```bash
./check_codebase.sh
```

For production-browser behavior, rebuild and exercise the served `dist/` surface:

```bash
npm run test:playwright -- --build
```

The browser and visual lanes prove controls, storage, responsive layout, accessibility, and rendered
biology. They complement the fast deterministic Node/tsx suite; neither test count nor a pixel or
timing threshold is a release criterion.

Capture the complete rendered review: a real opening playthrough, five responsive boards, six
guided earned-system surfaces, 11 tooltip states, feedback, recovery, offline, and high-contrast
states. Then copy the two reviewed playthrough frames into this README and verify the corpus:

```bash
node tools/capture_visual_review.mjs
node tools/capture_visual_review.mjs --sync-readme
node tools/capture_visual_review.mjs --verify-existing
```

## Status and boundaries

Cancer Clicker NG is pre-production software under active local validation. The project can improve
its foundations without legacy-compatibility promises: saves use exactly the current format-2,
state-schema-8 contract. Other shapes enter the protected recovery flow instead of being adapted
into invented history.

The release candidate closes through reproducible local build, semantic and production-browser
tests, `source source_me.sh && python3 devel/verify_candidate.py`, fixed-clock screenshots, an
independent agent original-resolution image report, and a static Pages workflow contract. The
candidate route writes ignored `output_release/candidate_manifest.json`, runs the full Python suite
through disposable Git storage, and proves the real index unchanged. GitHub Pages publication is
an optional distribution operation: it adds remote availability evidence without changing candidate
completeness. The balance laboratory compares player policies and reports calibration observations;
it does not declare a fixed numerical, byte, pixel, or machine-timing gate.

## Documentation

Start with the player-facing and operating routes:

- [docs/USAGE.md](docs/USAGE.md) - player flows, controls, and local browser use.
- [docs/INSTALL.md](docs/INSTALL.md) - prerequisites and setup details.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) - the player loop, Chicago-scale culmination, and
  offline-replay promise.
- [docs/PROGRESSION_DESIGN.md](docs/PROGRESSION_DESIGN.md) - the 14 hallmark branches and
  stage-based decisions.
- [docs/PRESTIGE_DESIGN.md](docs/PRESTIGE_DESIGN.md) - the four reset layers, culture workflow,
  and renewable dissemination topology.
- [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md) - the living-tumor SVG contract, direct-cell
  action, compact icons, and 1280 x 800 composition.

For architecture, persistence, and development work:

- [docs/CODE_ARCHITECTURE.md](docs/CODE_ARCHITECTURE.md) - system boundaries and source owners.
- [docs/FILE_STRUCTURE.md](docs/FILE_STRUCTURE.md) - where game, rendering, test, and build files
  live.
- [docs/SOLID_MODEL.md](docs/SOLID_MODEL.md) - the SolidJS client boundary and UI reactivity model.
- [docs/STATE_PERSISTENCE.md](docs/STATE_PERSISTENCE.md) - the exact current save, event funnel,
  protected recovery, and semantic replay.
- [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md) - production-browser verification and the
  screenshot workflow.
- [docs/RELEASE_EVIDENCE.md](docs/RELEASE_EVIDENCE.md) - current local-candidate evidence and the
  boundary between verified work and future publication.
- [docs/active_plans/implementation_plan.md](docs/active_plans/implementation_plan.md) - the
  durable implementation roadmap and autonomous closure contract.

## License

Source code is available under the [MIT License](LICENSE.MIT).
