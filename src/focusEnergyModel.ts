/** Desk focus stamina: shared rules for client + server. */

import { CHAIR_UPGRADE_MAX_LEVEL } from "./chairUpgradeConstants";

export const FOCUS_ENERGY_MAX = 100;
export const FOCUS_ENERGY_DRAIN_PER_MIN = 2;
export const FOCUS_ENERGY_REGEN_PER_MIN = 5;

/** Extra focus energy regen per minute while the local water-cooler buff is active (client-only). */
export const FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN = 5;

/** Must match water cooler buff length in `WaterCooler.tsx` (enter radius → expires). */
export const FOCUS_ENERGY_WATER_BUFF_DURATION_MS = 5 * 60 * 1000;

/**
 * While seated in a focus session, each chair upgrade level adds this much energy per minute
 * (stacks with {@link FOCUS_ENERGY_DRAIN_PER_MIN} — net change is drain minus this bonus).
 */
export const FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN = 0.2;

/** Maximum seated focus energy bonus per minute (level {@link CHAIR_UPGRADE_MAX_LEVEL}). */
export const FOCUS_ENERGY_SEATED_REGEN_MAX_PER_MIN =
  FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN * CHAIR_UPGRADE_MAX_LEVEL;

function clampChairUpgradeLevelForEnergy(n: unknown): number {
  const x = typeof n === "number" && Number.isFinite(n) ? n : Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(CHAIR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(x)));
}

/** Focus energy spent per parkour move (double jump or forward roll). */
export const PARKOUR_FOCUS_ENERGY_COST = 5;

/** Must have at least this much energy to double-jump or roll (below this, moves are blocked). */
export const PARKOUR_MIN_ENERGY_REQUIRED = 20;

/**
 * Energy ratio (current / max) at and above which walk speed and focus ream earn rate use full effect.
 * Below this, both scale down (same “decay zone” for movement and productivity).
 */
export const FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO = 0.4;

/** Ream multiplier curve: minimum ratio used before hitting half earn rate (unchanged legacy shape). */
const FOCUS_ENERGY_REAM_MIN_RATIO = 0.1;

/** Shown next to the energy bar when in the low-energy decay zone. */
export const FOCUS_ENERGY_DECAY_ZONE_HINT_EN =
  "Low energy: your earn rate and walk speed are reduced. Take a break to recover.";

export type FocusEnergyMode = "focus" | "idle";

export function clampFocusEnergy(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(FOCUS_ENERGY_MAX, Math.max(0, n));
}

export function isFocusEnergyInDecayZone(energy: number): boolean {
  return clampFocusEnergy(energy) / FOCUS_ENERGY_MAX < FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO;
}

export function parseFocusEnergyMode(raw: unknown): FocusEnergyMode {
  if (raw === "focus") return "focus";
  return "idle";
}

/**
 * Minutes within `[fromMs, toMs]` that overlap the water buff window ending at `buffExpiresAt`.
 * Buff is assumed active on `[buffExpiresAt - {@link FOCUS_ENERGY_WATER_BUFF_DURATION_MS}, buffExpiresAt]`.
 */
export function waterBuffOverlapMinutes(
  fromMs: number,
  toMs: number,
  buffExpiresAt: number | null
): number {
  if (buffExpiresAt == null || toMs <= fromMs) return 0;
  const winStart = buffExpiresAt - FOCUS_ENERGY_WATER_BUFF_DURATION_MS;
  const a = Math.max(fromMs, winStart);
  const b = Math.min(toMs, buffExpiresAt);
  if (b <= a) return 0;
  return (b - a) / 60_000;
}

/**
 * Apply constant drain or regen between two wall-clock instants (inclusive of elapsed time only).
 * In `focus` mode (seated desk session), {@link chairUpgradeLevel} adds seated regen per minute per level.
 */
export function settleFocusEnergy(
  stored: number,
  fromMs: number,
  toMs: number,
  mode: FocusEnergyMode,
  chairUpgradeLevel?: number
): number {
  if (toMs <= fromMs) return clampFocusEnergy(stored);
  const minutes = (toMs - fromMs) / 60_000;
  let deltaPerMin: number;
  if (mode === "focus") {
    const lv = clampChairUpgradeLevelForEnergy(chairUpgradeLevel ?? 0);
    deltaPerMin =
      -FOCUS_ENERGY_DRAIN_PER_MIN +
      lv * FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN;
  } else {
    deltaPerMin = FOCUS_ENERGY_REGEN_PER_MIN;
  }
  return clampFocusEnergy(stored + deltaPerMin * minutes);
}

/**
 * Ream earn multiplier during focus: full rate at and above {@link FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO},
 * half at 10% of max, linear between.
 */
export function focusReamMultiplier(energy: number): number {
  const r = clampFocusEnergy(energy) / FOCUS_ENERGY_MAX;
  const hi = FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO;
  const lo = FOCUS_ENERGY_REAM_MIN_RATIO;
  if (r >= hi) return 1;
  if (r <= lo) return 0.5;
  return 0.5 + ((r - lo) / (hi - lo)) * 0.5;
}

/**
 * Walk speed multiplier: full speed at and above {@link FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO};
 * linear down to 0.5× at 0%. (Roll speed is not scaled.)
 */
export function focusWalkSpeedMultiplier(energy: number): number {
  const r = clampFocusEnergy(energy) / FOCUS_ENERGY_MAX;
  const hi = FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO;
  if (r >= hi) return 1;
  return 0.5 + (r / hi) * 0.5;
}
