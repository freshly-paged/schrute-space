import React from 'react';
import { Box, Text } from '@react-three/drei';

const SNACK_COLORS = [
  '#e53e3e', '#dd6b20', '#d69e2e', '#38a169',
  '#3182ce', '#805ad5', '#d53f8c', '#e53e3e',
  '#38a169', '#dd6b20', '#3182ce', '#d69e2e',
];

export const VendingMachine = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Main body */}
    <Box args={[0.8, 2, 0.5]} position={[0, 1, 0]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>
    {/* Front glass panel — semi-transparent blue tint */}
    <Box args={[0.65, 1.4, 0.02]} position={[0, 1.1, 0.255]}>
      <meshStandardMaterial color="#bee3f8" transparent opacity={0.45} />
    </Box>
    {/* Snack grid behind glass: 3 columns x 4 rows */}
    {[0, 1, 2, 3].map((row) =>
      [0, 1, 2].map((col) => {
        const colorIndex = row * 3 + col;
        const xOffset = (col - 1) * 0.18;
        const yOffset = 1.6 - row * 0.33;
        return (
          <Box
            key={`snack-${row}-${col}`}
            args={[0.12, 0.1, 0.06]}
            position={[xOffset, yOffset, 0.22]}
          >
            <meshStandardMaterial color={SNACK_COLORS[colorIndex]} />
          </Box>
        );
      })
    )}
    {/* Coin slot — thin horizontal box on front */}
    <Box args={[0.12, 0.02, 0.04]} position={[0.28, 0.55, 0.255]}>
      <meshStandardMaterial color="#718096" />
    </Box>
    {/* Retrieval tray at bottom */}
    <Box args={[0.55, 0.1, 0.15]} position={[0, 0.12, 0.18]}>
      <meshStandardMaterial color="#a0aec0" />
    </Box>
    {/* Brand label text */}
    <Text
      position={[0, 1.85, 0.262]}
      fontSize={0.1}
      color="#2d3748"
      anchorX="center"
      anchorY="middle"
    >
      Vend-O-Matic
    </Text>
  </group>
);
