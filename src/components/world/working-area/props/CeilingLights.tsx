import React from 'react';
import * as THREE from 'three';
import { Box } from '@react-three/drei';

// 3×3 grid — 9 point lights is well within the safe shader threshold
const GRID_XS = [-13, 0, 13];
const GRID_ZS = [-13, 0, 13];

const housingMat = new THREE.MeshStandardMaterial({ color: '#d4d0ca' });
const tubeMat = new THREE.MeshStandardMaterial({
  color: '#fffaf2',
  emissive: new THREE.Color('#fff8ee'),
  emissiveIntensity: 1.6,
});

interface CeilingLightsProps {
  ceilingY: number;
}

export const CeilingLights = ({ ceilingY }: CeilingLightsProps) => {
  const fixtureY = ceilingY - 0.04;
  return (
    <group>
      {GRID_XS.flatMap((x) =>
        GRID_ZS.map((z) => (
          <group key={`cl-${x}-${z}`} position={[x, fixtureY, z]}>
            {/* Housing panel */}
            <Box args={[3.8, 0.07, 0.55]} material={housingMat} />
            {/* Tube 1 */}
            <Box args={[3.5, 0.04, 0.1]} position={[0, 0, -0.14]} material={tubeMat} />
            {/* Tube 2 */}
            <Box args={[3.5, 0.04, 0.1]} position={[0, 0, 0.14]} material={tubeMat} />
          </group>
        ))
      )}
    </group>
  );
};
