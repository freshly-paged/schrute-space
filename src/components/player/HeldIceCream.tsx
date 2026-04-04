import React from 'react';

/** Tiny cone + scoop for the blocky avatar hand (local units). */
export function HeldIceCream({ color }: { color: string }) {
  return (
    <group scale={1.05}>
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.065, 0.16, 10]} />
        <meshStandardMaterial color="#b08968" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshStandardMaterial color={color} roughness={0.35} />
      </mesh>
    </group>
  );
}
