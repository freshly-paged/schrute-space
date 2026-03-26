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

interface ThrowableObjectProps {
  id: string;
  restPosition: [number, number, number];
  restRotation?: [number, number, number];
  proximityRadius?: number;
  children: React.ReactNode;
}

export function ThrowableObject({
  id,
  restPosition,
  restRotation,
  proximityRadius,
  children,
}: ThrowableObjectProps) {
  const { groupRef, phase, isNear } = useThrowable({ id, restPosition, restRotation, proximityRadius });

  return (
    <group ref={groupRef}>
      {children}

      {phase === 'idle' && isNear && (
        <Billboard position={[0, 0.75, 0]}>
          <Text
            fontSize={0.22}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="black"
          >
            [E] Pick Up
          </Text>
        </Billboard>
      )}

      {phase === 'held' && (
        <Billboard position={[0, 0.75, 0]}>
          <Text
            fontSize={0.22}
            color="#FFD700"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="black"
          >
            [E] Throw
          </Text>
        </Billboard>
      )}
    </group>
  );
}
