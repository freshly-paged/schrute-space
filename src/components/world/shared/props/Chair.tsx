import React from 'react';
import { Box } from '@react-three/drei';

export const Chair = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Seat */}
    <Box args={[0.6, 0.1, 0.6]} position={[0, 0.45, 0]}>
      <meshStandardMaterial color="#222" />
    </Box>
    {/* Backrest */}
    <Box args={[0.6, 0.8, 0.1]} position={[0, 0.8, -0.25]}>
      <meshStandardMaterial color="#222" />
    </Box>
    {/* Column */}
    <Box args={[0.1, 0.4, 0.1]} position={[0, 0.2, 0]}>
      <meshStandardMaterial color="#333" />
    </Box>
    {/* Base */}
    <Box args={[0.5, 0.05, 0.5]} position={[0, 0.025, 0]}>
      <meshStandardMaterial color="#333" />
    </Box>
  </group>
);
