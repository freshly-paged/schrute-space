import React, { useMemo, useRef } from 'react';
import { Box, Plane, Sphere, Text, Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';
import { DESKS } from '../../constants';

export const Chair = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Seat */}
      <Box args={[0.6, 0.1, 0.6]} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#222" />
      </Box>
      {/* Backrest */}
      <Box args={[0.6, 0.8, 0.1]} position={[0, 0.8, -0.25]}>
        <meshStandardMaterial color="#222" />
      </Box>
      {/* Base/Leg */}
      <Box args={[0.1, 0.4, 0.1]} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
      <Box args={[0.5, 0.05, 0.5]} position={[0, 0.025, 0]}>
        <meshStandardMaterial color="#333" />
      </Box>
    </group>
  );
};

export const Desk = ({ id, position, rotation = [0, 0, 0], hasChair = true }: { id: string, position: [number, number, number], rotation?: [number, number, number], hasChair?: boolean }) => {
  const setNearestDeskId = useGameStore((state) => state.setNearestDeskId);
  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const deskRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!deskRef.current) return;
    
    // Get player position from the scene (LocalPlayer is named 'localPlayer' or we can find it)
    // For now, let's assume we can find the player group
    const player = state.scene.getObjectByName('localPlayer');
    if (player) {
      const distance = player.position.distanceTo(deskRef.current.position);
      if (distance < 2) {
        if (nearestDeskId !== id) setNearestDeskId(id);
      } else if (nearestDeskId === id) {
        setNearestDeskId(null);
      }
    }
  });

  const isNearest = nearestDeskId === id;

  return (
    <group ref={deskRef} position={position} rotation={rotation}>
      {/* Interaction Prompt */}
      {isNearest && !isTimerActive && (
        <Billboard position={[0, 2.5, 0]}>
          <Text fontSize={0.2} color="white" outlineColor="black" outlineWidth={0.02}>
            Press [E] to Start Focus
          </Text>
        </Billboard>
      )}

      {/* Table Top */}
      <Box args={[2, 0.1, 1]} position={[0, 0.95, 0]}>
        <meshStandardMaterial color={isNearest ? "#a0522d" : "#8B4513"} />
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
      {/* Computer */}
      <group position={[0, 1.0, 0]}>
        <Box args={[0.6, 0.4, 0.05]} position={[0, 0.2, -0.2]}>
          <meshStandardMaterial color="#111" />
        </Box>
        <Box args={[0.2, 0.05, 0.2]} position={[0, 0.025, -0.2]}>
          <meshStandardMaterial color="#222" />
        </Box>
        <Box args={[0.4, 0.02, 0.2]} position={[0, 0.01, 0.1]}>
          <meshStandardMaterial color="#222" />
        </Box>
      </group>
      {/* Chair */}
      {hasChair && <Chair position={[0, 0, 0.8]} rotation={[0, Math.PI, 0]} />}
    </group>
  );
};

export const BeetFarm = ({ position }: { position: [number, number, number] }) => {
  const beets = useMemo(() => {
    const items = [];
    for (let x = -2; x <= 2; x += 1) {
      for (let z = -2; z <= 2; z += 1) {
        items.push([x, 0.1, z]);
      }
    }
    return items;
  }, []);

  return (
    <group position={position}>
      {/* Soil */}
      <Plane args={[6, 6]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <meshStandardMaterial color="#3d2b1f" />
      </Plane>
      {/* Beets */}
      {beets.map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <Box args={[0.3, 0.3, 0.3]} position={[0, 0.1, 0]}>
            <meshStandardMaterial color="#7a0019" />
          </Box>
          <Box args={[0.05, 0.4, 0.05]} position={[0, 0.3, 0]}>
            <meshStandardMaterial color="#2d5a27" />
          </Box>
        </group>
      ))}
      <Text position={[0, 1.5, 0]} fontSize={0.4} color="white">
        Schrute Beet Farm
      </Text>
    </group>
  );
};

