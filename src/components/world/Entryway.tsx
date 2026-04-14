/**
 * Entryway — corridor along the east side of the manager's office.
 *
 * World extents: X[-9, -3], Z[5, 23]  (6 units wide, 18 units long)
 *   West  boundary: manager's office east wall at x=-9 (already exists)
 *   East  boundary: new wall at x=-3 (this file)
 *   South boundary: south perimeter wall at z=23, split in OfficeEnvironment for the door gap
 *   North end: open — players enter from the working area
 *
 * The ONLY way to exit the office is through the door in the south wall.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { OFFICE_CEILING_Y } from '../../officeLayout';
import { useGameStore } from '../../store/useGameStore';
import { onOverlayTextSync } from '../../utils/overlayTextSync';

// ── Layout constants ────────────────────────────────────────────────────────
const WALL_COLOR   = '#D8D0B8';
const DOOR_COLOR   = '#8B6914';
const SOFA_COLOR   = '#6b7280'; // gray-500
const ARM_COLOR    = '#4b5563'; // gray-600
const TABLE_COLOR  = '#78716c'; // warm gray

const CORRIDOR_Z_START  = 5;
const CORRIDOR_Z_END    = 23;
const CORRIDOR_Z_LEN    = CORRIDOR_Z_END - CORRIDOR_Z_START;        // 18
const CORRIDOR_Z_CENTER = (CORRIDOR_Z_START + CORRIDOR_Z_END) / 2;  // 14
const EAST_WALL_X       = -3;

// Exit door — centred at x=-6 (mid-corridor), in south perimeter wall z=23
const DOOR_CX    = -6;
const DOOR_W     = 2.2;
const DOOR_HEIGHT = 4.8;
const UPPER_H    = OFFICE_CEILING_Y - DOOR_HEIGHT;

const EXIT_DOOR_POS = new THREE.Vector3(DOOR_CX, 0, CORRIDOR_Z_END);
const INTERACT_RADIUS = 3.5;

// Frame rail dims
const FT = 0.08;
const FD = 0.14;

// ── Sofa (seat faces +z in local space; rotate π/2 so it faces –x / west) ──
function Sofa({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const W = 1.8, D = 0.85, SEAT_H = 0.42, BACK_H = 0.65, ARM_H = 0.52;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <Box args={[W, SEAT_H, D]} position={[0, SEAT_H / 2, 0]}>
        <meshStandardMaterial color={SOFA_COLOR} roughness={0.85} />
      </Box>
      <Box args={[W, BACK_H, 0.18]} position={[0, SEAT_H + BACK_H / 2, -(D / 2 - 0.09)]}>
        <meshStandardMaterial color={SOFA_COLOR} roughness={0.85} />
      </Box>
      <Box args={[0.18, ARM_H, D]} position={[-(W / 2 - 0.09), ARM_H / 2, 0]}>
        <meshStandardMaterial color={ARM_COLOR} roughness={0.8} />
      </Box>
      <Box args={[0.18, ARM_H, D]} position={[(W / 2 - 0.09), ARM_H / 2, 0]}>
        <meshStandardMaterial color={ARM_COLOR} roughness={0.8} />
      </Box>
    </group>
  );
}

// ── Exit door frame + closed panel ─────────────────────────────────────────
function ExitDoorFrame() {
  return (
    <group position={[DOOR_CX, 0, CORRIDOR_Z_END]}>
      {/* Vertical rails */}
      <Box args={[FT, OFFICE_CEILING_Y, FD]} position={[-DOOR_W / 2, OFFICE_CEILING_Y / 2, 0]}>
        <meshStandardMaterial color="#111" />
      </Box>
      <Box args={[FT, OFFICE_CEILING_Y, FD]} position={[ DOOR_W / 2, OFFICE_CEILING_Y / 2, 0]}>
        <meshStandardMaterial color="#111" />
      </Box>
      {/* Top rail at door height */}
      <Box args={[DOOR_W + FT, FT, FD]} position={[0, DOOR_HEIGHT, 0]}>
        <meshStandardMaterial color="#111" />
      </Box>
      {/* Door panel */}
      <Box args={[DOOR_W - FT * 2, DOOR_HEIGHT - FT * 2, 0.1]}
           position={[0, DOOR_HEIGHT / 2, -0.05]}>
        <meshStandardMaterial color={DOOR_COLOR} roughness={0.6} />
      </Box>
      {/* Transom glass */}
      <Box args={[DOOR_W, UPPER_H, 0.06]} position={[0, DOOR_HEIGHT + UPPER_H / 2, 0]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0}
          transparent opacity={0.3} color="#a8c8d8" />
      </Box>
      {/* Door knob */}
      <Box args={[0.07, 0.07, 0.07]} position={[0.72, 1.1, -0.08]}>
        <meshStandardMaterial color="#c4a055" metalness={0.7} roughness={0.2} />
      </Box>
    </group>
  );
}

