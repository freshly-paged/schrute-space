import * as THREE from 'three';

/** Updated by LocalPlayer every frame so door components can do proximity checks
 *  against the player's actual world position (not the orbit camera position). */
export const playerWorldPos = new THREE.Vector3();

// ── Manager's office door ────────────────────────────────────────────────────
// Room-local x=7, z=−3 to −1. GROUP_OFFSET=[−16,0,12] → world x=−9, z=9→11
export const doorState = { open: false };
export const DOOR_COLLISION_BOX = new THREE.Box3(
  new THREE.Vector3(-9.15, 0, 9),
  new THREE.Vector3(-8.85, 4.8, 11),
);

// ── Conference room door ─────────────────────────────────────────────────────
// Room-local x=7, z=+5 to +7. GROUP_OFFSET=[−16,0,−2] → world x=−9, z=3→5
export const confDoorState = { open: false };
export const CONF_DOOR_COLLISION_BOX = new THREE.Box3(
  new THREE.Vector3(-9.15, 0, 3),
  new THREE.Vector3(-8.85, 4.8, 5),
);

// ── Break room door ──────────────────────────────────────────────────────────
// Room-local x=−1 to x=+1, z=7. GROUP_OFFSET=[6,0,−16] → world x=5→7, z=−9
export const breakDoorState = { open: false };
export const BREAK_DOOR_COLLISION_BOX = new THREE.Box3(
  new THREE.Vector3(5, 0, -9.15),
  new THREE.Vector3(7, 4.8, -8.85),
);
