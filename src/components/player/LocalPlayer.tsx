import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { OrbitControls, useKeyboardControls, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Socket } from 'socket.io-client';
import { Player, DeskItem } from '../../types';
import { getDeterministicColor, COLLISION_BOXES, ROLL_PIVOT_Y } from '../../constants';
import { doorState, confDoorState, breakDoorState, playerWorldPos, DOOR_COLLISION_BOX, CONF_DOOR_COLLISION_BOX, BREAK_DOOR_COLLISION_BOX } from '../../doorState';
import { PLAYER_BOUNDS_XZ, CAMERA_MAX_Y } from '../../officeLayout';
import { useGameStore } from '../../store/useGameStore';
import { DEFAULT_AVATAR_CONFIG } from '../../types';
import { usePlayerPhysics, usePlayerPhysicsAvatarSync } from '../../hooks/usePlayerPhysics';
import { MS_BODY_THROWABLE_ID, TEAM_PYRAMID_INSPECT_ID } from '../../propIds';
import { iceCreamColorForIndex } from '../../iceCreamFlavors';
import { CharacterAvatar } from './CharacterAvatar';
import { WaterEnergyAura } from './WaterEnergyAura';
import { ChatBubble } from '../ui/ChatBubble';
import {
  PARKOUR_FOCUS_ENERGY_COST,
  PARKOUR_MIN_ENERGY_REQUIRED,
  focusWalkSpeedMultiplier,
} from '../../focusEnergyModel';
import {
  ICE_CREAM_BITE_FOCUS_ENERGY,
  ICE_CREAM_QUARTERS_MAX,
  POMODORO_FOCUS_DURATION_SEC,
} from '../../gameConfig';
import { requestFocusNotificationPermissionIfNeeded } from '../../lib/focusSessionCompleteFeedback';
import { onOverlayTextSync } from '../../utils/overlayTextSync';

function emitHeldThrowableSync(socket: Socket | null, propId: string | null) {
  if (socket?.connected) socket.emit('playerHeldThrowable', { propId });
}

// Camera is clamped within this radius of the player to prevent wall-clipping
const CAMERA_ORBIT_LEASH = 13;

const WALK_MOVE_SPEED = 6;
const ROLL_MOVE_SPEED = 18;
const MOVE_SPEED_SCALE = 1;

// Pre-allocated vectors reused every frame to avoid GC pressure
const _cameraDir = new THREE.Vector3();
const _cameraSide = new THREE.Vector3();
const _moveVector = new THREE.Vector3();
const _cameraTarget = new THREE.Vector3();
const _chairOffset = new THREE.Vector3();
const _currentVec = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);

interface LocalPlayerProps {
  socket: Socket | null;
  lastMessage?: string;
  lastMessageTime?: number;
  lastMessageDurationMs?: number;
  playerName: string;
  players: Record<string, Player>;
}

