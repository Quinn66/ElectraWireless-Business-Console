/**
 * Semantic colour constants shared across all components.
 * These are intentionally kept as plain hex strings so they can be used
 * in both Tailwind arbitrary-value classes and inline React style props.
 */

/** Positive financial values — profit, growth, success */
export const C_SUCCESS = "#1D9E75";

/** Negative financial values — expenses, losses, errors */
export const C_ERROR = "#E24B4A";

/** Warnings — alerts, amber indicators */
export const C_WARNING = "#F59E0B";

/** Brand primary indigo (mirrors --primary CSS variable) */
export const C_PRIMARY = "#2f2485";

/** Prophet / secondary violet line on charts */
export const C_VIOLET = "#7C3AED";

/** Historical data — neutral grey */
export const C_HIST = "#9CA3AF";

/** Shared panel/card border */
export const C_BORDER = "hsl(244 25% 82%)";

/** Inner table row border (lighter than C_BORDER) */
export const C_BORDER_IN = "hsl(244 25% 88%)";
