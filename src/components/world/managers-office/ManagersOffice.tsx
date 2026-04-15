import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Box, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { doorState, playerWorldPos } from '../../../doorState';
import { DESK_WOOD_COLOR } from '../../../officeTheme';
import { FloorPlanRect, DeskItem } from '../../../types';
import { WallDef, wallsToBoxes } from '../../../utils/walls';
import { OFFICE_CEILING_Y } from '../../../officeLayout';
import { useGameStore } from '../../../store/useGameStore';
import { BossDesk } from './props/BossDesk';
import { Bookshelf } from './props/Bookshelf';
import { Chair } from '../shared/props/Chair';

// Room: 14 wide × 14 deep, group at world [-16, 0, 12]
// World extents: X[-23, -9], Z[+5, +19]
const GROUP_OFFSET: [number, number, number] = [-16, 0, 12];
const WALL_COLOR  = '#D8D0B8';
const DOOR_COLOR  = DESK_WOOD_COLOR;
const DOOR_HEIGHT = 4.8;

// Frame constants
const BC = '#111111'; // border colour
const FT = 0.08;      // rail thickness in wall plane
const FD = 0.14;      // rail depth (protrudes from wall face)
const FX = 7.16;      // frame x position (at wall outer face)

// ── South wall window (visible from both office and entryway corridor) ───────
// Window centred at local x=0, y=3.0, z=7.  Width=3 u, height=2 u.
const SW_W     = 3.0;
const SW_LOWER = 1.4;   // lower pane (venetian blinds)
const SW_UPPER = 0.6;   // upper pane (clear glass)
const SW_H     = SW_LOWER + SW_UPPER;         // 2.0
const SW_CY    = 3.0;                          // vertical centre of window
const SW_BOT   = SW_CY - SW_H / 2;            // 2.0
const SW_TOP   = SW_CY + SW_H / 2;            // 4.0
const SW_MID   = SW_BOT + SW_LOWER;           // 3.4 — lower/upper split
const SW_LCCY  = (SW_BOT + SW_MID) / 2;      // 2.7
const SW_UCCY  = (SW_MID + SW_TOP) / 2;      // 3.7

// Blind slat Y positions within the lower pane
const SW_SLAT_YS: number[] = [];
for (let y = SW_BOT + 0.12; y < SW_MID - 0.1; y += 0.22) SW_SLAT_YS.push(y);

/** Window that sits in a hole in the south wall and is visible from both sides. */
function SouthWallWindow() {
  // Frame rail depth spans slightly past the wall thickness so rails show on both sides.
  const RAIL_D = 0.35;
  return (
    <group position={[0, 0, 7]}>
      {/* Lower glass pane — double-sided so the corridor sees it too */}
      <Box args={[SW_W, SW_LOWER, 0.06]} position={[0, SW_LCCY, 0]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0}
          transparent opacity={0.3} color="#a8c8d8" side={THREE.DoubleSide} />
      </Box>
      {/* Blind slats — span wall thickness */}
      {SW_SLAT_YS.map((y, i) => (
        <Box key={i} args={[SW_W - 0.1, 0.065, RAIL_D]} position={[0, y, 0]}>
          <meshStandardMaterial color="#cbc7bc" />
        </Box>
      ))}
      {/* Upper glass pane — double-sided */}
      <Box args={[SW_W, SW_UPPER, 0.06]} position={[0, SW_UCCY, 0]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0}
          transparent opacity={0.3} color="#a8c8d8" side={THREE.DoubleSide} />
      </Box>
      {/* Frame rails (box geometry — visible from both sides without DoubleSide) */}
      <Box args={[SW_W + FT, FT, RAIL_D]} position={[0, SW_BOT, 0]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[SW_W + FT, FT, RAIL_D]} position={[0, SW_MID, 0]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[SW_W + FT, FT, RAIL_D]} position={[0, SW_TOP, 0]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[FT, SW_H + FT, RAIL_D]} position={[-SW_W / 2, SW_CY, 0]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[FT, SW_H + FT, RAIL_D]} position={[ SW_W / 2, SW_CY, 0]}>
        <meshStandardMaterial color={BC} />
      </Box>
    </group>
  );
}

// Transom / upper-pane sizing
// UPPER_H is sized so the top frame rail sits exactly FT below the ceiling
const TRANSOM_Y = DOOR_HEIGHT;
const UPPER_H   = OFFICE_CEILING_Y - FT - TRANSOM_Y; // ≈ 1.12 with defaults
const LOWER_CY  = TRANSOM_Y / 2;
const UPPER_CY  = TRANSOM_Y + UPPER_H / 2;

