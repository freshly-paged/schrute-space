/**
 * useGlbCollision — registers a GLB prop's world-space bounding box in the
 * dynamic collision registry after the model mounts, and cleans it up on unmount.
 *
 * Usage: call this inside the component that renders the <primitive> (i.e. inside
 * the Suspense boundary, after the GLB has loaded). Pass a ref to the group that
 * carries the correct world position and rotation so setFromObject gives
 * world-space bounds.
 *
 *   function MyProp({ position, rotation }) {
 *     const ref = useRef<THREE.Group>(null);
 *     useGlbCollision('my-prop-id', ref);
 *     return <group ref={ref} position={position} rotation={rotation}>...</group>;
 *   }
 */
import { useEffect, RefObject } from 'react';
import * as THREE from 'three';
import {
  registerDynamicCollisionBox,
  unregisterDynamicCollisionBox,
} from '../utils/dynamicCollisionRegistry';

export function useGlbCollision(id: string, groupRef: RefObject<THREE.Group | null>): void {
  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // Ensure parent transforms are baked into matrixWorld before computing bounds.
    // useEffect runs before the first R3F frame, so world matrices may not be up to date yet.
    group.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(group);
    registerDynamicCollisionBox(id, box);

    return () => {
      unregisterDynamicCollisionBox(id);
    };
  }, [id, groupRef]);
}
