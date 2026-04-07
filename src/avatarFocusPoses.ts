/**
 * Seated leg presets for desk focus: hip Euler rotations [lx, ly, lz, rx, ry, rz] (radians).
 * Single-segment legs: large lx ≈ thighs forward; ly opens legs sideways for a straddle read.
 */
export const FOCUS_SIT_POSES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  // 0 — both legs forward, same direction (high lx, little lateral spread)
  [1.52, 0.02, 0.06, 1.52, -0.02, -0.06],

  // 1 — one leg raised forward, other tucked down
  [1.58, 0.12, 0.1, 0.18, -0.06, -0.12],

  // 2 — moderate sideways straddle, still seated lean
  [0.98, -0.58, 0.2, 0.98, 0.58, -0.2],

  // 3 — wide sideways straddle, clearly wider than 2
  [0.88, -0.72, 0.26, 0.88, 0.72, -0.26],

  // 4 — mix: one leg forward, one leg out to the side
  [1.45, -0.08, 0.14, 0.95, 0.48, -0.22],
];

export const FOCUS_SIT_POSE_COUNT = FOCUS_SIT_POSES.length;
