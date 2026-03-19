import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { FurnitureItem, DeskItem } from '../../types';
import { getDeterministicColor } from '../../constants';
import { PixelBeet } from './LandingPage';
import { FLOOR_PLAN_RECT as BREAK_ROOM_RECT } from '../world/break-room/BreakRoom';
import { FLOOR_PLAN_RECT as CONFERENCE_ROOM_RECT } from '../world/conference-room/ConferenceRoom';
import { FLOOR_PLAN_RECT as MANAGERS_OFFICE_RECT } from '../world/managers-office/ManagersOffice';
import { FLOOR_PLAN_RECT as WORKING_AREA_RECT } from '../world/working-area/WorkingArea';

const SVG_SIZE = 600;
const WORLD_SIZE = 50; // -25 to +25

function worldToSvg(worldX: number, worldZ: number): [number, number] {
  return [
    ((worldX + 25) / WORLD_SIZE) * SVG_SIZE,
    ((worldZ + 25) / WORLD_SIZE) * SVG_SIZE,
  ];
}

function svgToWorld(svgX: number, svgY: number): [number, number] {
  return [
    (svgX / SVG_SIZE) * WORLD_SIZE - 25,
    (svgY / SVG_SIZE) * WORLD_SIZE - 25,
  ];
}

function snap(val: number): number {
  return Math.round(val * 2) / 2;
}

const ROOM_RECTS = [
  WORKING_AREA_RECT,
  BREAK_ROOM_RECT,
  CONFERENCE_ROOM_RECT,
  MANAGERS_OFFICE_RECT,
].map((r) => {
  const [x1, y1] = worldToSvg(r.x1, r.z1);
  const [x2, y2] = worldToSvg(r.x2, r.z2);
  return { label: r.label, x: x1, y: y1, w: x2 - x1, h: y2 - y1, color: r.color };
});

interface DragState {
  deskId: string;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldZ: number;
}

interface OfficeCustomizationPageProps {
  roomId: string;
  initialLayout: FurnitureItem[];
  onBack: () => void;
  onSave: (layout: FurnitureItem[]) => Promise<void>;
}