export const Banner = ({ position, rotation = [0, 0, 0] }: { position: [number, number, number], rotation?: [number, number, number] }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* Banner Sheet */}
      <Box args={[4, 0.8, 0.05]} position={[0, 0, 0]}>
        <meshStandardMaterial color="white" />
      </Box>
      {/* Text */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.3}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        IT IS THE OFFICE
      </Text>
      {/* Iconic "Sad" Balloons (Brown, Grey, Black) */}
      <group position={[-1.8, -0.3, 0]}>
        <Sphere args={[0.12, 16, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#5D4037" />
        </Sphere>
        <Box args={[0.01, 0.4, 0.01]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#888" />
        </Box>
      </group>
      <group position={[1.8, -0.3, 0]}>
        <Sphere args={[0.12, 16, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#333" />
        </Sphere>
        <Box args={[0.01, 0.4, 0.01]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#888" />
        </Box>
      </group>
      <group position={[0, -0.5, 0]}>
        <Sphere args={[0.12, 16, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#777" />
        </Sphere>
        <Box args={[0.01, 0.4, 0.01]} position={[0, -0.2, 0]}>
          <meshStandardMaterial color="#888" />
        </Box>
      </group>
    </group>
  );
};

export const OfficeEnvironment = () => {
  return (
    <group>
      {/* Floor */}
      <Plane args={[50, 50]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#f0f0f0" />
      </Plane>
      
      {/* Walls */}
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

      {/* Desks (Dunder Mifflin Style Layout) */}
      {DESKS.map(desk => (
        <Desk key={desk.id} {...desk} />
      ))}

      {/* Iconic Banner */}
      <Banner position={[-3.5, 6, -6]} />
      
      {/* Michael's Office Walls */}
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
        {/* Extra chairs for meetings */}
        <Chair position={[-1.5, 0, 1.5]} rotation={[0, Math.PI / 4, 0]} />
        <Chair position={[1.5, 0, 1.5]} rotation={[0, -Math.PI / 4, 0]} />
      </group>

      {/* Conference Room */}
      <group position={[15, 0, 10]}>
        {/* Table */}
        <Box args={[12, 0.1, 6]} position={[0, 0.95, 0]}>
          <meshStandardMaterial color="#5D4037" />
        </Box>
        <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, -2.5]}><meshStandardMaterial color="#333" /></Box>
        <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, -2.5]}><meshStandardMaterial color="#333" /></Box>
        <Box args={[0.5, 0.95, 0.5]} position={[-5.5, 0.475, 2.5]}><meshStandardMaterial color="#333" /></Box>
        <Box args={[0.5, 0.95, 0.5]} position={[5.5, 0.475, 2.5]}><meshStandardMaterial color="#333" /></Box>
        
        {/* Wall */}
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
          - Sales are UP!{"\n"}- Harvest is ON TIME{"\n"}- Identity theft is DOWN
        </Text>
        
        {/* Chairs around table */}
        <Chair position={[-4, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[-2, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[0, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[2, 0, -3.5]} rotation={[0, 0, 0]} />
        <Chair position={[4, 0, -3.5]} rotation={[0, 0, 0]} />
        
        <Chair position={[-4, 0, 3.5]} rotation={[0, Math.PI, 0]} />
        <Chair position={[-2, 0, 3.5]} rotation={[0, Math.PI, 0]} />
        <Chair position={[0, 0, 3.5]} rotation={[0, Math.PI, 0]} />
        <Chair position={[2, 0, 3.5]} rotation={[0, Math.PI, 0]} />
        <Chair position={[4, 0, 3.5]} rotation={[0, Math.PI, 0]} />
        
        <Chair position={[-6.5, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
        <Chair position={[6.5, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      </group>

      {/* Break Room area */}
      <group position={[-15, 0, 15]}>
        <Box args={[1, 2, 1]} position={[0, 1, 0]}>
          <meshStandardMaterial color="white" />
        </Box>
        <Text position={[0, 2.5, 0]} fontSize={0.5} color="black">
          Break Room
        </Text>
      </group>

      {/* Schrute Beet Farm */}
      <BeetFarm position={[-18, 0, -18]} />

      {/* Roof */}
      <Box args={[50, 0.5, 50]} position={[0, 8, 0]}>
        <meshStandardMaterial color="#e2e8f0" />
      </Box>
    </group>
  );
};
