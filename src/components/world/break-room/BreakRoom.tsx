import React from 'react';
import { Box, Cylinder, Text } from '@react-three/drei';
import * as THREE from 'three';
import { FloorPlanRect } from '../../../types';
import {
  BREAK_ROOM_GROUP_POSITION,
  WATER_COOLER_LOCAL_POSITION,
} from '../../../officeLayout';
import { WallDef, wallsToBoxes } from '../../../utils/walls';
import { Chair } from '../shared/props/Chair';
import { WaterCooler } from './props/WaterCooler';
import { CoffeeMachine } from './props/CoffeeMachine';
import { VendingMachine } from './props/VendingMachine';
import { Plant } from '../shared/props/Plant';

// Room: 32 wide × 14 deep; group position shared via officeLayout (server + client).
// World extents: X[-9, +23], Z[-23, -9]
const GROUP_OFFSET = BREAK_ROOM_GROUP_POSITION;

export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Break Room', x1: -9, z1: -23, x2: 23, z2: -9, color: '#d1fae5',
};

const WALLS: WallDef[] = [
  { args: [32, 8, 0.3], position: [1,    4, -7] }, // North
  { args: [0.3, 8, 14], position: [-15,  4,  0] }, // West
  { args: [0.3, 8, 14], position: [17,   4,  0] }, // East
  { args: [11,  8, 0.3], position: [-9.5, 4,  7] }, // South — left panel
  { args: [13,  8, 0.3], position: [10.5, 4,  7] }, // South — right panel
];

export const BREAK_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  ...wallsToBoxes(WALLS, GROUP_OFFSET),
  // Counter
  new THREE.Box3(new THREE.Vector3(-6, 0, -22), new THREE.Vector3(14, 1, -20)),
  // Fridge
  new THREE.Box3(new THREE.Vector3(16, 0, -22), new THREE.Vector3(19, 1.8, -20)),
  // Round table (local [0,0,1] → world [6,0,-15])
  new THREE.Box3(new THREE.Vector3(5.2, 0, -15.8), new THREE.Vector3(6.8, 0.8, -14.2)),
  // Vending machine (local [13,0,0] → world [19,0,-16])
  new THREE.Box3(new THREE.Vector3(18.5, 0, -16.5), new THREE.Vector3(19.5, 2, -15.5)),
];

export const BreakRoom = () => (
  // Group at world [6, 0, -16]; all child positions are local to this origin
  <group position={GROUP_OFFSET}>
    {/* ── Walls (derived from WALLS — collision boxes stay in sync) ── */}
    {WALLS.map((w, i) => (
      <Box key={i} args={w.args} position={w.position}>
        <meshStandardMaterial color="#e8dcc8" />
      </Box>
    ))}

    {/* ── Counter / Kitchenette (along north wall) ── */}
    <Box args={[12, 0.9, 0.8]} position={[4, 0.45, -6]}>
      <meshStandardMaterial color="#b8a890" />
    </Box>
    <Box args={[12, 0.05, 0.8]} position={[4, 0.9, -6]}>
      <meshStandardMaterial color="#d4c5a9" />
    </Box>

    {/* ── Appliances ── */}
    <CoffeeMachine position={[8, 0.95, -5.8]} />
    {/* Microwave */}
    <Box args={[0.5, 0.35, 0.4]} position={[4, 1.3, -5.9]}>
      <meshStandardMaterial color="#2d2d2d" />
    </Box>

    {/* ── Fridge (east side of counter) ── */}
    <Box args={[0.8, 1.8, 0.6]} position={[13, 0.9, -6]}>
      <meshStandardMaterial color="#f0f0f0" />
    </Box>
    <Box args={[0.05, 0.4, 0.08]} position={[12.55, 1.1, -5.65]}>
      <meshStandardMaterial color="#a0aec0" />
    </Box>

    {/* ── Round table + chairs (center of room) ── */}
    <Cylinder args={[0.8, 0.8, 0.05, 16]} position={[0, 0.75, 1]}>
      <meshStandardMaterial color="#8B4513" />
    </Cylinder>
    <Cylinder args={[0.05, 0.05, 0.75, 8]} position={[0, 0.375, 1]}>
      <meshStandardMaterial color="#5a3320" />
    </Cylinder>
    <Chair position={[0, 0, 2.2]} rotation={[0, Math.PI, 0]} />
    <Chair position={[0, 0, -0.2]} rotation={[0, 0, 0]} />
    <Chair position={[-1.2, 0, 1]} rotation={[0, Math.PI / 2, 0]} />
    <Chair position={[1.2, 0, 1]} rotation={[0, -Math.PI / 2, 0]} />

    {/* ── Water cooler (NW corner) ── */}
    <WaterCooler position={WATER_COOLER_LOCAL_POSITION} />

    {/* ── Vending machine (east side) ── */}
    <VendingMachine position={[13, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

    {/* ── Plants ── */}
    <Plant position={[-13, 0, 5]} />

    {/* ── Sign ── */}
    <Text position={[0, 7, 6.8]} fontSize={0.5} color="#333" anchorX="center" anchorY="middle">
      Break Room
    </Text>
  </group>
);
