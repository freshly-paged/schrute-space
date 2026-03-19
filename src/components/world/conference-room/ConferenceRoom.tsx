import React from 'react';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Chair } from '../shared/props/Chair';
import { Whiteboard } from './props/Whiteboard';

// World offset for this room group: [15, 0, 10]
export const CONFERENCE_ROOM_COLLISION_BOXES = [
  // Back wall (local z=10 → world z=20)
  new THREE.Box3(new THREE.Vector3(7.5, 0, 19.85), new THREE.Vector3(22.5, 8, 20.15)),
  // Left wall (local x=-7.5 → world x=7.5)
  new THREE.Box3(new THREE.Vector3(7.35, 0, 5), new THREE.Vector3(7.65, 8, 25)),
  // Right wall (local x=7.5 → world x=22.5)
  new THREE.Box3(new THREE.Vector3(22.35, 0, 5), new THREE.Vector3(22.65, 8, 25)),
  // Glass front wall — split into two panels with a door gap
  // Left panel (local x=-4.5, width=6 → world x 7.5 to 13.5)
  new THREE.Box3(new THREE.Vector3(7.5, 0, 4.9), new THREE.Vector3(13.5, 8, 5.1)),
  // Right panel (local x=4.5, width=6 → world x 16.5 to 22.5)
  new THREE.Box3(new THREE.Vector3(16.5, 0, 4.9), new THREE.Vector3(22.5, 8, 5.1)),
  // Conference table (world offset applied)
  new THREE.Box3(new THREE.Vector3(8.5, 0, 6.5), new THREE.Vector3(21.5, 1.0, 13.5)),
];

export const ConferenceRoom = () => (
  <group position={[15, 0, 10]}>
    {/* ── Enclosure walls ── */}
    {/* Back wall */}
    <Box args={[15, 8, 0.3]} position={[0, 4, 10]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>
    {/* Left wall */}
    <Box args={[0.3, 8, 20]} position={[-7.5, 4, 0]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>
    {/* Right wall */}
    <Box args={[0.3, 8, 20]} position={[7.5, 4, 0]}>
      <meshStandardMaterial color="#dde3ea" />
    </Box>

    {/* ── Glass front wall — two panels with a ~2-unit door gap ── */}
    {/* Left glass panel */}
    <Box args={[6, 8, 0.2]} position={[-4.5, 4, -5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent={true}
        opacity={0.3}
        color="#a8d8f0"
      />
    </Box>
    {/* Right glass panel */}
    <Box args={[6, 8, 0.2]} position={[4.5, 4, -5]}>
      <meshPhysicalMaterial
        transmission={0.9}
        roughness={0}
        metalness={0}
        transparent={true}
        opacity={0.3}
        color="#a8d8f0"
      />
    </Box>

    {/* ── Conference table ── */}
    {/* Tabletop */}
    <Box args={[12, 0.12, 5.5]} position={[0, 0.95, 0]}>
      <meshStandardMaterial color="#3E2723" />
    </Box>
    {/* Center runner strip on top of table */}
    <Box args={[10, 0.02, 0.5]} position={[0, 1.015, 0]}>
      <meshStandardMaterial color="#2a1a10" />
    </Box>
    {/* Table legs */}
    <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, -2.5]}>
      <meshStandardMaterial color="#5D4037" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, -2.5]}>
      <meshStandardMaterial color="#5D4037" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, 2.5]}>
      <meshStandardMaterial color="#5D4037" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, 2.5]}>
      <meshStandardMaterial color="#5D4037" />
    </Box>

    {/* ── Name placards ── */}
    {/* Side chairs: 5 per long side at x = -4, -2, 0, 2, 4 */}
    {/* Front side (z = -3.5 edge) */}
    {([-4, -2, 0, 2, 4] as number[]).map((x) => (
      <Box key={`placard-front-${x}`} args={[0.3, 0.03, 0.15]} position={[x, 1.02, -2.6]}>
        <meshStandardMaterial color="#f5f5f0" />
      </Box>
    ))}
    {/* Back side (z = 3.5 edge) */}
    {([-4, -2, 0, 2, 4] as number[]).map((x) => (
      <Box key={`placard-back-${x}`} args={[0.3, 0.03, 0.15]} position={[x, 1.02, 2.6]}>
        <meshStandardMaterial color="#f5f5f0" />
      </Box>
    ))}
    {/* End chairs */}
    <Box args={[0.3, 0.03, 0.15]} position={[-5.9, 1.02, 0]}>
      <meshStandardMaterial color="#f5f5f0" />
    </Box>
    <Box args={[0.3, 0.03, 0.15]} position={[5.9, 1.02, 0]}>
      <meshStandardMaterial color="#f5f5f0" />
    </Box>

    {/* ── Whiteboard ── */}
    <Whiteboard position={[0, 3.5, 9.8]} rotation={[0, Math.PI, 0]} />

    {/* ── Spotlight ── */}
    <spotLight
      position={[0, 7.5, 2]}
      target-position={[0, 0.95, 0]}
      intensity={1.2}
      angle={0.6}
      penumbra={0.3}
      color="#fff5e0"
    />

    {/* ── Room sign on glass wall exterior ── */}
    <Text position={[0, 6.5, -5.2]} fontSize={0.35} color="#333">
      Conference Room B
    </Text>

    {/* ── Chairs — 5 per long side + 2 end chairs = 12 total ── */}
    {([-4, -2, 0, 2, 4] as number[]).map((x) => (
      <React.Fragment key={x}>
        <Chair position={[x, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[x, 0, 3.5]} rotation={[0, Math.PI, 0]} />
      </React.Fragment>
    ))}
    <Chair position={[-6.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
    <Chair position={[6.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
  </group>
);
