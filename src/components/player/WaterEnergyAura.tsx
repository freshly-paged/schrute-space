import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../../store/useGameStore';

const BLUE = '#38bdf8';
const BLUE_SOFT = '#7dd3fc';

// Pre-allocated geometries shared across all WaterEnergyAura instances
const shellGeometry = new THREE.SphereGeometry(0.95, 20, 20);
const innerGeometry = new THREE.SphereGeometry(0.62, 16, 16);

/**
 * Blue glow on the local avatar while water cooler buff is active (store: waterBuffExpiresAt).
 */
export const WaterEnergyAura = () => {
  const rootRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const exp = useGameStore.getState().waterBuffExpiresAt;
    const active = exp != null && Date.now() < exp;
    if (rootRef.current) rootRef.current.visible = active;
    if (!active) return;

    const t = state.clock.elapsedTime;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.8);

    if (lightRef.current) {
      lightRef.current.intensity = 0.9 + pulse * 0.85;
    }
    if (shellRef.current) {
      const m = shellRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.08 + pulse * 0.1;
      const s = 1 + Math.sin(t * 3.5) * 0.06;
      shellRef.current.scale.setScalar(s);
    }
    if (innerRef.current) {
      const m = innerRef.current.material as THREE.MeshBasicMaterial;
      m.opacity = 0.14 + pulse * 0.12;
      const s = 0.92 + Math.sin(t * 4.2) * 0.08;
      innerRef.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={rootRef} visible={false}>
      <pointLight
        ref={lightRef}
        color={BLUE}
        intensity={1.2}
        distance={5}
        decay={2}
        position={[0, 1.05, 0]}
      />
      <mesh ref={shellRef} position={[0, 1.02, 0]} geometry={shellGeometry}>
        <meshBasicMaterial
          color={BLUE}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={innerRef} position={[0, 1.02, 0]} geometry={innerGeometry}>
        <meshBasicMaterial
          color={BLUE_SOFT}
          transparent
          opacity={0.2}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Sparkles
        count={28}
        scale={[1.1, 1.35, 1.1]}
        size={2.2}
        speed={0.35}
        opacity={0.55}
        color={BLUE_SOFT}
        position={[0, 1.05, 0]}
      />
    </group>
  );
};
