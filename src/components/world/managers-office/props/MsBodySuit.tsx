import React, { Suspense } from 'react';
import { ThrowableObject } from '../../ThrowableObject';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { MS_BODY_THROWABLE_ID } from '../../../../propIds';

// World space — on BossDesk tabletop (same room group [-16,0,12], desk at [-1,0,0] rot π/2).
// Between mug and Dundie area, slightly toward the visitor side.
const REST_POSITION: [number, number, number] = [-16.85, 1.02, 12.35];
const REST_ROTATION: [number, number, number] = [0, (2 * Math.PI) / 3, 0];

function MsBodyDeskModel() {
  const { scene } = useGameAsset('ms_body');
  return <primitive object={scene.clone()} scale={0.4} />;
}

export function MsBodySuit() {
  return (
    <ThrowableObject
      id={MS_BODY_THROWABLE_ID}
      label="Michael Suit"
      description="The Regional Manager look. Not everyone can pull off this much polyester confidence."
      assetKey="ms_body"
      restPosition={REST_POSITION}
      restRotation={REST_ROTATION}
      wearable
    >
      <Suspense fallback={null}>
        <MsBodyDeskModel />
      </Suspense>
    </ThrowableObject>
  );
}
