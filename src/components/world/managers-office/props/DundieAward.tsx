import React, { Suspense } from 'react';
import { useGameAsset } from '../../../../hooks/useGameAsset';

interface DundieAwardProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
}

function DundieModel({ position, rotation, scale }: DundieAwardProps) {
  const { scene } = useGameAsset('dundie');
  return (
    <primitive
      object={scene.clone()}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

export function DundieAward({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: DundieAwardProps) {
  return (
    <Suspense fallback={null}>
      <DundieModel position={position} rotation={rotation} scale={scale} />
    </Suspense>
  );
}
