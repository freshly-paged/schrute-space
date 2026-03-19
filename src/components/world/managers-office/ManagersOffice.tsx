import React from 'react';
import * as THREE from 'three';
import { Box, Text } from '@react-three/drei';
import { BossDesk } from './props/BossDesk';
import { Bookshelf } from './props/Bookshelf';
import { Chair } from '../shared/props/Chair';

interface ManagersOfficeProps {
  ownerName?: string;
}

export const MANAGERS_OFFICE_COLLISION_BOXES: THREE.Box3[] = [
  // South wall left panel
  new THREE.Box3(new THREE.Vector3(10, 0, -10.1), new THREE.Vector3(14, 8, -9.9)),
  // South wall right panel
  new THREE.Box3(new THREE.Vector3(18, 0, -10.1), new THREE.Vector3(22, 8, -9.9)),
  // West wall
  new THREE.Box3(new THREE.Vector3(9.9, 0, -20), new THREE.Vector3(10.1, 8, -10)),
  // North wall
  new THREE.Box3(new THREE.Vector3(10, 0, -20.1), new THREE.Vector3(20, 8, -19.9)),
  // East wall
  new THREE.Box3(new THREE.Vector3(19.9, 0, -20), new THREE.Vector3(20.1, 8, -10)),
  // Desk
  new THREE.Box3(new THREE.Vector3(12.5, 0, -17), new THREE.Vector3(17.5, 1.0, -14.5)),
  // Bookshelf
  new THREE.Box3(new THREE.Vector3(10.8, 0, -19.9), new THREE.Vector3(12, 2.2, -19.6)),
];

export const ManagersOffice = ({ ownerName = '' }: ManagersOfficeProps) => (
  // Group is at world position [15, 0, -15]; all child positions are local to this group
  <group position={[15, 0, -15]}>
    {/* === GLASS WALLS === */}

    {/* South wall — left panel [4, 8, 0.2] at [-3, 4, 5] */}
    <Box args={[4, 8, 0.2]} position={[-3, 4, 5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.3}
        color="#a8d8ea"
      />
    </Box>

    {/* South wall — right panel [4, 8, 0.2] at [3, 4, 5] */}
    <Box args={[4, 8, 0.2]} position={[3, 4, 5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.3}
        color="#a8d8ea"
      />
    </Box>

    {/* South wall — door panel in gap [1.8, 7.5, 0.1] at [0, 3.75, 5] */}
    <Box args={[1.8, 7.5, 0.1]} position={[0, 3.75, 5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.5}
        color="#a8d8ea"
      />
    </Box>

    {/* West wall */}
    <Box args={[0.2, 8, 10]} position={[-5, 4, 0]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.3}
        color="#a8d8ea"
      />
    </Box>

    {/* North wall */}
    <Box args={[10, 8, 0.2]} position={[0, 4, -5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.3}
        color="#a8d8ea"
      />
    </Box>

    {/* East wall */}
    <Box args={[0.2, 8, 10]} position={[5, 4, 0]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent
        opacity={0.3}
        color="#a8d8ea"
      />
    </Box>

    {/* === FURNITURE === */}

    <BossDesk position={[-0.5, 0, -1]} rotation={[0, Math.PI, 0]} ownerName={ownerName} />

    {/* Visitor chairs */}
    <Chair position={[-1.2, 0, 2]} rotation={[0, Math.PI / 8, 0]} />
    <Chair position={[1.2, 0, 2]} rotation={[0, -Math.PI / 8, 0]} />

    {/* Bookshelf against north wall */}
    <Bookshelf position={[-3.5, 0, -4.7]} />

    {/* === AWARD PLAQUES ON EAST WALL === */}

    {/* Plaque 1 */}
    <Box args={[0.6, 0.4, 0.05]} position={[4.9, 4, -2]}>
      <meshStandardMaterial color="#d4af37" />
    </Box>
    <Text position={[4.88, 4, -2]} fontSize={0.1} color="#5a3e00" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
      Best Boss
    </Text>

    {/* Plaque 2 */}
    <Box args={[0.6, 0.4, 0.05]} position={[4.9, 4, -0.5]}>
      <meshStandardMaterial color="#d4af37" />
    </Box>
    <Text position={[4.88, 4, -0.5]} fontSize={0.1} color="#5a3e00" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
      Dundie &apos;05
    </Text>

    {/* Plaque 3 */}
    <Box args={[0.6, 0.4, 0.05]} position={[4.9, 4, 1]}>
      <meshStandardMaterial color="#d4af37" />
    </Box>
    <Text position={[4.88, 4, 1]} fontSize={0.1} color="#5a3e00" anchorX="center" anchorY="middle" rotation={[0, -Math.PI / 2, 0]}>
      Salesman
    </Text>

    {/* === LIGHTING === */}
    <pointLight position={[0, 5, 0]} intensity={0.6} distance={12} color="#fff3d0" />

    {/* === SOUTH GLASS EXTERIOR SIGNAGE === */}
    <Text
      position={[0, 5.5, 5.15]}
      fontSize={0.4}
      color="#222222"
      anchorX="center"
      anchorY="middle"
    >
      Regional Manager
    </Text>
    <Text
      position={[0, 4.9, 5.15]}
      fontSize={0.3}
      color="#555555"
      anchorX="center"
      anchorY="middle"
    >
      {ownerName}
    </Text>
  </group>
);
