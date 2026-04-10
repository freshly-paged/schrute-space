import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FloorPlanRect } from '../../../types';
import { useGameStore } from '../../../store/useGameStore';
import { DeskItem } from '../../../types';
import { Desk } from './Desk';
import { CeilingLights } from './props/CeilingLights';
import { Plant } from '../shared/props/Plant';
import { PrinterStation } from './props/PrinterStation';
import { WORKING_AREA_BOUNDS } from '../../../officeLayout';

const _deskWorldPos = new THREE.Vector3();

// Working area occupies the open floor; bounds are defined in officeLayout.ts
export const FLOOR_PLAN_RECT: FloorPlanRect = {
  label: 'Working Area', ...WORKING_AREA_BOUNDS, color: '#fef9c3',
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
  const deskRefsMap = useRef<Map<string, THREE.Group>>(new Map());

  // Single proximity check for all desks instead of per-desk useFrame hooks
  useFrame((state) => {
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;

    const store = useGameStore.getState();
    let closestId: string | null = null;
    let closestDist = 2; // proximity threshold

    for (const desk of desks) {
      const ref = deskRefsMap.current.get(desk.id);
      if (!ref) continue;
      ref.getWorldPosition(_deskWorldPos);
      const dist = player.position.distanceTo(_deskWorldPos);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = desk.id;
      }
    }

    if (store.nearestDeskId !== closestId) {
      store.setNearestDeskId(closestId);
    }
  });

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
          ownerEmail={desk.config.ownerEmail}
          groupRef={(el) => {
            if (el) deskRefsMap.current.set(desk.id, el);
            else deskRefsMap.current.delete(desk.id);
          }}
        />
      ))}
    </group>
  );
};
