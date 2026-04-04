import React, { useRef } from 'react';
import { Box, Billboard, Text, Cylinder } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../../store/useGameStore';
import { Chair } from '../shared/props/Chair';
import { onOverlayTextSync } from '../../../utils/overlayTextSync';

export const Desk = ({
  id,
  position,
  rotation = [0, 0, 0],
  hasChair = true,
  ownerName,
  ownerEmail,
}: {
  id: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  hasChair?: boolean;
  ownerName?: string;
  ownerEmail?: string;
}) => {
  const setNearestDeskId = useGameStore((state) => state.setNearestDeskId);
  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);
  const isOccupied = occupiedDeskIds.includes(id);
  const deskRef = useRef<THREE.Group>(null);
  const userEmail = useGameStore((state) => state.user?.email);
  const myRole = useGameStore((state) => state.roomInfo?.myRole);
  const chairLevelByEmail = useGameStore((state) => state.chairLevelByEmail);
  const chairLevel = ownerEmail ? (chairLevelByEmail[ownerEmail] ?? 0) : 0;

  const isOwnDesk = !!ownerEmail && ownerEmail === userEmail;
  const isOwnAdminDesk = isOwnDesk && (myRole === 'admin' || myRole === 'manager');

  useFrame((state) => {
    if (!deskRef.current) return;
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;

    const distance = player.position.distanceTo(deskRef.current.position);
    if (distance < 2) {
      if (nearestDeskId !== id) setNearestDeskId(id);
    } else if (nearestDeskId === id) {
      setNearestDeskId(null);
    }
  });

  const isNearest = nearestDeskId === id;

  return (
    <group ref={deskRef} position={position} rotation={rotation}>
      {ownerName && (
        <Billboard position={[0, 1.8, 0]}>
          <Text
            fontSize={0.18}
            color="#fde68a"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            {ownerName}
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
      <Box args={[0.1, 0.95, 0.1]} position={[-0.9, 0.475, -0.4]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.1, 0.95, 0.1]} position={[0.9, 0.475, -0.4]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.1, 0.95, 0.1]} position={[-0.9, 0.475, 0.4]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.1, 0.95, 0.1]} position={[0.9, 0.475, 0.4]}>
        <meshStandardMaterial color="#333" />
      </Box>

      {/* Paper stack on desk surface */}
      <Box args={[0.4, 0.02, 0.3]} position={[0.5, 1.01, 0.1]}>
        <meshStandardMaterial color="#f5f5f0" />
      </Box>

      {/* Coffee mug */}
      <Cylinder
        args={[0.06, 0.06, 0.12, 8]}
        position={[-0.55, 1.06, 0.1]}
      >
        <meshStandardMaterial color="#2c1810" />
      </Cylinder>

      {/* Keyboard strip */}
      <Box args={[0.5, 0.02, 0.15]} position={[0, 1.01, 0.25]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Box>

      {/* Monitor — improved with larger bezel and glowing screen */}
      <group position={[0, 1.0, 0]}>
        {/* Bezel */}
        <Box args={[0.65, 0.42, 0.05]} position={[0, 0.21, -0.2]}>
          <meshStandardMaterial color="#111111" />
        </Box>
        {/* Inner screen with blue emissive glow */}
        <Box args={[0.55, 0.32, 0.01]} position={[0, 0.21, -0.17]}>
          <meshStandardMaterial
            color="#0a1f33"
            emissive="#1a3a5c"
            emissiveIntensity={0.6}
          />
        </Box>
        {/* Monitor stand neck */}
        <Box args={[0.2, 0.05, 0.2]} position={[0, 0.025, -0.2]}>
          <meshStandardMaterial color="#222" />
        </Box>
        {/* Monitor stand base */}
        <Box args={[0.4, 0.02, 0.2]} position={[0, 0.01, 0.1]}>
          <meshStandardMaterial color="#222" />
        </Box>
      </group>

      {hasChair && (
        <Chair position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]} level={chairLevel} />
      )}
    </group>
  );
};
