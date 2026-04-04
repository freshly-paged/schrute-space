import { CHAIR_UPGRADE_MAX_LEVEL } from './chairUpgradeConstants';

export function clampChairLevel(level: number): number {
  const n = Math.floor(Number.isFinite(level) ? level : 0);
  return Math.max(0, Math.min(CHAIR_UPGRADE_MAX_LEVEL, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpHex(c1: string, c2: string, t: number): string {
  const parse = (c: string) => {
    const h = c.slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** HSL (0–360, 0–100, 0–100) → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = ((h % 360) + 360) % 360;
  const x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
  const m = L - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (hp < 60) {
    r1 = c;
    g1 = x;
  } else if (hp < 120) {
    r1 = x;
    g1 = c;
  } else if (hp < 180) {
    g1 = c;
    b1 = x;
  } else if (hp < 240) {
    g1 = x;
    b1 = c;
  } else if (hp < 300) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const r = Math.round((r1 + m) * 255);
  const g = Math.round((g1 + m) * 255);
  const b = Math.round((b1 + m) * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Strong, distinct tint per upgrade step (rotates hue so each level pops). */
function levelAccentHex(level: number): string {
  if (level <= 0) return '#888888';
  const h = (level * 47 + (level % 5) * 31 + 18) % 360;
  return hslToHex(h, 78, 52);
}

export type ChairAccentPart = 'column' | 'base' | 'backTrim';

/** Which of the three “hero” parts gets the obvious color shift this level (cycles 1→column, 2→base, 3→backTrim, …). */
export function getChairAccentPart(level: number): ChairAccentPart | null {
  if (level <= 0) return null;
  const m = level % 3;
  if (m === 1) return 'column';
  if (m === 2) return 'base';
  return 'backTrim';
}

export interface ChairVisualParams {
  scale: number;
  seatColor: string;
  backColor: string;
  columnColor: string;
  baseColor: string;
  /** 背后镶边（靠背外侧金属条） */
  backTrimColor: string;
  backTrimEmissive: string;
  backTrimEmissiveBoost: number;
  goldEmissiveIntensity: number;
  studCount: number;
  grassCount: number;
  goldRimVisible: boolean;
  accentPart: ChairAccentPart | null;
}

/** 坐垫、靠背主面：不随升级改色，保持黑色。 */
const SEAT_BLACK = '#222222';
const BACK_BLACK = '#1a1a1a';

/** Derives colors, scale, and decoration counts from upgrade level (0–20). */
export function getChairVisualParams(levelRaw: number): ChairVisualParams {
  const level = clampChairLevel(levelRaw);
  const t = level / CHAIR_UPGRADE_MAX_LEVEL;
  const scale = 1 + level * 0.012;
  const seatColor = SEAT_BLACK;
  const backColor = BACK_BLACK;
  const columnBase = lerpHex('#333333', '#6b5344', t);
  const basePlateBase = lerpHex('#2a2a2a', '#5c4a38', t);
  const accent = levelAccentHex(level);
  const accentPart = getChairAccentPart(level);
  const accentWeight = level > 0 ? 0.74 : 0;

  let columnColor = columnBase;
  let baseColor = basePlateBase;
  let backTrimColor = lerpHex('#c9a227', '#e8c547', Math.min(1, t * 1.1));
  let backTrimEmissive = '#6b5200';
  let backTrimEmissiveBoost = 0;

  if (accentPart === 'column') {
    columnColor = lerpHex(columnBase, accent, accentWeight);
  } else if (accentPart === 'base') {
    baseColor = lerpHex(basePlateBase, accent, accentWeight);
  } else if (accentPart === 'backTrim' && level >= 4) {
    backTrimColor = lerpHex(backTrimColor, accent, accentWeight);
    backTrimEmissive = lerpHex(backTrimEmissive, accent, 0.55);
    backTrimEmissiveBoost = 0.35 + (level / CHAIR_UPGRADE_MAX_LEVEL) * 0.25;
  }

  const goldEmissiveIntensity = Math.max(0, (level - 3) / 17) * 0.5;
  const studCount = Math.min(6, Math.floor(level / 3));
  const grassCount = level < 6 ? 0 : Math.min(4, Math.floor((level - 6) / 4));
  const goldRimVisible = level >= 4;
  return {
    scale,
    seatColor,
    backColor,
    columnColor,
    baseColor,
    backTrimColor,
    backTrimEmissive,
    backTrimEmissiveBoost,
    goldEmissiveIntensity,
    studCount,
    grassCount,
    goldRimVisible,
    accentPart,
  };
}
