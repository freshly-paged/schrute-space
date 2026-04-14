import React, { useState, useRef, useEffect } from 'react';
import { Box, Cylinder, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FloorPlanRect } from '../../../types';
import {
  BREAK_ROOM_GROUP_POSITION,
  VENDING_MACHINE_LOCAL_POSITION,
  WATER_COOLER_LOCAL_POSITION,
} from '../../../officeLayout';
import { WallDef, wallsToBoxes } from '../../../utils/walls';
import { OFFICE_CEILING_Y } from '../../../officeLayout';
import { breakDoorState, playerWorldPos } from '../../../doorState';
import { DESK_WOOD_COLOR } from '../../../officeTheme';
import { Chair } from '../shared/props/Chair';
import { OfficeWindow } from '../shared/props/OfficeWindow';
import { WaterCooler } from './props/WaterCooler';
import { VendingMachine } from './props/VendingMachine';

// Room: 32 wide × 14 deep; group position shared via officeLayout (server + client).
// World extents: X[-9, +23], Z[-23, -9]
const GROUP_OFFSET = BREAK_ROOM_GROUP_POSITION;

export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Break Room', x1: -9, z1: -23, x2: 23, z2: -9, color: '#d1fae5',
};

// South wall: 2-unit door at x=−1 to x=+1.
// 3-unit glass panels flank the door on each side (x=−4 to −1 and x=+1 to +4).
// Solid wall covers the rest.
const WALLS: WallDef[] = [
  { args: [32, 8, 0.3], position: [1,     4, -7] }, // North
  { args: [0.3, 8, 14], position: [-15,   4,  0] }, // West
  { args: [0.3, 8, 14], position: [17,    4,  0] }, // East
  { args: [11,  8, 0.3], position: [-9.5, 4,  7] }, // South — far left
  { args: [13,  8, 0.3], position: [10.5, 4,  7] }, // South — far right
];

export const BREAK_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  ...wallsToBoxes(WALLS, GROUP_OFFSET),
  // Glass panels flanking door (local x=−4 to −1 and +1 to +4, z≈7) — still block movement
  new THREE.Box3(new THREE.Vector3(2, 0, -9.15), new THREE.Vector3(5, 8, -8.85)),
  new THREE.Box3(new THREE.Vector3(7, 0, -9.15), new THREE.Vector3(10, 8, -8.85)),
  // Round table 1 (local [0,0,1] → world [6,0,−15])
  new THREE.Box3(new THREE.Vector3(5.2, 0, -15.8), new THREE.Vector3(6.8, 0.8, -14.2)),
  // Round table 2 (local [9,0,−3] → world [15,0,−19])
  new THREE.Box3(new THREE.Vector3(14.2, 0, -19.8), new THREE.Vector3(15.8, 0.8, -18.2)),
  // Vending machine (local [16.5,0,−1] → world [22.5,0,−17]; flush against east wall)
  new THREE.Box3(new THREE.Vector3(22, 0, -17.8), new THREE.Vector3(23, 4, -16.2)),
];

// ── Door / frame constants ─────────────────────────────────────────────────────
const DOOR_COLOR  = DESK_WOOD_COLOR;
const DOOR_HEIGHT = 4.8;
const UPPER_H     = OFFICE_CEILING_Y - 0.08 - DOOR_HEIGHT; // transom pane height ≈1.12
const BC  = '#111111';
const FT  = 0.08;
const FD  = 0.14;
// South wall outer face = z=7+0.15=7.15.  Frame protrudes outward (+z = south/exterior).
const FZ  = 7.15;

// Door hinge at room-local [−1, 0, 7] → world [5, 0, −9]
const BREAK_DOOR_HINGE_WORLD = new THREE.Vector3(5, 0, -9);
const PROXIMITY_R = 3.5;

/**
 * Full-height south-wall glass panel (venetian blinds lower + clear transom upper)
 * with black frame border.  Placed on the outer face of the south wall (z=FZ).
 * cx = panel centre X in room-local coords, w = panel width.
 */
