import { CHAIR_UPGRADE_COST_REAMS, CHAIR_UPGRADE_MAX_LEVEL } from "./chairUpgradeConstants";
import { MONITOR_UPGRADE_MAX_LEVEL, monitorUpgradeCostForNextLevel } from "./monitorUpgradeConstants";

function clampUpgradeLevel(level: number, maxLevel: number): number {
  if (!Number.isFinite(level)) return 0;
  return Math.min(maxLevel, Math.max(0, Math.floor(level)));
}

/** Sum of reams spent on monitor upgrades to reach `level` (0..MONITOR_UPGRADE_MAX_LEVEL). */
export function totalMonitorUpgradeSpend(level: number): number {
  const L = clampUpgradeLevel(level, MONITOR_UPGRADE_MAX_LEVEL);
  let sum = 0;
  for (let i = 0; i < L; i++) {
    sum += monitorUpgradeCostForNextLevel(i);
  }
  return sum;
}

/**
 * Lower bound for lifetime reams earned: current balance plus reams implied by upgrade levels.
 * Matches server backfill; bumping this on upgrade spend keeps leaderboard totals honest when
 * `total_paper_reams_earned` lagged behind (e.g. legacy rows or missed save deltas).
 */
export function totalPaperReamsEarnedFloor(
  paperReams: number,
  chairLevel: number,
  monitorLevel: number
): number {
  const chairLv = clampUpgradeLevel(chairLevel, CHAIR_UPGRADE_MAX_LEVEL);
  const monitorLv = clampUpgradeLevel(monitorLevel, MONITOR_UPGRADE_MAX_LEVEL);
  const p = Number(paperReams);
  const balance = Number.isFinite(p) ? Math.max(0, Math.floor(p)) : 0;
  const spend = chairLv * CHAIR_UPGRADE_COST_REAMS + totalMonitorUpgradeSpend(monitorLv);
  return balance + spend;
}
