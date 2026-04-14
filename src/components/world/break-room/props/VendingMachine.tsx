import React, { useRef } from 'react';
import { Box, Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VENDING_MACHINE_RADIUS } from '../../../../officeLayout';
import { useGameStore } from '../../../../store/useGameStore';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

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
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const worldPos = useRef(new THREE.Vector3());
  const nearVendingMachine = useGameStore((s) => s.nearVendingMachine);

  useFrame((state) => {
    if (!groupRef.current) return;
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;

    groupRef.current.getWorldPosition(worldPos.current);
    const px = player.position.x;
    const pz = player.position.z;
    const dx = px - worldPos.current.x;
    const dz = pz - worldPos.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const near = dist < VENDING_MACHINE_RADIUS;

    const gs = useGameStore.getState();
    if (near !== gs.nearVendingMachine) {
      gs.setNearVendingMachine(near);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {nearVendingMachine && (
        <Billboard position={[0, 4.4, 0]}>
          <Text
            fontSize={0.2}
            color="#a78bfa"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            [E] Browse snacks
          </Text>
        </Billboard>
      )}
      {/* Main body */}
      <Box args={[1.6, 4, 1.0]} position={[0, 2, 0]}>
        <meshStandardMaterial color="#e2e8f0" />
      </Box>
      {/* Front glass panel — semi-transparent blue tint */}
      <Box args={[1.3, 2.8, 0.06]} position={[0, 2.2, 0.47]}>
        <meshStandardMaterial color="#bee3f8" transparent opacity={0.45} />
      </Box>
      {/* Snack grid behind glass: 3 columns x 4 rows (well behind glass to avoid z-fighting) */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2].map((col) => {
          const colorIndex = row * 3 + col;
          const xOffset = (col - 1) * 0.36;
          const yOffset = 3.2 - row * 0.66;
          return (
            <Box
              key={`snack-${row}-${col}`}
              args={[0.24, 0.2, 0.12]}
              position={[xOffset, yOffset, 0.28]}
            >
              <meshStandardMaterial color={SNACK_COLORS[colorIndex]} />
            </Box>
          );
        })
      )}
      {/* Coin slot — thin horizontal box on front */}
      <Box args={[0.24, 0.04, 0.08]} position={[0.56, 1.1, 0.51]}>
        <meshStandardMaterial color="#718096" />
      </Box>
      {/* Retrieval tray at bottom */}
      <Box args={[1.1, 0.2, 0.3]} position={[0, 0.24, 0.36]}>
        <meshStandardMaterial color="#a0aec0" />
      </Box>
      {/* Brand label text */}
      <Text
        position={[0, 3.7, 0.524]}
        fontSize={0.2}
        color="#2d3748"
        anchorX="center"
        anchorY="middle"
      >
        Vend-O-Matic
      </Text>
    </group>
  );
};