export const OfficeCustomizationPage = ({
  roomId,
  initialLayout,
  onBack,
  onSave,
}: OfficeCustomizationPageProps) => {
  const [layout, setLayout] = useState<FurnitureItem[]>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dragging = useRef<DragState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const desks = layout.filter((f): f is DeskItem => f.type === 'desk');
  const hasChanges = JSON.stringify(layout) !== JSON.stringify(initialLayout);

  const handleSave = async () => {
    setSaving(true);
    await onSave(layout);
    setSaving(false);
  };

  const handleBack = () => {
    if (hasChanges && !confirm('You have unsaved changes. Discard them?')) return;
    onBack();
  };

  const handleDeskMouseDown = useCallback((e: React.MouseEvent, desk: DeskItem) => {
    e.stopPropagation();
    setSelectedId(desk.id);
    dragging.current = {
      deskId: desk.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startWorldX: desk.position[0],
      startWorldZ: desk.position[2],
    };
  }, []);

  const handleSvgMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = SVG_SIZE / rect.width;
    const deltaClientX = (e.clientX - dragging.current.startClientX) * scale;
    const deltaClientY = (e.clientY - dragging.current.startClientY) * scale;
    const [deltaWorldX, deltaWorldZ] = svgToWorld(deltaClientX, deltaClientY).map((v) => v + 25) as [number, number];

    const newWorldX = snap(dragging.current.startWorldX + deltaWorldX);
    const newWorldZ = snap(dragging.current.startWorldZ + deltaWorldZ);
    const clampedX = Math.max(-24, Math.min(24, newWorldX));
    const clampedZ = Math.max(-24, Math.min(24, newWorldZ));

    setLayout((prev) =>
      prev.map((f) =>
        f.id === dragging.current!.deskId
          ? { ...f, position: [clampedX, f.position[1], clampedZ] as [number, number, number] }
          : f
      )
    );
  }, []);

  const handleRotate = useCallback((deskId: string, direction: 1 | -1) => {
    setLayout((prev) =>
      prev.map((f) =>
        f.id === deskId
          ? { ...f, rotation: [f.rotation[0], f.rotation[1] + direction * (Math.PI / 4), f.rotation[2]] as [number, number, number] }
          : f
      )
    );
  }, []);

  useEffect(() => {
    const stopDrag = () => { dragging.current = null; };
    window.addEventListener('mouseup', stopDrag);
    return () => window.removeEventListener('mouseup', stopDrag);
  }, []);

  const selectedDesk = selectedId ? desks.find((d) => d.id === selectedId) : null;

  return (
    <div className="min-h-screen bg-[#3d2b1f] flex flex-col items-center justify-center p-4 font-pixel text-white overflow-hidden">
      {/* Background beets */}
      <div className="absolute inset-0 opacity-10 pointer-events-none grid grid-cols-6 gap-20 p-10">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="flex justify-center items-center">
            <PixelBeet />
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-3xl"
      >
        {/* Header */}
        <div className="pixel-border bg-[#2d1f0f] p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="pixel-button text-xs px-3 py-2"
            >
              ← Back
            </button>
            <div className="text-center">
              <div className="text-lg text-amber-300">OFFICE LAYOUT</div>
              <div className="text-xs text-amber-500/70">Room: {roomId.toUpperCase()}</div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="pixel-button text-xs px-3 py-2 disabled:opacity-50"
            >
              {saving ? 'Saving...' : '💾 Save Layout'}
            </button>
          </div>
        </div>

        {/* Floor plan */}
        <div className="pixel-border bg-[#2d1f0f] p-4 mb-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            className="w-full border border-amber-900/50 cursor-default select-none"
            style={{ maxHeight: '60vh', aspectRatio: '1' }}
            onMouseMove={handleSvgMouseMove}
          >
            {/* Floor */}
            <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="#f5f0e8" />

            {/* Grid lines */}
            {Array.from({ length: 11 }).map((_, i) => (
              <React.Fragment key={i}>
                <line x1={i * 60} y1="0" x2={i * 60} y2={SVG_SIZE} stroke="#e2d8c8" strokeWidth="0.5" />
                <line x1="0" y1={i * 60} x2={SVG_SIZE} y2={i * 60} stroke="#e2d8c8" strokeWidth="0.5" />
              </React.Fragment>
            ))}

            {/* Static room areas */}
            {ROOM_RECTS.map((r) => (
              <g key={r.label}>
                <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={r.color} stroke="#94a3b8" strokeWidth="1.5" opacity="0.85" />
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="9"
                  fill="#475569"
                  fontFamily="monospace"
                >
                  {r.label}
                </text>
              </g>
            ))}

            {/* Desks */}
            {desks.map((desk) => {
              const [sx, sy] = worldToSvg(desk.position[0], desk.position[2]);
              const rotDeg = -(desk.rotation[1] * 180) / Math.PI;
              const color = getDeterministicColor(String(desk.config.ownerName));
              const isSelected = desk.id === selectedId;
              const label = String(desk.config.ownerName).split(' ')[0];

              return (
                <g
                  key={desk.id}
                  transform={`translate(${sx}, ${sy}) rotate(${rotDeg})`}
                  onMouseDown={(e) => handleDeskMouseDown(e, desk)}
                  style={{ cursor: 'grab' }}
                >
                  <rect
                    x="-20"
                    y="-12"
                    width="40"
                    height="24"
                    fill={color}
                    fillOpacity="0.8"
                    stroke={isSelected ? '#111' : '#444'}
                    strokeWidth={isSelected ? 2.5 : 1}
                    rx="2"
                  />
                  {/* Monitor stub */}
                  <rect x="-6" y="-11" width="12" height="6" fill="rgba(0,0,0,0.25)" rx="1" />
                  <text
                    x="0"
                    y="0"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill="white"
                    fontWeight="bold"
                    fontFamily="monospace"
                    transform="rotate(0)"
                    style={{ pointerEvents: 'none' }}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected desk controls */}
        <div className="pixel-border bg-[#2d1f0f] p-3 min-h-[56px] flex items-center justify-between">
          {selectedDesk ? (
            <>
              <span className="text-xs text-amber-300">
                Selected: <span className="text-white">{String(selectedDesk.config.ownerName)}'s Desk</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRotate(selectedDesk.id, -1)}
                  className="pixel-button text-xs px-3 py-1"
                  title="Rotate counter-clockwise 45°"
                >
                  ↺ CCW
                </button>
                <button
                  onClick={() => handleRotate(selectedDesk.id, 1)}
                  className="pixel-button text-xs px-3 py-1"
                  title="Rotate clockwise 45°"
                >
                  CW ↻
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-amber-500/70">
              Click a desk to select it · Drag to reposition · Changes broadcast live to all players
            </span>
          )}
        </div>
      </motion.div>
    </div>
  );
};
