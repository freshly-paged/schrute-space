import React, { useEffect, useRef, useState } from 'react';
import { Billboard, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  TEAM_PYRAMID_INSPECT_RADIUS,
  TEAM_PYRAMID_WORLD_POSITION,
} from '../../../officeLayout';
import { TEAM_PYRAMID_INSPECT_ID } from '../../../propIds';
import { useGameStore } from '../../../store/useGameStore';
import { onOverlayTextSync } from '../../../utils/overlayTextSync';
import { TeamPyramidTabletMesh } from './TeamPyramidTabletMesh';

const TEAM_PYRAMID_VIDEO_URL = 'https://www.youtube.com/watch?v=yZBVnjXp7GQ';
const TEAM_PYRAMID_VIDEO_URL_ALT = 'https://www.youtube.com/watch?v=800IKHVVIH4';

const INSPECT_DESCRIPTION =
  'The Sabre Pyramid from The Office — ' +
  'the device that was going to replace paper forever. ' +
  'While this is active, everyone in the room earns 50% more paper reams during focus sessions. ' +
  'Below are clips from the show for context.';

/**
 * Floating inspect-only prop when the room Team Pyramid buff is active.
 */
export function TeamPyramidProp() {
  const groupRef = useRef<THREE.Group>(null);
  const worldPos = useRef(new THREE.Vector3());
  const expiresAt = useGameStore((s) => s.teamPyramidBuffExpiresAt);
  const setNearThrowable = useGameStore((s) => s.setNearThrowable);
  const setTeamPyramidBuffExpiresAt = useGameStore((s) => s.setTeamPyramidBuffExpiresAt);
  const nearThrowableId = useGameStore((s) => s.nearThrowableId);
  const [, setUiTick] = useState(0);

  useEffect(() => {
    if (expiresAt == null) return;
    const id = window.setInterval(() => setUiTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF') return;
      const s = useGameStore.getState();
      if (s.nearThrowableId !== TEAM_PYRAMID_INSPECT_ID) return;
      if (s.isChatFocused || s.inspectedObject !== null) return;
      s.openInspect({
        id: TEAM_PYRAMID_INSPECT_ID,
        label: 'Team Pyramid',
        description: INSPECT_DESCRIPTION,
        assetKey: '',
        previewKind: 'pyramid',
        linkUrl: TEAM_PYRAMID_VIDEO_URL,
        linkLabel: 'The Power of the Pyramid (YouTube)',
        secondaryLinkUrl: TEAM_PYRAMID_VIDEO_URL_ALT,
        secondaryLinkLabel: 'Launch of the Pyramid (YouTube)',
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const now = Date.now();
  const buffActive = expiresAt != null && Number.isFinite(expiresAt) && now < expiresAt;

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;

    const exp = useGameStore.getState().teamPyramidBuffExpiresAt;
    if (exp != null && Date.now() >= exp) {
      setTeamPyramidBuffExpiresAt(null);
      if (useGameStore.getState().nearThrowableId === TEAM_PYRAMID_INSPECT_ID) {
        setNearThrowable(null);
      }
      return;
    }
    if (exp == null) return;

    const t = state.clock.elapsedTime;
    g.position.x = TEAM_PYRAMID_WORLD_POSITION[0];
    g.position.z = TEAM_PYRAMID_WORLD_POSITION[2];
    g.position.y = TEAM_PYRAMID_WORLD_POSITION[1] + Math.sin(t * 1.2) * 0.12;
    // Upright tablet: spin around world Y so the triangle face stays vertical.
    g.rotation.y = t * 0.65;

    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;
    g.getWorldPosition(worldPos.current);
    const px = player.position.x;
    const pz = player.position.z;
    const dx = px - worldPos.current.x;
    const dz = pz - worldPos.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const near = dist < TEAM_PYRAMID_INSPECT_RADIUS;
    const gs = useGameStore.getState();
    if (near && (gs.nearThrowableId === null || gs.nearThrowableId === TEAM_PYRAMID_INSPECT_ID)) {
      if (gs.nearThrowableId !== TEAM_PYRAMID_INSPECT_ID) {
        setNearThrowable(TEAM_PYRAMID_INSPECT_ID);
      }
    } else if (!near && gs.nearThrowableId === TEAM_PYRAMID_INSPECT_ID) {
      setNearThrowable(null);
    }
  });

  if (!buffActive) return null;

  const showPrompt = nearThrowableId === TEAM_PYRAMID_INSPECT_ID;

  return (
    <group
      ref={groupRef}
      position={[
        TEAM_PYRAMID_WORLD_POSITION[0],
        TEAM_PYRAMID_WORLD_POSITION[1],
        TEAM_PYRAMID_WORLD_POSITION[2],
      ]}
    >
      <group scale={2.05}>
        <TeamPyramidTabletMesh />
      </group>
      {showPrompt && (
        <Billboard position={[0, 1.15, 0]}>
          <Text
            fontSize={0.16}
            color="#d8b4fe"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.012}
            outlineColor="black"
            onSync={onOverlayTextSync}
          >
            [F] Inspect
          </Text>
        </Billboard>
      )}
    </group>
  );
}
