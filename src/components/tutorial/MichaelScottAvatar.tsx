import React from 'react';

const PIXEL = 6;

// Color palette
const C: Record<string, string | null> = {
  '.': null,         // transparent
  H: '#3d1f06',      // dark brown hair
  S: '#f3b07e',      // skin
  E: '#1a0800',      // eyes
  M: '#b06848',      // mouth / darker skin
  N: '#1c2038',      // navy suit
  W: '#eeeeee',      // white shirt
  T: '#cc1111',      // red tie
};

// 16 × 16 pixel grid (each string must be exactly 16 chars)
const GRID = [
  '....HHHHHHHH....', //  0 hair top
  '..HHHHHHHHHHHH..', //  1 hair
  '..HSSSSSSSSSH..', //  2 hair sides + face (wait — 2+1+10+1+2 = 16) ✓
  '...SSSSSSSSSS...', //  3 face
  '...SSESSSSESS...', //  4 eyes
  '...SSSSSSSSSS...', //  5 face
  '...SSMMMMMMSS...', //  6 smile
  '...SSSSSSSSSS...', //  7 chin
  '.....SSSSSS.....', //  8 neck
  '....NNWWWWNN....', //  9 collar
  '...NNWWTTWWNN...', // 10 chest
  '..NNNWWTTTWWNN..', // 11 chest
  '..NNNWTTTTTWNN..', // 12 chest
  '..NNNNTTTTNNNN..', // 13 chest
  '..NNNNNTTNNNNNN.', // 14 chest bottom
  'NNNNNNNNNNNNNNNN', // 15 base
] as const;

export function MichaelScottAvatar({ className }: { className?: string }) {
  const size = PIXEL * 16;
  return (
    <svg
      width={size}
      height={size}
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-label="Michael Scott pixel art"
    >
      {GRID.map((row, y) =>
        [...row].map((char, x) => {
          const fill = C[char];
          if (!fill) return null;
          return (
            <rect
              key={`${x}-${y}`}
              x={x * PIXEL}
              y={y * PIXEL}
              width={PIXEL}
              height={PIXEL}
              fill={fill}
            />
          );
        })
      )}
    </svg>
  );
}
