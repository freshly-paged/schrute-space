/**
 * OfficePlanFrame — a framed floor-plan sketch that hangs on the east-facing
 * interior surface of the manager's office east wall, visible from the working
 * area.
 *
 * Interacting with it ([E] when near) opens the Office Layout customization
 * view via the requestCustomizeOffice store flag.
 *
 * World position: x ≈ -8.8, y = 2.5, z ≈ 7 (centred on the solid section of
 * the east wall). Rotation [0, PI/2, 0] so local +z faces world +x (east).
 */
import React, { useMemo, useRef, useState } from 'react';
import { Box, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../../../store/useGameStore';
import { onOverlayTextSync } from '../../../../utils/overlayTextSync';

const FRAME_WORLD = new THREE.Vector3(-8.8, 2.5, 7);
const PROXIMITY_R = 3.0;

// ── Floor-plan sketch texture ─────────────────────────────────────────────────

function createFloorPlanTexture(): THREE.CanvasTexture {
  const W = 300, H = 200;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Aged paper background
  ctx.fillStyle = '#f8f3e3';
  ctx.fillRect(0, 0, W, H);

  // World → canvas helpers (office spans -23..23 in both X and Z)
  const sX = W / 46;
  const sZ = H / 46;
  const px = (wx: number) => (wx + 23) * sX;
  const py = (wz: number) => (wz + 23) * sZ;
  const rect = (x1: number, z1: number, x2: number, z2: number,
                fill: string, stroke: string) => {
    ctx.fillStyle = fill;
    ctx.fillRect(px(x1), py(z1), (x2 - x1) * sX, (z2 - z1) * sZ);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px(x1), py(z1), (x2 - x1) * sX, (z2 - z1) * sZ);
  };

  // Room fills (approximate for the sketch; exact values from FloorPlanRect exports)
  rect(-9,  -9,  23,  23, '#fef9c3', '#b45309'); // working area
  rect(-23,  5, -9,  19, '#dbeafe', '#1d4ed8'); // manager's office
  rect(-23, 19, -9,  23, '#e0e7ff', '#4338ca'); // entryway
  rect( -9, -23, 23,  -9, '#dcfce7', '#15803d'); // break room area
  rect(-23, -14, -9,  -4, '#f3e8ff', '#7e22ce'); // conference room
  rect(-23, -23, -9, -14, '#fef3c7', '#92400e'); // beet farm / storage

  // Outer office border
  ctx.strokeStyle = '#5c3317';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Tiny room labels
  ctx.font = 'bold 8px sans-serif';
  ctx.textAlign = 'center';
  const label = (wx: number, wz: number, text: string, color: string) => {
    ctx.fillStyle = color;
    ctx.fillText(text, px(wx), py(wz));
  };
  label(7,    7,   'WORK',  '#78350f');
  label(-16,  12,  'MGR',   '#1e3a5f');
  label(-16,  21,  'LOBBY', '#312e81');
  label(7,   -16,  'BREAK', '#14532d');
  label(-16,  -9,  'CONF',  '#581c87');

  return new THREE.CanvasTexture(canvas);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OfficePlanFrame() {
  const nearRef = useRef(false);
  const [showHint, setShowHint] = useState(false);
  const setRequestCustomizeOffice = useGameStore((s) => s.setRequestCustomizeOffice);

  useFrame((state) => {
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;
    const dx = player.position.x - FRAME_WORLD.x;
    const dz = player.position.z - FRAME_WORLD.z;
    const near = Math.sqrt(dx * dx + dz * dz) < PROXIMITY_R;
    if (near !== nearRef.current) {
      nearRef.current = near;
      setShowHint(near);
    }
  });

  const planTexture = useMemo(() => createFloorPlanTexture(), []);

  const handleClick = () => setRequestCustomizeOffice(true);

  return (
    <group
      position={[FRAME_WORLD.x, FRAME_WORLD.y, FRAME_WORLD.z]}
      rotation={[0, Math.PI / 2, 0]}
      onClick={handleClick}
    >
      {/* Dark wood outer frame — front face at z=+0.03 */}
      <Box args={[1.5, 1.1, 0.06]}>
        <meshStandardMaterial
          color="#3B2506"
          roughness={0.7}
          metalness={0.05}
          emissive={showHint ? '#6B3510' : '#000000'}
          emissiveIntensity={showHint ? 0.4 : 0}
        />
      </Box>

      {/* Cream mat border — center at z=0.04, front face at z=+0.06 */}
      <Box args={[1.28, 0.88, 0.04]} position={[0, 0, 0.04]}>
        <meshStandardMaterial color="#f5f0e0" roughness={1} />
      </Box>

      {/* Floor-plan sketch — center at z=0.08, back face at z=+0.07 (clear of mat) */}
      <Box args={[1.14, 0.74, 0.02]} position={[0, 0, 0.08]}>
        <meshStandardMaterial map={planTexture} roughness={0.9} />
      </Box>

      {/* Brass label plate below the frame */}
      <Box args={[0.55, 0.09, 0.025]} position={[0, -0.63, 0.06]}>
        <meshStandardMaterial color="#c4a045" metalness={0.75} roughness={0.25} />
      </Box>

      {showHint && (
        <Billboard position={[0, 0.88, 0]}>
          <Text
            fontSize={0.2}
            color="white"
            outlineColor="black"
            outlineWidth={0.02}
            onSync={onOverlayTextSync}
          >
            Click to Customize Office
          </Text>
        </Billboard>
      )}
    </group>
  );
}
