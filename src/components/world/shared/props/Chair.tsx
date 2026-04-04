import React, { useMemo } from 'react';
import { Box, Cylinder } from '@react-three/drei';
import { getChairVisualParams } from '../../../../chairUpgradeStyle';

export const Chair = ({
  position,
  rotation = [0, 0, 0],
  level = 0,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  level?: number;
}) => {
  const p = useMemo(() => getChairVisualParams(level), [level]);

  const studs = useMemo(() => {
    if (p.studCount <= 0) return null;
    const n = p.studCount;
    const span = 0.42;
    const start = -span / 2;
    const step = n > 1 ? span / (n - 1) : 0;
    return Array.from({ length: n }, (_, i) => {
      const x = n === 1 ? 0 : start + step * i;
      return (
        <Box key={i} args={[0.09, 0.09, 0.06]} position={[x, 0.85, -0.29]}>
          <meshStandardMaterial
            color="#d4af37"
            metalness={0.6}
            roughness={0.4}
            emissive="#5c4810"
            emissiveIntensity={0.08 + p.goldEmissiveIntensity * 0.15}
          />
        </Box>
      );
    });
  }, [p.studCount, p.goldEmissiveIntensity]);

  const grass = useMemo(() => {
    if (p.grassCount <= 0) return null;
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    return Array.from({ length: p.grassCount }, (_, i) => {
      const a = angles[i % angles.length];
      const r = 0.28 + (i % 2) * 0.06;
      return (
        <group key={i} position={[Math.sin(a) * r, 0.04, Math.cos(a) * r]}>
          <Cylinder args={[0.04, 0.05, 0.1, 6]} position={[0, 0.05, 0]}>
            <meshStandardMaterial color="#2d6b3a" metalness={0} roughness={0.9} />
          </Cylinder>
          <Box args={[0.12, 0.02, 0.08]} position={[0.02, 0.02, 0]} rotation={[0, 0.4, 0]}>
            <meshStandardMaterial color="#3d8b4a" metalness={0} roughness={0.88} />
          </Box>
        </group>
      );
    });
  }, [p.grassCount]);

  /** Seat / back stay matte black — no gold sheen from upgrades. */
  const seatMetal = 0.12;
  const seatRough = 0.78;
  const backMetal = 0.1;
  const backRough = 0.82;

  return (
    <group position={position} rotation={rotation} scale={p.scale}>
      <Box args={[0.6, 0.1, 0.6]} position={[0, 0.45, 0]}>
        <meshStandardMaterial
          color={p.seatColor}
          metalness={seatMetal}
          roughness={seatRough}
        />
      </Box>
      {p.goldRimVisible ? (
        <>
          <Box args={[0.64, 0.018, 0.04]} position={[0, 0.505, 0.29]}>
            <meshStandardMaterial
              color="#c9a227"
              metalness={0.85}
              roughness={0.35}
              emissive="#6b5200"
              emissiveIntensity={p.goldEmissiveIntensity}
            />
          </Box>
          <Box args={[0.64, 0.018, 0.04]} position={[0, 0.505, -0.29]}>
            <meshStandardMaterial
              color="#c9a227"
              metalness={0.85}
              roughness={0.35}
              emissive="#6b5200"
              emissiveIntensity={p.goldEmissiveIntensity}
            />
          </Box>
          <Box args={[0.04, 0.018, 0.56]} position={[0.29, 0.505, 0]}>
            <meshStandardMaterial
              color="#c9a227"
              metalness={0.85}
              roughness={0.35}
              emissive="#6b5200"
              emissiveIntensity={p.goldEmissiveIntensity}
            />
          </Box>
          <Box args={[0.04, 0.018, 0.56]} position={[-0.29, 0.505, 0]}>
            <meshStandardMaterial
              color="#c9a227"
              metalness={0.85}
              roughness={0.35}
              emissive="#6b5200"
              emissiveIntensity={p.goldEmissiveIntensity}
            />
          </Box>
        </>
      ) : null}
      <Box args={[0.6, 0.8, 0.1]} position={[0, 0.8, -0.25]}>
        <meshStandardMaterial
          color={p.backColor}
          metalness={backMetal}
          roughness={backRough}
        />
      </Box>
      {p.goldRimVisible ? (
        <Box args={[0.62, 0.82, 0.014]} position={[0, 0.8, -0.31]}>
          <meshStandardMaterial
            color={p.backTrimColor}
            metalness={0.85}
            roughness={0.35}
            emissive={p.backTrimEmissive}
            emissiveIntensity={p.goldEmissiveIntensity + p.backTrimEmissiveBoost}
          />
        </Box>
      ) : null}
      {studs}
      <Box args={[0.1, 0.4, 0.1]} position={[0, 0.2, 0]}>
        <meshStandardMaterial color={p.columnColor} metalness={0.25} roughness={0.65} />
      </Box>
      <Box args={[0.5, 0.05, 0.5]} position={[0, 0.025, 0]}>
        <meshStandardMaterial color={p.baseColor} metalness={0.2} roughness={0.7} />
      </Box>
      {grass}
    </group>
  );
};
