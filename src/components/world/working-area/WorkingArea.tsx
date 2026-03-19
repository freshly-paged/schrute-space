import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';
import { DeskItem } from '../../../types';
import { Desk } from './Desk';
import { BeetFarm } from './props/BeetFarm';
import { Banner } from '../shared/props/Banner';

export const WORKING_AREA_COLLISION_BOXES = [
  // Beet Farm
  new THREE.Box3(new THREE.Vector3(-21, 0, -21), new THREE.Vector3(-15, 0.1, -15)),
];

export const WorkingArea = () => {
  const desks = useGameStore((s) => s.roomLayout).filter((f): f is DeskItem => f.type === 'desk');

  return (
    <group>
      {desks.map((desk) => (
        <Desk
          key={desk.id}
          id={desk.id}
          position={desk.position}
          rotation={desk.rotation}
          ownerName={String(desk.config.ownerName)}
        />
      ))}
      <Banner position={[-3.5, 6, -6]} />
      <BeetFarm position={[-18, 0, -18]} />
    </group>
  );
};
