import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Player } from '../../types';
import { COLLISION_BOXES, getDeterministicColor, DESKS } from '../../constants';
import { useGameStore } from '../../store/useGameStore';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from '../ui/ChatBubble';

export const LocalPlayer = ({ socket, lastMessage, lastMessageTime, playerName, players }: { socket: Socket | null, lastMessage?: string, lastMessageTime?: number, playerName: string, players: Record<string, Player> }) => {
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [isMoving, setIsMoving] = useState(false);
  const [, get] = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  const playerColor = useMemo(() => getDeterministicColor(playerName), [playerName]);
  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const activeDeskId = useGameStore((state) => state.activeDeskId);
  const startTimer = useGameStore((state) => state.startTimer);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const isChatFocused = useGameStore((state) => state.isChatFocused);

  // Parkour state
  const yVelocity = useRef(0);
  const jumpCount = useRef(0);
  const isGrounded = useRef(true);
  const lastJumpTime = useRef(0);
  const lastForwardTime = useRef(0);
  const isRolling = useRef(false);
  const rollTimer = useRef(0);
  const prevJumpPressed = useRef(false);
  const prevForwardPressed = useRef(false);

  useFrame((state, delta) => {
    // Clamp camera Y to stay below roof (8)
    if (state.camera.position.y > 7.5) {
      state.camera.position.y = 7.5;
    }

    const keys = get();
    const { forward, backward, left, right, jump, interact } = (isChatFocused || isTimerActive) ? { forward: false, backward: false, left: false, right: false, jump: false, interact: false } : keys;
    
    setIsMoving(forward || backward || left || right);

    // --- Interaction Logic ---
    if (interact && nearestDeskId && !isTimerActive) {
      startTimer('focus');
    }

    if (isTimerActive && activeDeskId) {
      // Snap to desk
      const desk = DESKS.find(d => d.id === activeDeskId);
      if (desk) {
        // Calculate chair position in world space
        const chairPos = new THREE.Vector3(0, 0, 0.8);
        chairPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), desk.rotation[1]);
        
        const targetPos: [number, number, number] = [
          desk.position[0] + chairPos.x,
          desk.position[1],
          desk.position[2] + chairPos.z
        ];
        const targetRot: [number, number, number] = [0, desk.rotation[1] + Math.PI, 0];

        // Smoothly lerp to position if not already there
        const currentPos = new THREE.Vector3(...position);
        const tPos = new THREE.Vector3(...targetPos);
        if (currentPos.distanceTo(tPos) > 0.01) {
          const lerped = currentPos.lerp(tPos, 0.1);
          setPosition([lerped.x, lerped.y, lerped.z]);
          setRotation(targetRot);
          
          if (socket?.connected) {
            socket.emit('playerMovement', { 
              position: [lerped.x, lerped.y, lerped.z], 
              rotation: targetRot,
              isRolling: false,
              rollTimer: 0
            });
          }
        }
        return; // Skip normal movement
      }
    }
    
    const speed = (isRolling.current ? 12 : 5) * delta;
    const gravity = 20 * delta;
    const jumpForce = 8;

    let newPosition = [...position] as [number, number, number];
    let newRotation = [...rotation] as [number, number, number];

    // --- Parkour Logic ---
    
    // Jump & Double Jump Detection
    const jumpJustPressed = jump && !prevJumpPressed.current;
    prevJumpPressed.current = jump;

    if (jumpJustPressed) {
      const now = Date.now();
      if (isGrounded.current) {
        yVelocity.current = jumpForce;
        isGrounded.current = false;
        jumpCount.current = 1;
      } else if (jumpCount.current === 1) {
        // Double Jump
        yVelocity.current = jumpForce;
        jumpCount.current = 2;
        if (socket) socket.emit('chatMessage', 'PARKOUR!');
      }
      lastJumpTime.current = now;
    }

    // Forward Roll Detection (Double tap W)
    const forwardJustPressed = forward && !prevForwardPressed.current;
    prevForwardPressed.current = forward;

    if (forwardJustPressed) {
      const now = Date.now();
      if (now - lastForwardTime.current < 300 && !isRolling.current) {
        // Roll!
        isRolling.current = true;
        rollTimer.current = 0.5; // Roll duration
        if (socket) socket.emit('chatMessage', 'PARKOUR!');
      }
      lastForwardTime.current = now;
    }

    if (isRolling.current) {
      rollTimer.current -= delta;
      if (rollTimer.current <= 0) isRolling.current = false;
    }

    // Apply Gravity
    let groundY = 0;
    for (const box of COLLISION_BOXES) {
      if (newPosition[0] >= box.min.x && newPosition[0] <= box.max.x && 
          newPosition[2] >= box.min.z && newPosition[2] <= box.max.z) {
        if (box.max.y <= position[1] + 0.1) {
          groundY = Math.max(groundY, box.max.y);
        }
      }
    }

    if (!isGrounded.current || newPosition[1] > groundY) {
      yVelocity.current -= gravity;
      newPosition[1] += yVelocity.current * delta;

      // Roof collision check (8m roof - 1.9m player height)
      if (newPosition[1] >= 6.1) {
        newPosition[1] = 6.1;
        yVelocity.current = 0;
      }

      if (newPosition[1] <= groundY) {
        newPosition[1] = groundY;
        yVelocity.current = 0;
        isGrounded.current = true;
        jumpCount.current = 0;
      } else {
        isGrounded.current = false;
      }
    }

    // --- Movement ---
    
    // Get camera direction for camera-relative movement
    const cameraDirection = new THREE.Vector3();
    state.camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const cameraSide = new THREE.Vector3();
    cameraSide.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

    const moveVector = new THREE.Vector3(0, 0, 0);
    if (forward || isRolling.current) moveVector.add(cameraDirection);
    if (backward && !isRolling.current) moveVector.sub(cameraDirection);
    if (left && !isRolling.current) moveVector.add(cameraSide);
    if (right && !isRolling.current) moveVector.sub(cameraSide);

    if (moveVector.length() > 0) {
      moveVector.normalize().multiplyScalar(speed);
      
      // Check collision for X
      const testPosX = [...newPosition] as [number, number, number];
      testPosX[0] += moveVector.x;
      // Use a slightly raised box for horizontal collision to allow walking on top of things
      const playerBoxX = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(testPosX[0], testPosX[1] + 0.8, testPosX[2]),
        new THREE.Vector3(0.5, 1.4, 0.5)
      );
      
      let collisionX = false;
      for (const box of COLLISION_BOXES) {
        if (playerBoxX.intersectsBox(box)) {
          collisionX = true;
          break;
        }
      }
      // Check other players
      if (!collisionX) {
        for (const p of Object.values(players)) {
          const otherBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(p.position[0], p.position[1] + 0.8, p.position[2]),
            new THREE.Vector3(0.5, 1.4, 0.5)
          );
          if (playerBoxX.intersectsBox(otherBox)) {
            collisionX = true;
            break;
          }
        }
      }
      if (!collisionX) newPosition[0] = testPosX[0];

      // Check collision for Z
      const testPosZ = [...newPosition] as [number, number, number];
      testPosZ[2] += moveVector.z;
      const playerBoxZ = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(testPosZ[0], testPosZ[1] + 0.8, testPosZ[2]),
        new THREE.Vector3(0.5, 1.4, 0.5)
      );

      let collisionZ = false;
      for (const box of COLLISION_BOXES) {
        if (playerBoxZ.intersectsBox(box)) {
          collisionZ = true;
          break;
        }
      }
      // Check other players
      if (!collisionZ) {
        for (const p of Object.values(players)) {
          const otherBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(p.position[0], p.position[1] + 0.8, p.position[2]),
            new THREE.Vector3(0.5, 1.4, 0.5)
          );
          if (playerBoxZ.intersectsBox(otherBox)) {
            collisionZ = true;
            break;
          }
        }
      }
      if (!collisionZ) newPosition[2] = testPosZ[2];
      
      // Update player rotation to face movement direction
      newRotation[1] = Math.atan2(moveVector.x, moveVector.z);
    }

    // Bounds check
    newPosition[0] = Math.max(-24, Math.min(24, newPosition[0]));
    newPosition[2] = Math.max(-24, Math.min(24, newPosition[2]));

    const hasMoved = 
      newPosition[0] !== position[0] ||
      newPosition[1] !== position[1] ||
      newPosition[2] !== position[2] ||
      newRotation[1] !== rotation[1] ||
      isRolling.current;

    if (hasMoved) {
      setPosition(newPosition);
      setRotation(newRotation);
      if (socket?.connected) {
        socket.emit('playerMovement', { 
          position: newPosition, 
          rotation: newRotation,
          isRolling: isRolling.current,
          rollTimer: rollTimer.current
        });
      }
    }

    // Update OrbitControls target to follow player
    if (controlsRef.current) {
      const targetPos = new THREE.Vector3(newPosition[0], newPosition[1] + 1.5, newPosition[2]);
      // Clamp target within office bounds
      targetPos.x = Math.max(-24, Math.min(24, targetPos.x));
      targetPos.z = Math.max(-24, Math.min(24, targetPos.z));
      targetPos.y = Math.max(0, Math.min(7.5, targetPos.y));
      
      controlsRef.current.target.lerp(targetPos, 0.1);
      controlsRef.current.update();

      // Clamp camera position to stay inside walls
      const cam = state.camera;
      cam.position.x = Math.max(-24.5, Math.min(24.5, cam.position.x));
      cam.position.z = Math.max(-24.5, Math.min(24.5, cam.position.z));
      cam.position.y = Math.max(0.5, Math.min(7.5, cam.position.y));
    }
  });

  return (
    <>
      <OrbitControls 
        ref={controlsRef} 
        enablePan={false} 
        maxPolarAngle={Math.PI / 2.1} 
        minPolarAngle={Math.PI / 3} // Increased from PI/6 to keep camera lower
        maxDistance={15} // Increased from 7 to allow more zoom out
        minDistance={2} 
        makeDefault
      />
      <group 
        ref={playerRef} 
        name="localPlayer"
        position={position} 
        rotation={[0, rotation[1], 0]}
      >
        <group rotation={[isRolling.current ? -Math.PI * 2 * (rollTimer.current / 0.5) : 0, 0, 0]}>
          <CharacterAvatar 
            color={playerColor} 
            isMoving={isMoving} 
            isGrounded={isGrounded.current} 
            isRolling={isRolling.current} 
          />
        </group>
        <Billboard position={[0, 2.2, 0]}>
          <Text
            fontSize={0.3}
            color="yellow"
            anchorX="center"
            anchorY="middle"
          >
            {playerName}
          </Text>
        </Billboard>
        <ChatBubble text={lastMessage} time={lastMessageTime} />
      </group>
    </>
  );
};
