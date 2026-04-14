import React, { Suspense, useMemo, useRef } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VENDING_MACHINE_RADIUS } from '../../../../officeLayout';
import { useGameStore } from '../../../../store/useGameStore';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { useGlbCollision } from '../../../../hooks/useGlbCollision';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

function VendingMachineModel({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGameAsset('ice_cream_vending_machine');

  const { cloned, yLift, zFlush } = useMemo(() => {
    const cloned = scene.clone();
    cloned.scale.setScalar(1.5);
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const yLift = -box.min.y;
    // With rotation [0, -π/2, 0]: model local -z → room local +x (east direction).
    // East wall inner face at break-room local x=16.85, group at x=16.5 → gap = 0.35.
    // room_x of model east face = group_x - model_z - zFlush = 16.5 - box.min.z - zFlush
    // Set equal to 16.85: zFlush = 16.5 - box.min.z - 16.85 = -0.35 - box.min.z
    const zFlush = -0.35 - box.min.z;
    return { cloned, yLift, zFlush };
  }, [scene]);

  useGlbCollision('ice_cream_vending_machine', groupRef);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <primitive object={cloned} position={[0, yLift, zFlush]} />
    </group>
  );
}

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
    <group ref={groupRef} position={position}>
      {nearVendingMachine && (
        <Billboard position={[0, 3.2, 0]}>
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
      <Suspense fallback={null}>
        <VendingMachineModel position={[0, 0, 0]} rotation={rotation} />
      </Suspense>
    </group>
  );
};
