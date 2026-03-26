import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Bounds, Center, useBounds } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';
import { ASSET_PATHS, AssetKey } from '../../hooks/useGameAsset';

// ─── 3D model viewer ─────────────────────────────────────────────────────────

function InspectModel({ assetKey }: { assetKey: string }) {
  const path = ASSET_PATHS[assetKey as AssetKey];
  const { scene } = useGLTF(path);
  const bounds = useBounds();

  // Re-fit after model geometry is available — handles the case where the GLB
  // wasn't already cached and Bounds measured an empty scene on first render.
  useEffect(() => {
    bounds.refresh().fit();
  }, [scene, bounds]);

  return <primitive object={scene.clone()} />;
}

function InspectScene({ assetKey }: { assetKey: string }) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[3, 5, 3]} intensity={2} />
      <directionalLight position={[-3, 2, -3]} intensity={0.6} />
      <Suspense fallback={null}>
        {/* Bounds computes the model's bounding box and adjusts the camera to
            frame it exactly — works for any model size or pivot point.
            Center ensures the geometry sits at the world origin. */}
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <InspectModel assetKey={assetKey} />
          </Center>
        </Bounds>
      </Suspense>
      <OrbitControls
        autoRotate
        autoRotateSpeed={1.8}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 1.8}
        makeDefault
      />
    </Canvas>
  );
}

// ─── Overlay ─────────────────────────────────────────────────────────────────

export function InspectOverlay() {
  const inspectedObject = useGameStore((s) => s.inspectedObject);
  const closeInspect = useGameStore((s) => s.closeInspect);

  useEffect(() => {
    if (!inspectedObject) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyF') closeInspect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inspectedObject, closeInspect]);

  if (!inspectedObject) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeInspect}
      />

      {/* Panel */}
      <div className="relative flex w-full max-w-2xl rounded-3xl border border-white/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden"
           style={{ height: '420px' }}>

        {/* Close button */}
        <button
          onClick={closeInspect}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all text-lg leading-none"
        >
          ×
        </button>

        {/* 3D canvas — left half */}
        <div className="w-1/2 h-full flex-shrink-0">
          <InspectScene assetKey={inspectedObject.assetKey} />
        </div>

        {/* Info — right half */}
        <div className="flex flex-col justify-center gap-4 px-8 py-10 w-1/2">
          <h2 className="text-white text-2xl font-bold leading-tight">
            {inspectedObject.label}
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            {inspectedObject.description}
          </p>
          <p className="text-slate-500 text-xs mt-auto">
            Press [F] or [Esc] to close
          </p>
        </div>
      </div>
    </div>
  );
}
