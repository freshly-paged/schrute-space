import React, { Suspense } from 'react';
import { ThrowableObject } from '../../ThrowableObject';
import { useGameAsset } from '../../../../hooks/useGameAsset';

// World-space resting position, derived from:
//   Group offset [-16, 0, 12]
//   + BossDesk local [-1, 0, 0] rotated π/2 around Y
//   + detector offset [-0.5, 1.01, 0.3] in BossDesk local space
//     → rotated π/2: x' = -z = -0.3, z' = x = -0.5
//     → world: [-17 + (-0.3), 1.01, 12 + (-0.5)] = [-17.3, 1.01, 11.5]
const REST_POSITION: [number, number, number] = [-17.3, 1.01, 11.5];
const REST_ROTATION: [number, number, number] = [0, Math.PI * 0.25, 0];

function NuclearLaunchDetectorModel() {
  const { scene } = useGameAsset('nuclear_launch_detector');
  return <primitive object={scene.clone()} scale={0.45} />;
}

export function NuclearLaunchDetector() {
  return (
    <ThrowableObject
      id="nuclear_launch_detector"
      label="Nuclear Launch Detector"
      description="A highly classified device that Michael insists is 'totally real and not from a gift shop.' It has one big red button labeled DO NOT PRESS, which Michael has pressed seventeen times."
      assetKey="nuclear_launch_detector"
      restPosition={REST_POSITION}
      restRotation={REST_ROTATION}
    >
      <Suspense fallback={null}>
        <NuclearLaunchDetectorModel />
      </Suspense>
    </ThrowableObject>
  );
}
