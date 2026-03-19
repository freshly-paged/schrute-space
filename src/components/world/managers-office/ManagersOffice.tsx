import React from 'react';
import * as THREE from 'three';
import { Box, Text } from '@react-three/drei';
import { FloorPlanRect } from '../../../types';
import { BossDesk } from './props/BossDesk';
import { Bookshelf } from './props/Bookshelf';
import { Chair } from '../shared/props/Chair';

// Room: 14 wide × 14 deep, group at world [-16, 0, 12]
// World extents: X[-23, -9], Z[+5, +19]
// North boundary (world z=+5) is the Conference Room's south wall — not re-rendered here.
export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: "Manager's Office", x1: -23, z1: 5, x2: -9, z2: 19, color: '#e2e8f0',
};

export const MANAGERS_OFFICE_COLLISION_BOXES: THREE.Box3[] = [
  // West wall (world x = -23)
  new THREE.Box3(new THREE.Vector3(-23.15, 0, 5), new THREE.Vector3(-22.85, 8, 19)),
  // South wall (world z = +19)
  new THREE.Box3(new THREE.Vector3(-23, 0, 18.85), new THREE.Vector3(-9, 8, 19.15)),
  // East glass — upper panel (world x = -9, z from +5 to +10)
  new THREE.Box3(new THREE.Vector3(-9.15, 0, 5), new THREE.Vector3(-8.85, 8, 10)),
  // East glass — lower panel (world x = -9, z from +12 to +19)
  new THREE.Box3(new THREE.Vector3(-9.15, 0, 12), new THREE.Vector3(-8.85, 8, 19)),
  // Boss desk (local [0,0,-2] → world [-16,0,10]; desk 2.8×1.4)
  new THREE.Box3(new THREE.Vector3(-17.4, 0, 9.3), new THREE.Vector3(-14.6, 1.0, 10.7)),
  // Bookshelf (local [-5,0,-6] → world [-21,0,6]; shelf 1.2×0.3)
  new THREE.Box3(new THREE.Vector3(-21.6, 0, 5.85), new THREE.Vector3(-20.4, 2.2, 6.45)),
];

interface ManagersOfficeProps {
  ownerName?: string;
}

export const ManagersOffice = ({ ownerName = '' }: ManagersOfficeProps) => (
  // Group at world [-16, 0, 12]; all child positions are local to this origin
  <group position={[-16, 0, 12]}>
    {/* ── Glass walls ── */}
    {/* West wall */}
    <Box args={[0.2, 8, 14]} position={[-7, 4, 0]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8ea" />
    </Box>
    {/* South wall */}
    <Box args={[14, 8, 0.2]} position={[0, 4, 7]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8ea" />
    </Box>
    {/* East wall — upper panel (z local -7 to -2) */}
    <Box args={[0.2, 8, 5]} position={[7, 4, -4.5]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8ea" />
    </Box>
    {/* East wall — lower panel (z local 0 to +7) — door gap from -2 to 0 */}
    <Box args={[0.2, 8, 7]} position={[7, 4, 3.5]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8ea" />
    </Box>
    {/* Door panel in gap */}
    <Box args={[0.1, 7.5, 1.8]} position={[7, 3.75, -1]}>
      <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.5} color="#a8d8ea" />
    </Box>

    {/* ── Furniture ── */}
    <BossDesk position={[0, 0, -2]} rotation={[0, Math.PI, 0]} ownerName={ownerName} />

    {/* Visitor chairs */}
    <Chair position={[-1.2, 0, 1.5]} rotation={[0, Math.PI / 8, 0]} />
    <Chair position={[1.2, 0, 1.5]} rotation={[0, -Math.PI / 8, 0]} />

    {/* Bookshelf against west wall */}
    <Bookshelf position={[-5, 0, -6]} />

    {/* ── Award plaques on south wall ── */}
    {([[-3, 'Best Boss'], [0, "Dundie '05"], [3, 'Salesman']] as [number, string][]).map(([x, label]) => (
      <React.Fragment key={label}>
        <Box args={[0.6, 0.4, 0.05]} position={[x, 4, 6.9]}>
          <meshStandardMaterial color="#d4af37" />
        </Box>
        <Text position={[x, 4, 6.88]} fontSize={0.1} color="#5a3e00" anchorX="center" anchorY="middle" rotation={[0, Math.PI, 0]}>
          {label}
        </Text>
      </React.Fragment>
    ))}

    {/* ── Lighting ── */}
    <pointLight position={[0, 5, 0]} intensity={0.6} distance={12} color="#fff3d0" />

    {/* ── Exterior signage on east glass ── */}
    <Text position={[7.2, 5.5, -1]} fontSize={0.35} color="#222" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
      Regional Manager
    </Text>
    <Text position={[7.2, 4.9, -1]} fontSize={0.25} color="#555" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]}>
      {ownerName}
    </Text>
  </group>
);
