import React from 'react';
import { Box, Cylinder } from '@react-three/drei';

export const CoffeeMachine = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <group position={position} rotation={rotation}>
    {/* Main body */}
    <Box args={[0.4, 0.55, 0.35]} position={[0, 0.275, 0]}>
      <meshStandardMaterial color="#1a1a1a" />
    </Box>
    {/* Water reservoir on top — slightly smaller translucent box */}
    <Box args={[0.32, 0.2, 0.28]} position={[0, 0.65, 0]}>
      <meshStandardMaterial color="#2d3748" transparent opacity={0.6} />
    </Box>
    {/* Nozzle/spout — small cylinder pointing downward at front-bottom */}
    <Cylinder args={[0.025, 0.025, 0.18, 8]} position={[0, 0.15, 0.21]} rotation={[Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color="#2d3748" />
    </Cylinder>
    {/* Drip tray — thin flat box below nozzle */}
    <Box args={[0.36, 0.03, 0.28]} position={[0, 0.03, 0.04]}>
      <meshStandardMaterial color="#2d3748" />
    </Box>
    {/* Control panel strip on front */}
    <Box args={[0.38, 0.1, 0.02]} position={[0, 0.42, 0.175]}>
      <meshStandardMaterial color="#2d3748" />
    </Box>
    {/* Emissive green indicator dot */}
    <Box args={[0.04, 0.04, 0.02]} position={[0.12, 0.42, 0.187]}>
      <meshStandardMaterial color="#48bb78" emissive="#48bb78" emissiveIntensity={0.8} />
    </Box>
    {/* Warming plate glow point light */}
    <pointLight
      position={[0, 0.05, 0.1]}
      intensity={0.3}
      distance={2}
      color="#ff8c00"
    />
  </group>
);
