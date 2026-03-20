import React from 'react';
import * as THREE from 'three';
import { FloorPlanRect } from '../../../types';
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
// Working area: X[-9, +23], Z[-9, +23] (open floor, no enclosing walls)
export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Working Area', x1: -9, z1: -9, x2: 23, z2: 23, color: '#fef9c3',
};

export const BEET_FARM_FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Beet Farm', x1: -22, z1: -22, x2: -10, z2: -10, color: '#fef3c7',
};

export const WORKING_AREA_COLLISION_BOXES: THREE.Box3[] = [
  // Beet Farm (NW corner, outside main working area)
  new THREE.Box3(new THREE.Vector3(-21, 0, -21), new THREE.Vector3(-15, 0.1, -15)),
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
