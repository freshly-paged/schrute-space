import React from 'react';
import { Box, Cylinder, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Chair } from '../shared/props/Chair';
import { WaterCooler } from './props/WaterCooler';
import { CoffeeMachine } from './props/CoffeeMachine';
import { VendingMachine } from './props/VendingMachine';
import { Plant } from '../shared/props/Plant';

// World-space collision boxes (local positions + group offset [-15, 0, 15])
export const BREAK_ROOM_COLLISION_BOXES: THREE.Box3[] = [
  // Back wall
  new THREE.Box3(new THREE.Vector3(-21, 0, 8.7), new THREE.Vector3(-9, 8, 9)),
  // Left wall
  new THREE.Box3(new THREE.Vector3(-21, 0, 9), new THREE.Vector3(-20.7, 8, 21)),
  // Right wall
  new THREE.Box3(new THREE.Vector3(-9.3, 0, 9), new THREE.Vector3(-9, 8, 21)),
  // Counter
  new THREE.Box3(new THREE.Vector3(-17, 0, 9), new THREE.Vector3(-11, 1, 10)),
  // Fridge
  new THREE.Box3(new THREE.Vector3(-9.8, 0, 10), new THREE.Vector3(-9.2, 1.8, 11)),
  // Table
  new THREE.Box3(new THREE.Vector3(-13.3, 0, 16.7), new THREE.Vector3(-12.7, 0.8, 17.3)),
  // Vending machine
  new THREE.Box3(new THREE.Vector3(-9.5, 0, 14), new THREE.Vector3(-9, 2, 16)),
];

export const BreakRoom = () => (
  <group position={[-15, 0, 15]}>
    {/* ── Walls ── */}
    {/* Back wall (z = -6) */}
    <Box args={[12, 8, 0.3]} position={[0, 4, -6]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* Left wall (x = -6) */}
    <Box args={[0.3, 8, 12]} position={[-6, 4, 0]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>
    {/* Right wall (x = 6) */}
    <Box args={[0.3, 8, 12]} position={[6, 4, 0]}>
      <meshStandardMaterial color="#e8dcc8" />
    </Box>

    {/* ── Counter / Kitchenette ── */}
    {/* Cabinet boxes underneath */}
    <Box args={[5, 0.9, 0.8]} position={[-1, 0.45, -5.5]}>
      <meshStandardMaterial color="#b8a890" />
    </Box>
    {/* Counter surface */}
    <Box args={[5, 0.05, 0.8]} position={[-1, 0.9, -5.5]}>
      <meshStandardMaterial color="#d4c5a9" />
    </Box>

    {/* ── Appliances on counter ── */}
    <CoffeeMachine position={[1, 0.95, -5.3]} />
    {/* Microwave */}
    <Box args={[0.5, 0.35, 0.4]} position={[-1, 1.3, -5.4]}>
      <meshStandardMaterial color="#2d2d2d" />
    </Box>

    {/* ── Fridge ── */}
    <Box args={[0.8, 1.8, 0.6]} position={[5, 0.9, -4.5]}>
      <meshStandardMaterial color="#f0f0f0" />
    </Box>
    {/* Fridge door handle */}
    <Box args={[0.05, 0.4, 0.08]} position={[4.55, 1.1, -4.15]}>
      <meshStandardMaterial color="#a0aec0" />
    </Box>

    {/* ── Round table ── */}
    {/* Tabletop */}
    <Cylinder args={[0.8, 0.8, 0.05, 16]} position={[2, 0.75, 2]}>
      <meshStandardMaterial color="#8B4513" />
    </Cylinder>
    {/* Leg */}
    <Cylinder args={[0.05, 0.05, 0.75, 8]} position={[2, 0.375, 2]}>
      <meshStandardMaterial color="#5a3320" />
    </Cylinder>

    {/* ── Chairs around the table ── */}
    <Chair position={[2, 0, 3.2]} rotation={[0, Math.PI, 0]} />
    <Chair position={[2, 0, 0.8]} rotation={[0, 0, 0]} />
    <Chair position={[0.8, 0, 2]} rotation={[0, Math.PI / 2, 0]} />
    <Chair position={[3.2, 0, 2]} rotation={[0, -Math.PI / 2, 0]} />

    {/* ── Water cooler ── */}
    <WaterCooler position={[-5, 0, -5]} />

    {/* ── Vending machine ── */}
    <VendingMachine position={[5.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />

    {/* ── Plants ── */}
    <Plant position={[-5.5, 0, 5]} />

    {/* ── Sign above entrance ── */}
    <Text
      position={[0, 7, 5.8]}
      fontSize={0.5}
      color="#333"
      anchorX="center"
      anchorY="middle"
    >
      Break Room
    </Text>
  </group>
);
