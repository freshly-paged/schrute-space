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

export const OtherPlayer = ({ player }: { player: Player }) => {
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
  }, [iceExp, syncedIce?.flavorIndex]);

  const showHeldIceCream =
    syncedIce != null &&
    Date.now() < syncedIce.expiresAt &&
    !player.heldThrowableId;

  const heldIceCreamColor = showHeldIceCream ? iceCreamColorForIndex(syncedIce!.flavorIndex) : null;
  const renderPosition = focusedDeskTransform?.position ?? player.position;
  const renderRotation = focusedDeskTransform?.rotation ?? player.rotation;

  useFrame(() => {
    const dist = new THREE.Vector3(...player.position).distanceTo(new THREE.Vector3(...prevPos.current));
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
        <Billboard position={[0, 3.0, 0]}>
          {/* Outer background */}
          <mesh position={[0, 0.1, -0.001]}>
            <planeGeometry args={[1.8, 0.58]} />
            <meshBasicMaterial color="#0f172a" transparent opacity={0.9} />
          </mesh>
          {/* Label */}
          <Text fontSize={0.18} color="#22c55e" position={[0, 0.22, 0]} anchorX="center" anchorY="middle">
            FOCUS
          </Text>
          {/* Bar background */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.6, 0.22]} />
            <meshBasicMaterial color="#1e293b" />
          </mesh>
          {/* Bar fill */}
          <mesh position={[-(1.6 - player.focusProgress * 1.6) / 2, 0, 0.001]}>
            <planeGeometry args={[Math.max(0.001, player.focusProgress * 1.6), 0.18]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          {/* Percent label */}
          <Text fontSize={0.1} color="white" position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
            {`${Math.round(player.focusProgress * 100)}%`}
          </Text>
        </Billboard>
      )}
      <ChatBubble text={player.lastMessage} time={player.lastMessageTime} />
    </group>
  );
};
