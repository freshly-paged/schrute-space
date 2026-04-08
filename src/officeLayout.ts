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

/** Break room group origin in world space (matches BreakRoom `<group position>`). */
export const BREAK_ROOM_GROUP_POSITION: [number, number, number] = [6, 0, -16];

/** Water cooler position local to the break room group (NW corner). */
export const WATER_COOLER_LOCAL_POSITION: [number, number, number] = [-13, 0, -5];

/** Water cooler center in world space (group + local). */
export const WATER_COOLER_WORLD_POSITION: [number, number, number] = [
  BREAK_ROOM_GROUP_POSITION[0] + WATER_COOLER_LOCAL_POSITION[0],
  BREAK_ROOM_GROUP_POSITION[1] + WATER_COOLER_LOCAL_POSITION[1],
  BREAK_ROOM_GROUP_POSITION[2] + WATER_COOLER_LOCAL_POSITION[2],
];

/** Horizontal proximity radius for water cooler interactions (meters). */
export const WATER_COOLER_RADIUS = 2.5;

/** Vending machine position local to the break room group (east side). */
export const VENDING_MACHINE_LOCAL_POSITION: [number, number, number] = [13, 0, 0];

/** Vending machine center in world space (break room group + local). */
export const VENDING_MACHINE_WORLD_POSITION: [number, number, number] = [
  BREAK_ROOM_GROUP_POSITION[0] + VENDING_MACHINE_LOCAL_POSITION[0],
  BREAK_ROOM_GROUP_POSITION[1] + VENDING_MACHINE_LOCAL_POSITION[1],
  BREAK_ROOM_GROUP_POSITION[2] + VENDING_MACHINE_LOCAL_POSITION[2],
];

/** Horizontal proximity radius for Vend-O-Matic interactions (meters). */
export const VENDING_MACHINE_RADIUS = 2.5;
