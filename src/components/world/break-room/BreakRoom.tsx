import React from 'react';
import { Box, Cylinder, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Chair } from '../shared/props/Chair';
import { WaterCooler } from './props/WaterCooler';
import { CoffeeMachine } from './props/CoffeeMachine';
import { VendingMachine } from './props/VendingMachine';
import { Plant } from '../shared/props/Plant';

// Room: 30 wide × 14 deep, group at world [8, 0, -16]
// World extents: X[-7, +23], Z[-23, -9]
export const BREAK_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  // North wall
  new THREE.Box3(new THREE.Vector3(-7, 0, -23.15), new THREE.Vector3(23, 8, -22.85)),
  // West wall
  new THREE.Box3(new THREE.Vector3(-7.15, 0, -23), new THREE.Vector3(-6.85, 8, -9)),
  // East wall
  new THREE.Box3(new THREE.Vector3(22.85, 0, -23), new THREE.Vector3(23.15, 8, -9)),
  // South partial walls (6-unit door gap in center)
  new THREE.Box3(new THREE.Vector3(-7, 0, -9.15), new THREE.Vector3(-3, 8, -8.85)),
  new THREE.Box3(new THREE.Vector3(3, 0, -9.15), new THREE.Vector3(23, 8, -8.85)),
  // Counter
  new THREE.Box3(new THREE.Vector3(-4, 0, -22), new THREE.Vector3(16, 1, -20)),
  // Fridge
  new THREE.Box3(new THREE.Vector3(18, 0, -22), new THREE.Vector3(21, 1.8, -20)),
  // Round table (local [0,0,1] → world [8,0,-15])
  new THREE.Box3(new THREE.Vector3(7.2, 0, -15.8), new THREE.Vector3(8.8, 0.8, -14.2)),
  // Vending machine (local [13,0,0] → world [21,0,-16])
  new THREE.Box3(new THREE.Vector3(20.5, 0, -16.5), new THREE.Vector3(21.5, 2, -15.5)),
];

export const BreakRoom = () => (
  // Group at world [8, 0, -16]; all child positions are local to this origin
  <group position={[8, 0, -16]}>
    {/* ── Walls ── */}
    {/* North wall */}
    <Box args={[30, 8, 0.3]} position={[0, 4, -7]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* West wall */}
    <Box args={[0.3, 8, 14]} position={[-15, 4, 0]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* East wall */}
    <Box args={[0.3, 8, 14]} position={[15, 4, 0]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* South — left panel */}
    <Box args={[11, 8, 0.3]} position={[-9.5, 4, 7]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* South — right panel */}
    <Box args={[11, 8, 0.3]} position={[9.5, 4, 7]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>

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
    <WaterCooler position={[-13, 0, -5]} />

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
