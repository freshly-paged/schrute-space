import React, { useState, useRef, useEffect } from 'react';
import { Box, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FloorPlanRect } from '../../../types';
import { WallDef, wallsToBoxes } from '../../../utils/walls';
import { OFFICE_CEILING_Y } from '../../../officeLayout';
import { confDoorState, playerWorldPos } from '../../../doorState';
import { DESK_WOOD_COLOR } from '../../../officeTheme';
import { Chair } from '../shared/props/Chair';
import { Whiteboard } from './props/Whiteboard';

// Room: 14 wide × 14 deep, group at world [-16, 0, -2]
// World extents: X[-23, -9], Z[-9, +5]
const GROUP_OFFSET: [number, number, number] = [-16, 0, -2];
const WALL_COLOR = '#D8D0B8';
const DOOR_COLOR = DESK_WOOD_COLOR;
const DOOR_HEIGHT = 4.8;

// Frame constants (matching manager's office style)
const BC = '#111111';
const FT = 0.08;
const FD = 0.14;
const FX = 7.16; // east wall outer face

// Pane height split (same as manager's office)
const TRANSOM_Y = DOOR_HEIGHT;
const UPPER_H   = OFFICE_CEILING_Y - FT - TRANSOM_Y;
const LOWER_CY  = TRANSOM_Y / 2;
const UPPER_CY  = TRANSOM_Y + UPPER_H / 2;

export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Conference Room', x1: -23, z1: -9, x2: -9, z2: 5, color: '#dbeafe',
};

// East wall layout (local x=7, z from -7 to +7, 14u total)
// Viewed from INSIDE (left→right = -z→+z, i.e. north→south):
//   z=-7 to -4 (3u): solid
//   z=-4 to -1 (3u): window (leftmost / north)
//   z=-1 to +2 (3u): window (middle)
//   z=+2 to +5 (3u): window (right / south)
//   z=+5 to +7 (2u): door (hinge at z=+5, nearest to manager's office)

const SOLID_WALLS: WallDef[] = [
  { args: [14, 8, 0.3], position: [0,  4, -7] }, // North
  { args: [0.3, 8, 14], position: [-7, 4,  0] }, // West
  { args: [14, 8, 0.3], position: [0,  4,  7] }, // South
];

// East wall collision covers the full wall except the door gap (z=+5 to +7).
// Windows are glass but still block movement.
const EAST_WALL_COLLISION: WallDef = { args: [0.3, 8, 12], position: [7, 4, -1] };

export const CONFERENCE_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  ...wallsToBoxes([...SOLID_WALLS, EAST_WALL_COLLISION], GROUP_OFFSET),
  // Conference table (local [0,0,0] → world [-16,0,-2]; table 10×4.5)
  new THREE.Box3(new THREE.Vector3(-21, 0, -4.25), new THREE.Vector3(-11, 1.0, 0.25)),
];

/** Four black rails forming a closed frame around a pane. */
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

// Conference room door hinge at room-local [7, 0, +5]
// GROUP_OFFSET = [-16, 0, -2] → world [-9, 0, +3]
const CONF_DOOR_HINGE_WORLD = new THREE.Vector3(-9, 0, 3);
const PROXIMITY_R = 3.5;

