# Release history

## v26.08.0 - 2026-08-28

### Highlights

- Delivered the living-tumor board as a 1280 x 800 interactive game surface: players click visible
  cancer cells while the colony, perfusion, invasion, and dissemination world develops around them.
- Added a complete fourteen-hallmark progression model with player-facing biology decisions,
  producer consequences, stage gating, mutation drafting, and late-hallmark effects.
- Added durable prestige layers for organ transit, host transfer, immortalized culture, assay work,
  and dissemination campaigns, each with saved state and explicit player-facing tradeoffs.
- Added a Chicago-scale soft ending that records a reached transition at the required cell scale,
  transforms the colony view into a city-scale dissemination scene, and keeps the game playable.
- Added development replay and a headless balance laboratory that both consume the same visible
  decisions and canonical event/reducer pathways as the game.

### Notable fixes

- Repaired the reached city overlay so it responds immediately after the accepted scale transition.
- Preserved a usable direct-cell click target in constrained desktop layouts.
- Corrected late-hallmark activation ordering and culture fixture IDs so canonical current-save
  validation exercises the actual domain model.
- Tightened saved campaign validation so active and completed plans retain their authoritative
  frontier source, topology, and containment choice.

### Compatibility notes

- **Pre-production schema cutover.** The release accepts and writes exactly `version: 2` with
  `stateSchemaVersion: 8`. Incompatible or incomplete data enters protected recovery, retaining
  rejected bytes until the player explicitly confirms a validated fresh replacement.
- Semantic replay is a development diagnostic over schema-current snapshots and accepted events. It
  verifies behavior through the current parser and reducer; it does not provide player-save
  compatibility.
- Earlier p5/p6/p7 migration work is historical implementation context, not a supported input
  contract for this release.

### Validation

- The release work records strict TypeScript compilation, the repository's `./check_codebase.sh`
  gate, production build checks, and production-browser gameplay coverage in
  [docs/CHANGELOG.md](CHANGELOG.md).
- Semantic replay, save parsing, reducer behavior, and browser interaction are validated as separate
  evidence lanes rather than as a byte- or pixel-equivalence claim.
