import React, { Suspense } from 'react';
import { MathUtils } from 'three';
import { useGameAsset } from '../../hooks/useGameAsset';

const WORN_SCALE = 0.56 * 1.2;
/** Top-down counterclockwise yaw (~20°) relative to player facing. */
const WORN_YAW = MathUtils.degToRad(40);

function MsBodyClone() {
  const { scene } = useGameAsset('ms_body');
  return <primitive object={scene.clone()} scale={WORN_SCALE} />;
}

/**
 * Covers shoulders / upper torso and replaces the block head; torso + arms stay as primitives below.
 * Aligned with player facing via parent group rotation.
 */
export function WornMsBody() {
  return (
    <group position={[0, 1.18, 0]} rotation={[0, WORN_YAW, 0]}>
      <Suspense fallback={null}>
        <MsBodyClone />
      </Suspense>
    </group>
  );
}
