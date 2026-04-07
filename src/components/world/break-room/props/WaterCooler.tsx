import React, { useRef } from 'react';
import { Box, Cylinder, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FOCUS_ENERGY_WATER_BUFF_DURATION_MS } from '../../../../focusEnergyModel';
import { WATER_COOLER_RADIUS } from '../../../../officeLayout';
import { useGameStore } from '../../../../store/useGameStore';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

export const WaterCooler = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const wasNearRef = useRef(false);
  const worldPos = useRef(new THREE.Vector3());
  const nearWaterCooler = useGameStore((s) => s.nearWaterCooler);

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
    const near = dist < WATER_COOLER_RADIUS;

    const gs = useGameStore.getState();
    if (near && !wasNearRef.current) {
      gs.setWaterBuffExpiresAt(Date.now() + FOCUS_ENERGY_WATER_BUFF_DURATION_MS);
    }
    wasNearRef.current = near;

    if (near !== gs.nearWaterCooler) {
      gs.setNearWaterCooler(near);
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {nearWaterCooler && (
        <Billboard position={[0, 2.1, 0]}>
          <Text
            fontSize={0.2}
            color="#7dd3fc"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            Water cooler gossip time
          </Text>
        </Billboard>
      )}
      {/* Main body cylinder */}
      <Cylinder args={[0.2, 0.22, 0.9, 12]} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#cdd9e5" />
      </Cylinder>
      {/* Water bottle (inverted cone shape — use a cylinder narrowing upward) */}
      <Cylinder args={[0.12, 0.18, 0.5, 12]} position={[0, 1.15, 0]}>
        <meshStandardMaterial color="#6ab4e8" transparent opacity={0.7} />
      </Cylinder>
      {/* Water bottle cap/top */}
      <Cylinder args={[0.05, 0.12, 0.05, 12]} position={[0, 1.42, 0]}>
        <meshStandardMaterial color="#6ab4e8" transparent opacity={0.7} />
      </Cylinder>
      {/* Water surface plane inside the top of the body */}
      <Box args={[0.35, 0.02, 0.35]} position={[0, 0.92, 0]}>
        <meshStandardMaterial color="#a8d4f0" transparent opacity={0.8} />
      </Box>
      {/* Hot button (red) */}
      <Box args={[0.06, 0.06, 0.04]} position={[-0.08, 0.3, 0.23]}>
        <meshStandardMaterial color="#e53e3e" />
      </Box>
      {/* Cold button (blue) */}
      <Box args={[0.06, 0.06, 0.04]} position={[0.08, 0.3, 0.23]}>
        <meshStandardMaterial color="#3182ce" />
      </Box>
      {/* Drip tray base */}
      <Box args={[0.5, 0.04, 0.3]} position={[0, 0.1, 0.1]}>
        <meshStandardMaterial color="#a0aec0" />
      </Box>
    </group>
  );
};
