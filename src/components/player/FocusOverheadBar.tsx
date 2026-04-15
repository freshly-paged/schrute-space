import React from 'react';
import { Billboard, Text } from '@react-three/drei';

interface FocusOverheadBarProps {
  focusProgress: number;
  sessionPaper?: number;
}

/**
 * Shared focus-session overhead UI rendered above a player's head.
 * Used by both LocalPlayer and OtherPlayer so the display is identical.
 */
export const FocusOverheadBar = React.memo(({ focusProgress, sessionPaper }: FocusOverheadBarProps) => {
  const showPaper = (sessionPaper ?? 0) > 0;
  return (
    <Billboard position={[0, 3.0, 0]}>
      {/* Outer background — taller when paper count is shown */}
      <mesh position={[0, 0.1, -0.001]} scale={[1.8, showPaper ? 0.78 : 0.58, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.9} />
      </mesh>
      {/* Label */}
      <Text fontSize={0.18} color="#22c55e" position={[0, 0.22, 0]} anchorX="center" anchorY="middle">
        FOCUS
      </Text>
      {/* Bar background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[1.6, 0.22]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      {/* Bar fill — fixed geometry, scaled via scale-x */}
      <mesh
        position={[-(1.6 - Math.max(0.001, focusProgress) * 1.6) / 2, 0, 0.001]}
        scale={[Math.max(0.001, focusProgress), 1, 1]}
      >
        <planeGeometry args={[1.6, 0.18]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>
      {/* Percent label */}
      <Text fontSize={0.1} color="white" position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
        {`${Math.round(focusProgress * 100)}%`}
      </Text>
      {/* Session paper count — only shown when provided */}
      {showPaper && (
        <Text fontSize={0.11} color="#86efac" position={[0, -0.22, 0.001]} anchorX="center" anchorY="middle">
          {`+${sessionPaper} paper`}
        </Text>
      )}
    </Billboard>
  );
});
