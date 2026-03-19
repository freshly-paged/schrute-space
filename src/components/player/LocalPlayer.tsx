import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Player } from '../../types';
import { getDeterministicColor, DESKS } from '../../constants';
import { useGameStore } from '../../store/useGameStore';
import { usePlayerPhysics } from '../../hooks/usePlayerPhysics';
import { CharacterAvatar } from './CharacterAvatar';
import { ChatBubble } from '../ui/ChatBubble';

const BOUNDS = 24;
const CAMERA_BOUNDS = 24.5;

interface LocalPlayerProps {
  socket: Socket | null;
  lastMessage?: string;
  lastMessageTime?: number;
  playerName: string;
  players: Record<string, Player>;
}

export const LocalPlayer = ({
  socket,
  lastMessage,
  lastMessageTime,
  playerName,
  players,
}: LocalPlayerProps) => {
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [isMoving, setIsMoving] = useState(false);
  const [, get] = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);

  const playerColor = useMemo(() => getDeterministicColor(playerName), [playerName]);
  const physics = usePlayerPhysics();

  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const activeDeskId = useGameStore((state) => state.activeDeskId);
  const startTimer = useGameStore((state) => state.startTimer);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const isChatFocused = useGameStore((state) => state.isChatFocused);
  const timeLeft = useGameStore((state) => state.timeLeft);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);

  const focusProgress = isTimerActive ? 1 - timeLeft / (25 * 60) : 0;

  // Emit focus state to server whenever it changes
  useEffect(() => {
    if (!socket?.connected) return;
    socket.emit('playerFocusUpdate', {
      isFocused: isTimerActive,
      focusProgress,
      activeDeskId: isTimerActive ? activeDeskId : null,
    });
  }, [socket, isTimerActive, timeLeft, activeDeskId]);

  useFrame((state, delta) => {
    // Keep camera below roof
    if (state.camera.position.y > 7.5) state.camera.position.y = 7.5;

    const rawKeys = get();
    const keys =
      isChatFocused || isTimerActive
        ? { forward: false, backward: false, left: false, right: false, jump: false, interact: false }
        : rawKeys;
    const { forward, backward, left, right, jump, interact } = keys;

    setIsMoving(forward || backward || left || right);

    // Desk interaction — block if desk is occupied by another player
    if (interact && nearestDeskId && !isTimerActive && !occupiedDeskIds.includes(nearestDeskId)) {
      startTimer('focus');
    }

    // Lock to desk chair during focus session
    if (isTimerActive && activeDeskId) {
      const desk = DESKS.find((d) => d.id === activeDeskId);
      if (desk) {
        const chairOffset = new THREE.Vector3(0, 0, 0.8).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          desk.rotation[1]
        );
        const targetPos: [number, number, number] = [
          desk.position[0] + chairOffset.x,
          desk.position[1],
          desk.position[2] + chairOffset.z,
        ];
        const targetRot: [number, number, number] = [0, desk.rotation[1] + Math.PI, 0];

        const currentVec = new THREE.Vector3(...position);
        const targetVec = new THREE.Vector3(...targetPos);
        if (currentVec.distanceTo(targetVec) > 0.01) {
          const lerped = currentVec.lerp(targetVec, 0.1);
          const lerpedPos: [number, number, number] = [lerped.x, lerped.y, lerped.z];
          setPosition(lerpedPos);
          setRotation(targetRot);
          socket?.connected &&
            socket.emit('playerMovement', {
              position: lerpedPos,
              rotation: targetRot,
              isRolling: false,
              rollTimer: 0,
            });
        }
        return;
      }
    }

    const speed = (physics.isRolling.current ? 12 : 5) * delta;

    physics.processJump(jump, () => socket?.emit('chatMessage', 'PARKOUR!'));
    physics.processRoll(forward, () => socket?.emit('chatMessage', 'PARKOUR!'));
    physics.tickRoll(delta);

    let newPosition: [number, number, number] = [...position];
    let newRotation: [number, number, number] = [...rotation];

    newPosition[1] = physics.applyGravity(newPosition, delta);

    // Camera-relative movement vector
    const cameraDir = new THREE.Vector3();
    state.camera.getWorldDirection(cameraDir);
    cameraDir.y = 0;
    cameraDir.normalize();
    const cameraSide = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), cameraDir)
      .normalize();

    const moveVector = new THREE.Vector3();
    if (forward || physics.isRolling.current) moveVector.add(cameraDir);
    if (backward && !physics.isRolling.current) moveVector.sub(cameraDir);
    if (left && !physics.isRolling.current) moveVector.add(cameraSide);
    if (right && !physics.isRolling.current) moveVector.sub(cameraSide);

    if (moveVector.length() > 0) {
      newPosition = physics.applyMovement(newPosition, moveVector, speed, players);
      newRotation[1] = Math.atan2(moveVector.x, moveVector.z);
    }

    // Clamp to office bounds
    newPosition[0] = Math.max(-BOUNDS, Math.min(BOUNDS, newPosition[0]));
    newPosition[2] = Math.max(-BOUNDS, Math.min(BOUNDS, newPosition[2]));

    const hasMoved =
      newPosition[0] !== position[0] ||
      newPosition[1] !== position[1] ||
      newPosition[2] !== position[2] ||
      newRotation[1] !== rotation[1] ||
      physics.isRolling.current;

    if (hasMoved) {
      setPosition(newPosition);
      setRotation(newRotation);
      socket?.connected &&
        socket.emit('playerMovement', {
          position: newPosition,
          rotation: newRotation,
          isRolling: physics.isRolling.current,
          rollTimer: physics.rollTimer.current,
        });
    }

    // Camera follow
    if (controlsRef.current) {
      const target = new THREE.Vector3(
        Math.max(-BOUNDS, Math.min(BOUNDS, newPosition[0])),
        Math.max(0, Math.min(7.5, newPosition[1] + 1.5)),
        Math.max(-BOUNDS, Math.min(BOUNDS, newPosition[2]))
      );
      controlsRef.current.target.lerp(target, 0.1);
      controlsRef.current.update();

      const cam = state.camera;
      cam.position.x = Math.max(-CAMERA_BOUNDS, Math.min(CAMERA_BOUNDS, cam.position.x));
      cam.position.z = Math.max(-CAMERA_BOUNDS, Math.min(CAMERA_BOUNDS, cam.position.z));
      cam.position.y = Math.max(0.5, Math.min(7.5, cam.position.y));
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={Math.PI / 3}
        maxDistance={15}
        minDistance={2}
        makeDefault
      />
      <group ref={playerRef} name="localPlayer" position={position} rotation={[0, rotation[1], 0]}>
        <group
          rotation={[
            physics.isRolling.current
              ? -Math.PI * 2 * (physics.rollTimer.current / 0.5)
              : 0,
            0,
            0,
          ]}
        >
          <CharacterAvatar
            color={playerColor}
            isMoving={isMoving}
            isGrounded={physics.isGrounded.current}
            isRolling={physics.isRolling.current}
          />
        </group>
        <Billboard position={[0, 2.2, 0]}>
          <Text fontSize={0.3} color="yellow" anchorX="center" anchorY="middle">
            {playerName}
          </Text>
        </Billboard>
        {isTimerActive && (
          <Billboard position={[0, 2.7, 0]}>
            <mesh>
              <planeGeometry args={[1.0, 0.12]} />
              <meshBasicMaterial color="#1e293b" transparent opacity={0.85} />
            </mesh>
            <mesh position={[-(1 - focusProgress) / 2, 0, 0.001]}>
              <planeGeometry args={[Math.max(0.001, focusProgress), 0.09]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            <Text fontSize={0.07} color="white" position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
              FOCUS
            </Text>
          </Billboard>
        )}
        <ChatBubble text={lastMessage} time={lastMessageTime} />
      </group>
    </>
  );
};
