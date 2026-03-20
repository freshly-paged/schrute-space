import React from 'react';
import * as THREE from 'three';
import { Box } from '@react-three/drei';
import { FloorPlanRect } from '../../../types';
import { WallDef, wallsToBoxes } from '../../../utils/walls';
import { BossDesk } from './props/BossDesk';
import { Bookshelf } from './props/Bookshelf';
import { Chair } from '../shared/props/Chair';

// Room: 14 wide × 14 deep, group at world [-16, 0, 12]
// World extents: X[-23, -9], Z[+5, +19]
// North boundary (world z=+5) is the Conference Room's south wall — not re-rendered here.
const GROUP_OFFSET: [number, number, number] = [-16, 0, 12];

export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: "Manager's Office", x1: -23, z1: 5, x2: -9, z2: 19, color: '#e2e8f0',
};

const GLASS_WALLS: WallDef[] = [
  { args: [0.2, 8, 14], position: [-7, 4,    0] }, // West
  { args: [14, 8, 0.2], position: [ 0, 4,    7] }, // South
  { args: [0.2, 8,  5], position: [ 7, 4, -4.5] }, // East — upper panel
  { args: [0.2, 8,  7], position: [ 7, 4,  3.5] }, // East — lower panel
];

export const MANAGERS_OFFICE_COLLISION_BOXES: THREE.Box3[] = [
  ...wallsToBoxes(GLASS_WALLS, GROUP_OFFSET),
  // Boss desk (local [-1,0,0] rotated 90° → world [-17,0,12]; footprint 1.4 E-W × 2.8 N-S)
  new THREE.Box3(new THREE.Vector3(-17.7, 0, 10.6), new THREE.Vector3(-16.3, 1.1, 13.4)),
  // Bookshelf (local [-5,0,-6] → world [-21,0,6]; shelf 1.2×0.3)
  new THREE.Box3(new THREE.Vector3(-21.6, 0, 5.85), new THREE.Vector3(-20.4, 2.2, 6.45)),
];

interface ManagersOfficeProps {
  ownerName?: string;
}

export const ManagersOffice = ({ ownerName = '' }: ManagersOfficeProps) => (
  // Group at world [-16, 0, 12]; all child positions are local to this origin
  <group position={GROUP_OFFSET}>
    {/* ── Glass walls (derived from GLASS_WALLS) ── */}
    {GLASS_WALLS.map((w, i) => (
      <Box key={i} args={w.args} position={w.position}>
        <meshPhysicalMaterial transmission={0.9} roughness={0} metalness={0} transparent opacity={0.3} color="#a8d8ea" />
      </Box>
    ))}

    {/* ── Furniture ── */}
    {/* Desk faces east (toward glass + working area); boss sits on west side */}
    <BossDesk position={[-1, 0, 0]} rotation={[0, Math.PI / 2, 0]} ownerName={ownerName} />

    {/* Visitor chairs on east side of desk, facing west toward boss */}
    <Chair position={[2.5, 0, -0.8]} rotation={[0, -Math.PI / 2 + Math.PI / 8, 0]} />
    <Chair position={[2.5, 0, 0.8]} rotation={[0, -Math.PI / 2 - Math.PI / 8, 0]} />

    {/* Bookshelf against west wall */}
    <Bookshelf position={[-5, 0, -6]} />

    {/* ── Award plaques on south wall ── */}
    {/* Award plaques (gold boxes on south wall) */}
    {([-3, 0, 3] as number[]).map((x) => (
      <Box key={x} args={[0.6, 0.4, 0.05]} position={[x, 4, 6.9]}>
        <meshStandardMaterial color="#d4af37" />
      </Box>
    ))}

    {/* ── Lighting ── */}
    <pointLight position={[0, 5, 0]} intensity={0.6} distance={12} color="#fff3d0" />
  </group>
);
