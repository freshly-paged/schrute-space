/**
 * useThrowable — makes any world object pick-up-able and throwable.
 *
 * Usage:
 *   const { groupRef, phase, isNear } = useThrowable({
 *     id: 'my-object',
 *     restPosition: [x, y, z],
 *   });
 *   return <group ref={groupRef}>...</group>;
 *
 * Phase transitions (driven by useGameStore):
 *   idle  →  pickUpObject(id)       →  held
 *   held  →  throwObject(velocity)  →  thrown
 *   thrown → hits floor              →  idle  (at landed position)
 *
 * LocalPlayer owns the throw velocity calculation and calls throwObject().
 * All position/physics are handled here via refs — no per-frame re-renders.
 * The `phase` value (React state) only updates on transitions, triggering
 * re-renders for UI prompts.
 */

import { useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const GRAVITY = 12;  // units/s²
const FLOOR_Y = 0.15;

export type ThrowablePhase = 'idle' | 'held' | 'thrown';

interface UseThrowableOptions {
  id: string;
  restPosition: [number, number, number];
  restRotation?: [number, number, number];
  proximityRadius?: number;
}

interface UseThrowableResult {
  groupRef: React.RefObject<THREE.Group | null>;
  phase: ThrowablePhase;
  isNear: boolean;
}

export function useThrowable({
  id,
  restPosition,
  restRotation = [0, 0, 0],
  proximityRadius = 2.5,
}: UseThrowableOptions): UseThrowableResult {
  const groupRef = useRef<THREE.Group>(null);

  // Physics — mutated every frame, never trigger React re-renders
  const posRef = useRef(new THREE.Vector3(...restPosition));
  const velRef = useRef(new THREE.Vector3());
  // Resting pose updates each time the object lands somewhere new
  const restPosRef = useRef(new THREE.Vector3(...restPosition));
  const restRotRef = useRef(new THREE.Euler(...restRotation));

  // phaseRef: authoritative value for use inside useFrame (avoids stale closures)
  // phase (state): mirrors phaseRef, drives React re-renders for UI prompts
  const phaseRef = useRef<ThrowablePhase>('idle');
  const [phase, setPhase] = useState<ThrowablePhase>('idle');

  const transitionTo = useCallback((next: ThrowablePhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  // Track the previous heldObjectId to detect the moment this object is thrown
  const prevHeldIdRef = useRef<string | null>(null);

  useFrame((rfState, delta) => {
    if (!groupRef.current) return;

    const store = useGameStore.getState();
    const { heldObjectId, throwVelocity } = store;

    const playerGroup = rfState.scene.getObjectByName('localPlayer');
    const playerPos = new THREE.Vector3();
    if (playerGroup) playerGroup.getWorldPosition(playerPos);

    // ── Transitions ───────────────────────────────────────────────────────

    if (heldObjectId === id && phaseRef.current === 'idle') {
      transitionTo('held');
    } else if (prevHeldIdRef.current === id && heldObjectId !== id && phaseRef.current === 'held') {
      velRef.current.set(throwVelocity[0], throwVelocity[1], throwVelocity[2]);
      transitionTo('thrown');
    }
    prevHeldIdRef.current = heldObjectId;

    // ── Per-phase behavior ────────────────────────────────────────────────

    if (phaseRef.current === 'idle') {
      posRef.current.copy(restPosRef.current);
      groupRef.current.rotation.copy(restRotRef.current);

      const near = posRef.current.distanceTo(playerPos) < proximityRadius;
      if (near && store.nearThrowableId !== id) store.setNearThrowable(id);
      else if (!near && store.nearThrowableId === id) store.setNearThrowable(null);

    } else if (phaseRef.current === 'held') {
      // Use the player mesh's own rotation (set by LocalPlayer, which tracks camera
      // direction when holding) so the object stays glued to the player regardless
      // of how the camera orbits.
      const facingY = playerGroup ? playerGroup.rotation.y : 0;
      const facingDir = new THREE.Vector3(Math.sin(facingY), 0, Math.cos(facingY));
      posRef.current
        .copy(playerPos)
        .addScaledVector(facingDir, 0.6)
        .setY(playerPos.y + 0.9);
      groupRef.current.rotation.set(0, facingY, 0);

    } else if (phaseRef.current === 'thrown') {
      velRef.current.y -= GRAVITY * delta;
      posRef.current.addScaledVector(velRef.current, delta);
      groupRef.current.rotation.y += 10 * delta;
      groupRef.current.rotation.x += 6 * delta;

      if (posRef.current.y <= FLOOR_Y) {
        posRef.current.y = FLOOR_Y;
        restPosRef.current.copy(posRef.current);
        restRotRef.current.set(Math.PI / 5, groupRef.current.rotation.y, 0);
        transitionTo('idle');
      }
    }

    groupRef.current.position.copy(posRef.current);
  });

  const isNear = useGameStore((s) => s.nearThrowableId === id);

  return { groupRef, phase, isNear };
}
