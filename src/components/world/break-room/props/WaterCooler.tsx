import React, { Suspense, useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FOCUS_ENERGY_WATER_BUFF_DURATION_MS } from '../../../../focusEnergyModel';
import { WATER_COOLER_RADIUS } from '../../../../officeLayout';
import { useGameStore } from '../../../../store/useGameStore';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { computeFloorLift } from '../../../../utils/glbFloorLift';
import { useGlbCollision } from '../../../../hooks/useGlbCollision';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

function WaterCoolerModel({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGameAsset('water_cooler');

  const { cloned, zFlush, yLift } = useMemo(() => {
    const cloned = scene.clone();
    // Apply scale before computing bounds so offsets are correct at render size.
    cloned.scale.setScalar(1.2);
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const yLift = -box.min.y;
    // Outer group sits at the north wall inner face (z=0 relative to itself).
    // Push model's back face (min.z) flush against that face.
    const zFlush = -box.min.z;
    return { cloned, zFlush, yLift };
  }, [scene]);

  useGlbCollision('water_cooler', groupRef);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={cloned} position={[0, yLift, zFlush]} />
    </group>
  );
}

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
    <group ref={groupRef} position={position}>
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
      <Suspense fallback={null}>
        <WaterCoolerModel position={[0, 0, 0]} rotation={rotation} />
      </Suspense>
    </group>
  );
};
