import React from 'react';
import { AvatarConfig } from '../../types';

export function AvatarPreview({ config, width = 72, height = 100 }: { config: AvatarConfig; width?: number; height?: number }) {
  const { shirtColor, skinTone, pantColor } = config;
  return (
    <svg width={width} height={height} viewBox="0 0 56 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Head */}
      <rect x="18" y="0" width="20" height="20" rx="2" fill={skinTone} />
      {/* Eyes */}
      <rect x="22" y="7" width="3" height="3" rx="1" fill="#1a1a1a" />
      <rect x="31" y="7" width="3" height="3" rx="1" fill="#1a1a1a" />
      {/* Torso */}
      <rect x="14" y="22" width="28" height="22" rx="2" fill={shirtColor} />
      {/* Left arm */}
      <rect x="6" y="22" width="7" height="18" rx="2" fill={skinTone} />
      {/* Right arm */}
      <rect x="43" y="22" width="7" height="18" rx="2" fill={skinTone} />
      {/* Left leg */}
      <rect x="14" y="46" width="12" height="24" rx="2" fill={pantColor} />
      {/* Right leg */}
      <rect x="30" y="46" width="12" height="24" rx="2" fill={pantColor} />
    </svg>
  );
}