export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: "Manager's Office", x1: -23, z1: 5, x2: -9, z2: 19, color: '#e2e8f0',
};

// East wall layout (local x=7, z from -7 to +7, 14 u total).
// Viewed from INSIDE the office (left→right = +z→−z):  window | window | door
//   z=-7 to z=-3  (4u)  left solid
//   z=-3 to z=-1  (2u)  door (hinge at z=-3, swings into room at +π/2)
//   z=-1 to z= 2  (3u)  left window
//   z= 2 to z= 5  (3u)  right window
//   z= 5 to z= 7  (2u)  right solid

const COLLISION_WALL_DEFS: WallDef[] = [
  { args: [0.3, OFFICE_CEILING_Y, 14], position: [-7, OFFICE_CEILING_Y / 2,  0] }, // West
  { args: [14,  OFFICE_CEILING_Y, 0.3], position: [ 0, OFFICE_CEILING_Y / 2,  7] }, // South
  { args: [0.3, OFFICE_CEILING_Y,  4], position: [ 7, OFFICE_CEILING_Y / 2, -5] }, // East left solid
  { args: [0.3, OFFICE_CEILING_Y,  8], position: [ 7, OFFICE_CEILING_Y / 2,  3] }, // East right (windows+solid)
];

export const MANAGERS_OFFICE_COLLISION_BOXES: THREE.Box3[] = [
  ...wallsToBoxes(COLLISION_WALL_DEFS, GROUP_OFFSET),
  // Boss desk (local [-1,0,0] rotated 90° → world [-17,0,12])
  new THREE.Box3(new THREE.Vector3(-17.7, 0, 10.6), new THREE.Vector3(-16.3, 1.1, 13.4)),
  // Bookshelf collision is registered dynamically via useGlbCollision in Bookshelf.tsx
];

/** Four black rails forming a closed frame around a pane.
 *  cy/cz = pane centre (room-local coords), w/h = pane dimensions. */
