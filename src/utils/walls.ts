import * as THREE from 'three';

export interface WallDef {
  args: [number, number, number];     // [width, height, depth] — same as <Box args>
  position: [number, number, number]; // local center position  — same as <Box position>
}

/**
 * Converts an array of WallDef objects to world-space THREE.Box3 collision boxes.
 * Pass the same groupOffset as the <group position> that wraps the walls.
 *
 * Usage:
 *   const WALLS: WallDef[] = [
 *     { args: [14, 8, 0.3], position: [0, 4, -7] }, // north wall
 *     ...
 *   ];
 *   export const MY_ROOM_COLLISION_BOXES = [
 *     ...wallsToBoxes(WALLS, GROUP_OFFSET),
 *     // any non-wall furniture boxes can still be added manually below
 *   ];
 *
 *   In JSX, render the same walls with:
 *   {WALLS.map((w, i) => (
 *     <Box key={i} args={w.args} position={w.position}>
 *       <meshStandardMaterial ... />
 *     </Box>
 *   ))}
 */
export function wallsToBoxes(
  walls: WallDef[],
  groupOffset: [number, number, number] = [0, 0, 0],
): THREE.Box3[] {
  const [gx, gy, gz] = groupOffset;
  return walls.map(({ args: [w, h, d], position: [lx, ly, lz] }) => {
    const cx = gx + lx;
    const cy = gy + ly;
    const cz = gz + lz;
    return new THREE.Box3(
      new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
    );
  });
}
