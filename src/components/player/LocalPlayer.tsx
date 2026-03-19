import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Player, DeskItem } from '../../types';
import { getDeterministicColor } from '../../constants';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_AVATAR_CONFIG } from '../../types';
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
  const lastActiveDeskIdRef = useRef<string | null>(null);
  const wasTimerActiveRef = useRef(false);

  const avatarConfig = useGameStore((state) => state.avatarConfig);
  const playerColor = avatarConfig?.shirtColor ?? getDeterministicColor(playerName);
  const physics = usePlayerPhysics();

  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const activeDeskId = useGameStore((state) => state.activeDeskId);
  const startTimer = useGameStore((state) => state.startTimer);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const isChatFocused = useGameStore((state) => state.isChatFocused);
  const timeLeft = useGameStore((state) => state.timeLeft);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);
  const roomLayout = useGameStore((state) => state.roomLayout);

  // Build AABB collision boxes for each desk based on its current position/rotation
  const deskBoxes = useMemo(() =>
    roomLayout
      .filter((f): f is DeskItem => f.type === 'desk')
      .map((desk) => {
        const [x, y, z] = desk.position;
        const rotY = desk.rotation[1];
        // Desk tabletop is 2 units wide × 1 unit deep in local space.
        // Rotate the half-extents to get a world-space AABB.
        const cosR = Math.abs(Math.cos(rotY));
        const sinR = Math.abs(Math.sin(rotY));
        const halfX = 1.0 * cosR + 0.5 * sinR;
        const halfZ = 1.0 * sinR + 0.5 * cosR;
        return new THREE.Box3(
          new THREE.Vector3(x - halfX, y, z - halfZ),
          new THREE.Vector3(x + halfX, y + 1.0, z + halfZ)
        );
      }),
    [roomLayout]
  );

  const focusProgress = isTimerActive ? 1 - timeLeft / (25 * 60) : 0;
  const sessionPaper = useGameStore((state) => state.sessionPaper);

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

    // Track active desk while session is running
    if (isTimerActive && activeDeskId) {
      lastActiveDeskIdRef.current = activeDeskId;
    }

    // Eject player from chair when session ends
    if (wasTimerActiveRef.current && !isTimerActive && lastActiveDeskIdRef.current) {
      const desk = roomLayout.find((d) => d.id === lastActiveDeskIdRef.current);
      if (desk) {
        const chairDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), desk.rotation[1]);
        const ejectedPos: [number, number, number] = [
          desk.position[0] + chairDir.x * 2.5,
          desk.position[1],
          desk.position[2] + chairDir.z * 2.5,
        ];
        const ejectedRot: [number, number, number] = [0, desk.rotation[1] + Math.PI, 0];
        setPosition(ejectedPos);
        setRotation(ejectedRot);
        socket?.connected &&
          socket.emit('playerMovement', { position: ejectedPos, rotation: ejectedRot, isRolling: false, rollTimer: 0 });
      }
      lastActiveDeskIdRef.current = null;
    }
    wasTimerActiveRef.current = isTimerActive;

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
      const desk = roomLayout.find((d) => d.id === activeDeskId);
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

    newPosition[1] = physics.applyGravity(newPosition, delta, deskBoxes);

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
      newPosition = physics.applyMovement(newPosition, moveVector, speed, players, deskBoxes);
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
            skinTone={avatarConfig?.skinTone ?? DEFAULT_AVATAR_CONFIG.skinTone}
            pantColor={avatarConfig?.pantColor ?? DEFAULT_AVATAR_CONFIG.pantColor}
          />
        </group>
        <Billboard position={[0, 2.2, 0]}>
          <Text fontSize={0.3} color="yellow" anchorX="center" anchorY="middle">
            {playerName}
          </Text>
        </Billboard>
        {isTimerActive && (
          <Billboard position={[0, 3.0, 0]}>
            {/* Outer background */}
            <mesh position={[0, 0.1, -0.001]}>
              <planeGeometry args={[1.8, sessionPaper > 0 ? 0.78 : 0.58]} />
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
            {/* Bar fill */}
            <mesh position={[-(1.6 - focusProgress * 1.6) / 2, 0, 0.001]}>
              <planeGeometry args={[Math.max(0.001, focusProgress * 1.6), 0.18]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            {/* Percent label */}
            <Text fontSize={0.1} color="white" position={[0, 0, 0.002]} anchorX="center" anchorY="middle">
              {`${Math.round(focusProgress * 100)}%`}
            </Text>
            {/* Session paper count */}
            {sessionPaper > 0 && (
              <Text fontSize={0.11} color="#86efac" position={[0, -0.22, 0.001]} anchorX="center" anchorY="middle">
                {`+${sessionPaper} paper`}
              </Text>
            )}
          </Billboard>
        )}
        <ChatBubble text={lastMessage} time={lastMessageTime} />
      </group>
    </>
  );
};
