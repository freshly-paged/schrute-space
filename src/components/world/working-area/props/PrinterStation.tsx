import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useGameAsset } from '../../../../hooks/useGameAsset';
import { computeFloorLift } from '../../../../utils/glbFloorLift';
import { useGlbCollision } from '../../../../hooks/useGlbCollision';
import { useGameStore } from '../../../../store/useGameStore';
import { COPIER_RADIUS } from '../../../../officeLayout';
import { COPIER_MAX_COPIES, COPIER_JOB_DURATION_MS } from '../../../../gameConfig';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

function formatMs(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatHours(ms: number): string {
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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
  const [tick, setTick] = useState(0);

  const { scene } = useGameAsset('copier');
  const { cloned, yLift } = useMemo(() => {
    const cloned = scene.clone();
    return { cloned, yLift: computeFloorLift(cloned) };
  }, [scene]);

  useGlbCollision('copier', groupRef);

  const nearCopier = useGameStore((s) => s.nearCopier);
  const copierCopiesUsed = useGameStore((s) => s.copierCopiesUsed);
  const copierCooldownUntil = useGameStore((s) => s.copierCooldownUntil);
  const copierJobStartedAt = useGameStore((s) => s.copierJobStartedAt);

  // Proximity detection + job management
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

    // If a job is in progress and the player walked away, cancel it
    if (gs.copierJobStartedAt !== null && !near) {
      gs.cancelCopierJob();
    }

    // If a job is in progress and the timer has elapsed, complete it
    if (gs.copierJobStartedAt !== null && near) {
      const elapsed = Date.now() - gs.copierJobStartedAt;
      if (elapsed >= COPIER_JOB_DURATION_MS) {
        gs.completeCopierJob();
      }
    }

    // Tick the display while near so the countdown / progress updates
    if (near || gs.copierJobStartedAt !== null) setTick((n) => n + 1);
  });

  // [E] key handler — start a job
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyE' || !nearRef.current) return;
      const gs = useGameStore.getState();
      // Don't intercept if another interaction already owns [E]
      if (gs.isTimerActive || gs.isChatFocused || gs.showVendingMenu) return;
      gs.startCopierJob();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- Billboard label logic ---
  const now = Date.now();

  // If the daily lock has expired, treat copies as reset
  const effectiveCopies =
    copierCooldownUntil > 0 && now >= copierCooldownUntil ? 0 : copierCopiesUsed;
  const lockedForDay = copierCooldownUntil > 0 && now < copierCooldownUntil && effectiveCopies >= COPIER_MAX_COPIES;
  const copiesLeft = COPIER_MAX_COPIES - effectiveCopies;

  // In-progress job state
  const jobActive = copierJobStartedAt !== null;
  const jobElapsed = jobActive ? now - copierJobStartedAt! : 0;
  const jobProgress = Math.min(1, jobElapsed / COPIER_JOB_DURATION_MS);
  const jobRemaining = Math.max(0, COPIER_JOB_DURATION_MS - jobElapsed);

  // Build progress bar string (10 blocks)
  const BAR_LEN = 10;
  const filled = Math.round(jobProgress * BAR_LEN);
  const progressBar = '█'.repeat(filled) + '░'.repeat(BAR_LEN - filled);

  let promptLines: string[];
  let promptColor: string;

  if (lockedForDay) {
    promptLines = [
      'Out of copies for today',
      `Resets in ${formatHours(copierCooldownUntil - now)}`,
    ];
    promptColor = '#f87171';
  } else if (jobActive) {
    promptLines = [
      `Copying… ${formatMs(jobRemaining)}`,
      `[${progressBar}]`,
      'Stay near the copier!',
    ];
    promptColor = '#fde68a';
  } else {
    promptLines = [
      `[E] Double your papers, up to 20 reams`,
      `(${copiesLeft}/${COPIER_MAX_COPIES} left today — takes 1 min)`,
    ];
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
            textAlign="center"
            onSync={onOverlayTextSync}
          >
            {promptLines.join('\n')}
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
