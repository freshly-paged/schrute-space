import React, { useMemo } from 'react';
import { Box, Billboard, Text, Cylinder } from '@react-three/drei';
import * as THREE from 'three';
import { MONITOR_UPGRADE_MAX_LEVEL } from '../../../monitorUpgradeConstants';
import { useGameStore } from '../../../store/useGameStore';
import { Chair } from '../shared/props/Chair';
import { onOverlayTextSync } from '../../../utils/overlayTextSync';
import type { DeskItemPlacement } from '../../../types';

// Shared materials — avoids creating hundreds of duplicate instances
const monitorBodyMat = new THREE.MeshStandardMaterial({ color: '#111111' });
const monitorScreenMat = new THREE.MeshStandardMaterial({ color: '#0a1f33', emissive: new THREE.Color('#1a3a5c'), emissiveIntensity: 0.6 });
const monitorStandMat = new THREE.MeshStandardMaterial({ color: '#222222' });
const deskLegMat = new THREE.MeshStandardMaterial({ color: '#333333' });
const deskPaperMat = new THREE.MeshStandardMaterial({ color: '#f5f5f0' });
const deskMugMat = new THREE.MeshStandardMaterial({ color: '#2c1810' });
const deskKeyboardMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a' });

function SingleDeskMonitor() {
  return (
    <group>
      <Box args={[0.65, 0.42, 0.05]} position={[0, 0.21, -0.2]} material={monitorBodyMat} />
      <Box args={[0.55, 0.32, 0.01]} position={[0, 0.21, -0.17]} material={monitorScreenMat} />
      <Box args={[0.2, 0.05, 0.2]} position={[0, 0.025, -0.2]} material={monitorStandMat} />
    </group>
  );
}

/** Monitors per row: first entry is the upper row, last is the lower row (Y-up stacking). */
function monitorRowCounts(c: number): number[] {
  switch (c) {
    case 1:
      return [1];
    case 2:
      return [2];
    case 3:
      return [3];
    case 4:
      return [2, 2];
    case 5:
      return [3, 2];
    case 6:
      return [3, 3];
    case 7:
      return [4, 3];
    case 8:
      return [4, 4];
    default:
      return [Math.min(8, Math.max(1, c))];
  }
}

/** Same cap as legacy single-monitor layout — do not shrink when adding more screens. */
const MONITOR_MESH_SCALE = 1.28;

function DeskMonitors({ count }: { count: number }) {
  const c = Math.min(8, Math.max(1, Math.floor(count)));
  const rows = monitorRowCounts(c);
  const unitW = 0.65;
  const gap = 0.06;
  /** Vertical offset between stacked rows (unscaled); ~one screen height per step. */
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
            <group
              key={key}
              position={[x, y, 0]}
              scale={[scale, scale, scale]}
            >
              <SingleDeskMonitor />
            </group>
          );
        });
      })}
    </group>
  );
}

/** Simple Dundie trophy rendered on the desk surface. */
function DundieAward({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 1.05, z]}>
      {/* Cup */}
      <Cylinder args={[0.04, 0.03, 0.1, 8]} position={[0, 0.1, 0]}>
        <meshStandardMaterial color="#FFD700" metalness={0.7} roughness={0.3} />
      </Cylinder>
      {/* Stem */}
      <Cylinder args={[0.015, 0.015, 0.08, 8]} position={[0, 0.04, 0]}>
        <meshStandardMaterial color="#b8860b" metalness={0.6} roughness={0.4} />
      </Cylinder>
      {/* Base */}
      <Cylinder args={[0.055, 0.055, 0.025, 8]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#b8860b" metalness={0.6} roughness={0.3} />
      </Cylinder>
    </group>
  );
}

function DeskDecorations({ ownerEmail }: { ownerEmail?: string }) {
  const deskItemsByEmail = useGameStore((s) => s.deskItemsByEmail);
  if (!ownerEmail) return null;
  const items: DeskItemPlacement[] = deskItemsByEmail[ownerEmail] ?? [];
  if (items.length === 0) return null;
  return (
    <>
      {items.map((item) => {
        if (item.id === 'dundie') return <DundieAward key={item.id} x={item.x} z={item.z} />;
        return null;
      })}
    </>
  );
}

export const Desk = ({
  id,
  position,
  rotation = [0, 0, 0],
  hasChair = true,
  ownerName,
  ownerEmail,
  groupRef,
}: {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  hasChair?: boolean;
  ownerName?: string;
  ownerEmail?: string;
  groupRef?: React.Ref<THREE.Group>;
}) => {
  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);
  const isOccupied = occupiedDeskIds.includes(id);
  const userEmail = useGameStore((state) => state.user?.email);
  const myRole = useGameStore((state) => state.roomInfo?.myRole);
  const chairLevelByEmail = useGameStore((state) => state.chairLevelByEmail);
  const chairLevel = ownerEmail ? (chairLevelByEmail[ownerEmail] ?? 0) : 0;
  const monitorLevelByEmail = useGameStore((state) => state.monitorLevelByEmail);
  const rawMonitorLv = ownerEmail ? (monitorLevelByEmail[ownerEmail] ?? 0) : 0;
  const monitorLv = Math.min(
    MONITOR_UPGRADE_MAX_LEVEL,
    Math.max(0, Math.floor(rawMonitorLv))
  );
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
  const isOwnAdminDesk = isOwnDesk && (myRole === 'admin' || myRole === 'manager');

  const isNearest = nearestDeskId === id;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {deskNameplate && (
        <Billboard position={[0, 1.8, 0]}>
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
        <Billboard position={[0, 2.5, 0]}>
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

      {/* Table top */}
      <Box args={[2, 0.1, 1]} position={[0, 0.95, 0]}>
        <meshStandardMaterial color={isOccupied ? '#6b3a3a' : isNearest ? '#a0522d' : '#8B4513'} />
      </Box>

      {/* Legs */}
      <Box args={[0.1, 0.95, 0.1]} position={[-0.9, 0.475, -0.4]} material={deskLegMat} />
      <Box args={[0.1, 0.95, 0.1]} position={[0.9, 0.475, -0.4]} material={deskLegMat} />
      <Box args={[0.1, 0.95, 0.1]} position={[-0.9, 0.475, 0.4]} material={deskLegMat} />
      <Box args={[0.1, 0.95, 0.1]} position={[0.9, 0.475, 0.4]} material={deskLegMat} />

      {/* Paper stack on desk surface */}
      <Box args={[0.4, 0.02, 0.3]} position={[0.5, 1.01, 0.1]} material={deskPaperMat} />

      {/* Coffee mug */}
      <Cylinder args={[0.06, 0.06, 0.12, 8]} position={[-0.55, 1.06, 0.1]} material={deskMugMat} />

      {/* Keyboard strip */}
      <Box args={[0.5, 0.02, 0.15]} position={[0, 1.01, 0.25]} material={deskKeyboardMat} />

      <DeskMonitors count={monitorCount} />

      <DeskDecorations ownerEmail={ownerEmail} />

      {hasChair && (
        <Chair position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]} level={chairLevel} />
      )}
    </group>
  );
};
