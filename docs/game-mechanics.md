# Game mechanics reference

All tunable numbers live in **`src/gameConfig.ts`**. Other modules (`src/focusEnergyModel.ts`, `src/monitorUpgradeConstants.ts`, `src/chairUpgradeConstants.ts`) re-export or build on those values for shared client + server logic.

---

## Desk upgrades (whose chair / monitor counts?)

While you are in a **focus session at a desk**, chair and monitor bonuses use the **desk owner’s** upgrade levels from `chairLevelByEmail` / `monitorLevelByEmail`, not necessarily the sitter’s. Resolution is `getEffectiveDeskUpgradeEmail()` in `src/deskOwner.ts`: owner email from the active desk in `roomLayout`, falling back to the local user’s email if the layout has no owner on that desk.

---

## Currency: paper reams

Paper reams are the main currency. They accrue during focus sessions, sync to the server, and are spent on vending purchases (validated in `server.ts` transactions).

### Earning paper

Only during an **active focus timer** (Pomodoro focus mode, not paused). Accrual is **wall-clock based**: `tickTimer()` in `src/store/useGameStore.ts` uses elapsed time since `lastFocusPaperTickAt` (capped at 120 seconds per tick to limit catch-up jumps).

| Factor | Behavior |
|--------|------------|
| Baseline | `FOCUS_BASE_REAMS_PER_MINUTE` (2 reams/min) at monitor upgrade level 0 |
| Monitor upgrades | Each of the first `MONITOR_INCOME_BOOST_LEVELS` (3) levels adds **+1** ream/min (capped by `MONITOR_UPGRADE_MAX_LEVEL`). Further monitor levels are **cosmetic** for income. |
| Focus energy | `focusReamMultiplier(energy)` in `src/focusEnergyModel.ts`: full rate from **40%** of max energy upward; linear between **10%** and **40%**; **50%** of full rate at **10%** of max and below. |
| Team Pyramid buff | If `teamPyramidBuffExpiresAt` is in the future, rate is multiplied by `TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER` (**1.5×**). Room-wide; see below. |

Effective reams per minute during focus:

```text
focusReamsPerMinute(monitorLevel)
  * focusReamMultiplier(currentEnergy)
  * (teamPyramidActive ? TEAM_PYRAMID_FOCUS_REAM_MULTIPLIER : 1)
```

Fractional reams accumulate in `sessionPaperAccruedFloat`; whole reams are added to `paperReams` and `sessionPaper` when the fractional total crosses an integer boundary.

### Spending paper

| Purchase | Cost / notes |
|----------|----------------|
| Chair upgrade (each level) | `CHAIR_UPGRADE_COST_REAMS` (**50** reams), flat |
| Monitor upgrade | `MONITOR_UPGRADE_COSTS` in `gameConfig.ts`: **200** (0→1), **300** (1→2), **500** for each further level up to max (see `monitorUpgradeCostForNextLevel()` in `src/monitorUpgradeConstants.ts`) |
| Ice cream | `ICE_CREAM_COST_REAMS` (**2** reams) |
| Team Pyramid (room buff) | `TEAM_PYRAMID_COST_REAMS` (**80** reams) |

Purchases that debit reams are handled over Socket.IO with server-side transactions (`purchaseChairUpgrade`, `purchaseMonitorUpgrade`, `purchaseTeamPyramid`, vending ice cream flow in `server.ts` / `server/memoryDb.ts`).

---

## Currency: focus energy

Focus energy is **0–`FOCUS_ENERGY_MAX`** (100). It affects passive paper rate and walk speed, gates parkour, and is settled over time using `settleFocusEnergy()` plus optional water-buff overlap (`waterBuffOverlapMinutes()`).

### Energy change per minute (seated focus vs idle)

| State | Net effect |
|-------|------------|
| Idle (not in an active focus session) | **`FOCUS_ENERGY_REGEN_PER_MIN`** (+5 / min) via `settleFocusEnergy(..., "idle")` |
| Focus session (seated, timer running) | **`−FOCUS_ENERGY_DRAIN_PER_MIN`** (−2 / min) **+** `chairUpgradeLevel × FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN` (each chair level **+0.2** / min). Chair level is the **desk owner’s** level while focusing (same email resolution as paper). |
| Water cooler buff window | Extra **`FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN`** (+5 / min) for minutes overlapping `[buffExpiresAt − duration, buffExpiresAt]` (client-side `waterBuffExpiresAt`; stacks on top of settled energy). |
| Parkour (double jump / roll) | **`−PARKOUR_FOCUS_ENERGY_COST`** (−5) instant spend via `consumeFocusEnergy()` |

Water buff duration: `FOCUS_ENERGY_WATER_BUFF_DURATION_MS` (5 minutes).

### Energy effects

