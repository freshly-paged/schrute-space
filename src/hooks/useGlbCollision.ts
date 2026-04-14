/**
 * useGlbCollision — registers a GLB prop's world-space bounding box in the
 * dynamic collision registry after the first animation frame, and cleans it up on unmount.
 *
 * Registration is deferred to the first useFrame tick (not useEffect) so that
 * R3F has already called scene.updateMatrixWorld() and all ancestor world matrices
 * are guaranteed to be correct.
 *
 *   function MyProp({ position, rotation }) {
 *     const ref = useRef<THREE.Group>(null);
 *     useGlbCollision('my-prop-id', ref);
 *     return <group ref={ref} position={position} rotation={rotation}>...</group>;
 *   }
 */
import { useEffect, useRef, RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  registerDynamicCollisionBox,
  unregisterDynamicCollisionBox,
} from '../utils/dynamicCollisionRegistry';

export function useGlbCollision(id: string, groupRef: RefObject<THREE.Group | null>): void {
  const registeredRef = useRef(false);

  // Compute and register the world-space bounding box on the first animation frame.
  // useFrame runs after R3F calls scene.updateMatrixWorld(), so all parent transforms
  // are already baked — no manual updateWorldMatrix() needed.
  useFrame(() => {
    if (registeredRef.current) return;
    const group = groupRef.current;
    if (!group) return;

    const box = new THREE.Box3().setFromObject(group);
    registerDynamicCollisionBox(id, box);
    registeredRef.current = true;
  });

  // Unregister on unmount so stale boxes don't linger.
  useEffect(() => {
    return () => {
      unregisterDynamicCollisionBox(id);
      registeredRef.current = false;
    };
  }, [id]);
}
