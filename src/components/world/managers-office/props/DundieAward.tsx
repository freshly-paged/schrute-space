import React, { Suspense } from 'react';
import { ThrowableObject } from '../../ThrowableObject';
import { useGameAsset } from '../../../../hooks/useGameAsset';

// World-space resting position, derived from:
//   Group offset [-16, 0, 12]
//   + BossDesk local [-1, 0, 0] rotated π/2 around Y
//   + dundie offset [0.6, 1.01, 0.2] in BossDesk local space
const REST_POSITION: [number, number, number] = [-17.2, 1.01, 12.6];
const REST_ROTATION: [number, number, number] = [0, (2 * Math.PI) / 3, 0];

function DundieModel() {
  const { scene } = useGameAsset('dundie');
  return <primitive object={scene.clone()} scale={0.45} />;
}

export function DundieAward() {
  return (
    <ThrowableObject id="dundie" restPosition={REST_POSITION} restRotation={REST_ROTATION}>
      <Suspense fallback={null}>
        <DundieModel />
      </Suspense>
    </ThrowableObject>
  );
}
