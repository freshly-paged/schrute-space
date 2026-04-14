import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Box, Plane } from '@react-three/drei'; // Plane used for floor only
import { CeilingLights } from './working-area/props/CeilingLights';
import { OfficeWindow } from './shared/props/OfficeWindow';
import { WorkingArea, FLOOR_PLAN_RECT as WORKING_AREA_RECT } from './working-area/WorkingArea';
import { OFFICE_CEILING_Y } from '../../officeLayout';
import { BreakRoom } from './break-room/BreakRoom';
import { ConferenceRoom, FLOOR_PLAN_RECT as CONFERENCE_ROOM_RECT } from './conference-room/ConferenceRoom';
import { ManagersOffice, FLOOR_PLAN_RECT as MANAGERS_OFFICE_RECT } from './managers-office/ManagersOffice';
import { DundieAward } from './managers-office/props/DundieAward';
import { DwightBobblehead } from './managers-office/props/DwightBobblehead';
import { MsBodySuit } from './managers-office/props/MsBodySuit';
import { TeamPyramidProp } from './working-area/TeamPyramidProp';


// Window centres along the north/south walls (x varies)
const NS_WINDOW_XS: number[] = [-16, -9, -2, 5, 12];
// Window centres along the east/west walls (z varies)
const EW_WINDOW_ZS: number[] = [-14, -7, 0, 7, 14];
const WINDOW_Y = 3.0;

function createTileTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Tile base
  ctx.fillStyle = '#d8d4cc';
  ctx.fillRect(0, 0, size, size);
  // Grout border
  ctx.strokeStyle = '#b8b2a8';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(23, 23); // 2×2 world-unit tiles across the 46×46 floor
  return tex;
}

function createCarpetTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = '#8A8482';
  ctx.fillRect(0, 0, size, size);

  // Dense short pile strokes — lighter tips, darker roots — direction varies via
  // a deterministic sine wave so the result is consistent across renders.
  const SPACING = 3;
  const PILE_LEN = 5;
  for (let px = 0; px < size; px += SPACING) {
    for (let py = 0; py < size; py += SPACING) {
      // Subtle directional wave so adjacent tufts lean slightly differently
      const angle = Math.sin(px * 0.08) * Math.cos(py * 0.08) * 0.5;
      const dx = Math.sin(angle) * PILE_LEN;
      const dy = -Math.abs(Math.cos(angle)) * PILE_LEN; // pile grows "upward" in UV space

      // Dark root
      ctx.strokeStyle = '#6A6260';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + dx * 0.45, py + dy * 0.45);
      ctx.stroke();

      // Light tip
      ctx.strokeStyle = '#A49E9C';
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(px + dx * 0.45, py + dy * 0.45);
      ctx.lineTo(px + dx, py + dy);
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(21, 21);
  return tex;
}

// Rooms that get carpet, derived from each room's exported FLOOR_PLAN_RECT.
// Width / depth / centre are computed so this stays in sync if room bounds change.
const CARPET_RECTS = [WORKING_AREA_RECT, CONFERENCE_ROOM_RECT, MANAGERS_OFFICE_RECT];

function createCeilingTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Acoustic tile base — off-white
  ctx.fillStyle = '#e8e6e2';
  ctx.fillRect(0, 0, size, size);
  // Grid lines dividing into 4 panels (2×2 layout in the tile)
  ctx.strokeStyle = '#c8c4be';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, size / 2 - 6, size / 2 - 6);
  ctx.strokeRect(size / 2 + 3, 3, size / 2 - 6, size / 2 - 6);
  ctx.strokeRect(3, size / 2 + 3, size / 2 - 6, size / 2 - 6);
  ctx.strokeRect(size / 2 + 3, size / 2 + 3, size / 2 - 6, size / 2 - 6);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12); // ~3.8-unit tiles across the 46×46 ceiling
  return tex;
}

export const OfficeEnvironment = () => {
  const tileTexture = useMemo(() => createTileTexture(), []);
  const ceilingTexture = useMemo(() => createCeilingTexture(), []);
  const carpetTexture = useMemo(() => createCarpetTexture(), []);

  return (
  <group>
    {/* Floor */}
    <Plane args={[46, 46]} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <meshStandardMaterial map={tileTexture} />
    </Plane>

    {/* Perimeter walls */}
    <Box args={[46, OFFICE_CEILING_Y, 0.5]} position={[0, OFFICE_CEILING_Y / 2, -23]}>
      <meshStandardMaterial color="#D8D0B8" />
    </Box>
    <Box args={[46, OFFICE_CEILING_Y, 0.5]} position={[0, OFFICE_CEILING_Y / 2, 23]}>
      <meshStandardMaterial color="#D8D0B8" />
    </Box>
    <Box args={[0.5, OFFICE_CEILING_Y, 46]} position={[-23, OFFICE_CEILING_Y / 2, 0]}>
      <meshStandardMaterial color="#D8D0B8" />
    </Box>
    <Box args={[0.5, OFFICE_CEILING_Y, 46]} position={[23, OFFICE_CEILING_Y / 2, 0]}>
      <meshStandardMaterial color="#D8D0B8" />
    </Box>

    {/* Ceiling — thin box so the bottom face is always visible from inside */}
    <Box args={[46, 0.2, 46]} position={[0, OFFICE_CEILING_Y + 0.1, 0]}>
      <meshStandardMaterial map={ceilingTexture} />
    </Box>

    {/* Carpet — laid just above the tile floor in all rooms except the break room */}
    {CARPET_RECTS.map((rect) => {
      const w = rect.x2 - rect.x1;
      const d = rect.z2 - rect.z1;
      const cx = (rect.x1 + rect.x2) / 2;
      const cz = (rect.z1 + rect.z2) / 2;
      return (
        <Plane
          key={rect.label}
          args={[w, d]}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[cx, 0.005, cz]}
        >
          <meshStandardMaterial map={carpetTexture} roughness={1} metalness={0} />
        </Plane>
      );
    })}

    {/* North wall windows (face into room = +z); skip x=−9 which aligns with the break room west wall and renders half-clipped */}
    {NS_WINDOW_XS.filter(x => x !== -9).map((x) => (
      <OfficeWindow key={`win-n-${x}`} position={[x, WINDOW_Y, -22.75]} />
    ))}

    {/* South wall windows (face into room = -z) */}
    {NS_WINDOW_XS.map((x) => (
      <OfficeWindow key={`win-s-${x}`} position={[x, WINDOW_Y, 22.75]} rotation={[0, Math.PI, 0]} />
    ))}

    {/* East wall windows (face into room = -x); skip z=−7 which sits too close to the break room south wall */}
    {EW_WINDOW_ZS.filter(z => z !== -7).map((z) => (
      <OfficeWindow key={`win-e-${z}`} position={[22.75, WINDOW_Y, z]} rotation={[0, -Math.PI / 2, 0]} />
    ))}

    {/* West wall windows (face into room = +x) */}
    {EW_WINDOW_ZS.map((z) => (
      <OfficeWindow key={`win-w-${z}`} position={[-22.75, WINDOW_Y, z]} rotation={[0, Math.PI / 2, 0]} />
    ))}

    <CeilingLights ceilingY={OFFICE_CEILING_Y} />

    <WorkingArea />
    <TeamPyramidProp />
    <BreakRoom />
    <ConferenceRoom />
    <ManagersOffice />
    <DundieAward />
    <DwightBobblehead />
    <MsBodySuit />
  </group>
  );
};
