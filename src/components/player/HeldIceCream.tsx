import React from 'react';
import { ICE_CREAM_QUARTERS_MAX } from '../../gameConfig';

/** Tiny cone + scoop for the blocky avatar hand (local units). */
export function HeldIceCream({
  color,
  remainingQuarters = ICE_CREAM_QUARTERS_MAX,
}: {
  color: string;
  /** 1–4; scoop height scales by this / max (cone unchanged). */
  remainingQuarters?: number;
}) {
  const q = Math.min(ICE_CREAM_QUARTERS_MAX, Math.max(1, Math.floor(remainingQuarters)));
  const scoopK = q / ICE_CREAM_QUARTERS_MAX;
  const scoopR = 0.075;
  const scoopY = -0.015 + scoopR * scoopK;

  return (
    <group scale={1.05}>
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.065, 0.16, 10]} />
        <meshStandardMaterial color="#b08968" roughness={0.7} />
      </mesh>
      <mesh position={[0, scoopY, 0]} scale={[1, scoopK, 1]}>
        <sphereGeometry args={[scoopR, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}
