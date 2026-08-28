# Player and developer cookbook

## Inspect a first board

1. Run `npm run serve` from the repository root and open the printed URL.
2. Click a visible cell and confirm the arena count changes.
3. Choose a buy quantity in the upgrade rack and purchase an affordable illustrated machine.
4. Open an evolution tab, focus a compact icon to read its tooltip, and open specimen details from
   the HUD or an available detail control.

This walkthrough checks the intended board sequence: direct tumor action, growth feedback, upgrade
choice, then biological explanation. It uses fictional game state rather than clinical
interpretation.

## Review keyboard parity

1. Tab to the `Divide cell` control and press Enter or Space.
2. Tab through the evolution tabs and upgrade controls; read each visible focus treatment and
   tooltip.
3. Open the specimen drawer, press Escape, and verify focus returns to the invoking control.
4. Repeat at a 360px viewport, where the board stacks tumor, evolution, upgrade rack, and rewards.

## Capture a visual change

1. Build the production artifact with `./build_github_pages.sh`.
2. Capture the current board at 1280 x 800 and the narrow board at 360px.
3. Repeat with reduced motion enabled.
4. Review that cell geometry, not whitespace, is the primary pointer target; that labels and small
   icons remain legible; and that no clipping hides the action or upgrade rack.

These captures are one-time visual evidence. Keep permanent tests focused on deterministic,
behavioral contracts.