function SouthFullPanel({ cx, w }: { cx: number; w: number }) {
  const lowerCY = DOOR_HEIGHT / 2;
  const upperCY = DOOR_HEIGHT + UPPER_H / 2;
  const rz = FZ + FD / 2; // frame rail centre (protruding outward)

  const slats: number[] = [];
  for (let y = 0.3; y < DOOR_HEIGHT - 0.2; y += 0.32) slats.push(y);

  return (
    <>
      {/* Lower glass pane */}
      <Box args={[w, DOOR_HEIGHT, 0.07]} position={[cx, lowerCY, FZ + 0.035]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>
      {/* Venetian blind slats in lower section */}
      {slats.map((sy, i) => (
        <Box key={i} args={[w - 0.15, 0.065, 0.07]} position={[cx, sy, FZ + 0.06]}>
          <meshStandardMaterial color="#cbc7bc" />
        </Box>
      ))}
      {/* Upper glass pane (clear transom) */}
      <Box args={[w, UPPER_H, 0.07]} position={[cx, upperCY, FZ + 0.035]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>
      {/* Black frame — bottom */}
      <Box args={[w + FT, FT, FD]} position={[cx, 0, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Black frame — top */}
      <Box args={[w + FT, FT, FD]} position={[cx, OFFICE_CEILING_Y, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Black frame — mid (door-height / transom split) */}
      <Box args={[w + FT, FT, FD]} position={[cx, DOOR_HEIGHT, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Black frame — left rail */}
      <Box args={[FT, OFFICE_CEILING_Y + FT, FD]} position={[cx - w / 2, OFFICE_CEILING_Y / 2, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Black frame — right rail */}
      <Box args={[FT, OFFICE_CEILING_Y + FT, FD]} position={[cx + w / 2, OFFICE_CEILING_Y / 2, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
    </>
  );
}

/**
 * South-wall door frame: vertical rails + top + mid (transom split) + bottom.
 * Protrudes outward (+z = exterior/south) at FZ, matching SouthFullPanel alignment.
 */
function SouthDoorFrame() {
  const DOOR_W = 2.0;
  const fullH  = OFFICE_CEILING_Y;
  const rz = FZ + FD / 2;
  return (
    <group>
      {/* Left rail */}
      <Box args={[FT, fullH + FT, FD]} position={[-DOOR_W / 2, fullH / 2, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Right rail */}
      <Box args={[FT, fullH + FT, FD]} position={[DOOR_W / 2, fullH / 2, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Top rail (at ceiling) */}
      <Box args={[DOOR_W + FT, FT, FD]} position={[0, fullH, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Mid rail (door/transom split) */}
      <Box args={[DOOR_W + FT, FT, FD]} position={[0, DOOR_HEIGHT, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Bottom rail */}
      <Box args={[DOOR_W + FT, FT, FD]} position={[0, 0, rz]}>
        <meshStandardMaterial color={BC} />
      </Box>
    </group>
  );
}

/** Interactive door: hinge at room-local [−1, 0, 7], panel extends in +x (closed).
 *  rotation.y = 0 → closed (panel along +x fills the gap)
 *  rotation.y = π/2 → open (panel swings into break room toward −z) */
function BreakInteractiveDoor() {
  const hingeRef  = useRef<THREE.Group>(null!);
  const rotRef    = useRef(0);
  const isOpenRef = useRef(false);
  const nearRef   = useRef(false);

  const [showHint, setShowHint] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearRef.current) {
        isOpenRef.current = !isOpenRef.current;
        breakDoorState.open = isOpenRef.current;
        setLabelOpen(isOpenRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((_, delta) => {
    const dx = playerWorldPos.x - BREAK_DOOR_HINGE_WORLD.x;
    const dz = playerWorldPos.z - BREAK_DOOR_HINGE_WORLD.z;
    const near = Math.sqrt(dx * dx + dz * dz) < PROXIMITY_R;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setShowHint(near);
    }

    const target = isOpenRef.current ? Math.PI / 2 : 0;
    rotRef.current += (target - rotRef.current) * Math.min(delta * 6, 1);
    hingeRef.current.rotation.y = rotRef.current;
  });

  // Panel fits inside the frame rails with a small gap on every side.
  // Left/right rails inner faces are at x=±0.96 → clear width = 1.92; use 1.88 (0.02 gap each side).
  // Mid rail inner face at y=4.76; bottom rail inner face at y=0.04 → use height 4.70 (0.01 gap top/bottom).
  const panelW  = 1.88;
  const panelH  = 4.70;
  const panelCY = panelH / 2 + 0.05; // raised 0.05 off floor → panel spans y=0.05 to y=4.75

  return (
    <>
      {/* Hinge at room-local [−1, 0, 7]; panel extends in local +x when closed.
          Centre at hinge-local x=1.0 → room-local x=0 (midpoint of 2-unit opening).
          Centre at hinge-local z=0.23 → outer face flush with frame rail outer face (FZ+FD=7.29). */}
      <group ref={hingeRef} position={[-1, 0, 7]}>
        <Box args={[panelW, panelH, 0.12]} position={[1.0, panelCY, 0.23]}>
          <meshStandardMaterial color={DOOR_COLOR} />
        </Box>
        {/* Knob near latch side (local x≈1.75) — interior side */}
        <Box args={[0.09, 0.09, 0.09]} position={[1.75, 1.35, 0.12]}>
          <meshStandardMaterial color="#c4a055" metalness={0.7} roughness={0.2} />
        </Box>
        {/* Knob near latch side — exterior side */}
        <Box args={[0.09, 0.09, 0.09]} position={[1.75, 1.35, 0.34]}>
          <meshStandardMaterial color="#c4a055" metalness={0.7} roughness={0.2} />
        </Box>
      </group>

      {/* Transom glass above door — aligned with SouthFullPanel upper panes */}
      <Box args={[2.0, UPPER_H, 0.07]} position={[0, DOOR_HEIGHT + UPPER_H / 2, FZ + 0.035]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>

      {showHint && (
        <Html center position={[0, 3.2, 6.2]}>
          <div style={{
            color: 'white',
            background: 'rgba(0,0,0,0.65)',
            padding: '3px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}>
            [E] {labelOpen ? 'Close Door' : 'Open Door'}
          </div>
        </Html>
      )}
    </>
  );
}

/** One round table with four chairs. */
function RoundTable({ x, z }: { x: number; z: number }) {
  return (
    <>
      <Cylinder args={[0.8, 0.8, 0.05, 16]} position={[x, 0.75, z]}>
        <meshStandardMaterial color={DESK_WOOD_COLOR} />
      </Cylinder>
      <Cylinder args={[0.05, 0.05, 0.75, 8]} position={[x, 0.375, z]}>
        <meshStandardMaterial color={DESK_WOOD_COLOR} />
      </Cylinder>
      <Chair position={[x,       0, z + 1.2]} rotation={[0, Math.PI, 0]} />
      <Chair position={[x,       0, z - 1.2]} rotation={[0, 0, 0]} />
      <Chair position={[x - 1.2, 0, z]}       rotation={[0,  Math.PI / 2, 0]} />
      <Chair position={[x + 1.2, 0, z]}       rotation={[0, -Math.PI / 2, 0]} />
    </>
  );
}

export const BreakRoom = () => (
  <group position={GROUP_OFFSET}>
    {/* ── Walls ── */}
    {WALLS.map((w, i) => (
      <Box key={i} args={w.args} position={w.position}>
        <meshStandardMaterial color="#D8D0B8" />
      </Box>
    ))}

    {/* ── South-wall door frame + interactive door ── */}
    <SouthDoorFrame />
    <BreakInteractiveDoor />

    {/* ── Full-height glass panels flanking the door ── */}
    <SouthFullPanel cx={-2.5} w={3.0} />
    <SouthFullPanel cx={2.5}  w={3.0} />

    {/* ── South-wall windows (visible from working area) ── */}
    {/* Two in the far-left 11u section, two in the far-right 13u section */}
    <OfficeWindow position={[-11, 3.0, 7.15]} />
    <OfficeWindow position={[-7,  3.0, 7.15]} />
    <OfficeWindow position={[7,   3.0, 7.15]} />
    <OfficeWindow position={[11,  3.0, 7.15]} />

    {/* ── Tables ── */}
    <RoundTable x={0}  z={1} />
    <RoundTable x={9}  z={-3} />

    {/* ── Water cooler (NW corner) ── */}
    <WaterCooler position={WATER_COOLER_LOCAL_POSITION} />

    {/* ── Vending machine (east side) ── */}
    <VendingMachine position={VENDING_MACHINE_LOCAL_POSITION} rotation={[0, -Math.PI / 2, 0]} />
  </group>
);
