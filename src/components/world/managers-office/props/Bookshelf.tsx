import React, { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { computeFloorLift } from '../../../../utils/glbFloorLift';
import { useGlbCollision } from '../../../../hooks/useGlbCollision';

// Manager's office local-space geometry
// North wall: center at z = -7, thickness 0.3 → inner face at z = -6.85
const NORTH_WALL_INNER_Z = -6.85;

interface BookshelfProps {
  /** X position in manager's office local space (default centres on the north wall). */
  x?: number;
}

function BookshelfModel({ x = -5 }: BookshelfProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGameAsset('manager_bookshelf');

  const { cloned, yLift, zPos } = useMemo(() => {
    const cloned = scene.clone();
    // Apply scale before computing bounds so yLift and zPos are correct at render size.
    cloned.scale.setScalar(1.5);
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const yLift = -box.min.y;
    // Push the model's back face (min.z) flush against the north wall inner face.
    const zPos = NORTH_WALL_INNER_Z - box.min.z;
    return { cloned, yLift, zPos };
  }, [scene]);

  useGlbCollision('manager_bookshelf', groupRef);

  return (
    <group ref={groupRef} position={[x, yLift, zPos]}>
      <primitive object={cloned} />
    </group>
  );
}

export const Bookshelf = ({ x }: BookshelfProps) => (
  <Suspense fallback={null}>
    <BookshelfModel x={x} />
  </Suspense>
);