export const LocalPlayer = ({
  socket,
  lastMessage,
  lastMessageTime,
  lastMessageDurationMs,
  playerName,
  players,
}: LocalPlayerProps) => {
  // Spawn beside the entryway exit door (west wall x=-23, door centred at z=21).
  const positionRef = useRef<[number, number, number]>([-21, 0, 21]);
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
  const prevEatIceCreamRef = useRef(false);
  const cameraRayRef = useRef(new THREE.Ray());
  const cameraHitRef = useRef(new THREE.Vector3());
  const lastMovementEmitRef = useRef(0);

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

  const focusProgress = isTimerActive ? 1 - timeLeft / POMODORO_FOCUS_DURATION_SEC : 0;
  const sessionPaper = useGameStore((state) => state.sessionPaper);

  // Snap OrbitControls target to spawn position on first mount so the camera
  // doesn't slowly drift from [0,0,0] to the actual spawn location.
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const [x, , z] = positionRef.current;
    controls.target.set(x, 1.5, z);
    controls.update();
  }, []);

  // Emit focus state to server whenever it changes
  useEffect(() => {
    if (!socket) return;
    socket.emit('playerFocusUpdate', {
      isFocused: isTimerActive,
      focusProgress,
      activeDeskId: isTimerActive ? activeDeskId : null,
      focusSitPoseIndex: isTimerActive ? focusSitPoseIndex : undefined,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, isTimerActive, activeDeskId, focusSitPoseIndex]);

  useFrame((state, delta) => {
    // Keep camera below ceiling
    if (state.camera.position.y > CAMERA_MAX_Y) state.camera.position.y = CAMERA_MAX_Y;

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

    const blockMovement = isChatFocused || isTimerActive || isInspecting || showVendingMenu;
    const keys = blockMovement
      ? {
          forward: false,
          backward: false,
          left: false,
          right: false,
          jump: false,
          interact: false,
          computer: false,
          drop: false,
          eatIceCream:
            !isChatFocused && !isInspecting && !showVendingMenu ? rawKeys.eatIceCream : false,
        }
      : rawKeys;
    const { forward, backward, left, right, jump, interact, computer, drop, eatIceCream } = keys;

    setIsMoving(forward || backward || left || right);

    // Edge-triggered interact / drop (single keypress, not held)
    const interactEdge = interact && !prevInteractRef.current;
    prevInteractRef.current = interact;
    const computerEdge = computer && !prevComputerRef.current;
    prevComputerRef.current = computer;
    const dropEdge = drop && !prevDropRef.current;
    prevDropRef.current = drop;
    const eatIceCreamEdge = eatIceCream && !prevEatIceCreamRef.current;
    prevEatIceCreamRef.current = eatIceCream;

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
        if (nearThrowableId !== TEAM_PYRAMID_INSPECT_ID) {
          pickUpObject(nearThrowableId);
          emitHeldThrowableSync(socket, nearThrowableId);
        }
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

    if (eatIceCreamEdge) {
      const iceNow = useGameStore.getState().heldIceCream;
      const objId = useGameStore.getState().heldObjectId;
      if (
        iceNow &&
        Date.now() < iceNow.expiresAt &&
        objId === null &&
        iceNow.remainingQuarters >= 1
      ) {
        const st = useGameStore.getState();
        st.setFocusEnergy(st.focusEnergy + ICE_CREAM_BITE_FOCUS_ENERGY);
        const nextQ = iceNow.remainingQuarters - 1;
        if (nextQ <= 0) {
          useGameStore.getState().setHeldIceCream(null);
          socket?.connected && socket.emit('playerIceCream', { flavorIndex: null, expiresAt: null });
        } else {
          useGameStore.getState().setHeldIceCream({ ...iceNow, remainingQuarters: nextQ });
          socket?.connected &&
            socket.emit('playerIceCream', {
              flavorIndex: iceNow.flavorIndex,
              expiresAt: iceNow.expiresAt,
              remainingQuarters: nextQ,
            });
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
      requestFocusNotificationPermissionIfNeeded();
      startTimer('focus');
    }

    // Lock to desk chair during focus session
    if (isTimerActive && activeDeskId) {
      const desk = roomLayout.find((d) => d.id === activeDeskId);
      if (desk) {
        _chairOffset.set(0, 0, 0.8).applyAxisAngle(_upAxis, desk.rotation[1]);
        const targetPos: [number, number, number] = [
          desk.position[0] + _chairOffset.x,
          desk.position[1],
          desk.position[2] + _chairOffset.z,
        ];
        const targetRot: [number, number, number] = [0, desk.rotation[1] + Math.PI, 0];

        _currentVec.set(positionRef.current[0], positionRef.current[1], positionRef.current[2]);
        _targetVec.set(targetPos[0], targetPos[1], targetPos[2]);
        if (_currentVec.distanceTo(_targetVec) > 0.01) {
          _currentVec.lerp(_targetVec, 0.1);
          const lerpedPos: [number, number, number] = [_currentVec.x, _currentVec.y, _currentVec.z];
          positionRef.current = lerpedPos;
          rotationRef.current = targetRot;
          if (playerRef.current) {
            playerRef.current.position.set(...lerpedPos);
            playerRef.current.rotation.set(0, targetRot[1], 0);
          }
          if (socket?.connected) {
            const now = performance.now();
            if (now - lastMovementEmitRef.current >= 50) {
              socket.emit('playerMovement', {
                position: lerpedPos,
                rotation: targetRot,
                isRolling: false,
                rollTimer: 0,
              });
              lastMovementEmitRef.current = now;
            }
          }
        }

        // Apply camera follow and bounds clamping during focus session
        if (controlsRef.current) {
          const focusPos = positionRef.current;
          _cameraTarget.set(
            Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, focusPos[0])),
            Math.max(0, Math.min(CAMERA_MAX_Y, focusPos[1] + 1.5)),
            Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, focusPos[2]))
          );
          controlsRef.current.target.lerp(_cameraTarget, 0.08);
          controlsRef.current.update();

          const cam = state.camera;
          const px = focusPos[0];
          const pz = focusPos[2];
          cam.position.x = Math.max(
            Math.max(-PLAYER_BOUNDS_XZ, px - CAMERA_ORBIT_LEASH),
            Math.min(Math.min(PLAYER_BOUNDS_XZ, px + CAMERA_ORBIT_LEASH), cam.position.x)
          );
          cam.position.z = Math.max(
            Math.max(-PLAYER_BOUNDS_XZ, pz - CAMERA_ORBIT_LEASH),
            Math.min(Math.min(PLAYER_BOUNDS_XZ, pz + CAMERA_ORBIT_LEASH), cam.position.z)
          );
          cam.position.y = Math.max(0.5, Math.min(CAMERA_MAX_Y, cam.position.y));

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

        return;
      }
    }

    const rolling = physics.isRolling.current;
    const walkEnergyMult = rolling ? 1 : focusWalkSpeedMultiplier(useGameStore.getState().focusEnergy);
    const speed =
      (rolling ? ROLL_MOVE_SPEED : WALK_MOVE_SPEED) * walkEnergyMult * MOVE_SPEED_SCALE * delta;

    const tryParkourEnergy = () => {
      const s = useGameStore.getState();
      if (s.focusEnergy < PARKOUR_MIN_ENERGY_REQUIRED) {
        s.flashParkourEnergyInsufficientHint();
        return false;
      }
      return s.consumeFocusEnergy(PARKOUR_FOCUS_ENERGY_COST);
    };
    physics.processJump(jump, {
      onDoubleJump: () => socket?.emit('chatMessage', 'PARKOUR!'),
      tryConsumeParkourEnergy: tryParkourEnergy,
    });
    physics.processRoll(forward, {
      onRoll: () => socket?.emit('chatMessage', 'PARKOUR!'),
      tryConsumeParkourEnergy: tryParkourEnergy,
    });
    physics.tickRoll(delta);

    let newPosition: [number, number, number] = [...positionRef.current];
    let newRotation: [number, number, number] = [...rotationRef.current];

    const extraBoxes = [
      ...deskBoxes,
      ...(doorState.open      ? [] : [DOOR_COLLISION_BOX]),
      ...(confDoorState.open  ? [] : [CONF_DOOR_COLLISION_BOX]),
      ...(breakDoorState.open ? [] : [BREAK_DOOR_COLLISION_BOX]),
    ];
    newPosition[1] = physics.applyGravity(newPosition, delta, extraBoxes);

    // Camera-relative movement vector
    state.camera.getWorldDirection(_cameraDir);
    _cameraDir.y = 0;
    _cameraDir.normalize();
    _cameraSide.crossVectors(_upAxis, _cameraDir).normalize();

    _moveVector.set(0, 0, 0);
    if (forward || physics.isRolling.current) _moveVector.add(_cameraDir);
    if (backward && !physics.isRolling.current) _moveVector.sub(_cameraDir);
    if (left && !physics.isRolling.current) _moveVector.add(_cameraSide);
    if (right && !physics.isRolling.current) _moveVector.sub(_cameraSide);

    if (_moveVector.length() > 0) {
      newPosition = physics.applyMovement(newPosition, _moveVector, speed, players, extraBoxes);
      newRotation[1] = Math.atan2(_moveVector.x, _moveVector.z);
    }

    // Clamp to office bounds
    newPosition[0] = Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, newPosition[0]));
    newPosition[2] = Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, newPosition[2]));

    // Keep shared world position up to date for proximity checks in other components
    playerWorldPos.set(newPosition[0], newPosition[1], newPosition[2]);

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
      if (socket?.connected) {
        const now = performance.now();
        if (now - lastMovementEmitRef.current >= 50) {
          socket.emit('playerMovement', {
            position: newPosition,
            rotation: newRotation,
            isRolling: physics.isRolling.current,
            rollTimer: physics.rollTimer.current,
          });
          lastMovementEmitRef.current = now;
        }
      }
    }

    // Camera follow
    if (controlsRef.current) {
      _cameraTarget.set(
        Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, newPosition[0])),
        Math.max(0, Math.min(CAMERA_MAX_Y, newPosition[1] + 1.5)),
        Math.max(-PLAYER_BOUNDS_XZ, Math.min(PLAYER_BOUNDS_XZ, newPosition[2]))
      );
      controlsRef.current.target.lerp(_cameraTarget, 0.08);
      controlsRef.current.update();

      const cam = state.camera;
      // Clamp camera both within world bounds AND within orbit leash of player
      // to prevent clipping through walls.
      const px = newPosition[0];
      const pz = newPosition[2];
      cam.position.x = Math.max(
        Math.max(-PLAYER_BOUNDS_XZ, px - CAMERA_ORBIT_LEASH),
        Math.min(Math.min(PLAYER_BOUNDS_XZ, px + CAMERA_ORBIT_LEASH), cam.position.x)
      );
      cam.position.z = Math.max(
        Math.max(-PLAYER_BOUNDS_XZ, pz - CAMERA_ORBIT_LEASH),
        Math.min(Math.min(PLAYER_BOUNDS_XZ, pz + CAMERA_ORBIT_LEASH), cam.position.z)
      );
      cam.position.y = Math.max(0.5, Math.min(CAMERA_MAX_Y, cam.position.y));

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
                  heldIceCream.remainingQuarters >= 1 &&
                  heldObjectId === null
                    ? iceCreamColorForIndex(heldIceCream.flavorIndex)
                    : null
                }
                heldIceCreamRemainingQuarters={heldIceCream?.remainingQuarters ?? ICE_CREAM_QUARTERS_MAX}
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
              onSync={onOverlayTextSync}
            >
              [E] Take off Michael Suit
            </Text>
          </Billboard>
        )}
        {heldIceCream &&
          Date.now() < heldIceCream.expiresAt &&
          heldIceCream.remainingQuarters >= 1 &&
          heldObjectId === null &&
          !isChatFocused &&
          !isInspecting &&
          !showVendingMenu && (
            <Billboard position={[0, 1.42, 0.48]}>
              <Text
                fontSize={0.14}
                color="#fdf4ff"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.008}
                outlineColor="black"
                onSync={onOverlayTextSync}
              >
                Press [B] to eat your ice cream
              </Text>
            </Billboard>
          )}
        {isTimerActive && (
          <Billboard position={[0, 3.0, 0]}>
            {/* Outer background */}
            <mesh position={[0, 0.1, -0.001]} scale={[1.8, sessionPaper > 0 ? 0.78 : 0.58, 1]}>
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
            {/* Session paper count */}
            {sessionPaper > 0 && (
              <Text fontSize={0.11} color="#86efac" position={[0, -0.22, 0.001]} anchorX="center" anchorY="middle">
                {`+${sessionPaper} paper`}
              </Text>
            )}
          </Billboard>
        )}
        <ChatBubble text={lastMessage} time={lastMessageTime} durationMs={lastMessageDurationMs} />
      </group>
    </>
  );
};
