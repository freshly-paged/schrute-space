/**
 * Runtime registry for collision boxes derived from GLB models.
 *
 * GLB bounds are only known after the model loads, so they can't be included
 * in the static COLLISION_BOXES constant. This registry lets GLB components
 * register their world-space bounding box after mount and unregister on unmount.
 *
 * The physics hook merges these with the static boxes every frame.
 * No React state is involved — reads/writes are plain Map operations.
 */
import * as THREE from 'three';

const registry = new Map<string, THREE.Box3>();

export function registerDynamicCollisionBox(id: string, box: THREE.Box3): void {
  registry.set(id, box);
}

export function unregisterDynamicCollisionBox(id: string): void {
  registry.delete(id);
}

/** Returns a snapshot of all currently registered dynamic boxes. Called each frame by the physics hook. */
export function getDynamicCollisionBoxes(): IterableIterator<THREE.Box3> {
  return registry.values();
}
