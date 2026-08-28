# Troubleshooting

## A pointer click does not divide a cell

- Click directly on a visible membrane or nucleus. Tissue background, voids, and board whitespace
  intentionally remain inert.
- Use the focusable `Divide cell` control and press Enter or Space to verify the shared action.
- If the saved-progress recovery notice is visible, make its explicit replacement decision before
  normal gameplay can write progress again.

## A compact control is unfamiliar

- Hover, focus, or press the control to open its tooltip.
- Read the control's accessible label with a screen reader; decorative adjacent SVG marks do not
  replace its name.
- Use the specimen drawer when an available detail control offers a biological explanation.

## The narrow board looks different

- At widths below 48rem, the board intentionally stacks the tumor arena, active evolution family,
  upgrade rack, and rewards to preserve readable controls.
- The 360px layout keeps direct-cell keyboard activation, tooltips, and drawer behavior. It does
  not remove progress or turn the game into a static poster.

## Motion is distracting

- Enable the operating system or browser reduced-motion preference.
- The board removes animation while retaining static morphology, earned state, focus, and direct
  interaction cues.

## A local save did not appear after reopening

- Return to the same browser origin printed by `npm run serve`; another port is another local
  storage origin.
- Read [STATE_PERSISTENCE.md](STATE_PERSISTENCE.md) for protected unreadable-save behavior and the
  explicit fresh-replacement route.
