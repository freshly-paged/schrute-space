import React from 'react';
import { Box } from '@react-three/drei';

// Window dimensions
const WIN_W      = 3.0;   // glass width
const WIN_LOWER  = 1.4;   // lower pane (venetian blinds)
const WIN_UPPER  = 0.6;   // upper pane (clear glass)
const WIN_H      = WIN_LOWER + WIN_UPPER; // 2.0 total

// Frame constants — same style as east-wall pane frames
const FT = 0.08; // rail thickness
const FD = 0.10; // rail depth (protrudes toward room interior = local +Z)
const BC = '#111111';

// Pre-computed centres (relative to group origin = window centre)
const LOWER_CY = -WIN_H / 2 + WIN_LOWER / 2; // −0.3
const UPPER_CY =  WIN_H / 2 - WIN_UPPER / 2; //  0.7
const MID_Y    = -WIN_H / 2 + WIN_LOWER;      //  0.4 (lower / upper split)

// Blind slat Y positions (within lower pane, with small top/bottom margin)
const SLAT_YS: number[] = [];
for (let y = -WIN_H / 2 + 0.12; y < MID_Y - 0.1; y += 0.22) SLAT_YS.push(y);

/**
 * Floating window with venetian blinds (lower) and clear glass (upper),
 * framed by a black border.  Local +Z faces the room interior so any rotation
 * that makes the group's +Z point inward will work (e.g. [0, Math.PI, 0] for
 * south-facing walls).
 */
export function OfficeWindow({
  position,
  rotation,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Lower glass pane */}
      <Box args={[WIN_W, WIN_LOWER, 0.06]} position={[0, LOWER_CY, 0.03]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>

      {/* Venetian blind slats */}
      {SLAT_YS.map((y, i) => (
        <Box key={i} args={[WIN_W - 0.1, 0.06, 0.06]} position={[0.05, y, 0.07]}>
          <meshStandardMaterial color="#cbc7bc" />
        </Box>
      ))}

      {/* Upper glass pane (clear) */}
      <Box args={[WIN_W, WIN_UPPER, 0.06]} position={[0, UPPER_CY, 0.03]}>
        <meshPhysicalMaterial transmission={0.8} roughness={0} metalness={0} transparent opacity={0.3} color="#a8c8d8" />
      </Box>

      {/* Black frame rails */}
      {/* Bottom */}
      <Box args={[WIN_W + FT, FT, FD]} position={[0, -WIN_H / 2, FD / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Top */}
      <Box args={[WIN_W + FT, FT, FD]} position={[0, WIN_H / 2, FD / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Mid (blind / clear split) */}
      <Box args={[WIN_W + FT, FT, FD]} position={[0, MID_Y, FD / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Left */}
      <Box args={[FT, WIN_H + FT, FD]} position={[-WIN_W / 2, 0, FD / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
      {/* Right */}
      <Box args={[FT, WIN_H + FT, FD]} position={[WIN_W / 2, 0, FD / 2]}>
        <meshStandardMaterial color={BC} />
      </Box>
    </group>
  );
}
