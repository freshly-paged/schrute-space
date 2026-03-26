/**
 * useGameAsset — centralized GLB asset loader.
 *
 * All 3D assets live in public/assets/*.glb. Import this hook wherever you
 * need a loaded GLTF scene; it delegates to drei's useGLTF so assets are
 * cached and preloaded automatically.
 *
 * Usage:
 *   const { scene } = useGameAsset('dundie');
 *   return <primitive object={scene.clone()} />;
 *
 * To add a new asset:
 *   1. Drop the .glb file into public/assets/
 *   2. Add an entry to ASSETS below
 *   3. Call useGameAsset('<key>') in your component
 */

import { useGLTF } from '@react-three/drei';

const ASSETS = {
  dundie: '/assets/dundie.glb',
} as const;

export type AssetKey = keyof typeof ASSETS;

export function useGameAsset(key: AssetKey) {
  return useGLTF(ASSETS[key]);
}

// Preload all assets at module load time so they're ready before the scene
// needs them. Call this once from App.tsx or main.tsx if desired.
export function preloadAllAssets() {
  for (const path of Object.values(ASSETS)) {
    useGLTF.preload(path);
  }
}
