/**
 * ThrowableObject — generic wrapper that makes any 3D prop pick-up-able and throwable.
 *
 * Example:
 *   <ThrowableObject id="stapler" restPosition={[2, 1, -3]}>
 *     <Suspense fallback={null}>
 *       <StaplerModel />
 *     </Suspense>
 *   </ThrowableObject>
 *
 * The player interaction ([E] to pick up / throw) is wired automatically.
 * Add the object's ID to useGameAsset's ASSETS map for GLB loading.
 */

import React from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useThrowable } from '../../hooks/useThrowable';
import { onOverlayTextSync } from '../../utils/overlayTextSync';

interface ThrowableObjectProps {
  id: string;
  label?: string;
  description?: string;
  assetKey?: string;
  restPosition: [number, number, number];
  restRotation?: [number, number, number];
  proximityRadius?: number;
  /** Upper-body wearables: [E] while held equips; [G] puts down (no throw). */
  wearable?: boolean;
  children: React.ReactNode;
}

export function ThrowableObject({
  id,
  label,
  description,
  assetKey,
  restPosition,
  restRotation,
  proximityRadius,
  wearable,
  children,
}: ThrowableObjectProps) {
  const { groupRef, phase, isNear } = useThrowable({
    id,
    label,
    description,
    assetKey,
    restPosition,
    restRotation,
    proximityRadius,
    wearable,
  });

  return (
    <group ref={groupRef}>
      {children}

      {/* Object name — visible when nearby (idle) or while held */}
      {label && (isNear || phase === 'held') && (
        <Billboard position={[0, 0.75, 0]}>
          <Text
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="black"
            onSync={onOverlayTextSync}
          >
            {label}
          </Text>
        </Billboard>
      )}

      {/* Interaction prompt — shown below the label when in range or held */}
      {phase === 'idle' && isNear && (
        <Billboard position={[0, 0.5, 0]}>
          <Text
            fontSize={0.18}
            color="#aaaaaa"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
            onSync={onOverlayTextSync}
          >
            [E] Pick Up    [F] Inspect
          </Text>
        </Billboard>
      )}

      {phase === 'held' && (
        <Billboard position={[0, 0.5, 0]}>
          <Text
            fontSize={0.18}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="black"
            onSync={onOverlayTextSync}
          >
            {wearable ? '[E] Wear    [G] Put Down' : '[E] Put Down    [G] Throw'}
          </Text>
        </Billboard>
      )}
    </group>
  );
}
