import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player, DEFAULT_AVATAR_CONFIG } from '../../types';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from '../ui/ChatBubble';

export const OtherPlayer = ({ player }: { player: Player }) => {
  const prevPos = useRef(player.position);
  const [isMoving, setIsMoving] = useState(false);

  useFrame(() => {
    const dist = new THREE.Vector3(...player.position).distanceTo(new THREE.Vector3(...prevPos.current));
    setIsMoving(dist > 0.01);
    prevPos.current = player.position;
  });

  return (
    <group position={player.position} rotation={[0, player.rotation[1], 0]}>
      <group rotation={[player.isRolling ? -Math.PI * 2 * ((player.rollTimer || 0) / 0.5) : 0, 0, 0]}>
        <CharacterAvatar
          color={player.avatarConfig?.shirtColor ?? player.color}
          isMoving={isMoving}
          isGrounded={player.position[1] < 0.1}
          isRolling={player.isRolling || false}
          skinTone={player.avatarConfig?.skinTone ?? DEFAULT_AVATAR_CONFIG.skinTone}
          pantColor={player.avatarConfig?.pantColor ?? DEFAULT_AVATAR_CONFIG.pantColor}
        />
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
        <Billboard position={[0, 2.7, 0]}>
          <mesh>
            <planeGeometry args={[1.0, 0.12]} />
            <meshBasicMaterial color="#1e293b" transparent opacity={0.85} />
          </mesh>
          <mesh position={[-(1 - player.focusProgress) / 2, 0, 0.001]}>
            <planeGeometry args={[Math.max(0.001, player.focusProgress), 0.09]} />
            <meshBasicMaterial color="#22c55e" />
          </mesh>
          <Text fontSize={0.07} color="white" position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
            FOCUS
          </Text>
        </Billboard>
      )}
      <ChatBubble text={player.lastMessage} time={player.lastMessageTime} />
    </group>
  );
};
