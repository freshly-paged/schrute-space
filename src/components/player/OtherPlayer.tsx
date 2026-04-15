import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player, DEFAULT_AVATAR_CONFIG, DeskItem } from '../../types';
import { ROLL_PIVOT_Y } from '../../constants';
import { MS_BODY_THROWABLE_ID } from '../../propIds';

import { CharacterAvatar } from './CharacterAvatar';
import { OtherPlayerHeldThrowable } from './OtherPlayerHeldThrowable';
import { ChatBubble } from '../ui/ChatBubble';
import { FocusOverheadBar } from './FocusOverheadBar';
import { getSyncedIceCreamState, iceCreamColorForIndex } from '../../iceCreamFlavors';
import { useGameStore } from '../../store/useGameStore';

export function getFocusedDeskTransform(
  player: Player,
  roomLayout: { type: string; id: string; position: [number, number, number]; rotation: [number, number, number] }[]
): { position: [number, number, number]; rotation: [number, number, number] } | null {
  if (!player.isFocused || !player.activeDeskId) return null;
  const desk = roomLayout.find(
    (item): item is DeskItem => item.type === 'desk' && item.id === player.activeDeskId
  );
  if (!desk) return null;
  const chairOffset = new THREE.Vector3(0, 0, 0.8).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    desk.rotation[1]
  );
  const position: [number, number, number] = [
    desk.position[0] + chairOffset.x,
    desk.position[1],
    desk.position[2] + chairOffset.z,
  ];
  const rotation: [number, number, number] = [0, desk.rotation[1] + Math.PI, 0];
  return { position, rotation };
}

export const OtherPlayer = React.memo(({ player }: { player: Player }) => {
  const [isMoving, setIsMoving] = useState(false);
  const [, setIceCreamTick] = useState(0);
  const roomLayout = useGameStore((state) => state.roomLayout);

  const focusedDeskTransform = useMemo(
    () => getFocusedDeskTransform(player, roomLayout),
    [player, roomLayout]
  );

  const syncedIce = getSyncedIceCreamState(player);
  const iceExp = syncedIce?.expiresAt ?? null;

  useEffect(() => {
    if (iceExp == null || Date.now() >= iceExp) return;
    const ms = iceExp - Date.now() + 30;
    const id = window.setTimeout(() => setIceCreamTick((t) => t + 1), Math.max(ms, 0));
    return () => clearTimeout(id);
  }, [iceExp, syncedIce?.flavorIndex, syncedIce?.remainingQuarters]);

  const showHeldIceCream =
    syncedIce != null &&
    Date.now() < syncedIce.expiresAt &&
    !player.heldThrowableId;

  const heldIceCreamColor = showHeldIceCream ? iceCreamColorForIndex(syncedIce!.flavorIndex) : null;

  // Interpolation: visual position/rotY lag-track the target from server snapshots
  const groupRef = useRef<THREE.Group>(null);
  const visualPos = useRef(new THREE.Vector3(...player.position));
  const visualRotY = useRef(player.rotation[1]);
  const isMovingRef = useRef(false);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (focusedDeskTransform) {
      // Snap to desk — no interpolation needed
      groupRef.current.position.set(...focusedDeskTransform.position);
      groupRef.current.rotation.set(0, focusedDeskTransform.rotation[1], 0);
      visualPos.current.set(...focusedDeskTransform.position);
      visualRotY.current = focusedDeskTransform.rotation[1];
      if (isMovingRef.current) { isMovingRef.current = false; setIsMoving(false); }
      return;
    }

    const targetX = player.position[0];
    const targetY = player.position[1];
    const targetZ = player.position[2];
    const targetRotY = player.rotation[1];

    // Frame-rate independent lerp: converges in ~100ms
    const alpha = Math.min(1, delta * 20);

    const prevX = visualPos.current.x;
    const prevZ = visualPos.current.z;

    visualPos.current.x += (targetX - visualPos.current.x) * alpha;
    visualPos.current.y += (targetY - visualPos.current.y) * alpha;
    visualPos.current.z += (targetZ - visualPos.current.z) * alpha;

    // Shortest-path rotation lerp
    let rotDiff = targetRotY - visualRotY.current;
    if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
    if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
    visualRotY.current += rotDiff * alpha;

    groupRef.current.position.copy(visualPos.current);
    groupRef.current.rotation.set(0, visualRotY.current, 0);

    const dx = visualPos.current.x - prevX;
    const dz = visualPos.current.z - prevZ;
    const nowMoving = dx * dx + dz * dz > 0.0001;
    if (nowMoving !== isMovingRef.current) { isMovingRef.current = nowMoving; setIsMoving(nowMoving); }
  });

  return (
    <group ref={groupRef} position={player.position} rotation={[0, player.rotation[1], 0]}>
      <group position={[0, ROLL_PIVOT_Y, 0]}>
        <group rotation={[player.isRolling ? -Math.PI * 2 * ((player.rollTimer || 0) / 0.5) : 0, 0, 0]}>
          <group position={[0, -ROLL_PIVOT_Y, 0]}>
            <OtherPlayerHeldThrowable heldThrowableId={player.heldThrowableId} />
            <CharacterAvatar
              color={player.avatarConfig?.shirtColor ?? player.color}
              isMoving={isMoving}
              isGrounded={player.position[1] < 0.1}
              isRolling={player.isRolling || false}
              skinTone={player.avatarConfig?.skinTone ?? DEFAULT_AVATAR_CONFIG.skinTone}
              pantColor={player.avatarConfig?.pantColor ?? DEFAULT_AVATAR_CONFIG.pantColor}
              wornUpperPropId={player.wornPropId === MS_BODY_THROWABLE_ID ? MS_BODY_THROWABLE_ID : null}
              heldIceCreamColor={heldIceCreamColor}
              heldIceCreamRemainingQuarters={syncedIce?.remainingQuarters}
              isFocused={player.isFocused ?? false}
              focusSitPoseIndex={player.focusSitPoseIndex ?? 0}
            />
          </group>
        </group>
      </group>
      <Billboard position={[0, 2.2, 0]}>
        <Text
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {player.name}
        </Text>
      </Billboard>
      {player.isFocused && player.focusProgress != null && (
        <FocusOverheadBar focusProgress={player.focusProgress} />
      )}
      <ChatBubble
        text={player.lastMessage}
        time={player.lastMessageTime}
        durationMs={player.lastMessageDurationMs}
      />
    </group>
  );
});
