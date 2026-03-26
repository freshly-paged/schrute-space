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
import { COLLISION_BOXES } from '../constants';

const GRAVITY = 12;   // units/s²
const FLOOR_Y = 0.15;
const CEIL_Y  = 7.5;
const BOUNCE  = 0.35; // velocity retained after each wall/ceiling bounce

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

      // ── Wall / ceiling collision ────────────────────────────────────────
      // For each wall box that contains the object's position, resolve on the
      // minimum-penetration axis: push the point outside and reflect+damp
      // the velocity component along that axis.
      for (const box of COLLISION_BOXES) {
        if (!box.containsPoint(posRef.current)) continue;

        const dxMax = box.max.x - posRef.current.x;
        const dxMin = posRef.current.x - box.min.x;
        const dyMax = box.max.y - posRef.current.y;
        const dyMin = posRef.current.y - box.min.y;
        const dzMax = box.max.z - posRef.current.z;
        const dzMin = posRef.current.z - box.min.z;

        const minX = Math.min(dxMax, dxMin);
        const minY = Math.min(dyMax, dyMin);
        const minZ = Math.min(dzMax, dzMin);

        if (minX <= minY && minX <= minZ) {
          if (dxMax < dxMin) { posRef.current.x = box.max.x; velRef.current.x =  Math.abs(velRef.current.x) * BOUNCE; }
          else               { posRef.current.x = box.min.x; velRef.current.x = -Math.abs(velRef.current.x) * BOUNCE; }
        } else if (minY <= minX && minY <= minZ) {
          if (dyMax < dyMin) { posRef.current.y = box.max.y; velRef.current.y =  Math.abs(velRef.current.y) * BOUNCE; }
          else               { posRef.current.y = box.min.y; velRef.current.y = -Math.abs(velRef.current.y) * BOUNCE; }
        } else {
          if (dzMax < dzMin) { posRef.current.z = box.max.z; velRef.current.z =  Math.abs(velRef.current.z) * BOUNCE; }
          else               { posRef.current.z = box.min.z; velRef.current.z = -Math.abs(velRef.current.z) * BOUNCE; }
        }
      }

      // Ceiling
      if (posRef.current.y >= CEIL_Y) {
        posRef.current.y = CEIL_Y;
        velRef.current.y = -Math.abs(velRef.current.y) * BOUNCE;
      }

      // ── Floor landing ───────────────────────────────────────────────────
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
