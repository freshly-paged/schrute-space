import React from 'react';
import { Box, Cylinder, Text } from '@react-three/drei';

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
    <Cylinder
      args={[0.07, 0.07, 0.14, 12]}
      position={[-0.8, 1.08, -0.3]}
    >
      <meshStandardMaterial color="#1565C0" />
    </Cylinder>
    <Text
      position={[-0.8, 1.28, -0.3]}
      fontSize={0.06}
      color="#ffffff"
      anchorX="center"
      anchorY="bottom"
    >
      {"World's\nBest Boss"}
    </Text>

    {/* Nameplate base */}
    <Box args={[0.6, 0.05, 0.15]} position={[0, 0.985, 0.6]}>
      <meshStandardMaterial color="#f5f5dc" />
    </Box>
    {/* Nameplate text */}
    <Text
      position={[0, 1.05, 0.62]}
      fontSize={0.08}
      color="#333333"
      anchorX="center"
      anchorY="bottom"
    >
      {ownerName}
    </Text>
  </group>
);
