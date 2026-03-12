import { useRef } from 'react';
import * as THREE from 'three';
import { COLLISION_BOXES } from '../constants';
import { Player } from '../types';

const JUMP_FORCE = 8;
const GRAVITY = 20;
const ROOF_Y = 6.1;
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

  function processJump(jump: boolean, onDoubleJump?: () => void) {
    const justPressed = jump && !prevJumpPressed.current;
    prevJumpPressed.current = jump;

    if (!justPressed) return;

    const now = Date.now();
    if (isGrounded.current) {
      yVelocity.current = JUMP_FORCE;
      isGrounded.current = false;
      jumpCount.current = 1;
    } else if (jumpCount.current === 1) {
      yVelocity.current = JUMP_FORCE;
      jumpCount.current = 2;
      onDoubleJump?.();
    }
    lastJumpTime.current = now;
  }

  function processRoll(forward: boolean, onRoll?: () => void) {
    const justPressed = forward && !prevForwardPressed.current;
    prevForwardPressed.current = forward;

    if (!justPressed) return;

    const now = Date.now();
    if (now - lastForwardTime.current < DOUBLE_TAP_MS && !isRolling.current) {
      isRolling.current = true;
      rollTimer.current = ROLL_DURATION;
      onRoll?.();
    }
    lastForwardTime.current = now;
  }

  function tickRoll(delta: number) {
    if (isRolling.current) {
      rollTimer.current -= delta;
      if (rollTimer.current <= 0) isRolling.current = false;
    }
  }

  // Returns the new Y position after applying gravity and landing
  function applyGravity(position: [number, number, number], delta: number): number {
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

    let newY = position[1];
    if (!isGrounded.current || newY > groundY) {
      yVelocity.current -= GRAVITY * delta;
      newY += yVelocity.current * delta;

      if (newY >= ROOF_Y) {
        newY = ROOF_Y;
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

    return newY;
  }

  // Returns new [x, z] after collision-tested movement
  function applyMovement(
    position: [number, number, number],
    moveVector: THREE.Vector3,
    speed: number,
    otherPlayers: Record<string, Player>
  ): [number, number, number] {
    if (moveVector.length() === 0) return position;

    const scaled = moveVector.clone().normalize().multiplyScalar(speed);
    const newPos: [number, number, number] = [...position];

    const testX = [...newPos] as [number, number, number];
    testX[0] += scaled.x;
    if (!hasCollision(testX, otherPlayers)) newPos[0] = testX[0];

    const testZ = [...newPos] as [number, number, number];
    testZ[2] += scaled.z;
    if (!hasCollision(testZ, otherPlayers)) newPos[2] = testZ[2];

    return newPos;
  }

  return {
    isGrounded,
    isRolling,
    rollTimer,
    processJump,
    processRoll,
    tickRoll,
    applyGravity,
    applyMovement,
  };
}

function hasCollision(position: [number, number, number], otherPlayers: Record<string, Player>): boolean {
  const playerBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(position[0], position[1] + 0.8, position[2]),
    new THREE.Vector3(0.5, 1.4, 0.5)
  );

  for (const box of COLLISION_BOXES) {
    if (playerBox.intersectsBox(box)) return true;
  }

  for (const p of Object.values(otherPlayers)) {
    const otherBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(p.position[0], p.position[1] + 0.8, p.position[2]),
      new THREE.Vector3(0.5, 1.4, 0.5)
    );
    if (playerBox.intersectsBox(otherBox)) return true;
  }

  return false;
}