function PaneFrame({ cy, cz, w, h }: { cy: number; cz: number; w: number; h: number }) {
  return (
    <group>
      <Box args={[FD, FT, w + FT]} position={[FX, cy + h / 2, cz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[FD, FT, w + FT]} position={[FX, cy - h / 2, cz]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[FD, h, FT]} position={[FX, cy, cz - w / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
      <Box args={[FD, h, FT]} position={[FX, cy, cz + w / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
    </group>
  );
}

/** Lower window pane with venetian blinds + black frame. */
function LowerWindow({ cz, w }: { cz: number; w: number }) {
  const slats: number[] = [];
  for (let wy = 0.4; wy <= TRANSOM_Y - 0.25; wy += 0.32) slats.push(wy - LOWER_CY);
  return (
    <>
      <group position={[7.04, LOWER_CY, cz]}>
        <Box args={[0.07, TRANSOM_Y, w]}>
          <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
        </Box>
        {slats.map((ly, i) => (
          <Box key={i} args={[0.07, 0.065, w - 0.15]} position={[0.06, ly, 0]}>
            <meshStandardMaterial color="#cbc7bc" />
          </Box>
        ))}
      </group>
      <PaneFrame cy={LOWER_CY} cz={cz} w={w} h={TRANSOM_Y} />
    </>
  );
}

/** Upper transom glass pane + black frame. */
function UpperPane({ cz, w }: { cz: number; w: number }) {
  return (
    <>
      <Box args={[0.07, UPPER_H, w]} position={[7.04, UPPER_CY, cz]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>
      <PaneFrame cy={UPPER_CY} cz={cz} w={w} h={UPPER_H} />
    </>
  );
}

// World position of the door hinge for proximity detection
const DOOR_HINGE_WORLD = new THREE.Vector3(
  GROUP_OFFSET[0] + 7,  // −9
  0,
  GROUP_OFFSET[2] - 3   // 9
);
const PROXIMITY_R = 3.5;

/** Interactive door: hinge at room-local [7, 0, -3], swings inward (+π/2 rotation). */
function InteractiveDoor() {
  const hingeRef  = useRef<THREE.Group>(null!);
  const rotRef    = useRef(0);
  const isOpenRef = useRef(false);
  const nearRef   = useRef(false);

  const [showHint, setShowHint] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  // Native keydown listener — more reliable than useKeyboardControls inside a sub-component
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearRef.current) {
        isOpenRef.current = !isOpenRef.current;
        doorState.open = isOpenRef.current;
        setLabelOpen(isOpenRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((_, delta) => {
    // Proximity check against the player's world position (not the orbit camera)
    const dx = playerWorldPos.x - DOOR_HINGE_WORLD.x;
    const dz = playerWorldPos.z - DOOR_HINGE_WORLD.z;
    const near = Math.sqrt(dx * dx + dz * dz) < PROXIMITY_R;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setShowHint(near);
    }

    // Smooth rotation toward target
    const target = isOpenRef.current ? -Math.PI / 2 : 0;
    rotRef.current += (target - rotRef.current) * Math.min(delta * 6, 1);
    hingeRef.current.rotation.y = rotRef.current;
  });

  // Door panel in hinge-local space.
  // Hinge is at room-local [7, 0, -3].
  // Door spans z=-3 to z=-1 world-local → local z=0 to z=2 → panel centre at local z=1.
  // Door knob near the latch side (local z=1.75 ≈ world z=-1.25).
  const panelH  = DOOR_HEIGHT - 0.05;
  const panelCY = panelH / 2 + 0.05; // raised 0.05 off floor

  return (
    <>
      <group ref={hingeRef} position={[7, 0, -3]}>
        {/* Oak door panel */}
        <Box args={[0.12, panelH, 1.9]} position={[0.05, panelCY, 1]}>
          <meshStandardMaterial color={DOOR_COLOR} />
        </Box>
        {/* Door knob — near latch edge (local z≈1.75), at handle height */}
        <Box args={[0.09, 0.09, 0.09]} position={[0.14, 1.35, 1.75]}>
          <meshStandardMaterial color="#c4a055" metalness={0.7} roughness={0.2} />
        </Box>
      </group>

      {/* [E] hint rendered in room-local space, above door centre */}
      {showHint && (
        <Html center position={[6.2, 2.8, -2]}>
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

export const ManagersOffice = () => {
  const hasManagerDesk = useGameStore((s) =>
    s.roomLayout.some((f): f is DeskItem => f.type === 'desk' && (f as DeskItem).config?.variant === 'manager')
  );

  return (
  <group position={GROUP_OFFSET}>

    {/* ── South wall — split around window opening (x=−1.5→1.5, y=2→4) ── */}
    {/* Left section */}
    <Box args={[5.5, OFFICE_CEILING_Y, 0.3]} position={[-4.25, OFFICE_CEILING_Y / 2, 7]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>
    {/* Right section */}
    <Box args={[5.5, OFFICE_CEILING_Y, 0.3]} position={[4.25, OFFICE_CEILING_Y / 2, 7]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>
    {/* Below window */}
    <Box args={[SW_W, SW_BOT, 0.3]} position={[0, SW_BOT / 2, 7]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>
    {/* Above window */}
    <Box args={[SW_W, OFFICE_CEILING_Y - SW_TOP, 0.3]} position={[0, SW_TOP + (OFFICE_CEILING_Y - SW_TOP) / 2, 7]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>
    {/* Double-sided window in the opening */}
    <SouthWallWindow />

    {/* ── East wall ── */}

    {/* Left solid section (z=−7 to z=−3) */}
    <Box args={[0.3, OFFICE_CEILING_Y, 4]} position={[7, OFFICE_CEILING_Y / 2, -5]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>

    {/* Door: black frame around door opening + transom glass above */}
    <PaneFrame cy={LOWER_CY} cz={-2} w={2} h={TRANSOM_Y} />
    <UpperPane cz={-2} w={2} />

    {/* Interactive door panel (animated hinge) */}
    <InteractiveDoor />

    {/* Left window (z=−1 to z=2, cz=0.5) */}
    <LowerWindow cz={0.5} w={3} />
    <UpperPane cz={0.5} w={3} />

    {/* Right window (z=2 to z=5, cz=3.5) */}
    <LowerWindow cz={3.5} w={3} />
    <UpperPane cz={3.5} w={3} />

    {/* Right solid section (z=5 to z=7) */}
    <Box args={[0.3, OFFICE_CEILING_Y, 2]} position={[7, OFFICE_CEILING_Y / 2, 6]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>

    {/* ── Furniture ── */}
    {/* Fallback decorative desk shown when no manager has claimed the office */}
    {!hasManagerDesk && (
      <BossDesk position={[-1, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
    )}
    {/* Visitor chairs face the boss desk position */}
    <Chair position={[2.5, 0, -0.8]} rotation={[0, -Math.PI / 2 + Math.PI / 8, 0]} />
    <Chair position={[2.5, 0, 0.8]} rotation={[0, -Math.PI / 2 - Math.PI / 8, 0]} />
    <Bookshelf x={-5} />

    {/* ── Lighting ── */}
    <pointLight position={[0, 5, 0]} intensity={0.6} distance={12} color="#fff3d0" />
  </group>
  );
};
