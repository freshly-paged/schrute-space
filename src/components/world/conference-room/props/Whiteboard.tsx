import { Box, Cylinder } from '@react-three/drei';

interface WhiteboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

export const Whiteboard = ({ position, rotation = [0, 0, 0] }: WhiteboardProps) => (
  <group position={position} rotation={rotation}>
    {/* Board surface */}
    <Box args={[6, 3, 0.05]} position={[0, 0, 0]}>
      <meshStandardMaterial color="#f9f9f7" />
    </Box>

    {/* Frame - top */}
    <Box args={[6.1, 0.08, 0.06]} position={[0, 1.54, 0.01]}>
      <meshStandardMaterial color="#b0b0b0" />
    </Box>
    {/* Frame - bottom */}
    <Box args={[6.1, 0.08, 0.06]} position={[0, -1.54, 0.01]}>
      <meshStandardMaterial color="#b0b0b0" />
    </Box>
    {/* Frame - left */}
    <Box args={[0.08, 3.16, 0.06]} position={[-3.04, 0, 0.01]}>
      <meshStandardMaterial color="#b0b0b0" />
    </Box>
    {/* Frame - right */}
    <Box args={[0.08, 3.16, 0.06]} position={[3.04, 0, 0.01]}>
      <meshStandardMaterial color="#b0b0b0" />
    </Box>

    {/* Marker lines on board surface — abstract drawn content */}
    {/* Blue line - long horizontal */}
    <Box args={[2.4, 0.04, 0.01]} position={[-0.8, 0.6, 0.035]}>
      <meshStandardMaterial color="#1565c0" />
    </Box>
    {/* Blue line - short angled (simulate underline) */}
    <Box args={[1.0, 0.04, 0.01]} position={[0.2, 0.3, 0.035]}>
      <meshStandardMaterial color="#1565c0" />
    </Box>
    {/* Red line - bold accent */}
    <Box args={[1.8, 0.06, 0.01]} position={[-1.0, -0.1, 0.035]}>
      <meshStandardMaterial color="#c62828" />
    </Box>
    {/* Red line - short tick */}
    <Box args={[0.5, 0.04, 0.01]} position={[0.8, -0.1, 0.035]}>
      <meshStandardMaterial color="#c62828" />
    </Box>
    {/* Green line - data line */}
    <Box args={[2.0, 0.04, 0.01]} position={[0.2, -0.5, 0.035]}>
      <meshStandardMaterial color="#2e7d32" />
    </Box>
    {/* Green line - short segment */}
    <Box args={[0.8, 0.04, 0.01]} position={[-1.5, -0.8, 0.035]}>
      <meshStandardMaterial color="#2e7d32" />
    </Box>
    {/* Blue short line - bullet */}
    <Box args={[0.15, 0.04, 0.01]} position={[-2.4, 0.6, 0.035]}>
      <meshStandardMaterial color="#1565c0" />
    </Box>
    <Box args={[0.15, 0.04, 0.01]} position={[-2.4, 0.3, 0.035]}>
      <meshStandardMaterial color="#1565c0" />
    </Box>
    <Box args={[0.15, 0.04, 0.01]} position={[-2.4, -0.1, 0.035]}>
      <meshStandardMaterial color="#c62828" />
    </Box>

    {/* Whiteboard tray at bottom */}
    <Box args={[6.1, 0.08, 0.18]} position={[0, -1.62, 0.06]}>
      <meshStandardMaterial color="#b0b0b0" />
    </Box>

    {/* Tiny cylinder markers in the tray */}
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
  </group>
);
