import React from 'react';
import { Box } from '@react-three/drei';

export const PrinterStation = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Cart / base table */}
    <Box args={[0.9, 0.75, 0.55]} position={[0, 0.375, 0]}>
      <meshStandardMaterial color="#888888" />
    </Box>
    {/* Printer body on top of cart */}
    <Box args={[0.75, 0.3, 0.45]} position={[0, 0.9, 0]}>
      <meshStandardMaterial color="#d4d4d4" />
    </Box>
    {/* Paper tray — thin flat box protruding from the front */}
    <Box args={[0.55, 0.03, 0.25]} position={[0, 0.8, 0.35]}>
      <meshStandardMaterial color="#ffffff" />
    </Box>
    {/* Paper stack detail — a few slightly fanned thin white sheets */}
    <Box args={[0.48, 0.015, 0.18]} position={[0, 0.83, 0.35]}>
      <meshStandardMaterial color="#f8f8f8" />
    </Box>
    <Box args={[0.46, 0.015, 0.17]} position={[0.01, 0.845, 0.35]} rotation={[0, 0.04, 0]}>
      <meshStandardMaterial color="#f5f5f5" />
    </Box>
    <Box args={[0.44, 0.015, 0.16]} position={[-0.01, 0.86, 0.35]} rotation={[0, -0.04, 0]}>
      <meshStandardMaterial color="#f0f0f0" />
    </Box>
  </group>
);
