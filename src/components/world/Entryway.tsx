/**
 * Entryway — the lobby corridor south of the manager's office.
 *
 * World extents: X[-23, -9], Z[19, 23]  (14 units wide, 4 units deep)
 *   North boundary: manager's office south wall (z=19, already exists)
 *   South boundary: south perimeter wall (z=23, already exists)
 *   West boundary:  west perimeter wall (x=-23), split in OfficeEnvironment for the exit door
 *   East side:      open into the working area at x=-9
 *
 * Exit door is in the west perimeter wall, centred at z=21.
 * Press [E] near the door to leave the office.
 */
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Box, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { OFFICE_CEILING_Y } from '../../officeLayout';
import { useGameStore } from '../../store/useGameStore';
import { onOverlayTextSync } from '../../utils/overlayTextSync';

// ── Layout constants ────────────────────────────────────────────────────────
const DOOR_COLOR  = '#8B6914';
const SOFA_COLOR  = '#6b7280';
const ARM_COLOR   = '#4b5563';
const TABLE_COLOR = '#78716c';

// Exit door in the west perimeter wall (x=-23), centred at z=21
const DOOR_Z      = 21;
const DOOR_W      = 2.2;    // gap in the z direction
const DOOR_HEIGHT = 4.8;
const UPPER_H     = OFFICE_CEILING_Y - DOOR_HEIGHT;

const EXIT_DOOR_POS   = new THREE.Vector3(-23, 0, DOOR_Z);
const INTERACT_RADIUS = 2.5;

const FT = 0.08;
const FD = 0.14;

// ── Sofa ───────────────────────────────────────────────────────────────────
// Default orientation: backrest at local -z, seat faces +z.
// rotation=Math.PI → backrest faces +z (south wall), seat faces -z (north/into corridor).
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

// ── Exit door frame (sits on the interior face of the west perimeter wall) ──
// The frame protrudes eastward (+x) from x=-23.
function ExitDoorFrame() {
  return (
    <group position={[-23, 0, DOOR_Z]}>
      {/* Vertical rails */}
      <Box args={[FD, OFFICE_CEILING_Y, FT]} position={[0, OFFICE_CEILING_Y / 2, -DOOR_W / 2]}>
        <meshStandardMaterial color="#111" />
      </Box>
      <Box args={[FD, OFFICE_CEILING_Y, FT]} position={[0, OFFICE_CEILING_Y / 2,  DOOR_W / 2]}>
        <meshStandardMaterial color="#111" />
      </Box>
      {/* Top rail at door height */}
      <Box args={[FD, FT, DOOR_W + FT]} position={[0, DOOR_HEIGHT, 0]}>
        <meshStandardMaterial color="#111" />
      </Box>
      {/* Door panel — visible from corridor side */}
      <Box args={[0.1, DOOR_HEIGHT - FT * 2, DOOR_W - FT * 2]}
           position={[0.05, DOOR_HEIGHT / 2, 0]}>
        <meshStandardMaterial color={DOOR_COLOR} roughness={0.6} />
      </Box>
      {/* Transom glass above door */}
      <Box args={[0.06, UPPER_H, DOOR_W]} position={[0, DOOR_HEIGHT + UPPER_H / 2, 0]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0}
          transparent opacity={0.3} color="#a8c8d8" />
      </Box>
      {/* Knob */}
      <Box args={[0.07, 0.07, 0.07]} position={[0.08, 1.1, 0.72]}>
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
      {/* ── Exit door frame ── */}
      <ExitDoorFrame />

      {/* ── [E] Exit Office prompt ── */}
      {showHint && (
        <Billboard position={[-21, 3.2, DOOR_Z]}>
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

      {/* ── Gray sofas along south wall (z≈22.3, facing north into corridor) ── */}
      {/* rotation=Math.PI: backrest faces south (toward z=23 wall), seat faces north */}
      <Sofa position={[-20, 0, 22.3]} rotation={Math.PI} />
      <Sofa position={[-15, 0, 22.3]} rotation={Math.PI} />
      <Sofa position={[-10.5, 0, 22.3]} rotation={Math.PI} />

      {/* Side tables between sofas */}
      <Box args={[0.45, 0.45, 0.45]} position={[-17.5, 0.225, 22.3]}>
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.7} />
      </Box>
      <Box args={[0.45, 0.45, 0.45]} position={[-12.5, 0.225, 22.3]}>
        <meshStandardMaterial color={TABLE_COLOR} roughness={0.7} />
      </Box>
    </group>
  );
}

// ── Collision boxes (merged into COLLISION_BOXES via constants.ts) ───────────
export const ENTRYWAY_COLLISION_BOXES: THREE.Box3[] = [
  // Sofas (W=1.8 in x, D=0.85 in z; rotation π doesn't change axis-aligned footprint)
  // Sofa at x=-20, z=22.3 → x∈[-20.9,-19.1], z∈[21.87,22.73]
  new THREE.Box3(new THREE.Vector3(-20.9, 0, 21.87), new THREE.Vector3(-19.1, 1.1, 22.73)),
  // Sofa at x=-15, z=22.3
  new THREE.Box3(new THREE.Vector3(-15.9, 0, 21.87), new THREE.Vector3(-14.1, 1.1, 22.73)),
  // Sofa at x=-10.5, z=22.3
  new THREE.Box3(new THREE.Vector3(-11.4, 0, 21.87), new THREE.Vector3(-9.6,  1.1, 22.73)),
];
