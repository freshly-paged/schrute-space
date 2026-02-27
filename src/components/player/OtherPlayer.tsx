import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Player } from '../../types';
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
          color={player.color} 
          isMoving={isMoving} 
          isGrounded={player.position[1] < 0.1} 
          isRolling={player.isRolling || false} 
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
      <ChatBubble text={player.lastMessage} time={player.lastMessageTime} />
    </group>
  );
};
