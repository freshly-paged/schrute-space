/** Shared server + client: vending machine desk monitor upgrades. */

/** Purchases made (0–7); monitor count = 1 + level (max 8 monitors). */
export const MONITOR_UPGRADE_MAX_LEVEL = 7;

/** Reams earned per minute during focus at monitor upgrade level 0 (baseline). */
export const FOCUS_BASE_REAMS_PER_MINUTE = 2;

export function monitorUpgradeCostForNextLevel(currentLevel: number): number {
  const L = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(currentLevel)));
  const next = L + 1;
  if (next === 1) return 200;
  if (next === 2) return 300;
  return 500;
}

/** First three upgrades each add +1 ream/min while focusing; further upgrades are cosmetic only. */
export function focusReamsPerMinute(monitorUpgradeLevel: number): number {
  const lv = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(monitorUpgradeLevel)));
  return FOCUS_BASE_REAMS_PER_MINUTE + Math.min(lv, 3);
}
