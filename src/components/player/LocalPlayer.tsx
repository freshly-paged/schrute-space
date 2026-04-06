import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Player, DeskItem } from '../../types';
import { getDeterministicColor, COLLISION_BOXES, ROLL_PIVOT_Y } from '../../constants';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_AVATAR_CONFIG } from '../../types';
import { usePlayerPhysics, usePlayerPhysicsAvatarSync } from '../../hooks/usePlayerPhysics';
import { MS_BODY_THROWABLE_ID } from '../../propIds';
import { iceCreamColorForIndex } from '../../iceCreamFlavors';
import { CharacterAvatar } from './CharacterAvatar';
import { WaterEnergyAura } from './WaterEnergyAura';
import { ChatBubble } from '../ui/ChatBubble';

function emitHeldThrowableSync(socket: Socket | null, propId: string | null) {
  if (socket?.connected) socket.emit('playerHeldThrowable', { propId });
}

const BOUNDS = 22;
const CAMERA_BOUNDS = 22;
// Camera is clamped within this radius of the player to prevent wall-clipping
const CAMERA_ORBIT_LEASH = 13;

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
  const positionRef = useRef<[number, number, number]>([0, 0, 0]);
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [isMoving, setIsMoving] = useState(false);
  const [, get] = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null);
  const rollGroupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const lastActiveDeskIdRef = useRef<string | null>(null);
  const wasTimerActiveRef = useRef(false);
  const prevInteractRef = useRef(false);
  const prevComputerRef = useRef(false);
  const prevDropRef = useRef(false);
  const cameraRayRef = useRef(new THREE.Ray());
  const cameraHitRef = useRef(new THREE.Vector3());

  const avatarConfig = useGameStore((state) => state.avatarConfig);
  const playerColor = avatarConfig?.shirtColor ?? getDeterministicColor(playerName);
  const physics = usePlayerPhysics();
  const avatarPhysics = usePlayerPhysicsAvatarSync(physics);

  const nearestDeskId = useGameStore((state) => state.nearestDeskId);
  const activeDeskId = useGameStore((state) => state.activeDeskId);
  const startTimer = useGameStore((state) => state.startTimer);
  const isTimerActive = useGameStore((state) => state.isTimerActive);
  const isChatFocused = useGameStore((state) => state.isChatFocused);
  const isInspecting = useGameStore((state) => state.inspectedObject !== null);
  const showVendingMenu = useGameStore((state) => state.showVendingMenu);
  const timeLeft = useGameStore((state) => state.timeLeft);
  const focusSitPoseIndex = useGameStore((state) => state.focusSitPoseIndex);
  const occupiedDeskIds = useGameStore((state) => state.occupiedDeskIds);
  const roomLayout = useGameStore((state) => state.roomLayout);
  const wornPropId = useGameStore((state) => state.wornPropId);
  const heldIceCream = useGameStore((state) => state.heldIceCream);
  const heldObjectId = useGameStore((state) => state.heldObjectId);

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
    if (!socket) return;
    socket.emit('playerFocusUpdate', {
      isFocused: isTimerActive,
      focusProgress,
      activeDeskId: isTimerActive ? activeDeskId : null,
      focusSitPoseIndex: isTimerActive ? focusSitPoseIndex : undefined,
    });
  }, [socket, isTimerActive, timeLeft, activeDeskId, focusSitPoseIndex]);

  useFrame((state, delta) => {
    // Keep camera below roof
    if (state.camera.position.y > 7.5) state.camera.position.y = 7.5;

    const ice = useGameStore.getState().heldIceCream;
    if (ice && Date.now() >= ice.expiresAt) {
      useGameStore.getState().setHeldIceCream(null);
      socket?.connected && socket.emit('playerIceCream', { flavorIndex: null, expiresAt: null });
    }

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
        positionRef.current = ejectedPos;
        rotationRef.current = ejectedRot;
        if (playerRef.current) {
          playerRef.current.position.set(...ejectedPos);
          playerRef.current.rotation.set(0, ejectedRot[1], 0);
        }
        socket?.connected &&
          socket.emit('playerMovement', { position: ejectedPos, rotation: ejectedRot, isRolling: false, rollTimer: 0 });
      }
      lastActiveDeskIdRef.current = null;
    }
    wasTimerActiveRef.current = isTimerActive;

    const rawKeys = get();

    const keys =
      isChatFocused || isTimerActive || isInspecting || showVendingMenu
        ? { forward: false, backward: false, left: false, right: false, jump: false, interact: false, computer: false, drop: false }
        : rawKeys;
    const { forward, backward, left, right, jump, interact, computer, drop } = keys;

    setIsMoving(forward || backward || left || right);

    // Edge-triggered interact / drop (single keypress, not held)
    const interactEdge = interact && !prevInteractRef.current;
    prevInteractRef.current = interact;
    const computerEdge = computer && !prevComputerRef.current;
    prevComputerRef.current = computer;
    const dropEdge = drop && !prevDropRef.current;
    prevDropRef.current = drop;

    // Throwable object interactions take priority over desk interactions
    let interactConsumed = false;
    if (interactEdge) {
      const {
        heldObjectId,
        nearThrowableId,
        pickUpObject,
        dropObject,
        wearHeldProp,
        clearWornProp,
        wornPropId: wornId,
      } = useGameStore.getState();

      if (wornId === MS_BODY_THROWABLE_ID) {
        const feet: [number, number, number] = [positionRef.current[0], 0.15, positionRef.current[2]];
        const rot: [number, number, number] = [0, rotationRef.current[1], 0];
        clearWornProp();
        socket?.emit('playerWornProp', { propId: null });
        socket?.emit('throwableRestSync', {
          throwableId: MS_BODY_THROWABLE_ID,
          position: feet,
          rotation: rot,
        });
        interactConsumed = true;
      } else if (heldObjectId !== null) {
        if (heldObjectId === MS_BODY_THROWABLE_ID) {
          wearHeldProp(MS_BODY_THROWABLE_ID);
          emitHeldThrowableSync(socket, null);
          socket?.emit('playerWornProp', { propId: MS_BODY_THROWABLE_ID });
          socket?.connected &&
            socket.emit(
              'chatMessage',
              'Am I a hero？I really can\'t say, but yes.'
            );
        } else {
          dropObject();
          emitHeldThrowableSync(socket, null);
        }
        interactConsumed = true;
      } else if (nearThrowableId !== null) {
        pickUpObject(nearThrowableId);
        emitHeldThrowableSync(socket, nearThrowableId);
        interactConsumed = true;
      }
    }

    // Throw in the camera's forward direction with a fixed upward arc (wearables put down with G instead)
    if (dropEdge) {
      const { heldObjectId, throwObject, dropObject } = useGameStore.getState();
      if (heldObjectId !== null) {
        if (heldObjectId === MS_BODY_THROWABLE_ID) {
          dropObject();
          emitHeldThrowableSync(socket, null);
          const feet: [number, number, number] = [positionRef.current[0], 0.15, positionRef.current[2]];
          const rot: [number, number, number] = [0, rotationRef.current[1], 0];
          socket?.emit('throwableRestSync', {
            throwableId: MS_BODY_THROWABLE_ID,
            position: feet,
            rotation: rot,
          });
        } else {
          const camDir = new THREE.Vector3();
          state.camera.getWorldDirection(camDir);
          camDir.y = 0;
          camDir.normalize();
          throwObject([camDir.x * 10, 5, camDir.z * 10]);
          emitHeldThrowableSync(socket, null);
        }
      }
    }

    // Whiteboard interaction — open leaderboard
    if (!interactConsumed && interactEdge) {
      const { nearWhiteboard, setShowLeaderboard } = useGameStore.getState();
      if (nearWhiteboard) {
        setShowLeaderboard(true);
        interactConsumed = true;
      }
    }

    if (!interactConsumed && interactEdge) {
      const { nearVendingMachine, setShowVendingMenu } = useGameStore.getState();
      if (nearVendingMachine) {
        setShowVendingMenu(true);
        interactConsumed = true;
      }
    }

    // Computer (F) — open interface at own desk
    if (computerEdge && nearestDeskId) {
      const { user, setShowComputerInterface } = useGameStore.getState();
      if (user && nearestDeskId === `desk-${user.email}`) {
        setShowComputerInterface(true);
      }
    }

    // Desk focus (E) — unchanged, works at any desk including own
    if (!interactConsumed && interact && nearestDeskId && !isTimerActive && !occupiedDeskIds.includes(nearestDeskId)) {
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

        const currentVec = new THREE.Vector3(...positionRef.current);
        const targetVec = new THREE.Vector3(...targetPos);
        if (currentVec.distanceTo(targetVec) > 0.01) {
          const lerped = currentVec.lerp(targetVec, 0.1);
          const lerpedPos: [number, number, number] = [lerped.x, lerped.y, lerped.z];
          positionRef.current = lerpedPos;
          rotationRef.current = targetRot;
          if (playerRef.current) {
            playerRef.current.position.set(...lerpedPos);
            playerRef.current.rotation.set(0, targetRot[1], 0);
          }
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

    let newPosition: [number, number, number] = [...positionRef.current];
    let newRotation: [number, number, number] = [...rotationRef.current];

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
      newPosition[0] !== positionRef.current[0] ||
      newPosition[1] !== positionRef.current[1] ||
      newPosition[2] !== positionRef.current[2] ||
      newRotation[1] !== rotationRef.current[1] ||
      physics.isRolling.current;

    if (hasMoved) {
      positionRef.current = newPosition;
      rotationRef.current = newRotation;
      if (playerRef.current) {
        playerRef.current.position.set(...newPosition);
        playerRef.current.rotation.set(0, newRotation[1], 0);
      }
      if (rollGroupRef.current) {
        rollGroupRef.current.rotation.set(
          physics.isRolling.current ? -Math.PI * 2 * (physics.rollTimer.current / 0.5) : 0,
          0, 0
        );
      }
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
      controlsRef.current.target.lerp(target, 0.08);
      controlsRef.current.update();

      const cam = state.camera;
      // Clamp camera both within world bounds AND within orbit leash of player
      // to prevent clipping through walls.
      const px = newPosition[0];
      const pz = newPosition[2];
      cam.position.x = Math.max(
        Math.max(-CAMERA_BOUNDS, px - CAMERA_ORBIT_LEASH),
        Math.min(Math.min(CAMERA_BOUNDS, px + CAMERA_ORBIT_LEASH), cam.position.x)
      );
      cam.position.z = Math.max(
        Math.max(-CAMERA_BOUNDS, pz - CAMERA_ORBIT_LEASH),
        Math.min(Math.min(CAMERA_BOUNDS, pz + CAMERA_ORBIT_LEASH), cam.position.z)
      );
      cam.position.y = Math.max(0.5, Math.min(7.5, cam.position.y));

      // Camera wall-clip prevention: ray-cast from orbit target toward the camera.
      // If any wall box sits between them, pull the camera in to just in front of it.
      const orbitTarget = controlsRef.current.target;
      cameraRayRef.current.origin.copy(orbitTarget);
      cameraRayRef.current.direction
        .subVectors(cam.position, orbitTarget)
        .normalize();
      const desiredDist = cam.position.distanceTo(orbitTarget);
      let nearestDist = desiredDist;

      for (const box of COLLISION_BOXES) {
        if (cameraRayRef.current.intersectBox(box, cameraHitRef.current)) {
          const d = orbitTarget.distanceTo(cameraHitRef.current);
          if (d < nearestDist) nearestDist = d;
        }
      }

      if (nearestDist < desiredDist) {
        cam.position
          .copy(orbitTarget)
          .addScaledVector(cameraRayRef.current.direction, Math.max(nearestDist - 0.3, 1.0));
      }
    }
  });

  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 4}
        maxDistance={15}
        minDistance={3}
        enableDamping
        dampingFactor={0.08}
        makeDefault
      />
      <group ref={playerRef} name="localPlayer">
        <group position={[0, ROLL_PIVOT_Y, 0]}>
          <group ref={rollGroupRef}>
            <group position={[0, -ROLL_PIVOT_Y, 0]}>
              <WaterEnergyAura />
              <CharacterAvatar
                color={playerColor}
                isMoving={isMoving}
                isGrounded={avatarPhysics.grounded}
                isRolling={avatarPhysics.rolling}
                skinTone={avatarConfig?.skinTone ?? DEFAULT_AVATAR_CONFIG.skinTone}
                pantColor={avatarConfig?.pantColor ?? DEFAULT_AVATAR_CONFIG.pantColor}
                wornUpperPropId={wornPropId === MS_BODY_THROWABLE_ID ? MS_BODY_THROWABLE_ID : null}
                heldIceCreamColor={
                  heldIceCream &&
                  Date.now() < heldIceCream.expiresAt &&
                  heldObjectId === null
                    ? iceCreamColorForIndex(heldIceCream.flavorIndex)
                    : null
                }
                isFocused={isTimerActive}
                focusSitPoseIndex={focusSitPoseIndex}
              />
            </group>
          </group>
        </group>
        <Billboard position={[0, 2.2, 0]}>
          <Text fontSize={0.3} color="yellow" anchorX="center" anchorY="middle">
            {playerName}
          </Text>
        </Billboard>
        {wornPropId === MS_BODY_THROWABLE_ID && (
          <Billboard position={[0, 1.18, 0.42]}>
            <Text
              fontSize={0.14}
              color="#a5f3fc"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.008}
              outlineColor="black"
            >
              [E] Take off Michael Suit
            </Text>
          </Billboard>
        )}
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
