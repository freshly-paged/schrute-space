import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box } from '@react-three/drei';
import * as THREE from 'three';
import { MS_BODY_THROWABLE_ID } from '../../propIds';
import { FOCUS_SIT_POSES, FOCUS_SIT_POSE_COUNT } from '../../avatarFocusPoses';
import { WornMsBody } from './WornMsBody';

export { FOCUS_SIT_POSES, FOCUS_SIT_POSE_COUNT } from '../../avatarFocusPoses';

/** Local +Z = toward desk when seated; shifts thighs forward past the chair seat. */
const FOCUS_LEG_FORWARD_Z = 0.14;

export const CharacterAvatar = ({
  color,
  isMoving,
  isGrounded,
  isRolling,
  rollProgress = 0,
  skinTone = '#ffdbac',
  pantColor = '#333333',
  wornUpperPropId,
  isFocused = false,
  focusSitPoseIndex = 0,
}: {
  color: string;
  isMoving: boolean;
  isGrounded: boolean;
  isRolling: boolean;
  rollProgress?: number;
  skinTone?: string;
  pantColor?: string;
  wornUpperPropId?: string | null;
  /** When true, legs use a seated preset instead of standing idle. */
  isFocused?: boolean;
  /** Index into `FOCUS_SIT_POSES` (clamped). */
  focusSitPoseIndex?: number;
}) => {
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

    if (isFocused) {
      const idx = Math.min(
        Math.max(0, focusSitPoseIndex),
        FOCUS_SIT_POSE_COUNT - 1
      );
      const [lx, ly, lz, rx, ry, rz] = FOCUS_SIT_POSES[idx]!;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0.38;
        leftArmRef.current.rotation.y = -0.06;
        leftArmRef.current.rotation.z = 0.05;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0.38;
        rightArmRef.current.rotation.y = 0.06;
        rightArmRef.current.rotation.z = -0.05;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = lx;
        leftLegRef.current.rotation.y = ly;
        leftLegRef.current.rotation.z = lz;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = rx;
        rightLegRef.current.rotation.y = ry;
        rightLegRef.current.rotation.z = rz;
      }
      return;
    }

    if (!isGrounded) {
      // Jumping pose
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -Math.PI * 0.2;
        leftArmRef.current.rotation.y = 0;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -Math.PI * 0.2;
        rightArmRef.current.rotation.y = 0;
        rightArmRef.current.rotation.z = 0;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = Math.PI * 0.1;
        leftLegRef.current.rotation.y = 0;
        leftLegRef.current.rotation.z = 0;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = Math.PI * 0.1;
        rightLegRef.current.rotation.y = 0;
        rightLegRef.current.rotation.z = 0;
      }
    } else if (isMoving) {
      // Walking animation
      const swing = Math.sin(t * walkSpeed) * walkAmount;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = swing;
        leftArmRef.current.rotation.y = 0;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = -swing;
        rightArmRef.current.rotation.y = 0;
        rightArmRef.current.rotation.z = 0;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = -swing;
        leftLegRef.current.rotation.y = 0;
        leftLegRef.current.rotation.z = 0;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = swing;
        rightLegRef.current.rotation.y = 0;
        rightLegRef.current.rotation.z = 0;
      }
    } else {
      // Idle pose
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.y = 0;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.y = 0;
        rightArmRef.current.rotation.z = 0;
      }
      if (leftLegRef.current) {
        leftLegRef.current.rotation.x = 0;
        leftLegRef.current.rotation.y = 0;
        leftLegRef.current.rotation.z = 0;
      }
      if (rightLegRef.current) {
        rightLegRef.current.rotation.x = 0;
        rightLegRef.current.rotation.y = 0;
        rightLegRef.current.rotation.z = 0;
      }
    }
  });

  const suitReplacesHead = wornUpperPropId === MS_BODY_THROWABLE_ID;
  const legAnchorZ = isFocused ? FOCUS_LEG_FORWARD_Z : 0;

  return (
    <group ref={groupRef}>
      {/* Torso + arms always visible; suit covers upper chest/shoulders and replaces the block head */}
      <Box args={[0.5, 0.8, 0.3]} position={[0, 0.9, 0]}>
        <meshStandardMaterial color={color} />
      </Box>

      {!suitReplacesHead && (
        <>
          <Box args={[0.4, 0.4, 0.4]} position={[0, 1.5, 0]}>
            <meshStandardMaterial color={skinTone} />
          </Box>
          <Box args={[0.07, 0.07, 0.02]} position={[-0.09, 1.54, 0.21]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
          <Box args={[0.07, 0.07, 0.02]} position={[0.09, 1.54, 0.21]}>
            <meshStandardMaterial color="#1a1a1a" />
          </Box>
        </>
      )}

      <group position={[-0.35, 1.2, 0]}>
        <mesh ref={leftArmRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color={skinTone} />
        </mesh>
      </group>
      <group position={[0.35, 1.2, 0]}>
        <mesh ref={rightArmRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color={skinTone} />
        </mesh>
      </group>

      {suitReplacesHead ? <WornMsBody /> : null}

      {/* Legs — forward Z when seated so mesh clears chair seat */}
      <group position={[-0.15, 0.5, legAnchorZ]}>
        <mesh ref={leftLegRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color={pantColor} />
        </mesh>
      </group>
      <group position={[0.15, 0.5, legAnchorZ]}>
        <mesh ref={rightLegRef} position={[0, -0.25, 0]}>
          <boxGeometry args={[0.2, 0.5, 0.2]} />
          <meshStandardMaterial color={pantColor} />
        </mesh>
      </group>
    </group>
  );
};
