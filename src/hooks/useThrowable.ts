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

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { COLLISION_BOXES } from '../constants';

const GRAVITY      = 12;   // units/s²
const FLOOR_Y      = 0.15;
const CEIL_Y       = 7.5;
const BOUNCE       = 0.35; // velocity retained after each wall/ceiling bounce
const PLAY_BOUNDS  = 22;   // matches LocalPlayer BOUNDS — hard perimeter safety net

export type ThrowablePhase = 'idle' | 'held' | 'thrown' | 'worn';

interface UseThrowableOptions {
  id: string;
  label?: string;
  description?: string;
  assetKey?: string;
  restPosition: [number, number, number];
  restRotation?: [number, number, number];
  proximityRadius?: number;
  /** When true: [E] while held wears the prop; no throw. World mesh hidden while worn (local or remote). */
  wearable?: boolean;
}

interface UseThrowableResult {
  groupRef: React.RefObject<THREE.Group | null>;
  phase: ThrowablePhase;
  isNear: boolean;
}

export function useThrowable({
  id,
  label = id,
  description = '',
  assetKey = '',
  restPosition,
  restRotation = [0, 0, 0],
  proximityRadius = 2.5,
  wearable = false,
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

  // Track the previous heldObjectId to detect the moment this object is thrown/dropped
  const prevHeldIdRef = useRef<string | null>(null);

  // Pre-allocated vectors for swept collision — avoids per-frame GC
  const sweepRayRef  = useRef(new THREE.Ray());
  const sweepHitRef  = useRef(new THREE.Vector3());
  const sweepDirRef  = useRef(new THREE.Vector3());
  const prevPosRef   = useRef(new THREE.Vector3());

  // [F] to inspect — only fires when this object is idle and the player is nearby
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF') return;
      const store = useGameStore.getState();
      if (store.nearThrowableId !== id) return;
      if (phaseRef.current !== 'idle') return;
      if (store.isChatFocused || store.isTimerActive || store.inspectedObject !== null) return;
      store.openInspect({ id, label, description, assetKey });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [id, label, description, assetKey]);

  // Apply server-broadcast rest pose when another client drops / removes wear
  useEffect(
    () =>
      useGameStore.subscribe((state, prev) => {
        const next = state.throwableRest[id];
        const was = prev?.throwableRest?.[id];
        if (!next || next === was) return;
        if (
          was &&
          next.position[0] === was.position[0] &&
          next.position[1] === was.position[1] &&
          next.position[2] === was.position[2] &&
          next.rotation[0] === was.rotation[0] &&
          next.rotation[1] === was.rotation[1] &&
          next.rotation[2] === was.rotation[2]
        ) {
          return;
        }
        restPosRef.current.set(...next.position);
        restRotRef.current.set(...next.rotation);
      }),
    [id]
  );

  useFrame((rfState, delta) => {
    if (!groupRef.current) return;

    const store = useGameStore.getState();
    const { heldObjectId, throwVelocity, wornPropId, remoteWornThrowableIds } = store;

    const playerGroup = rfState.scene.getObjectByName('localPlayer');
    const playerPos = new THREE.Vector3();
    if (playerGroup) playerGroup.getWorldPosition(playerPos);

    const hiddenBecauseWornElsewhere =
      wearable &&
      remoteWornThrowableIds.includes(id) &&
      wornPropId !== id &&
      phaseRef.current !== 'held' &&
      phaseRef.current !== 'worn';

    // ── Transitions ───────────────────────────────────────────────────────

    if (heldObjectId === id && phaseRef.current === 'idle') {
      transitionTo('held');
    } else if (prevHeldIdRef.current === id && heldObjectId !== id && phaseRef.current === 'held') {
      if (wearable && wornPropId === id) {
        transitionTo('worn');
      } else if (store.droppingObjectId === id) {
        // Put down: place at player feet, no physics
        posRef.current.copy(playerPos).setY(FLOOR_Y);
        restPosRef.current.copy(posRef.current);
        restRotRef.current.set(0, groupRef.current.rotation.y, 0);
        if (wearable) {
          store.setThrowableRest(id, [posRef.current.x, posRef.current.y, posRef.current.z], [
            restRotRef.current.x,
            restRotRef.current.y,
            restRotRef.current.z,
          ]);
        }
        store.setNearThrowable(null); // clear so prompt reappears after a step away
        transitionTo('idle');
      } else if (wearable) {
        // Wearable props cannot be thrown — treat release as drop at feet
        posRef.current.copy(playerPos).setY(FLOOR_Y);
        restPosRef.current.copy(posRef.current);
        restRotRef.current.set(0, playerGroup ? playerGroup.rotation.y : 0, 0);
        store.setThrowableRest(id, [posRef.current.x, posRef.current.y, posRef.current.z], [
          restRotRef.current.x,
          restRotRef.current.y,
          restRotRef.current.z,
        ]);
        store.setNearThrowable(null);
        transitionTo('idle');
      } else {
        velRef.current.set(throwVelocity[0], throwVelocity[1], throwVelocity[2]);
        transitionTo('thrown');
      }
    } else if (phaseRef.current === 'worn' && wornPropId !== id) {
      posRef.current.copy(playerPos).setY(FLOOR_Y);
      restPosRef.current.copy(posRef.current);
      restRotRef.current.set(0, playerGroup ? playerGroup.rotation.y : 0, 0);
      store.setThrowableRest(id, [posRef.current.x, posRef.current.y, posRef.current.z], [
        restRotRef.current.x,
        restRotRef.current.y,
        restRotRef.current.z,
      ]);
      store.setNearThrowable(null);
      transitionTo('idle');
    }
    prevHeldIdRef.current = heldObjectId;

    // ── Per-phase behavior ────────────────────────────────────────────────

    if (phaseRef.current === 'idle') {
      posRef.current.copy(restPosRef.current);
      groupRef.current.rotation.copy(restRotRef.current);

      if (hiddenBecauseWornElsewhere) {
        groupRef.current.visible = false;
        if (store.nearThrowableId === id) store.setNearThrowable(null);
      } else {
        groupRef.current.visible = true;
        const near = posRef.current.distanceTo(playerPos) < proximityRadius;
        if (near && store.nearThrowableId !== id) store.setNearThrowable(id);
        else if (!near && store.nearThrowableId === id) store.setNearThrowable(null);
      }

    } else if (phaseRef.current === 'worn') {
      groupRef.current.visible = false;
      if (store.nearThrowableId === id) store.setNearThrowable(null);

    } else if (phaseRef.current === 'held') {
      groupRef.current.visible = true;
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
      groupRef.current.visible = true;
      prevPosRef.current.copy(posRef.current);

      velRef.current.y -= GRAVITY * delta;
      posRef.current.addScaledVector(velRef.current, delta);
      groupRef.current.rotation.y += 10 * delta;
      groupRef.current.rotation.x += 6 * delta;

      // ── Swept collision (handles thin walls / tunneling) ────────────────
      // Cast a ray from the previous position to the new one. If it crosses
      // any wall box, reflect and damp the velocity at the crossing point.
      sweepDirRef.current.subVectors(posRef.current, prevPosRef.current);
      const sweepLen = sweepDirRef.current.length();
      if (sweepLen > 0.001) {
        sweepRayRef.current.origin.copy(prevPosRef.current);
        sweepRayRef.current.direction.copy(sweepDirRef.current).divideScalar(sweepLen);

        for (const box of COLLISION_BOXES) {
          if (!sweepRayRef.current.intersectBox(box, sweepHitRef.current)) continue;
          if (sweepHitRef.current.distanceTo(prevPosRef.current) > sweepLen) continue;

          // Determine which face was hit to get the surface normal
          const eps = 0.02;
          const h = sweepHitRef.current;
          let nx = 0, ny = 0, nz = 0;
          if      (h.x <= box.min.x + eps) nx = -1;
          else if (h.x >= box.max.x - eps) nx =  1;
          else if (h.y <= box.min.y + eps) ny = -1;
          else if (h.y >= box.max.y - eps) ny =  1;
          else if (h.z <= box.min.z + eps) nz = -1;
          else                             nz =  1;

          // Push back to just outside the wall, reflect+damp velocity
          posRef.current.copy(h);
          if (nx !== 0) { posRef.current.x += nx * 0.05; velRef.current.x = Math.sign(nx) * Math.abs(velRef.current.x) * BOUNCE; }
          if (ny !== 0) { posRef.current.y += ny * 0.05; velRef.current.y = Math.sign(ny) * Math.abs(velRef.current.y) * BOUNCE; }
          if (nz !== 0) { posRef.current.z += nz * 0.05; velRef.current.z = Math.sign(nz) * Math.abs(velRef.current.z) * BOUNCE; }
        }
      }

      // ── Penetration fallback (slow-moving objects already inside a box) ─
      for (const box of COLLISION_BOXES) {
        if (!box.containsPoint(posRef.current)) continue;
        const dxMax = box.max.x - posRef.current.x, dxMin = posRef.current.x - box.min.x;
        const dyMax = box.max.y - posRef.current.y, dyMin = posRef.current.y - box.min.y;
        const dzMax = box.max.z - posRef.current.z, dzMin = posRef.current.z - box.min.z;
        const minX = Math.min(dxMax, dxMin), minY = Math.min(dyMax, dyMin), minZ = Math.min(dzMax, dzMin);
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

      // ── Hard perimeter clamp — final safety net ─────────────────────────
      if (posRef.current.x < -PLAY_BOUNDS) { posRef.current.x = -PLAY_BOUNDS; velRef.current.x =  Math.abs(velRef.current.x) * BOUNCE; }
      if (posRef.current.x >  PLAY_BOUNDS) { posRef.current.x =  PLAY_BOUNDS; velRef.current.x = -Math.abs(velRef.current.x) * BOUNCE; }
      if (posRef.current.z < -PLAY_BOUNDS) { posRef.current.z = -PLAY_BOUNDS; velRef.current.z =  Math.abs(velRef.current.z) * BOUNCE; }
      if (posRef.current.z >  PLAY_BOUNDS) { posRef.current.z =  PLAY_BOUNDS; velRef.current.z = -Math.abs(velRef.current.z) * BOUNCE; }

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
