/** Player-facing Chicago-scale copy stays separate from state and interaction ownership. */
export const ENDING_COPY = Object.freeze({
  availableLead:
    "The colony now occupies the modeled volume of Chicago's high-rise core. Open the report when you want the scale change explained.",
  reachedLead:
    "The map did not get smaller. Your experiment got large enough to need a city-sized metaphor.",
  continuation:
    "Cells, producers, offline accrual, and dissemination choices continue from the same saved experiment.",
  unavailableLead:
    "The report unlocks after the global laboratory stage, one completed dissemination tier, and the modeled Chicago cell scale.",
} as const);
