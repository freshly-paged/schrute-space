import React from 'react';
import * as THREE from 'three';
import { Box, Cylinder } from '@react-three/drei';
import { BOSS_DESK_WOOD_COLOR } from '../../../../officeTheme';

interface BossDeskProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  ownerName?: string;
}

// Dark polished tabletop — differentiated from the drawer pedestals
const topMat = new THREE.MeshStandardMaterial({ color: '#5C2D14', roughness: 0.25, metalness: 0.05 });
// Lighter oak pedestal base
const baseMat = new THREE.MeshStandardMaterial({ color: BOSS_DESK_WOOD_COLOR, roughness: 0.7, metalness: 0 });
// Dark groove for drawer dividers
const grooveMat = new THREE.MeshStandardMaterial({ color: '#1a0c06' });
// Brushed gold drawer pulls
const pullMat = new THREE.MeshStandardMaterial({ color: '#c4a045', metalness: 0.8, roughness: 0.2 });

// Pedestal front face sits at z = -0.6; grooves/pulls protrude just past it
const FZ = -0.62;
const PULL_Z = -0.65;

// 3 evenly-spaced drawer dividers → 3 drawers per pedestal (heights divide 0–0.95)
const GROOVE_YS = [0.32, 0.63] as const;
// Drawer centre Y values (midpoint of each section)
const DRAWER_CY = [0.16, 0.475, 0.79] as const;

function PedestalDrawers({ cx }: { cx: number }) {
  return (
    <>
      {/* Horizontal divider grooves */}
      {GROOVE_YS.map((y) => (
        <Box key={y} args={[0.44, 0.025, 0.02]} position={[cx, y, FZ]} material={grooveMat} />
      ))}

      {/* Drawer pulls — one centred on each drawer face */}
      {DRAWER_CY.map((cy) => (
        <Box key={cy} args={[0.14, 0.035, 0.03]} position={[cx, cy, PULL_Z]} material={pullMat} />
      ))}
    </>
  );
}

export const BossDesk = ({ position, rotation = [0, 0, 0], ownerName = '' }: BossDeskProps) => (
  <group position={position} rotation={rotation}>
    {/* Thick executive tabletop — dark colour to differentiate from pedestals */}
    <Box args={[3.0, 0.16, 1.5]} position={[0, 0.97, 0]} material={topMat} />

    {/* Left pedestal (drawer unit) */}
    <Box args={[0.6, 0.95, 1.2]} position={[-1.1, 0.475, 0]} material={baseMat} />
    <PedestalDrawers cx={-1.1} />

    {/* Right pedestal (drawer unit) */}
    <Box args={[0.6, 0.95, 1.2]} position={[1.1, 0.475, 0]} material={baseMat} />
    <PedestalDrawers cx={1.1} />

    {/* "World's Best Boss" mug */}
    <Cylinder args={[0.07, 0.07, 0.14, 12]} position={[-0.8, 1.12, -0.3]}>
      <meshStandardMaterial color="#1565C0" />
    </Cylinder>
  </group>
);
