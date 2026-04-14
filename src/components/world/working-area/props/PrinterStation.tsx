import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { computeFloorLift } from '../../../../utils/glbFloorLift';
import { useGlbCollision } from '../../../../hooks/useGlbCollision';
import { useGameStore } from '../../../../store/useGameStore';
import { COPIER_RADIUS } from '../../../../officeLayout';
import { COPIER_MAX_COPIES } from '../../../../gameConfig';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * CopierModel renders inside the Suspense boundary (after the GLB has loaded).
 * It owns the world-positioned group so useGlbCollision gets accurate world-space bounds.
 */
function CopierModel({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const worldPos = useRef(new THREE.Vector3());
  const nearRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const { scene } = useGameAsset('copier');
  const { cloned, yLift } = useMemo(() => {
    const cloned = scene.clone();
    return { cloned, yLift: computeFloorLift(cloned) };
  }, [scene]);

  useGlbCollision('copier', groupRef);

  const nearCopier = useGameStore((s) => s.nearCopier);
  const copierCopiesUsed = useGameStore((s) => s.copierCopiesUsed);
  const copierCooldownUntil = useGameStore((s) => s.copierCooldownUntil);

  // Proximity detection
  useFrame((state) => {
    const player = state.scene.getObjectByName('localPlayer');
    if (!groupRef.current || !player) return;

    groupRef.current.getWorldPosition(worldPos.current);
    const dx = player.position.x - worldPos.current.x;
    const dz = player.position.z - worldPos.current.z;
    const near = Math.sqrt(dx * dx + dz * dz) < COPIER_RADIUS;

    const gs = useGameStore.getState();
    if (near !== gs.nearCopier) {
      gs.setNearCopier(near);
    }
    nearRef.current = near;

    // Tick the display while near so the countdown updates
    if (near) forceUpdate((n) => n + 1);
  });

  // [E] key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || !nearRef.current) return;
      const gs = useGameStore.getState();
      // Don't intercept if another interaction already owns [E]
      if (gs.isTimerActive || gs.isChatFocused || gs.showVendingMenu) return;
      gs.useCopierCopy();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Billboard label logic
  const now = Date.now();
  const effectiveCopies =
    copierCooldownUntil > 0 && now >= copierCooldownUntil ? 0 : copierCopiesUsed;
  const onCooldown = copierCooldownUntil > 0 && now < copierCooldownUntil;
  const copiesLeft = COPIER_MAX_COPIES - effectiveCopies;
  const isReset = onCooldown && effectiveCopies >= COPIER_MAX_COPIES;

  let promptLine: string;
  let promptColor: string;
  if (isReset) {
    promptLine = `Out of copies — resets in ${formatMs(copierCooldownUntil - now)}`;
    promptColor = '#f87171';
  } else if (onCooldown) {
    promptLine = `Cooling down… ${formatMs(copierCooldownUntil - now)} (${copiesLeft} left)`;
    promptColor = '#fde68a';
  } else {
    promptLine = `[E] Double your papers (${copiesLeft}/${COPIER_MAX_COPIES} left)`;
    promptColor = '#86efac';
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {nearCopier && (
        <Billboard position={[0, 2.2, 0]}>
          <Text
            fontSize={0.2}
            color={promptColor}
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            {promptLine}
          </Text>
        </Billboard>
      )}
      <primitive object={cloned} position={[0, yLift, 0]} />
    </group>
  );
}

export const PrinterStation = ({
  position,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) => (
  <Suspense fallback={null}>
    <CopierModel position={position} rotation={rotation} />
  </Suspense>
);
