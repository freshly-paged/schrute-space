import React, { useRef, useState, useEffect } from 'react';
import { Box, Cylinder, Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../../../store/useGameStore';

interface WhiteboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

interface TopEntry {
  name: string | null;
  email: string;
  paperReams: number;
}

export const Whiteboard = ({ position, rotation = [0, 0, 0] }: WhiteboardProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const nearWhiteboard = useGameStore((s) => s.nearWhiteboard);
  const setNearWhiteboard = useGameStore((s) => s.setNearWhiteboard);
  const roomId = useGameStore((s) => s.roomInfo?.roomId);
  const [topEntry, setTopEntry] = useState<TopEntry | null>(null);

  useEffect(() => {
    if (!roomId) return;
    const doFetch = () => {
      fetch(`/api/room/${roomId}/leaderboard`, { credentials: 'include' })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) setTopEntry(data[0]);
          else setTopEntry(null);
        })
        .catch(() => {});
    };
    doFetch();
    const interval = setInterval(doFetch, 60_000);
    return () => clearInterval(interval);
  }, [roomId]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;
    const wp = new THREE.Vector3();
    groupRef.current.getWorldPosition(wp);
    const xzDist = Math.sqrt(
      Math.pow(player.position.x - wp.x, 2) + Math.pow(player.position.z - wp.z, 2)
    );
    const { nearWhiteboard: cur, setNearWhiteboard: set_ } = useGameStore.getState();
    if (xzDist < 3.5) {
      if (!cur) set_(true);
    } else if (cur) {
      set_(false);
    }
  });

  const displayName = topEntry
    ? (topEntry.name ?? topEntry.email.split('@')[0])
    : null;

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Board surface */}
      <Box args={[6, 3, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f9f9f7" />
      </Box>

      {/* Frame */}
      <Box args={[6.1, 0.08, 0.06]} position={[0, 1.54, 0.01]}>
        <meshStandardMaterial color="#b0b0b0" />
      </Box>
      <Box args={[6.1, 0.08, 0.06]} position={[0, -1.54, 0.01]}>
        <meshStandardMaterial color="#b0b0b0" />
      </Box>
      <Box args={[0.08, 3.16, 0.06]} position={[-3.04, 0, 0.01]}>
        <meshStandardMaterial color="#b0b0b0" />
      </Box>
      <Box args={[0.08, 3.16, 0.06]} position={[3.04, 0, 0.01]}>
        <meshStandardMaterial color="#b0b0b0" />
      </Box>

      {/* Header */}
      <Text position={[0, 1.1, 0.04]} fontSize={0.24} color="#1565c0" anchorX="center" anchorY="middle">
        SALES STANDINGS
      </Text>

      {/* Divider */}
      <Box args={[5.2, 0.03, 0.01]} position={[0, 0.82, 0.04]}>
        <meshStandardMaterial color="#666" />
      </Box>

      {/* Top entry */}
      {displayName ? (
        <>
          <Text position={[-2.0, 0.45, 0.04]} fontSize={0.34} color="#c8a000" anchorX="center" anchorY="middle">
            #1
          </Text>
          <Text position={[0.5, 0.45, 0.04]} fontSize={0.28} color="#1a1a1a" anchorX="center" anchorY="middle">
            {displayName}
          </Text>
          <Text position={[0.5, 0.05, 0.04]} fontSize={0.22} color="#555" anchorX="center" anchorY="middle">
            {`${topEntry!.paperReams.toLocaleString()} reams`}
          </Text>
        </>
      ) : (
        <Text position={[0, 0.3, 0.04]} fontSize={0.2} color="#999" anchorX="center" anchorY="middle">
          No sales data yet
        </Text>
      )}

      {/* Tray */}
      <Box args={[6.1, 0.08, 0.18]} position={[0, -1.62, 0.06]}>
        <meshStandardMaterial color="#b0b0b0" />
      </Box>

      {/* Markers */}
      <Cylinder args={[0.025, 0.025, 0.14, 8]} position={[-0.8, -1.62, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#1565c0" />
      </Cylinder>
      <Cylinder args={[0.025, 0.025, 0.14, 8]} position={[-0.5, -1.62, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#c62828" />
      </Cylinder>
      <Cylinder args={[0.025, 0.025, 0.14, 8]} position={[-0.2, -1.62, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#2e7d32" />
      </Cylinder>
      <Cylinder args={[0.025, 0.025, 0.14, 8]} position={[0.1, -1.62, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#333333" />
      </Cylinder>

      {/* Proximity prompt */}
      {nearWhiteboard && (
        <Billboard position={[0, 2.5, 0]}>
          <Text fontSize={0.2} color="white" outlineColor="black" outlineWidth={0.02}>
            Press [E] to View Leaderboard
          </Text>
        </Billboard>
      )}
    </group>
  );
};
