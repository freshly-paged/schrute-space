import React from 'react';
import { Box, Plane } from '@react-three/drei';
import { WorkingArea } from './working-area/WorkingArea';
import { BreakRoom } from './break-room/BreakRoom';
import { ConferenceRoom } from './conference-room/ConferenceRoom';
import { ManagersOffice } from './managers-office/ManagersOffice';

export const OfficeEnvironment = () => (
  <group>
    {/* Floor */}
    <Plane args={[50, 50]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#f0f0f0" />
    </Plane>

    {/* Perimeter walls */}
    <Box args={[50, 8, 0.5]} position={[0, 4, -25]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>
    <Box args={[50, 8, 0.5]} position={[0, 4, 25]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>
    <Box args={[0.5, 8, 50]} position={[-25, 4, 0]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>
    <Box args={[0.5, 8, 50]} position={[25, 4, 0]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>

    {/* Roof */}
    <Box args={[50, 0.5, 50]} position={[0, 8, 0]}>
      <meshStandardMaterial color="#e2e8f0" />
    </Box>

    <WorkingArea />
    <BreakRoom />
    <ConferenceRoom />
    <ManagersOffice />
  </group>
);
