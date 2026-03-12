import React from 'react';
import { Box, Sphere, Text } from '@react-three/drei';

export const Banner = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    <Box args={[4, 0.8, 0.05]} position={[0, 0, 0]}>
      <meshStandardMaterial color="white" />
    </Box>
    <Text position={[0, 0, 0.03]} fontSize={0.3} color="black" anchorX="center" anchorY="middle">
      IT IS THE OFFICE
    </Text>
    {/* Sad balloons (brown, grey, black) */}
    {[
      { pos: [-1.8, -0.3, 0] as [number, number, number], color: '#5D4037' },
      { pos: [1.8, -0.3, 0] as [number, number, number], color: '#333' },
      { pos: [0, -0.5, 0] as [number, number, number], color: '#777' },
    ].map(({ pos, color }) => (
      <group key={color} position={pos}>
        <Sphere args={[0.12, 16, 16]}>
          <meshStandardMaterial color={color} />
        </Sphere>
        <Box args={[0.01, 0.4, 0.01]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#888" />
        </Box>
      </group>
    ))}
  </group>
);
