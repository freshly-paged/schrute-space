/** Shared server + client: vending machine desk monitor upgrades. */

export {
  MONITOR_UPGRADE_MAX_LEVEL,
  FOCUS_BASE_REAMS_PER_MINUTE,
  MONITOR_UPGRADE_COSTS,
  MONITOR_INCOME_BOOST_LEVELS,
} from "./gameConfig";

import {
  MONITOR_UPGRADE_MAX_LEVEL,
  FOCUS_BASE_REAMS_PER_MINUTE,
  MONITOR_UPGRADE_COSTS,
  MONITOR_INCOME_BOOST_LEVELS,
} from "./gameConfig";

export function monitorUpgradeCostForNextLevel(currentLevel: number): number {
  const L = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(currentLevel)));
  const next = L + 1;
  const costs = MONITOR_UPGRADE_COSTS;
  return costs[next - 1] ?? costs[costs.length - 1];
}

/** First {@link MONITOR_INCOME_BOOST_LEVELS} upgrades each add +1 ream/min while focusing; further upgrades are cosmetic only. */
export function focusReamsPerMinute(monitorUpgradeLevel: number): number {
  const lv = Math.min(MONITOR_UPGRADE_MAX_LEVEL, Math.max(0, Math.floor(monitorUpgradeLevel)));
  return FOCUS_BASE_REAMS_PER_MINUTE + Math.min(lv, MONITOR_INCOME_BOOST_LEVELS);
}
