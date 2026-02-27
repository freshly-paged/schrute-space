import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';

export const CharacterAvatar = ({ color, isMoving, isGrounded, isRolling, rollProgress = 0 }: { color: string, isMoving: boolean, isGrounded: boolean, isRolling: boolean, rollProgress?: number }) => {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const walkSpeed = 10;
    const walkAmount = 0.5;

    if (isRolling) {
      // Tucked position for rolling
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.PI * 0.8;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.PI * 0.8;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -Math.PI * 0.4;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -Math.PI * 0.4;
      return;
    }

    if (!isGrounded) {
      // Jumping pose
      if (leftArmRef.current) leftArmRef.current.rotation.x = -Math.PI * 0.2;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -Math.PI * 0.2;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.PI * 0.1;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.PI * 0.1;
    } else if (isMoving) {
      // Walking animation
      const swing = Math.sin(t * walkSpeed) * walkAmount;
      if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
      if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
      if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
    } else {
      // Idle pose
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0;
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0;
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Torso */}
      <Box args={[0.5, 0.8, 0.3]} position={[0, 0.9, 0]}>
        <meshStandardMaterial color={color} />
      </Box>
      
      {/* Head */}
      <Box args={[0.4, 0.4, 0.4]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#ffdbac" />
      </Box>

      {/* Arms */}
      <group position={[-0.35, 1.2, 0]}>
        <mesh ref={leftArmRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color="#ffdbac" />
        </mesh>
      </group>
      <group position={[0.35, 1.2, 0]}>
        <mesh ref={rightArmRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color="#ffdbac" />
        </mesh>
      </group>

      {/* Legs */}
      <group position={[-0.15, 0.5, 0]}>
        <mesh ref={leftLegRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
      <group position={[0.15, 0.5, 0]}>
        <mesh ref={rightLegRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </group>
  );
};
