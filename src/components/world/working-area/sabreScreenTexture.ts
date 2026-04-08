import * as THREE from 'three';

/**
 * Lightweight “Sabre Pyramid” style UI: purple/blue glow, triangular icons, bottom dock.
 * Drawn once to a canvas for use on the tablet face (keeps GPU simple).
 */
export function createSabreScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.colorSpace = THREE.SRGBColorSpace;
    return fallback;
  }

  ctx.clearRect(0, 0, 512, 512);

  // Clip to triangle (upright tablet face)
  ctx.beginPath();
  ctx.moveTo(256, 40);
  ctx.lineTo(52, 472);
  ctx.lineTo(460, 472);
  ctx.closePath();
  ctx.clip();

  const bg = ctx.createRadialGradient(200, 160, 10, 256, 300, 360);
  bg.addColorStop(0, '#93c5fd');
  bg.addColorStop(0.25, '#6366f1');
  bg.addColorStop(0.5, '#4f46e5');
  bg.addColorStop(0.75, '#312e81');
  bg.addColorStop(1, '#172554');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 512);

  // Soft light streaks
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    ctx.moveTo(-20, i * 38);
    ctx.lineTo(520, i * 38 + 100);
    ctx.stroke();
  }

  const drawTri = (cx: number, cy: number, r: number, a: string) => {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx - r * 0.88, cy + r * 0.52);
    ctx.lineTo(cx + r * 0.88, cy + r * 0.52);
    ctx.closePath();
    ctx.fillStyle = a;
    ctx.fill();
  };

  // Loose “pyramid of apps” (reference layout, simplified)
  drawTri(256, 165, 32, 'rgba(255,255,255,0.55)');
  drawTri(200, 235, 24, 'rgba(255,255,255,0.42)');
  drawTri(312, 235, 24, 'rgba(255,255,255,0.42)');
  drawTri(256, 275, 22, 'rgba(255,255,255,0.38)');
  drawTri(175, 315, 18, 'rgba(255,255,255,0.32)');
  drawTri(337, 315, 18, 'rgba(255,255,255,0.32)');
  drawTri(256, 345, 18, 'rgba(255,255,255,0.28)');

  // Bottom dock bar
  ctx.fillStyle = 'rgba(30, 64, 175, 0.55)';
  ctx.fillRect(72, 418, 368, 44);
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(72, 418, 368, 44);

  const dockY = 438;
  [130, 200, 270, 340].forEach((x) => {
    drawTri(x, dockY, 12, 'rgba(186, 230, 253, 0.95)');
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.premultiplyAlpha = false;
  tex.needsUpdate = true;
  tex.anisotropy = 8;
  return tex;
}
