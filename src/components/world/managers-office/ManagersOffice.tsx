import React from 'react';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Chair } from '../shared/props/Chair';

export const MANAGERS_OFFICE_COLLISION_BOXES = [
  // Glass walls
  new THREE.Box3(new THREE.Vector3(10, 0, -10.1), new THREE.Vector3(20, 8, -9.9)),   // South wall
  new THREE.Box3(new THREE.Vector3(9.9, 0, -20), new THREE.Vector3(10.1, 8, -10)),   // West wall
  // Desk
  new THREE.Box3(new THREE.Vector3(13.5, 0, -16.5), new THREE.Vector3(16.5, 1.0, -13.5)),
  // Visitor chairs
  new THREE.Box3(new THREE.Vector3(13.2, 0, -13.8), new THREE.Vector3(13.8, 0.5, -13.2)),
  new THREE.Box3(new THREE.Vector3(16.2, 0, -13.8), new THREE.Vector3(16.8, 0.5, -13.2)),
];

export const ManagersOffice = () => (
  <group position={[15, 0, -15]}>
    {/* South glass wall */}
    <Box args={[10, 8, 0.2]} position={[0, 4, 5]}>
      <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
    </Box>
    {/* West glass wall */}
    <Box args={[0.2, 8, 10]} position={[-5, 4, 0]}>
      <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
    </Box>
    {/* Nameplate text on exterior-facing glass */}
    <Text position={[0, 3, 4.9]} fontSize={0.5} color="black">
      Regional Manager
    </Text>
    <Text position={[0, 2.5, 4.9]} fontSize={0.3} color="#444">
      {/* Populated dynamically by room owner — placeholder shown when no owner */}
      Michael Scott
    </Text>
    {/* Visitor chairs */}
    <Chair position={[-1.5, 0, 1.5]} rotation={[0, Math.PI / 4, 0]} />
    <Chair position={[1.5, 0, 1.5]} rotation={[0, -Math.PI / 4, 0]} />
  </group>
);
