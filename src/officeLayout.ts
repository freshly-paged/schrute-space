/**
 * Shared office layout constants — imported by both server-side (server.ts)
 * and client-side code. Keep this file free of React / Three.js imports.
 */

/** World-space bounds of the working area (where player desks are placed). */
export const WORKING_AREA_BOUNDS = {
  x1: -9,
  z1: -9,
  x2: 23,
  z2: 23,
} as const;

/** Minimum distance from working-area walls before placing a desk. */
export const DESK_SPAWN_MARGIN = 3;

/** Grid spacing between desk spawn slots. */
export const DESK_SPAWN_SPACING = 3.5;
