/**
 * Seated leg presets for desk focus: hip Euler rotations [lx, ly, lz, rx, ry, rz] (radians).
 * Single-segment legs: large lx ≈ thighs forward; ly opens legs sideways for “劈叉” reads.
 */
export const FOCUS_SIT_POSES: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  // 0 — 向前平伸：两腿尽量同向朝前伸出（高 lx，几乎无侧摆）
  [1.52, 0.02, 0.06, 1.52, -0.02, -0.06],

  // 1 — 单腿前抬：左腿高抬前伸，右腿收回下垂（像一条腿架起来）
  [1.58, 0.12, 0.1, 0.18, -0.06, -0.12],

  // 2 — 横向劈叉（中开）：髋外展，两腿向左右打开仍保持坐姿前倾
  [0.98, -0.58, 0.2, 0.98, 0.58, -0.2],

  // 3 — 横向劈叉（大开）：劈得更开，和 2 明显不同
  [0.88, -0.72, 0.26, 0.88, 0.72, -0.26],

  // 4 — 混合：一腿向前平伸，另一腿向侧方打开
  [1.45, -0.08, 0.14, 0.95, 0.48, -0.22],
];

export const FOCUS_SIT_POSE_COUNT = FOCUS_SIT_POSES.length;
