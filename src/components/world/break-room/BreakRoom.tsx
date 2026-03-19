import React from 'react';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';

export const BREAK_ROOM_COLLISION_BOXES = [
  new THREE.Box3(new THREE.Vector3(-15.5, 0, 14.5), new THREE.Vector3(-14.5, 2, 15.5)),
];

export const BreakRoom = () => (
  <group position={[-15, 0, 15]}>
    <Box args={[1, 2, 1]} position={[0, 1, 0]}>
      <meshStandardMaterial color="white" />
    </Box>
    <Text position={[0, 2.5, 0]} fontSize={0.5} color="black">
      Break Room
    </Text>
  </group>
);
