# Cancer Clicker NG

An educational browser strategy game for learners who want to explore how one transformed cell grows, adapts, and faces resource tradeoffs through a science-informed incremental model.

## Grow under pressure

Cancer Clicker NG turns cancer-biology concepts into consequential systems rather than a
memorization exercise. You will guide an optimizing transformed cell through resource pressure,
growth, adaptation, and eventually a deliberately dark, science-informed escalation. It is not
clinical advice and does not depict patients; the satire targets the cell's relentless
optimization.

The signature promise is an endless incremental game where biology changes the choices, not just
the labels on larger numbers. The completed foundations make that promise concrete:

- Eight data-defined producers support `1`, `10`, `100`, and maximum affordable purchases with
  deterministic costs.
- Custom BigNum arithmetic and Conway-Wechsler illion names keep enormous quantities readable.
- A typed event funnel, strict V2/p4 local-save migration, and one bounded replay seam make
  growth and return-from-away accounting inspectable.
- A progression design maps 14 cancer-biology branches and 12 stages to future player decisions
  instead of a memorization checklist.
- A client-only SolidJS surface turns those framework-free systems into a saved, playable loop
  without adding a server or account boundary.

## Current proof

M1 through M7 are accepted. The first playable SolidJS slice now lets you divide a cell, buy
producers, watch cells accumulate while the tab is open, reload preserved local progress, and see
meaningful offline gains on return. It keeps the game local to the browser: no account, network,
or clinical data is involved.

The accepted M7 evidence includes 75 Node/tsx tests and 6 production-dist Playwright tests. The
browser suite proves keyboard play, purchase and idle behavior, reload, offline gains, recovery,
focus identity, narrow layout, and zero browser diagnostics. There is no confirmed hosted
deployment URL, and no checked-in screenshot asset yet.

<!-- screenshots:begin (managed by screenshot-docs) -->
<!-- screenshots:end -->

## Play the first loop

Prerequisites: a current Node.js and npm installation. Install dependencies, then build and serve
the GitHub Pages-shaped `dist/` artifact locally:

```bash
npm install
npm run serve
```

Open the printed URL. Select **Divide cell** to create cells, then spend cells on a producer in
the **Division apparatus** panel. The producer raises ongoing cells per second; reload the page to
confirm that progress is local and durable. After time away, the **Offline progress** panel shows
the applied gain when it is meaningful. Controls remain keyboard-operable. Stop the foreground
server with `Ctrl-C`.

Use `npm run build` to create `dist/` without starting a server.

## Verify the foundation

The normal repository validation front door is not Vitest. Run the owned Node/tsx test and static
gate:

```bash
./check_codebase.sh
```

It type-checks source and test/tool surfaces, runs ESLint and Prettier checks, then runs
`tests/test_*.mjs` with Node's test runner and the `tsx` loader. The accepted M7 run contains 75
Node/tsx tests. This is not Vitest. Verify the production-built browser surface separately:

```bash
npm run test:playwright -- --build
```

That command rebuilds `dist/` and runs the committed production Playwright suite.

## What comes next

M8 is now hardening the game contracts. Later milestones add the 12-stage arc, 14 mechanically
distinct hallmark branches, prestige systems, and editable SVG colony visuals. The active plan
keeps those milestones explicit so the game's ambition stays testable as it grows.

## Documentation

- `docs/SOLID_MODEL.md` - the client-only SolidJS boundary, one-store model, and
  production-browser proof contract. It is shown as an inline path while its shared-worktree
  document remains untracked.
- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) - offline replay, clocks, and the shared economy
  tick semantics.
- [docs/STATE_PERSISTENCE.md](docs/STATE_PERSISTENCE.md) - local V2/p4 save ownership,
  migration, recovery, and writer-reader closure.
- [docs/BIGNUM_OPS.md](docs/BIGNUM_OPS.md) - the arithmetic, bulk-cost, and illion-display
  contract.
- [docs/PROGRESSION_DESIGN.md](docs/PROGRESSION_DESIGN.md) - the 14 branch decisions and
  12-stage gameplay arc.
- [docs/active_plans/implementation_plan.md](docs/active_plans/implementation_plan.md) - the
  canonical 22-milestone roadmap and acceptance criteria.
- [docs/active_plans/active/cancer_clicker_build_plan.md](docs/active_plans/active/cancer_clicker_build_plan.md)
  - the live execution ledger and accepted evidence.
- [docs/E2E_TESTS.md](docs/E2E_TESTS.md) and
  [docs/PLAYWRIGHT_USAGE.md](docs/PLAYWRIGHT_USAGE.md) - the difference between fast Node checks
  and production-shaped browser evidence.

## License

Source code is available under the [LICENSE.MIT](LICENSE.MIT).
