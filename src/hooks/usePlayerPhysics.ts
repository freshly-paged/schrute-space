import { useRef, useCallback, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { COLLISION_BOXES } from '../constants';
import { PLAYER_ROOF_Y } from '../officeLayout';
import { Player } from '../types';

/** Values derived from physics refs that must trigger React re-renders (refs alone do not). */
export type PlayerPhysicsAvatarSnapshot = Readonly<{
  grounded: boolean;
  rolling: boolean;
}>;

// Pre-allocated objects to avoid per-frame GC pressure
const _playerBox = new THREE.Box3();
const _otherBox = new THREE.Box3();
const _boxCenter = new THREE.Vector3();
const _playerSize = new THREE.Vector3(0.5, 1.4, 0.5);
const _moveScaled = new THREE.Vector3();

const JUMP_FORCE = 8;
const GRAVITY = 20;
const ROLL_DURATION = 0.5;
const DOUBLE_TAP_MS = 300;

export function usePlayerPhysics() {
  const yVelocity = useRef(0);
  const jumpCount = useRef(0);
  const isGrounded = useRef(true);
  const lastJumpTime = useRef(0);
  const lastForwardTime = useRef(0);
  const isRolling = useRef(false);
  const rollTimer = useRef(0);
  const prevJumpPressed = useRef(false);
  const prevForwardPressed = useRef(false);

  const avatarSnapshotRef = useRef<PlayerPhysicsAvatarSnapshot>({ grounded: true, rolling: false });
  const avatarListenersRef = useRef(new Set<() => void>());

  function pushAvatarSnapshot() {
    const g = isGrounded.current;
    const r = isRolling.current;
    const s = avatarSnapshotRef.current;
    if (s.grounded === g && s.rolling === r) return;
    avatarSnapshotRef.current = { grounded: g, rolling: r };
    avatarListenersRef.current.forEach((l) => l());
  }

  const subscribeAvatar = useCallback((onStoreChange: () => void) => {
    avatarListenersRef.current.add(onStoreChange);
    return () => {
      avatarListenersRef.current.delete(onStoreChange);
    };
  }, []);

  const getAvatarSnapshot = useCallback(() => avatarSnapshotRef.current, []);

  function processJump(
    jump: boolean,
    opts?: { onDoubleJump?: () => void; tryConsumeParkourEnergy?: () => boolean }
  ) {
    const justPressed = jump && !prevJumpPressed.current;
    prevJumpPressed.current = jump;

    if (!justPressed) return;

    const now = Date.now();
    if (isGrounded.current) {
      yVelocity.current = JUMP_FORCE;
      isGrounded.current = false;
      jumpCount.current = 1;
    } else if (jumpCount.current === 1) {
      if (opts?.tryConsumeParkourEnergy && !opts.tryConsumeParkourEnergy()) {
        lastJumpTime.current = now;
        pushAvatarSnapshot();
        return;
      }
      yVelocity.current = JUMP_FORCE;
      jumpCount.current = 2;
      opts?.onDoubleJump?.();
    }
    lastJumpTime.current = now;
    pushAvatarSnapshot();
  }

  function processRoll(
    forward: boolean,
    opts?: { onRoll?: () => void; tryConsumeParkourEnergy?: () => boolean }
  ) {
    const justPressed = forward && !prevForwardPressed.current;
    prevForwardPressed.current = forward;

    if (!justPressed) return;

    const now = Date.now();
    if (now - lastForwardTime.current < DOUBLE_TAP_MS && !isRolling.current) {
      if (opts?.tryConsumeParkourEnergy && !opts.tryConsumeParkourEnergy()) {
        lastForwardTime.current = now;
        pushAvatarSnapshot();
        return;
      }
      isRolling.current = true;
      rollTimer.current = ROLL_DURATION;
      opts?.onRoll?.();
    }
    lastForwardTime.current = now;
    pushAvatarSnapshot();
  }

  function tickRoll(delta: number) {
    if (isRolling.current) {
      rollTimer.current -= delta;
      if (rollTimer.current <= 0) isRolling.current = false;
    }
    pushAvatarSnapshot();
  }

  // Returns the new Y position after applying gravity and landing
  function applyGravity(position: [number, number, number], delta: number, extraBoxes: THREE.Box3[] = []): number {
    let groundY = 0;
    for (const box of COLLISION_BOXES) {
      if (
        position[0] >= box.min.x && position[0] <= box.max.x &&
        position[2] >= box.min.z && position[2] <= box.max.z &&
        box.max.y <= position[1] + 0.1
      ) {
        groundY = Math.max(groundY, box.max.y);
      }
    }
    for (const box of extraBoxes) {
      if (
        position[0] >= box.min.x && position[0] <= box.max.x &&
        position[2] >= box.min.z && position[2] <= box.max.z &&
        box.max.y <= position[1] + 0.1
      ) {
        groundY = Math.max(groundY, box.max.y);
      }
    }

    let newY = position[1];
    if (!isGrounded.current || newY > groundY) {
      yVelocity.current -= GRAVITY * delta;
      newY += yVelocity.current * delta;

      if (newY >= PLAYER_ROOF_Y) {
        newY = PLAYER_ROOF_Y;
        yVelocity.current = 0;
      }

      if (newY <= groundY) {
        newY = groundY;
        yVelocity.current = 0;
        isGrounded.current = true;
        jumpCount.current = 0;
      } else {
        isGrounded.current = false;
      }
    }

    pushAvatarSnapshot();
    return newY;
  }

  // Returns new [x, z] after collision-tested movement
  function applyMovement(
    position: [number, number, number],
    moveVector: THREE.Vector3,
    speed: number,
    otherPlayers: Record<string, Player>,
    extraBoxes: THREE.Box3[] = []
  ): [number, number, number] {
    if (moveVector.length() === 0) return position;

    _moveScaled.copy(moveVector).normalize().multiplyScalar(speed);
    const scaled = _moveScaled;
    const newPos: [number, number, number] = [...position];

    const testX = [...newPos] as [number, number, number];
    testX[0] += scaled.x;
    if (!hasCollision(testX, otherPlayers, extraBoxes)) newPos[0] = testX[0];

    const testZ = [...newPos] as [number, number, number];
    testZ[2] += scaled.z;
    if (!hasCollision(testZ, otherPlayers, extraBoxes)) newPos[2] = testZ[2];

    return newPos;
  }

  return {
    isGrounded,
    isRolling,
    rollTimer,
    subscribeAvatar,
    getAvatarSnapshot,
    processJump,
    processRoll,
    tickRoll,
    applyGravity,
    applyMovement,
  };
}

/**
 * Subscribe to physics flags that affect React-rendered UI (avatar pose, etc.).
 * Physics uses refs for the sim; this bridges ref updates to re-renders without ad-hoc useState per flag.
 */
export function usePlayerPhysicsAvatarSync(physics: {
  subscribeAvatar: (onStoreChange: () => void) => () => void;
  getAvatarSnapshot: () => PlayerPhysicsAvatarSnapshot;
}) {
  return useSyncExternalStore(physics.subscribeAvatar, physics.getAvatarSnapshot);
}

function hasCollision(position: [number, number, number], otherPlayers: Record<string, Player>, extraBoxes: THREE.Box3[] = []): boolean {
  _boxCenter.set(position[0], position[1] + 0.8, position[2]);
  _playerBox.setFromCenterAndSize(_boxCenter, _playerSize);

  for (const box of COLLISION_BOXES) {
    if (_playerBox.intersectsBox(box)) return true;
  }
  for (const box of extraBoxes) {
    if (_playerBox.intersectsBox(box)) return true;
  }

  for (const p of Object.values(otherPlayers)) {
    _boxCenter.set(p.position[0], p.position[1] + 0.8, p.position[2]);
    _otherBox.setFromCenterAndSize(_boxCenter, _playerSize);
    if (_playerBox.intersectsBox(_otherBox)) return true;
  }

  return false;
}
