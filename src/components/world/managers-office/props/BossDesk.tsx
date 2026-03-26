import React from 'react';
import { Box, Cylinder } from '@react-three/drei';

interface BossDeskProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  ownerName?: string;
}

export const BossDesk = ({ position, rotation = [0, 0, 0], ownerName = '' }: BossDeskProps) => (
  <group position={position} rotation={rotation}>
    {/* Main tabletop */}
    <Box args={[2.8, 0.12, 1.4]} position={[0, 0.95, 0]}>
      <meshStandardMaterial color="#3E2723" />
    </Box>

    {/* 4 chunky legs */}
    <Box args={[0.15, 0.95, 0.15]} position={[-1.3, 0.475, -0.6]}>
      <meshStandardMaterial color="#4E342E" />
    </Box>
    <Box args={[0.15, 0.95, 0.15]} position={[1.3, 0.475, -0.6]}>
      <meshStandardMaterial color="#4E342E" />
    </Box>
    <Box args={[0.15, 0.95, 0.15]} position={[-1.3, 0.475, 0.6]}>
      <meshStandardMaterial color="#4E342E" />
    </Box>
    <Box args={[0.15, 0.95, 0.15]} position={[1.3, 0.475, 0.6]}>
      <meshStandardMaterial color="#4E342E" />
    </Box>

    {/* Return / side extension attached at right end */}
    <Box args={[1.2, 0.12, 0.8]} position={[2.0, 0.95, -0.3]}>
      <meshStandardMaterial color="#3E2723" />
    </Box>

    {/* "World's Best Boss" mug */}
    <Cylinder args={[0.07, 0.07, 0.14, 12]} position={[-0.8, 1.08, -0.3]}>
      <meshStandardMaterial color="#1565C0" />
    </Cylinder>

  </group>
);
