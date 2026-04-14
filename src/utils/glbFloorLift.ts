import * as THREE from 'three';

/**
 * Computes the Y offset needed to lift a cloned GLB scene so its lowest point
 * sits flush on the floor (y = 0).
 *
 * Usage:
 *   const cloned = scene.clone();
 *   const yLift = computeFloorLift(cloned);
 *   return <primitive object={cloned} position={[0, yLift, 0]} />;
 *
 * Only use this for props that rest on the floor. Desk-surface items and
 * throwables have their own positioning and should not use this helper.
 */
export function computeFloorLift(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return -box.min.y;
}
