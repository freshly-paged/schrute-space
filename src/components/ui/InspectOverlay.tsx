import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Bounds, Center, useBounds } from '@react-three/drei';
import { useGameStore } from '../../store/useGameStore';
import { ASSET_PATHS, AssetKey } from '../../hooks/useGameAsset';
import { TeamPyramidTabletMesh } from '../world/working-area/TeamPyramidTabletMesh';

// ─── 3D model viewer ─────────────────────────────────────────────────────────

function InspectModelInner({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const bounds = useBounds();

  // Re-fit after model geometry is available — handles the case where the GLB
  // wasn't already cached and Bounds measured an empty scene on first render.
  // Double RAF ensures Two.js has finished computing bounding boxes before we
  // ask Bounds to fit — a single frame is not always enough for complex models
  // (e.g. the Michael Scott suit), causing the sporadic "model too small" bug.
  useEffect(() => {
    let id1: number, id2: number;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => bounds.refresh().fit());
    });
    return () => {
      cancelAnimationFrame(id1);
      cancelAnimationFrame(id2);
    };
  }, [scene, bounds]);

  return <primitive object={scene.clone()} />;
}

function InspectScene({ assetKey }: { assetKey: string }) {
  const path = ASSET_PATHS[assetKey as AssetKey];
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
            {path ? <InspectModelInner path={path} /> : null}
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

function PyramidInspectScene() {
  return (
    <Canvas camera={{ position: [0, 0.2, 2.6], fov: 42 }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2, 5, 3]} intensity={1.8} />
      <directionalLight position={[-2, 2, -2]} intensity={0.5} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.2}>
          <Center>
            <TeamPyramidTabletMesh />
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
        className="absolute inset-0 bg-black/70"
        onClick={closeInspect}
      />

      {/* Panel */}
      <div
        className="pixel-panel font-pixel relative flex w-full max-w-2xl overflow-hidden p-0"
        style={{ height: '420px' }}
      >
        {/* Schrute red header bar */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-2"
          style={{ background: 'var(--color-schrute)' }}
        >
          <div>
            <div className="text-white text-[8px] uppercase tracking-widest">
              Item Inspection Report
            </div>
            <div className="text-[7px] uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
              Dunder Mifflin Property Dept.
            </div>
          </div>
          <button
            onClick={closeInspect}
            className="text-white/70 hover:text-white transition-colors text-[8px] uppercase"
          >
            ✕ Close
          </button>
        </div>

        {/* 3D canvas — left half, dark panel for contrast */}
        <div
          className="w-1/2 h-full flex-shrink-0 mt-0"
          style={{ background: 'var(--color-carbon)', paddingTop: '36px' }}
        >
          {inspectedObject.previewKind === 'pyramid' ? (
            <PyramidInspectScene />
          ) : (
            <InspectScene assetKey={inspectedObject.assetKey} />
          )}
        </div>

        {/* Info — right half */}
        <div
          className="flex flex-col gap-4 px-6 py-4 w-1/2 overflow-y-auto"
          style={{ paddingTop: '48px', background: 'var(--color-paper)' }}
        >
          {/* Memo lines */}
          <div className="space-y-1 text-[8px]">
            <div className="flex gap-2">
              <span className="w-10 shrink-0" style={{ color: 'var(--color-ink-faint)' }}>RE:</span>
              <span className="font-bold uppercase" style={{ color: 'var(--color-ink)' }}>
                {inspectedObject.label}
              </span>
            </div>
          </div>

          <hr className="memo-rule" />

          <p className="text-[8px] leading-relaxed" style={{ color: 'var(--color-ink)' }}>
            {inspectedObject.description}
          </p>

          {(inspectedObject.linkUrl || inspectedObject.secondaryLinkUrl) && (
            <div className="flex flex-col gap-2">
              {inspectedObject.linkUrl ? (
                <a
                  href={inspectedObject.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] underline"
                  style={{ color: 'var(--color-beet)' }}
                >
                  → {inspectedObject.linkLabel ?? 'Open link'}
                </a>
              ) : null}
              {inspectedObject.secondaryLinkUrl ? (
                <a
                  href={inspectedObject.secondaryLinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[8px] underline"
                  style={{ color: 'var(--color-beet)' }}
                >
                  → {inspectedObject.secondaryLinkLabel ?? 'Open link'}
                </a>
              ) : null}
            </div>
          )}

          <div className="mt-auto">
            <hr className="memo-rule" />
            <p className="text-[7px] uppercase" style={{ color: 'var(--color-ink-faint)' }}>
              Press [F] or [Esc] to close
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
