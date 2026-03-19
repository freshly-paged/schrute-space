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
