/**
 * Single source of truth for all game economy, energy, and timer constants.
 *
 * Edit values here to tune gameplay — all client and server code imports from this module
 * (directly or via the thin re-export shims in focusEnergyModel / chairUpgradeConstants /
 * monitorUpgradeConstants, which are kept for backwards-compatibility).
 */

// ---------------------------------------------------------------------------
// Pomodoro timer
// ---------------------------------------------------------------------------

/** Focus session length in seconds (default: 25 minutes). */
export const POMODORO_FOCUS_DURATION_SEC = 25 * 60;

/** Short break length in seconds (default: 5 minutes). */
export const POMODORO_BREAK_DURATION_SEC = 5 * 60;

// ---------------------------------------------------------------------------
// Focus energy (stamina)
// ---------------------------------------------------------------------------

/** Maximum focus energy value. */
export const FOCUS_ENERGY_MAX = 100;

/** Energy drained per minute while seated in an active focus session. */
export const FOCUS_ENERGY_DRAIN_PER_MIN = 2;

/** Energy regenerated per minute while idle (not in a focus session). */
export const FOCUS_ENERGY_REGEN_PER_MIN = 5;

/** Extra energy regen per minute while the water-cooler buff is active (client-only). */
export const FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN = 5;

/** Duration of the water-cooler energy buff in milliseconds (default: 5 minutes). */
export const FOCUS_ENERGY_WATER_BUFF_DURATION_MS = 5 * 60 * 1000;

/**
 * Additional energy regen per minute per chair upgrade level while seated in a focus session
 * (stacks on top of the drain — net change is drain minus this bonus × level).
 */
export const FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN = 0.2;

/**
 * Energy ratio (current / max) at or above which walk speed and ream earn rate are at full effect.
 * Below this threshold both scale down linearly.
 */
export const FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO = 0.4;

/**
 * Energy ratio below which the ream earn-rate multiplier bottoms out at 50%.
 * Between FOCUS_ENERGY_REAM_MIN_RATIO and FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO the rate scales linearly.
 */
export const FOCUS_ENERGY_REAM_MIN_RATIO = 0.1;

// ---------------------------------------------------------------------------
// Parkour (double jump / forward roll)
// ---------------------------------------------------------------------------

/** Focus energy consumed per parkour move. */
export const PARKOUR_FOCUS_ENERGY_COST = 5;

/** Minimum focus energy required to perform a parkour move. */
export const PARKOUR_MIN_ENERGY_REQUIRED = 20;

// ---------------------------------------------------------------------------
// Chair upgrades
// ---------------------------------------------------------------------------

/** Paper reams required to purchase one chair upgrade level. */
export const CHAIR_UPGRADE_COST_REAMS = 50;

/** Maximum chair upgrade level purchasable. */
export const CHAIR_UPGRADE_MAX_LEVEL = 20;

// ---------------------------------------------------------------------------
// Monitor upgrades
// ---------------------------------------------------------------------------

/** Maximum number of monitor upgrade purchases (monitor count = 1 + level, capped at 8). */
export const MONITOR_UPGRADE_MAX_LEVEL = 7;

/** Paper reams earned per minute during a focus session at monitor level 0 (baseline). */
export const FOCUS_BASE_REAMS_PER_MINUTE = 2;

/**
 * Cost in reams for each monitor upgrade level.
 * Index 0 = cost to go from level 0 → 1, index 1 = level 1 → 2, and so on.
 * The last entry is used for all levels beyond the explicit list.
 */
export const MONITOR_UPGRADE_COSTS: readonly number[] = [200, 300, 500];

/**
 * Each of the first N monitor upgrades adds +1 ream/min to the focus earn rate.
 * Upgrades beyond this count are cosmetic only.
 */
export const MONITOR_INCOME_BOOST_LEVELS = 3;

// ---------------------------------------------------------------------------
// Vending machine — ice cream
// ---------------------------------------------------------------------------

/** Paper reams required to purchase one ice cream cone from the vending machine. */
export const ICE_CREAM_COST_REAMS = 2;

/** Duration of the ice cream prop in milliseconds. */
export const ICE_CREAM_DURATION_MS = 60_000;

/** Bites until the cone is gone (each bite removes one quarter of the scoop). */
export const ICE_CREAM_QUARTERS_MAX = 4;

/** Focus energy gained per ice cream bite (clamped to {@link FOCUS_ENERGY_MAX}). */
export const ICE_CREAM_BITE_FOCUS_ENERGY = 4;

// ---------------------------------------------------------------------------
// Copier
// ---------------------------------------------------------------------------

/** Maximum number of copies a player can make before the reset cooldown kicks in. */
export const COPIER_MAX_COPIES = 5;

/** Maximum paper reams that can be doubled in a single copier use. */
export const COPIER_MAX_DOUBLE_REAMS = 20;

/** How long the player must stand at the copier for one job to complete (1 minute). */
export const COPIER_JOB_DURATION_MS = 60_000;

/**
 * Cooldown after all daily copies are exhausted before the counter resets (24 hours).
 * Once a player has used all COPIER_MAX_COPIES in a day, the copier is locked until
 * this duration has elapsed.
 */
export const COPIER_RESET_COOLDOWN_MS = 24 * 60 * 60_000;

// ---------------------------------------------------------------------------
// Vending machine — Team Pyramid (room buff)
// ---------------------------------------------------------------------------

/** Paper reams required to purchase the Team Pyramid room buff. */
export const TEAM_PYRAMID_COST_REAMS = 80;

/** How long the Team Pyramid buff lasts after purchase (milliseconds). */
export const TEAM_PYRAMID_DURATION_MS = 3 * 60 * 60 * 1000;

/** Multiplier applied to focus-session ream earn rate while the buff is active. */
export const TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER = 1.5;