// ── Entryway ────────────────────────────────────────────────────────────────
export function Entryway() {
  const nearRef = useRef(false);
  const [showHint, setShowHint] = useState(false);
  const setRequestExitRoom = useGameStore((s) => s.setRequestExitRoom);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearRef.current) {
        setRequestExitRoom(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setRequestExitRoom]);

  useFrame((state) => {
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;
    const dx = player.position.x - EXIT_DOOR_POS.x;
    const dz = player.position.z - EXIT_DOOR_POS.z;
    const near = Math.sqrt(dx * dx + dz * dz) < INTERACT_RADIUS;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setShowHint(near);
    }
  });

  return (
    <group>
      {/* ── Corridor east wall (x=-3, z=5→23) ── */}
      <Box
        args={[0.3, OFFICE_CEILING_Y, CORRIDOR_Z_LEN]}
        position={[EAST_WALL_X, OFFICE_CEILING_Y / 2, CORRIDOR_Z_CENTER]}
      >
        <meshStandardMaterial color={WALL_COLOR} />
      </Box>

      {/* ── Lintel above exit door (fills the gap above the door in south wall) ── */}
      <Box args={[DOOR_W, UPPER_H, 0.5]} position={[DOOR_CX, DOOR_HEIGHT + UPPER_H / 2, 23]}>
        <meshStandardMaterial color={WALL_COLOR} />
      </Box>

      {/* ── Exit door ── */}
      <ExitDoorFrame />

      {/* ── [E] Exit Office prompt ── */}
      {showHint && (
        <Billboard position={[DOOR_CX, 3.4, 21]}>
          <Text
            fontSize={0.22}
            color="#fde68a"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            [E] Exit Office
          </Text>
        </Billboard>
      )}

      {/* ── Gray sofas along the east wall ── */}
      {/* rotation=Math.PI/2: back faces east wall (x=-3), seat faces west into corridor */}
      <Sofa position={[-3.85, 0,  9]} rotation={Math.PI / 2} />
      <Sofa position={[-3.85, 0, 13]} rotation={Math.PI / 2} />
      <Sofa position={[-3.85, 0, 17]} rotation={Math.PI / 2} />

      {/* Small side tables between sofas */}
      <Box args={[0.45, 0.45, 0.45]} position={[-4.1, 0.225, 11]}>
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.7} />
      </Box>
      <Box args={[0.45, 0.45, 0.45]} position={[-4.1, 0.225, 15]}>
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.7} />
      </Box>
    </group>
  );
}

// ── Static collision boxes (merged into COLLISION_BOXES in constants.ts) ────
export const ENTRYWAY_COLLISION_BOXES: THREE.Box3[] = [
  // Corridor east wall (x=-3, thickness=0.3)
  new THREE.Box3(
    new THREE.Vector3(EAST_WALL_X - 0.15, 0, CORRIDOR_Z_START),
    new THREE.Vector3(EAST_WALL_X + 0.15, OFFICE_CEILING_Y, CORRIDOR_Z_END)
  ),
  // Sofas — after rotation π/2, W(1.8) is in Z, D(0.85) is in X
  // Sofa at z=9:  x∈[-4.28,-3.43], z∈[8.1,9.9]
  new THREE.Box3(new THREE.Vector3(-4.3, 0,  8.1), new THREE.Vector3(-3.4, 1.1,  9.9)),
  // Sofa at z=13: x∈[-4.28,-3.43], z∈[12.1,13.9]
  new THREE.Box3(new THREE.Vector3(-4.3, 0, 12.1), new THREE.Vector3(-3.4, 1.1, 13.9)),
  // Sofa at z=17: x∈[-4.28,-3.43], z∈[16.1,17.9]
  new THREE.Box3(new THREE.Vector3(-4.3, 0, 16.1), new THREE.Vector3(-3.4, 1.1, 17.9)),
];
