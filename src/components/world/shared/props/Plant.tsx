import React from 'react';
import { Cylinder, Sphere } from '@react-three/drei';

export const Plant = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Terracotta pot */}
    <Cylinder args={[0.2, 0.25, 0.3, 8]} position={[0, 0.15, 0]}>
      <meshStandardMaterial color="#c1440e" />
    </Cylinder>
    {/* Foliage sphere sitting just above pot rim */}
    <Sphere args={[0.35, 8, 8]} position={[0, 0.55, 0]}>
      <meshStandardMaterial color="#2d7a2d" />
    </Sphere>
  </group>
);
