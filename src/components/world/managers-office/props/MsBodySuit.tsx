import React, { Suspense } from 'react';
import { ThrowableObject } from '../../ThrowableObject';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { MS_BODY_THROWABLE_ID } from '../../../../propIds';

// World space — on top of the manager's bookshelf.
// Bookshelf is at office-local x=-5, flushed against north wall (office-local z≈-6.85).
// Group offset [-16, 0, 12] → world x=-21, world z≈5.3.
// Adjust REST_POSITION[1] (y) if the bookshelf GLB height differs from this estimate.
const REST_POSITION: [number, number, number] = [-21, 2.05, 5.5];
const REST_ROTATION: [number, number, number] = [0, Math.PI / 4, 0];

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
