import * as THREE from 'three';

export { CHAIR_UPGRADE_COST_REAMS, CHAIR_UPGRADE_MAX_LEVEL } from './chairUpgradeConstants';
export {
  MONITOR_UPGRADE_MAX_LEVEL,
  FOCUS_BASE_REAMS_PER_MINUTE,
  monitorUpgradeCostForNextLevel,
  focusReamsPerMinute,
} from './monitorUpgradeConstants';
import { WORKING_AREA_COLLISION_BOXES } from './components/world/working-area/WorkingArea';
import { BREAK_ROOM_COLLISION_BOXES } from './components/world/break-room/BreakRoom';
import { CONFERENCE_ROOM_COLLISION_BOXES } from './components/world/conference-room/ConferenceRoom';
import { MANAGERS_OFFICE_COLLISION_BOXES } from './components/world/managers-office/ManagersOffice';

export const OFFICE_COLORS = [
  "#4f46e5", // Indigo
  "#059669", // Emerald
  "#d97706", // Amber
  "#dc2626", // Red
  "#7c3aed", // Violet
  "#2563eb", // Blue
  "#db2777", // Pink
  "#0891b2", // Cyan
];

/** Feet → torso center: roll rotates around this height; paired with a downward child offset so feet stay on the floor when not rolling. */
export const ROLL_PIVOT_Y = 0.85;

export const getDeterministicColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return OFFICE_COLORS[Math.abs(hash) % OFFICE_COLORS.length];
};

export const DESKS = [
  { id: "pam-desk", position: [-10, 0, -15] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] },
  { id: "sales-1", position: [-5, 0, -5] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
  { id: "sales-2", position: [-5, 0, -7] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] },
  { id: "sales-3", position: [-2, 0, -5] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] },
  { id: "sales-4", position: [-2, 0, -7] as [number, number, number], rotation: [0, Math.PI, 0] as [number, number, number] },
  { id: "michael-desk", position: [15, 0, -15] as [number, number, number], rotation: [0, -Math.PI / 4, 0] as [number, number, number] },
];

const PERIMETER_BOXES = [
  new THREE.Box3(new THREE.Vector3(-25.5, 0, -25.5), new THREE.Vector3(25.5, 8, -24.5)), // North
  new THREE.Box3(new THREE.Vector3(-25.5, 0, 24.5), new THREE.Vector3(25.5, 8, 25.5)),   // South
  new THREE.Box3(new THREE.Vector3(-25.5, 0, -25.5), new THREE.Vector3(-24.5, 8, 25.5)), // West
  new THREE.Box3(new THREE.Vector3(24.5, 0, -25.5), new THREE.Vector3(25.5, 8, 25.5)),   // East
];

export const COLLISION_BOXES = [
  ...PERIMETER_BOXES,
  ...WORKING_AREA_COLLISION_BOXES,
  ...BREAK_ROOM_COLLISION_BOXES,
  ...CONFERENCE_ROOM_COLLISION_BOXES,
  ...MANAGERS_OFFICE_COLLISION_BOXES,
];
