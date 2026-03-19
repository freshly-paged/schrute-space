import React from 'react';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FloorPlanRect } from '../../../types';
import { Chair } from '../shared/props/Chair';
import { Whiteboard } from './props/Whiteboard';

// Room: 14 wide × 14 deep, group at world [-16, 0, -2]
// World extents: X[-23, -9], Z[-9, +5]
export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Conference Room', x1: -23, z1: -9, x2: -9, z2: 5, color: '#dbeafe',
};

export const CONFERENCE_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  // North wall (world z = -9)
  new THREE.Box3(new THREE.Vector3(-23, 0, -9.15), new THREE.Vector3(-9, 8, -8.85)),
  // West wall (world x = -23)
  new THREE.Box3(new THREE.Vector3(-23.15, 0, -9), new THREE.Vector3(-22.85, 8, 5)),
  // South wall (world z = +5) — shared boundary with Manager's Office
  new THREE.Box3(new THREE.Vector3(-23, 0, 4.85), new THREE.Vector3(-9, 8, 5.15)),
  // East glass — upper panel (world x = -9, z from -9 to -2)
  new THREE.Box3(new THREE.Vector3(-9.15, 0, -9), new THREE.Vector3(-8.85, 8, -3)),
  // East glass — lower panel (world x = -9, z from +1 to +5)
  new THREE.Box3(new THREE.Vector3(-9.15, 0, 1), new THREE.Vector3(-8.85, 8, 5)),
  // Conference table (local [0,0,0] → world [-16,0,-2]; table 10×4.5)
  new THREE.Box3(new THREE.Vector3(-21, 0, -4.25), new THREE.Vector3(-11, 1.0, 0.25)),
];

export const ConferenceRoom = () => (
  // Group at world [-16, 0, -2]; all child positions are local to this origin
  <group position={[-16, 0, -2]}>
    {/* ── Enclosure walls ── */}
    {/* North wall */}
    <Box args={[14, 8, 0.3]} position={[0, 4, -7]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>
    {/* West wall */}
    <Box args={[0.3, 8, 14]} position={[-7, 4, 0]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>
    {/* South wall */}
    <Box args={[14, 8, 0.3]} position={[0, 4, 7]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>

    {/* ── East glass wall — two panels with ~4-unit door gap ── */}
    {/* Upper panel (z local -7 to -1) */}
    <Box args={[0.2, 8, 6]} position={[7, 4, -4]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8f0" />
    </Box>
    {/* Lower panel (z local +3 to +7) */}
    <Box args={[0.2, 8, 4]} position={[7, 4, 5]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8f0" />
    </Box>

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

    {/* ── Sign on glass exterior ── */}
    <Text position={[7.2, 6.5, 0]} fontSize={0.3} color="#333" rotation={[0, Math.PI / 2, 0]}>
      Conference Room B
    </Text>
  </group>
);
