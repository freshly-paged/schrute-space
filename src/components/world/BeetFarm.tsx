import React, { useMemo } from 'react';
import { Box, Plane, Text } from '@react-three/drei';

export const BeetFarm = ({ position }: { position: [number, number, number] }) => {
  const beets = useMemo(() => {
    const items: [number, number, number][] = [];
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        items.push([x, 0.1, z]);
      }
    }
    return items;
  }, []);

  return (
    <group position={position}>
      <Plane args={[6, 6]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#3d2b1f" />
      </Plane>
      {beets.map((pos, i) => (
        <group key={i} position={pos}>
          <Box args={[0.3, 0.3, 0.3]} position={[0, 0.1, 0]}>
            <meshStandardMaterial color="#7a0019" />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[0, 0.3, 0]}>
            <meshStandardMaterial color="#2d5a27" />
          </Box>
        </group>
      ))}
      <Text position={[0, 1.5, 0]} fontSize={0.4} color="white">
        Schrute Beet Farm
      </Text>
    </group>
  );
};
