import React, { Suspense } from 'react';
import { useGameAsset, type AssetKey } from '../../hooks/useGameAsset';
import { heldThrowableIdToDisplay, type NetworkHeldThrowableId } from '../../networkThrowables';

function HeldClone({ assetKey, scale }: { assetKey: AssetKey; scale: number }) {
  const { scene } = useGameAsset(assetKey);
  return <primitive object={scene.clone()} scale={scale} />;
}

/** Renders another player's held throwable at the same offset as local `useThrowable` held phase.
 * Must live under `OtherPlayer`'s yaw group: parent already applies `rotationY`, so use local +Z forward only. */
export function OtherPlayerHeldThrowable({
  heldThrowableId,
}: {
  heldThrowableId: string | null | undefined;
}) {
  if (!heldThrowableId) return null;
  const spec = heldThrowableIdToDisplay[heldThrowableId as NetworkHeldThrowableId];
  if (!spec) return null;

  return (
    <group position={[0, 0.9, 0.6]}>
      <Suspense fallback={null}>
        <HeldClone assetKey={spec.assetKey} scale={spec.scale} />
      </Suspense>
    </group>
  );
}
