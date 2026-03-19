import React from 'react';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Chair } from '../shared/props/Chair';

export const CONFERENCE_ROOM_COLLISION_BOXES = [
  // Glass wall (south face)
  new THREE.Box3(new THREE.Vector3(7.5, 0, 4.9), new THREE.Vector3(22.5, 8, 5.1)),
  // Table
  new THREE.Box3(new THREE.Vector3(8.5, 0, 6.5), new THREE.Vector3(21.5, 1.0, 13.5)),
  // Chairs — south side
  new THREE.Box3(new THREE.Vector3(10.7, 0, 6.2), new THREE.Vector3(11.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(12.7, 0, 6.2), new THREE.Vector3(13.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(14.7, 0, 6.2), new THREE.Vector3(15.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(16.7, 0, 6.2), new THREE.Vector3(17.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(18.7, 0, 6.2), new THREE.Vector3(19.3, 0.5, 6.8)),
  // Chairs — north side
  new THREE.Box3(new THREE.Vector3(10.7, 0, 13.2), new THREE.Vector3(11.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(12.7, 0, 13.2), new THREE.Vector3(13.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(14.7, 0, 13.2), new THREE.Vector3(15.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(16.7, 0, 13.2), new THREE.Vector3(17.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(18.7, 0, 13.2), new THREE.Vector3(19.3, 0.5, 13.8)),
  // Chairs — end caps
  new THREE.Box3(new THREE.Vector3(8.2, 0, 9.7), new THREE.Vector3(8.8, 0.5, 10.3)),
  new THREE.Box3(new THREE.Vector3(21.2, 0, 9.7), new THREE.Vector3(21.8, 0.5, 10.3)),
];

export const ConferenceRoom = () => (
  <group position={[15, 0, 10]}>
    {/* Table */}
    <Box args={[12, 0.1, 6]} position={[0, 0.95, 0]}>
      <meshStandardMaterial color="#5D4037" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, -2.5]}>
      <meshStandardMaterial color="#333" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, -2.5]}>
      <meshStandardMaterial color="#333" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, 2.5]}>
      <meshStandardMaterial color="#333" />
    </Box>
    <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, 2.5]}>
      <meshStandardMaterial color="#333" />
    </Box>
    {/* Glass wall */}
    <Box args={[15, 8, 0.2]} position={[0, 4, -5]}>
      <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
    </Box>
    {/* Whiteboard */}
    <Box args={[6, 3, 0.05]} position={[0, 3, 14.7]}>
      <meshStandardMaterial color="white" />
    </Box>
    <Text position={[0, 4, 14.6]} fontSize={0.3} color="black" rotation={[0, Math.PI, 0]}>
      Quarterly Beet Projections
    </Text>
    <Text position={[0, 3, 14.6]} fontSize={0.2} color="#333" rotation={[0, Math.PI, 0]}>
      {'- Sales are UP!\n- Harvest is ON TIME\n- Identity theft is DOWN'}
    </Text>
    {/* Chairs */}
    {[-4, -2, 0, 2, 4].map((x) => (
      <React.Fragment key={x}>
        <Chair position={[x, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[x, 0, 3.5]} rotation={[0, Math.PI, 0]} />
      </React.Fragment>
    ))}
    <Chair position={[-6.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
    <Chair position={[6.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
  </group>
);
