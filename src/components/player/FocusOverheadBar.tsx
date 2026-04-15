import React, { useMemo } from 'react';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

function RoundedPlaneMesh({ w, h, r, color, z = 0 }: { w: number; h: number; r: number; color: string; z?: number }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
    s.lineTo(w / 2, h / 2 - r);
    s.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
    s.lineTo(-w / 2 + r, h / 2);
    s.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(-w / 2, -h / 2 + r);
    s.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
  }, [w, h, r]);
  return (
    <mesh position={[0, 0, z]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

interface FocusOverheadBarProps {
  focusProgress: number;
  sessionPaper?: number;
}

/**
 * Shared focus-session overhead UI rendered above a player's head.
 * Used by both LocalPlayer and OtherPlayer so the display is identical.
 */
export const FocusOverheadBar = React.memo(({ focusProgress, sessionPaper }: FocusOverheadBarProps) => {
  const paper = sessionPaper ?? 0;
  const W = 1.72;
  const H = paper > 0 ? 0.92 : 0.72;
  const BAR_W = 1.44;
  const BAR_H = 0.20;
  const R = 0.08;
  const BAR_R = 0.08;
  const textY = paper > 0 ? H / 2 - 0.22 : H / 2 - 0.20;
  const barY  = paper > 0 ? 0.00 : -0.08;
  const reamY = -(H / 2 - 0.18);

  const fillW = Math.max(BAR_R * 2 + 0.02, focusProgress * BAR_W);
  const fillX = -(BAR_W - fillW) / 2;

  return (
    <Billboard position={[0, 3.1, 0]}>
      {/* Black border */}
      <RoundedPlaneMesh w={W + 0.06} h={H + 0.06} r={R + 0.02} color="#000000" z={-0.003} />
      {/* Cream paper fill */}
      <RoundedPlaneMesh w={W} h={H} r={R} color="#fdfaf3" z={-0.002} />

      {/* "FOCUSING..." label — Press Start 2P pixel font */}
      <Text
        fontSize={0.11}
        color="#7a0019"
        font="/fonts/PressStart2P.ttf"
        position={[0, textY, 0]}
        anchorX="center"
        anchorY="middle"
      >
        FOCUSING...
      </Text>

      {/* Bar track — rounded pill */}
      <group position={[0, barY, 0.001]}>
        <RoundedPlaneMesh w={BAR_W} h={BAR_H} r={BAR_R} color="#e8dfc8" />
      </group>
      {/* Bar fill — rounded pill, left-anchored */}
      <group position={[fillX, barY, 0.002]}>
        <RoundedPlaneMesh w={fillW} h={BAR_H - 0.04} r={BAR_R} color="#166534" />
      </group>

      {/* Percent on bar */}
      <Text fontSize={0.09} color="#1a1207" position={[0, barY, 0.003]} anchorX="center" anchorY="middle">
        {`${Math.round(focusProgress * 100)}%`}
      </Text>

      {/* Session reams — only shown when provided */}
      {paper > 0 && (
        <Text fontSize={0.1} color="#6b5c3e" position={[0, reamY, 0.001]} anchorX="center" anchorY="middle">
          {`+${paper} reams`}
        </Text>
      )}
    </Billboard>
  );
});
