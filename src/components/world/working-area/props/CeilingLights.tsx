import React from 'react';
import * as THREE from 'three';
import { Box } from '@react-three/drei';

// Grid of fluorescent ceiling light fixtures across the working area
const LIGHT_POSITIONS: [number, number, number][] = [
  [-15, 7.9, -20],
  [-5,  7.9, -20],
  [ 5,  7.9, -20],
  [-15, 7.9, -10],
  [-5,  7.9, -10],
  [ 5,  7.9, -10],
  [-15, 7.9,   0],
  [ 5,  7.9,   0],
];

const fixtureMat = new THREE.MeshStandardMaterial({
  color: '#ffffff',
  emissive: new THREE.Color('#fffaee'),
  emissiveIntensity: 0.4,
});

export const CeilingLights = () => (
  <group>
    {LIGHT_POSITIONS.map(([x, y, z], i) => (
      <group key={i} position={[x, y, z]}>
        <Box args={[2, 0.05, 0.4]} material={fixtureMat} />
        <pointLight
          color="#fffaee"
          intensity={0.8}
          distance={12}
          position={[0, -0.1, 0]}
        />
      </group>
    ))}
  </group>
);
