import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player, DEFAULT_AVATAR_CONFIG, DeskItem } from '../../types';
import { ROLL_PIVOT_Y } from '../../constants';
import { MS_BODY_THROWABLE_ID } from '../../propIds';

// Pre-allocated vectors reused every frame to avoid GC pressure
const _otherPos = new THREE.Vector3();
const _otherPrev = new THREE.Vector3();
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
  const prevPos = useRef(player.position);
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
  const renderPosition = focusedDeskTransform?.position ?? player.position;
  const renderRotation = focusedDeskTransform?.rotation ?? player.rotation;

  useFrame(() => {
    _otherPos.set(player.position[0], player.position[1], player.position[2]);
    _otherPrev.set(prevPos.current[0], prevPos.current[1], prevPos.current[2]);
    const dist = _otherPos.distanceTo(_otherPrev);
    setIsMoving(dist > 0.01);
    prevPos.current = player.position;
  });

  return (
    <group position={renderPosition} rotation={[0, renderRotation[1], 0]}>
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
