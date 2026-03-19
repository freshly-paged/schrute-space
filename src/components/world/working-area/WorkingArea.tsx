import React from 'react';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';
import { DeskItem } from '../../../types';
import { Desk } from './Desk';
import { CeilingLights } from './props/CeilingLights';
import { Plant } from '../shared/props/Plant';
import { PrinterStation } from './props/PrinterStation';

/**
 * Collision boxes for the working area props in world space.
 * WorkingArea renders at position [0,0,0], so local coords == world coords.
 */
export const WORKING_AREA_COLLISION_BOXES: THREE.Box3[] = [
  // Pillar at [-12, 4, -20]
  new THREE.Box3(new THREE.Vector3(-12.3, 0, -20.3), new THREE.Vector3(-11.7, 8, -19.7)),
  // Pillar at [0, 4, -20]
  new THREE.Box3(new THREE.Vector3(-0.3, 0, -20.3), new THREE.Vector3(0.3, 8, -19.7)),
  // Pillar at [10, 4, -20]
  new THREE.Box3(new THREE.Vector3(9.7, 0, -20.3), new THREE.Vector3(10.3, 8, -19.7)),
  // Pillar at [-12, 4, 0]
  new THREE.Box3(new THREE.Vector3(-12.3, 0, -0.3), new THREE.Vector3(-11.7, 8, 0.3)),
  // Pillar at [10, 4, 0]
  new THREE.Box3(new THREE.Vector3(9.7, 0, -0.3), new THREE.Vector3(10.3, 8, 0.3)),
  // Printer station at [-8, 0, -12] rotated 90deg — approx footprint
  new THREE.Box3(new THREE.Vector3(-8.3, 0, -12.5), new THREE.Vector3(-7.7, 1, -11.5)),
];

export const WorkingArea = () => {
  const desks = useGameStore((s) => s.roomLayout).filter(
    (f): f is DeskItem => f.type === 'desk'
  );

  return (
    <group>
      {/* Ceiling light fixtures */}
      <CeilingLights />

      {/* Structural column pillars */}
      {(
        [
          [-12, 4, -20],
          [0,   4, -20],
          [10,  4, -20],
          [-12, 4,   0],
          [10,  4,   0],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Box key={`pillar-${i}`} args={[0.4, 8, 0.4]} position={[x, y, z]}>
          <meshStandardMaterial color="#b0b8c1" />
        </Box>
      ))}

      {/* Corner plants */}
      <Plant position={[-22, 0, -22]} />
      <Plant position={[-22, 0,   5]} />
      <Plant position={[  8, 0, -22]} />

      {/* Shared printer station */}
      <PrinterStation position={[-8, 0, -12]} rotation={[0, Math.PI / 2, 0]} />

      {/* Desks (dynamic from room layout) */}
      {desks.map((desk) => (
        <Desk
          key={desk.id}
          id={desk.id}
          position={desk.position}
          rotation={desk.rotation}
          ownerName={String(desk.config.ownerName)}
        />
      ))}
    </group>
  );
};
