import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { createSabreScreenTexture } from './sabreScreenTexture';

/**
 * Stylized equilateral “tablet” (Sabre Pyramid–style): white bezel, dark base + textured “glass” UI.
 * Shared by the world prop and the inspect overlay preview.
 */
export function TeamPyramidTabletMesh() {
  const screenTexture = useMemo(() => createSabreScreenTexture(), []);
  useEffect(() => {
    return () => {
      screenTexture.dispose();
    };
  }, [screenTexture]);

  const { bezelGeometry, screenGeometry, displayPlaneSize, zScreenPlus, zScreenMinus, zGlassPlus, zGlassMinus } =
    useMemo(() => {
    const shape = new THREE.Shape();
    // Triangle in XY plane (vertical in world); extrusion is along Z for thin depth.
    const w = 0.62;
    const h = 0.68;
    shape.moveTo(0, h * 0.52);
    shape.lineTo(-w * 0.5, -h * 0.48);
    shape.lineTo(w * 0.5, -h * 0.48);
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.022,
      bevelSize: 0.024,
      bevelSegments: 2,
      curveSegments: 12,
    };

    const bezelGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bezelGeometry.center();
    bezelGeometry.computeBoundingBox();
    const bb = bezelGeometry.boundingBox;
    // Bevel extends past nominal depth — fixed Z offsets sit *inside* the solid; use bbox + epsilon.
    const pad = 0.004;
    const zScreenPlus = (bb?.max.z ?? 0.06) + pad;
    const zScreenMinus = (bb?.min.z ?? -0.06) - pad;
    const zGlassPlus = (bb?.max.z ?? 0.06) - 0.002;
    const zGlassMinus = (bb?.min.z ?? -0.06) + 0.002;

    // Inner face: same triangle as the bezel, scaled down slightly (was ~38% — too small).
    const INNER_SCALE = 0.92;
    const iw = w * INNER_SCALE;
    const ih = h * INNER_SCALE;
    const innerTri = new THREE.Shape();
    innerTri.moveTo(0, ih * 0.52);
    innerTri.lineTo(-iw * 0.5, -ih * 0.48);
    innerTri.lineTo(iw * 0.5, -ih * 0.48);
    innerTri.closePath();
    const screenGeo = new THREE.ShapeGeometry(innerTri);
    // Bounding box of that triangle (matches plane for canvas UVs).
    const dispW = iw;
    const dispH = ih;
    return {
      bezelGeometry,
      screenGeometry: screenGeo,
      displayPlaneSize: [dispW, dispH] as const,
      zScreenPlus,
      zScreenMinus,
      zGlassPlus,
      zGlassMinus,
    };
  }, []);

  return (
    <group>
      <mesh geometry={bezelGeometry} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e8ec" metalness={0.25} roughness={0.45} />
      </mesh>
      {/* Dark glass — flush with each cap (inside the bezel). */}
      <mesh geometry={screenGeometry} position={[0, 0, zGlassPlus]}>
        <meshStandardMaterial
          color="#0f172a"
          emissive="#3b0764"
          emissiveIntensity={0.35}
          metalness={0.15}
          roughness={0.4}
        />
      </mesh>
      <mesh geometry={screenGeometry} position={[0, 0, zGlassMinus]} rotation={[0, Math.PI, 0]}>
        <meshStandardMaterial
          color="#0f172a"
          emissive="#3b0764"
          emissiveIntensity={0.35}
          metalness={0.15}
          roughness={0.4}
        />
      </mesh>

      {/*
        Canvas UI — placed *outside* the extruded bbox so it is never buried in the gray shell.
      */}
      <mesh position={[0, 0, zScreenPlus]} renderOrder={3} frustumCulled={false}>
        <planeGeometry args={[displayPlaneSize[0], displayPlaneSize[1]]} />
        <meshBasicMaterial
          map={screenTexture}
          color="#ffffff"
          transparent
          opacity={1}
          alphaTest={0.02}
          side={THREE.DoubleSide}
          depthWrite
          depthTest
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0, zScreenMinus]} rotation={[0, Math.PI, 0]} renderOrder={3} frustumCulled={false}>
        <planeGeometry args={[displayPlaneSize[0], displayPlaneSize[1]]} />
        <meshBasicMaterial
          map={screenTexture}
          color="#ffffff"
          transparent
          opacity={1}
          alphaTest={0.02}
          side={THREE.DoubleSide}
          depthWrite
          depthTest
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