| Rule | Detail |
|------|--------|
| Paper multiplier | `focusReamMultiplier`: 100% at ≥ **`FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO`** (40% of max); 50% at ≤ **`FOCUS_ENERGY_REAM_MIN_RATIO`** (10% of max); linear between. |
| Walk speed | `focusWalkSpeedMultiplier`: 100% at ≥ 40% of max; below that, scales linearly down to **0.5×** at 0% energy. **Roll speed is not scaled** (see `usePlayerPhysics`). |
| Parkour gate | Requires energy ≥ **`PARKOUR_MIN_ENERGY_REQUIRED`** (20) to start a move; each move costs **`PARKOUR_FOCUS_ENERGY_COST`** (5). |

At **max chair level** (`CHAIR_UPGRADE_MAX_LEVEL` = 20), seated regen bonus is `0.2 × 20 = +4` / min vs `−2` / min drain → **+2** / min net during focus (before water buff).

---

## Upgrades

Stored **per user** in the database; chair/monitor maps keyed by email are broadcast to the room (`deskChairLevels`, `deskMonitorLevels`, patch events on purchase).

### Chair upgrade

- **Max level:** `CHAIR_UPGRADE_MAX_LEVEL` (**20**)
- **Cost per level:** `CHAIR_UPGRADE_COST_REAMS` (**50**)
- **Benefit:** +`FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN` (**0.2**) energy per minute per level while seated in focus (see formula above).

### Monitor upgrade

- **Max purchasable levels:** `MONITOR_UPGRADE_MAX_LEVEL` (**7**) → up to **8** monitors visually.
- **Income:** `focusReamsPerMinute(level)` = baseline **2** + min(level, `MONITOR_INCOME_BOOST_LEVELS` (**3**)); levels **4–7** do not increase income.
- **Costs:** `MONITOR_UPGRADE_COSTS` — **200**, **300**, then **500** for each remaining step (see `monitorUpgradeCostForNextLevel()`).

---

## Pomodoro timer

| Setting | Constant | Default |
|---------|----------|---------|
| Focus session | `POMODORO_FOCUS_DURATION_SEC` | 25 × 60 s |
| Break | `POMODORO_BREAK_DURATION_SEC` | 5 × 60 s |

The countdown uses a wall-clock **`timerEndsAt`** while running so it stays accurate if the tab is backgrounded. Paper is earned only in **focus** mode when the timer is **not** paused. The break phase has no paper or energy mechanics attached.

---

## Vending machine & room buff

| Item | Cost | Effect | Duration / notes |
|------|------|--------|-------------------|
| Ice cream | `ICE_CREAM_COST_REAMS` (2) | Held cone prop; **each bite** restores `ICE_CREAM_BITE_FOCUS_ENERGY` (**4**) energy (clamped to max). | Cone lasts `ICE_CREAM_DURATION_MS` (60 s); up to `ICE_CREAM_QUARTERS_MAX` (**4**) bite quarters. |
| Chair upgrade | 50 / level | Seated focus energy regen (see above) | Permanent |
| Monitor upgrade | Tiered (200 / 300 / 500…) | +1 ream/min for first **3** income levels | Permanent |
| Team Pyramid | `TEAM_PYRAMID_COST_REAMS` (**80**) | **1.5×** focus paper rate for everyone in the **room** while `teamPyramidBuffExpiresAt` is in the future | `TEAM_PYRAMID_DURATION_MS` (**3 hours**) per purchase; buying again **extends** from the current room expiry (or from now if none), server-side in `purchaseTeamPyramid`. |

Team Pyramid state is loaded on `joinRoom` (`teamPyramidBuffLoaded`) and updated for all clients (`teamPyramidBuffUpdated`). See `src/hooks/useSocket.ts` and `server.ts` (`roomTeamPyramidBuffExpiresAt`).

---

## Where to find the code

| Concern | Location |
|---------|----------|
| Tunable constants | `src/gameConfig.ts` |
| Energy math (multipliers, settle, water overlap) | `src/focusEnergyModel.ts` |
| Monitor income & upgrade prices | `src/monitorUpgradeConstants.ts` |
| Chair upgrade caps / cost export | `src/chairUpgradeConstants.ts` |
| Desk owner vs sitter for upgrades | `src/deskOwner.ts` |
| Timer, paper accrual, energy wall-clock ticks, buff state | `src/store/useGameStore.ts` — `tickTimer`, `tickFocusEnergyWallClock` |
| Focus UI effective rate display | `src/components/ui/PomodoroUI.tsx` |
| Vending + socket purchases | `src/components/ui/VendingMenu.tsx` |
| Leaderboard lifetime paper floor | `src/paperReamsLifetime.ts` |
| Server purchases & room pyramid | `server.ts` — `purchaseChairUpgradeTxn`, `purchaseMonitorUpgradeTxn`, `purchaseTeamPyramidTxn`, room buff map |
| Local test economy | `server/memoryDb.ts` |
