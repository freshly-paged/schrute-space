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
// Working area: X[-7, +22], Z[-9, +18] (open floor, no enclosing walls)
export const WORKING_AREA_COLLISION_BOXES: THREE.Box3[] = [
  // Beet Farm (NW corner, outside main working area)
  new THREE.Box3(new THREE.Vector3(-21, 0, -21), new THREE.Vector3(-15, 0.1, -15)),
  // Pillars
  new THREE.Box3(new THREE.Vector3(-1.3, 0, -6.3), new THREE.Vector3(-0.7, 8, -5.7)),
  new THREE.Box3(new THREE.Vector3(9.7, 0, -6.3), new THREE.Vector3(10.3, 8, -5.7)),
  new THREE.Box3(new THREE.Vector3(19.7, 0, -6.3), new THREE.Vector3(20.3, 8, -5.7)),
  new THREE.Box3(new THREE.Vector3(-1.3, 0, 7.7), new THREE.Vector3(-0.7, 8, 8.3)),
  new THREE.Box3(new THREE.Vector3(19.7, 0, 7.7), new THREE.Vector3(20.3, 8, 8.3)),
  // Printer station (world [12, 0, 12])
  new THREE.Box3(new THREE.Vector3(11.5, 0, 11.5), new THREE.Vector3(13.5, 1, 12.5)),
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
      {/* Structural pillars — placed within working area X[-7,+22], Z[-9,+18] */}
      {(
        [
          [-1,  4, -6],
          [10,  4, -6],
          [20,  4, -6],
          [-1,  4,  8],
          [20,  4,  8],
        ] as [number, number, number][]
      ).map(([x, y, z], i) => (
        <Box key={`pillar-${i}`} args={[0.4, 8, 0.4]} position={[x, y, z]}>
          <meshStandardMaterial color="#b0b8c1" />
        </Box>
      ))}

      {/* Plants — corners of working area */}
      <Plant position={[20, 0, -8]} />
      <Plant position={[-6, 0, 17]} />
      <Plant position={[20, 0, 17]} />

      {/* Printer station — south side of working area */}
      <PrinterStation position={[12, 0, 12]} rotation={[0, Math.PI / 2, 0]} />

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
