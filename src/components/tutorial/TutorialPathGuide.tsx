import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';

const Y = 0.12;
const THROTTLE_SEC = 0.04;

type Props = {
  target: readonly [number, number, number] | null;
  visible: boolean;
};

/**
 * Ground-level dashed path from local player feet to the tutorial target (drei Line).
 */
export function TutorialPathGuide({ target, visible }: Props) {
  const [points, setPoints] = useState<[number, number, number][]>([
    [0, Y, 0],
    [0, Y, 0],
  ]);
  const accRef = useRef(0);

  useFrame((state, dt) => {
    if (!visible || !target) return;
    accRef.current += dt;
    if (accRef.current < THROTTLE_SEC) return;
    accRef.current = 0;
    const player = state.scene.getObjectByName('localPlayer');
    if (!player) return;
    const px = player.position.x;
    const pz = player.position.z;
    const tx = target[0];
    const tz = target[2];
    setPoints([
      [px, Y, pz],
      [tx, Y, tz],
    ]);
  });

  if (!visible || !target) return null;

  return (
    <Line
      points={points}
      color="#fbbf24"
      lineWidth={2}
      dashed
      dashSize={0.45}
      gapSize={0.28}
      renderOrder={1000}
      depthWrite={false}
      frustumCulled={false}
    />
  );
}
