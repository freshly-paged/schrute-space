import React from 'react';
import { Box, Plane, Text } from '@react-three/drei';
import { DESKS } from '../../constants';
import { Chair } from './Chair';
import { Desk } from './Desk';
import { BeetFarm } from './BeetFarm';
import { Banner } from './Banner';

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

    {/* Desks */}
    {DESKS.map((desk) => (
      <Desk key={desk.id} {...desk} />
    ))}

    <Banner position={[-3.5, 6, -6]} />

    {/* Michael's Office */}
    <group position={[15, 0, -15]}>
      <Box args={[10, 8, 0.2]} position={[0, 4, 5]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>
      <Box args={[0.2, 8, 10]} position={[-5, 4, 0]}>
        <meshStandardMaterial color="#cbd5e1" transparent opacity={0.3} />
      </Box>
      <Text position={[0, 3, 4.9]} fontSize={0.5} color="black">
        Michael Scott
      </Text>
      <Text position={[0, 2.5, 4.9]} fontSize={0.3} color="#444">
        Regional Manager
      </Text>
      <Chair position={[-1.5, 0, 1.5]} rotation={[0, Math.PI / 4, 0]} />
      <Chair position={[1.5, 0, 1.5]} rotation={[0, -Math.PI / 4, 0]} />
    </group>

    {/* Conference Room */}
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

    {/* Break Room */}
    <group position={[-15, 0, 15]}>
      <Box args={[1, 2, 1]} position={[0, 1, 0]}>
        <meshStandardMaterial color="white" />
      </Box>
      <Text position={[0, 2.5, 0]} fontSize={0.5} color="black">
        Break Room
      </Text>
    </group>

    <BeetFarm position={[-18, 0, -18]} />
  </group>
);
