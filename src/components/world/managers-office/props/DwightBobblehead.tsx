import React, { Suspense } from 'react';
import { ThrowableObject } from '../../ThrowableObject';
import { useGameAsset } from '../../../../hooks/useGameAsset';

// World-space resting position, derived from:
//   Group offset [-16, 0, 12]
//   + BossDesk local [-1, 0, 0] rotated π/2 around Y
//   + bobblehead offset [-0.5, 1.01, -0.4] in BossDesk local space
//     → rotated π/2: x' = 0.4, z' = -0.5
//     → world: [-17 + 0.4, 1.01, 12 + (-0.5)] = [-16.6, 1.01, 11.5]
const REST_POSITION: [number, number, number] = [-16.6, 1.01, 11.5];
const REST_ROTATION: [number, number, number] = [0, Math.PI * 0.75, 0];

function DwightBobbleheadModel() {
  const { scene } = useGameAsset('dwight_bobblehead');
  return <primitive object={scene.clone()} scale={0.45} />;
}

export function DwightBobblehead() {
  return (
    <ThrowableObject
      id="dwight_bobblehead"
      label="Dwight Bobblehead"
      description="A limited-edition collectible in the exact likeness of Dwight K. Schrute — Assistant Regional Manager, beet farmer, and volunteer sheriff's deputy. The head bobs in silent agreement with everything Michael says. Bears an unsettling resemblance to the real thing."
      assetKey="dwight_bobblehead"
      restPosition={REST_POSITION}
      restRotation={REST_ROTATION}
    >
      <Suspense fallback={null}>
        <DwightBobbleheadModel />
      </Suspense>
    </ThrowableObject>
  );
}