/** Interactive door: hinge at room-local [7, 0, +5], swings inward (−π/2). */
function ConfInteractiveDoor() {
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
        confDoorState.open = isOpenRef.current;
        setLabelOpen(isOpenRef.current);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useFrame((_, delta) => {
    const dx = playerWorldPos.x - CONF_DOOR_HINGE_WORLD.x;
    const dz = playerWorldPos.z - CONF_DOOR_HINGE_WORLD.z;
    const near = Math.sqrt(dx * dx + dz * dz) < PROXIMITY_R;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setShowHint(near);
    }

    const target = isOpenRef.current ? -Math.PI / 2 : 0;
    rotRef.current += (target - rotRef.current) * Math.min(delta * 6, 1);
    hingeRef.current.rotation.y = rotRef.current;
  });

  const panelH  = DOOR_HEIGHT - 0.05;
  const panelCY = panelH / 2 + 0.05;

  return (
    <>
      {/* Hinge at room-local [7, 0, +5]; door extends toward +z (z=+5 to z=+7) */}
      <group ref={hingeRef} position={[7, 0, 5]}>
        <Box args={[0.12, panelH, 1.9]} position={[0.05, panelCY, 1]}>
          <meshStandardMaterial color={DOOR_COLOR} />
        </Box>
        {/* Knob near latch side (z≈1.75), at handle height */}
        <Box args={[0.09, 0.09, 0.09]} position={[0.14, 1.35, 1.75]}>
          <meshStandardMaterial color="#c4a055" metalness={0.7} roughness={0.2} />
        </Box>
      </group>

      {showHint && (
        <Html center position={[6.2, 2.8, 6]}>
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

export const ConferenceRoom = () => (
  <group position={GROUP_OFFSET}>
    {/* ── Solid walls (north, west, south) ── */}
    {SOLID_WALLS.map((w, i) => (
      <Box key={i} args={w.args} position={w.position}>
        <meshStandardMaterial color={WALL_COLOR} />
      </Box>
    ))}

    {/* ── East wall ── */}

    {/* Solid section z=−7 to −4 */}
    <Box args={[0.3, OFFICE_CEILING_Y, 3]} position={[7, OFFICE_CEILING_Y / 2, -5.5]}>
      <meshStandardMaterial color={WALL_COLOR} />
    </Box>

    {/* Door opening frame + transom above */}
    <PaneFrame cy={LOWER_CY} cz={6} w={2} h={TRANSOM_Y} />
    <UpperPane cz={6} w={2} />

    {/* Interactive door panel */}
    <ConfInteractiveDoor />

    {/* Window 1 (z=+2 to +5, cz=+3.5) */}
    <LowerWindow cz={3.5} w={3} />
    <UpperPane cz={3.5} w={3} />

    {/* Window 2 (z=−1 to +2, cz=+0.5) */}
    <LowerWindow cz={0.5} w={3} />
    <UpperPane cz={0.5} w={3} />

    {/* Window 3 (z=−4 to −1, cz=−2.5) */}
    <LowerWindow cz={-2.5} w={3} />
    <UpperPane cz={-2.5} w={3} />

    {/* ── Table ── */}
    <Box args={[10, 0.12, 4.5]} position={[0, 0.95, 0]}>
      <meshStandardMaterial color="#3E2723" />
    </Box>
    <Box args={[8, 0.02, 0.4]} position={[0, 1.015, 0]}>
      <meshStandardMaterial color="#2a1a10" />
    </Box>
    {/* Legs */}
    {([[-4.5, -2], [4.5, -2], [-4.5, 2], [4.5, 2]] as [number, number][]).map(([x, z]) => (
      <Box key={`${x}-${z}`} args={[0.4, 0.95, 0.4]} position={[x, 0.475, z]}>
        <meshStandardMaterial color="#5D4037" />
      </Box>
    ))}

    {/* ── Name placards ── */}
    {([-3, -1.5, 0, 1.5, 3] as number[]).map((x) => (
      <React.Fragment key={x}>
        <Box args={[0.3, 0.03, 0.15]} position={[x, 1.02, -2.1]}>
          <meshStandardMaterial color="#f5f5f0" />
        </Box>
        <Box args={[0.3, 0.03, 0.15]} position={[x, 1.02, 2.1]}>
          <meshStandardMaterial color="#f5f5f0" />
        </Box>
      </React.Fragment>
    ))}

    {/* ── Chairs — 5 per long side + 2 end caps ── */}
    {([-3, -1.5, 0, 1.5, 3] as number[]).map((x) => (
      <React.Fragment key={x}>
        <Chair position={[x, 0, -3.2]} rotation={[0, 0, 0]} />
        <Chair position={[x, 0, 3.2]} rotation={[0, Math.PI, 0]} />
      </React.Fragment>
    ))}
    <Chair position={[-5.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
    <Chair position={[5.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

    {/* ── Whiteboard (on north wall) ── */}
    <Whiteboard position={[0, 3.5, -6.8]} rotation={[0, 0, 0]} />

    {/* ── Spotlight ── */}
    <spotLight position={[0, 7.5, 0]} intensity={1.2} angle={0.6} penumbra={0.3} color="#fff5e0" />
  </group>
);
