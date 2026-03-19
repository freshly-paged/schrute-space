import * as THREE from 'three';

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

export const COLLISION_BOXES = [
  // Michael's Office Walls & Desk
  new THREE.Box3(new THREE.Vector3(10, 0, -10.1), new THREE.Vector3(20, 8, -9.9)), // Wall 1
  new THREE.Box3(new THREE.Vector3(9.9, 0, -20), new THREE.Vector3(10.1, 8, -10)), // Wall 2
  new THREE.Box3(new THREE.Vector3(13.5, 0, -16.5), new THREE.Vector3(16.5, 1.0, -13.5)), // Michael's Desk (rotated 45deg, larger box)
  
  // Michael's Office Chairs
  new THREE.Box3(new THREE.Vector3(13.2, 0, -13.8), new THREE.Vector3(13.8, 0.5, -13.2)),
  new THREE.Box3(new THREE.Vector3(16.2, 0, -13.8), new THREE.Vector3(16.8, 0.5, -13.2)),
  
  // Conference Room Wall & Table
  new THREE.Box3(new THREE.Vector3(7.5, 0, 4.9), new THREE.Vector3(22.5, 8, 5.1)), // Glass Wall
  new THREE.Box3(new THREE.Vector3(8.5, 0, 6.5), new THREE.Vector3(21.5, 1.0, 13.5)), // Table (slightly larger to ensure no walking through)
  
  // Conference Room Chairs
  new THREE.Box3(new THREE.Vector3(10.7, 0, 6.2), new THREE.Vector3(11.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(12.7, 0, 6.2), new THREE.Vector3(13.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(14.7, 0, 6.2), new THREE.Vector3(15.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(16.7, 0, 6.2), new THREE.Vector3(17.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(18.7, 0, 6.2), new THREE.Vector3(19.3, 0.5, 6.8)),
  new THREE.Box3(new THREE.Vector3(10.7, 0, 13.2), new THREE.Vector3(11.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(12.7, 0, 13.2), new THREE.Vector3(13.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(14.7, 0, 13.2), new THREE.Vector3(15.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(16.7, 0, 13.2), new THREE.Vector3(17.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(18.7, 0, 13.2), new THREE.Vector3(19.3, 0.5, 13.8)),
  new THREE.Box3(new THREE.Vector3(8.2, 0, 9.7), new THREE.Vector3(8.8, 0.5, 10.3)),
  new THREE.Box3(new THREE.Vector3(21.2, 0, 9.7), new THREE.Vector3(21.8, 0.5, 10.3)),
  
  // Break Room
  new THREE.Box3(new THREE.Vector3(-15.5, 0, 14.5), new THREE.Vector3(-14.5, 2, 15.5)),
  
  // Beet Farm
  new THREE.Box3(new THREE.Vector3(-21, 0, -21), new THREE.Vector3(-15, 0.1, -15)),

  // Office Perimeter Walls
  new THREE.Box3(new THREE.Vector3(-25.5, 0, -25.5), new THREE.Vector3(25.5, 8, -24.5)), // North
  new THREE.Box3(new THREE.Vector3(-25.5, 0, 24.5), new THREE.Vector3(25.5, 8, 25.5)), // South
  new THREE.Box3(new THREE.Vector3(-25.5, 0, -25.5), new THREE.Vector3(-24.5, 8, 25.5)), // West
  new THREE.Box3(new THREE.Vector3(24.5, 0, -25.5), new THREE.Vector3(25.5, 8, 25.5)), // East
];
