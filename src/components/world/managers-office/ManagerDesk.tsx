import React, { Suspense, useMemo } from 'react';
import { Box, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { MONITOR_UPGRADE_MAX_LEVEL } from '../../../monitorUpgradeConstants';
import { useGameStore } from '../../../store/useGameStore';
import { Chair } from '../shared/props/Chair';
import { onOverlayTextSync } from '../../../utils/overlayTextSync';
import { BossDesk } from './props/BossDesk';
import type { DeskItemPlacement } from '../../../types';
import { DESK_ITEM_CATALOG } from '../../../deskItemCatalog';
import { useGameAsset, type AssetKey } from '../../../hooks/useGameAsset';

// ── Monitor rendering ─────────────────────────────────────────────────────────

const monitorBodyMat = new THREE.MeshStandardMaterial({ color: '#111111' });
const monitorScreenMat = new THREE.MeshStandardMaterial({
  color: '#0a1f33',
  emissive: new THREE.Color('#1a3a5c'),
  emissiveIntensity: 0.6,
});
const monitorStandMat = new THREE.MeshStandardMaterial({ color: '#222222' });

function SingleDeskMonitor() {
  return (
    <group>
      <Box args={[0.65, 0.42, 0.05]} position={[0, 0.21, -0.2]} material={monitorBodyMat} />
      <Box args={[0.55, 0.32, 0.01]} position={[0, 0.21, -0.17]} material={monitorScreenMat} />
      <Box args={[0.2, 0.05, 0.2]} position={[0, 0.025, -0.2]} material={monitorStandMat} />
    </group>
  );
}

function monitorRowCounts(c: number): number[] {
  switch (c) {
    case 1: return [1];
    case 2: return [2];
    case 3: return [3];
    case 4: return [2, 2];
    case 5: return [3, 2];
    case 6: return [3, 3];
    case 7: return [4, 3];
    case 8: return [4, 4];
    default: return [Math.min(8, Math.max(1, c))];
  }
}

const MONITOR_MESH_SCALE = 1.28;

function DeskMonitors({ count }: { count: number }) {
  const c = Math.min(8, Math.max(1, Math.floor(count)));
  const rows = monitorRowCounts(c);
  const unitW = 0.65;
  const gap = 0.06;
  const rowStepY = 0.44;
  const scale = MONITOR_MESH_SCALE;
  const rowCount = rows.length;
  const step = scale * (unitW + gap);
  const rowDy = scale * rowStepY;

  let globalIndex = 0;
  return (
    <group position={[0, 1.0, 0]}>
      {rows.flatMap((nInRow, rowIdx) => {
        const rowMid = (nInRow - 1) / 2;
        const y = (rowCount - 1 - rowIdx) * rowDy;
        return Array.from({ length: nInRow }, (_, i) => {
          const x = (i - rowMid) * step;
          const key = globalIndex++;
          return (
            <group key={key} position={[x, y, 0]} scale={[scale, scale, scale]}>
              <SingleDeskMonitor />
            </group>
          );
        });
      })}
    </group>
  );
}

// ── Desk decorations ──────────────────────────────────────────────────────────

function DeskItemAssetModel({ assetKey, x, z, yOffset = 0 }: {
  assetKey: AssetKey; x: number; z: number; yOffset?: number;
}) {
  const { scene } = useGameAsset(assetKey);
  return <primitive object={scene.clone()} position={[x, 1.05 + yOffset, z]} scale={0.45} />;
}

function DeskDecorations({ ownerEmail }: { ownerEmail?: string }) {
  const deskItemsByEmail = useGameStore((s) => s.deskItemsByEmail);
  if (!ownerEmail) return null;
  const items: DeskItemPlacement[] = deskItemsByEmail[ownerEmail] ?? [];
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => {
        const def = DESK_ITEM_CATALOG.find((d) => d.id === item.id);
        if (!def) return null;
        return (
          <Suspense key={item.id} fallback={null}>
            <DeskItemAssetModel assetKey={def.modelKey} x={item.x} z={item.z} yOffset={def.yOffset} />
          </Suspense>
        );
      })}
    </>
  );
}

// ── ManagerDesk ───────────────────────────────────────────────────────────────

/**
 * Interactive manager's desk using the executive BossDesk visual style.
 * Supports focus sessions, monitor upgrades, chair upgrades, and desk
 * decorations — identical feature set to the regular Desk component.
 *
 * The chair sits 1.8 u behind the desk (+Z in group-local space) to clear the
 * deeper pedestal base. The caller's rotation determines which world direction
 * "behind" maps to.
 */
export const ManagerDesk = ({
  id,
  position,
  rotation = [0, 0, 0],
  ownerName,
  ownerEmail,
  groupRef,
}: {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  ownerName?: string;
  ownerEmail?: string;
  groupRef?: React.Ref<THREE.Group>;
}) => {
  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);
  const isOccupied = occupiedDeskIds.includes(id);
  const userEmail = useGameStore((state) => state.user?.email);
  const chairLevelByEmail = useGameStore((state) => state.chairLevelByEmail);
  const chairLevel = ownerEmail ? (chairLevelByEmail[ownerEmail] ?? 0) : 0;
  const monitorLevelByEmail = useGameStore((state) => state.monitorLevelByEmail);
  const rawMonitorLv = ownerEmail ? (monitorLevelByEmail[ownerEmail] ?? 0) : 0;
  const monitorLv = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(rawMonitorLv)));
  const monitorCount = 1 + monitorLv;

  const members = useGameStore((state) => state.roomInfo?.members);
  const resolvedDeskOwnerName = useMemo(() => {
    const layoutName = ownerName?.trim();
    if (!ownerEmail) return layoutName || '';
    const m = members?.find((x) => x.email === ownerEmail);
    const fromDb = m?.name?.trim();
    if (fromDb) return fromDb;
    if (layoutName) return layoutName;
    return ownerEmail.split('@')[0] ?? '';
  }, [members, ownerEmail, ownerName]);

  const deskNameplate = resolvedDeskOwnerName ? `${resolvedDeskOwnerName}'s desk` : '';
  const isOwnDesk = !!ownerEmail && ownerEmail === userEmail;
  const isNearest = nearestDeskId === id;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {deskNameplate && (
        <Billboard position={[0, 2.2, 0]}>
          <Text
            fontSize={0.18}
            color="#fde68a"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            {deskNameplate}
          </Text>
        </Billboard>
      )}
      {isNearest && !isTimerActive && (
        <Billboard position={[0, 3.0, 0]}>
          <Text
            fontSize={0.2}
            color={isOccupied ? '#f87171' : 'white'}
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            {isOccupied ? 'Desk Occupied' : 'Press [E] to Start Focus'}
          </Text>
          {!isOccupied && isOwnDesk && (
            <Text
              fontSize={0.17}
              color="#fde68a"
              outlineColor="black"
              outlineWidth={0.02}
              position={[0, -0.28, 0]}
              onSync={onOverlayTextSync}
            >
              Press [F] to Use Computer
            </Text>
          )}
        </Billboard>
      )}

      {/* Executive desk geometry — reused from the manager's office boss desk */}
      <BossDesk position={[0, 0, 0]} />

      <DeskMonitors count={monitorCount} />
      <DeskDecorations ownerEmail={ownerEmail} />

      {/* Chair 1.8 u behind the desk (in +Z group-local space) to clear the pedestal */}
      <Chair position={[0, 0, 1.8]} rotation={[0, Math.PI, 0]} level={chairLevel} />
    </group>
  );
};
