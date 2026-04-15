/**
 * Shared office layout constants — imported by both server-side (server.ts)
 * and client-side code. Keep this file free of React / Three.js imports.
 */

// ─── Office dimensions ────────────────────────────────────────────────────────
// All player, camera, and geometry bounds are derived from these two values so
// that changing the office size only ever requires editing this file.

/** Distance from world origin to the interior face of each perimeter wall. */
export const OFFICE_HALF_SIZE = 23;

/** Interior ceiling height in world units. */
export const OFFICE_CEILING_Y = 6;

/**
 * Maximum Y the player's feet may reach.
 * Set so the player's visual height (~1.9 units) stays below the ceiling.
 */
export const PLAYER_ROOF_Y = OFFICE_CEILING_Y - 1.9;

/**
 * Maximum Y the camera position may reach (just below the ceiling so it
 * never pokes through).
 */
export const CAMERA_MAX_Y = OFFICE_CEILING_Y - 0.2;

/**
 * Maximum XZ magnitude for player movement.
 * One unit of inset from the wall interior face keeps the player inside.
 */
export const PLAYER_BOUNDS_XZ = OFFICE_HALF_SIZE - 1;

/** World-space bounds of the working area (where player desks are placed). */
export const WORKING_AREA_BOUNDS = {
  x1: -9,
  z1: -9,
  x2: 23,
  z2: 23,
} as const;

/** Horizontal center of the working area (world X and Z). */
export const WORKING_AREA_CENTER_XZ: [number, number] = [
  (WORKING_AREA_BOUNDS.x1 + WORKING_AREA_BOUNDS.x2) / 2,
  (WORKING_AREA_BOUNDS.z1 + WORKING_AREA_BOUNDS.z2) / 2,
];

/**
 * Floating Team Pyramid prop position (working-area center, elevated).
 * Y is meters above the floor.
 */
export const TEAM_PYRAMID_WORLD_POSITION: [number, number, number] = [
  WORKING_AREA_CENTER_XZ[0],
  4.85,
  WORKING_AREA_CENTER_XZ[1],
];

/** Proximity radius for inspecting the floating Team Pyramid (meters). */
export const TEAM_PYRAMID_INSPECT_RADIUS = 3;

/** Minimum distance from working-area walls before placing a desk. */
export const DESK_SPAWN_MARGIN = 3;

/** Grid spacing between desk spawn slots. */
export const DESK_SPAWN_SPACING = 3.5;

/** Break room group origin in world space (matches BreakRoom `<group position>`). */
export const BREAK_ROOM_GROUP_POSITION: [number, number, number] = [6, 0, -16];

/** Water cooler position local to the break room group (NW corner, flush against north wall, gap from west wall). */
export const WATER_COOLER_LOCAL_POSITION: [number, number, number] = [-12, 0, -6.75];

/** Water cooler center in world space (group + local). */
export const WATER_COOLER_WORLD_POSITION: [number, number, number] = [
  BREAK_ROOM_GROUP_POSITION[0] + WATER_COOLER_LOCAL_POSITION[0],
  BREAK_ROOM_GROUP_POSITION[1] + WATER_COOLER_LOCAL_POSITION[1],
  BREAK_ROOM_GROUP_POSITION[2] + WATER_COOLER_LOCAL_POSITION[2],
];

/** Horizontal proximity radius for water cooler interactions (meters). */
export const WATER_COOLER_RADIUS = 2.5;

/** Vending machine position local to the break room group (east side, flush against east wall, 1u north of centre). */
export const VENDING_MACHINE_LOCAL_POSITION: [number, number, number] = [16.5, 0, -1];

/** Vending machine center in world space (break room group + local). */
export const VENDING_MACHINE_WORLD_POSITION: [number, number, number] = [
  BREAK_ROOM_GROUP_POSITION[0] + VENDING_MACHINE_LOCAL_POSITION[0],
  BREAK_ROOM_GROUP_POSITION[1] + VENDING_MACHINE_LOCAL_POSITION[1],
  BREAK_ROOM_GROUP_POSITION[2] + VENDING_MACHINE_LOCAL_POSITION[2],
];

/** Horizontal proximity radius for Vend-O-Matic interactions (meters). */
export const VENDING_MACHINE_RADIUS = 2.5;

/** World-space position of the copier (matches PrinterStation placement in WorkingArea). */
export const COPIER_WORLD_POSITION: [number, number, number] = [12, 0, 12];

/** Horizontal proximity radius for copier interactions (meters). */
export const COPIER_RADIUS = 2.5;

/**
 * World-space desk slots inside the Manager's Office for the 'manager' role.
 * Assigned in order; first unoccupied slot wins.
 * All desks face east ([0, -PI/2, 0]): drawers toward the east windows/door,
 * chair on the west side.
 */
export const MANAGER_OFFICE_DESK_SLOTS: Array<{
  position: [number, number, number];
  rotation: [number, number, number];
}> = [
  // Slot 0 — canonical boss desk position (west-centre)
  { position: [-17, 0, 12], rotation: [0, -Math.PI / 2, 0] },
  // Slot 1 — north-east area, away from the door opening
  { position: [-14, 0, 7],  rotation: [0, -Math.PI / 2, 0] },
  // Slot 2 — south-east area
  { position: [-13, 0, 16], rotation: [0, -Math.PI / 2, 0] },
  // Slot 3 — south-west area (clear of bookshelf at x≈-21)
  { position: [-19, 0, 16], rotation: [0, -Math.PI / 2, 0] },
];
