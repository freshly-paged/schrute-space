# Game Mechanics Reference

All tunable values live in **`src/gameConfig.ts`**. Edit that file to change gameplay balance — no other files need touching for numeric tweaks.

---

## Currency: Paper Reams

Paper reams are the primary game currency. They are earned passively during focus sessions and spent on upgrades or items.

### Earning paper

| Condition | Rate |
|---|---|
| Focus session, monitor level 0 | `FOCUS_BASE_REAMS_PER_MINUTE` (2 reams/min) |
| Each of the first 3 monitor upgrades | +1 ream/min (up to 5 reams/min max) |
| Monitor upgrades 4–7 | Cosmetic only, no income boost |
| Energy below `FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO` (40%) | Rate scales down linearly |
| Energy at `FOCUS_ENERGY_REAM_MIN_RATIO` (10%) or below | Rate floored at 50% of base |

Earn rate formula (during focus):
```
reamsPerMin = focusReamsPerMinute(monitorLevel) * focusReamMultiplier(currentEnergy)
```

Paper accrues fractionally every game tick and is granted in whole-ream increments.

### Spending paper

| Purchase | Cost |
|---|---|
| Chair upgrade (per level) | `CHAIR_UPGRADE_COST_REAMS` (50 reams) |
| Monitor upgrade level 1 | 200 reams |
| Monitor upgrade level 2 | 300 reams |
| Monitor upgrade level 3+ | 500 reams each |
| Ice cream cone (vending machine) | `ICE_CREAM_COST_REAMS` (2 reams) |

---

## Currency: Focus Energy

Focus energy (0–100) represents stamina. It affects earn rate, walk speed, and the ability to perform parkour moves.

### Energy rates

| State | Change per minute |
|---|---|
| Idle (not in focus session) | +`FOCUS_ENERGY_REGEN_PER_MIN` (+5) |
| Focus session (seated at desk) | −`FOCUS_ENERGY_DRAIN_PER_MIN` (−2) |
| Focus session + chair upgrades | −2 + (`FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN` × level) |
| Water cooler buff active | +`FOCUS_ENERGY_WATER_BUFF_REGEN_PER_MIN` (+5, stacks with regen) |
| Parkour move (double jump / roll) | −`PARKOUR_FOCUS_ENERGY_COST` (−5, instant) |

The water cooler buff lasts `FOCUS_ENERGY_WATER_BUFF_DURATION_MS` (5 minutes).

### Energy effects

| Threshold | Effect |
|---|---|
| ≥ `FOCUS_ENERGY_FULL_EFFECT_MIN_RATIO` × max (≥ 40 energy) | Full earn rate and full walk speed |
| Between 10 and 40 energy | Earn rate and walk speed scale down linearly |
| ≤ `FOCUS_ENERGY_REAM_MIN_RATIO` × max (≤ 10 energy) | Earn rate floored at 50%; walk speed still scales |
| < `PARKOUR_MIN_ENERGY_REQUIRED` (20 energy) | Parkour moves blocked |

---

## Upgrades

Upgrades are purchased at the vending machine and stored per-user in the database.

### Chair upgrade

- **Max level:** `CHAIR_UPGRADE_MAX_LEVEL` (20)
- **Cost per level:** `CHAIR_UPGRADE_COST_REAMS` (50 reams, flat)
- **Benefit:** Each level adds `FOCUS_ENERGY_SEATED_REGEN_PER_CHAIR_LEVEL_PER_MIN` (0.2) energy regen per minute while seated, offsetting the focus drain. At max level the net drain during focus is −2 + (0.2 × 20) = +2/min (net regen).

### Monitor upgrade

- **Max level:** `MONITOR_UPGRADE_MAX_LEVEL` (7, giving 8 monitors total)
- **Cost:** Tiered — see `MONITOR_UPGRADE_COSTS` in `src/gameConfig.ts`
- **Benefit:** Each of the first `MONITOR_INCOME_BOOST_LEVELS` (3) purchases adds +1 ream/min. Upgrades 4–7 are cosmetic (add monitors to the desk model, no income change).

---

## Pomodoro Timer

| Setting | Value |
|---|---|
| Focus session duration | `POMODORO_FOCUS_DURATION_SEC` (1500 s = 25 min) |
| Break duration | `POMODORO_BREAK_DURATION_SEC` (300 s = 5 min) |

Paper is earned only during the focus session. The break timer is purely a cooldown with no mechanics attached.

---

## Vending Machine Items

| Item | Cost | Effect | Duration |
|---|---|---|---|
| Ice cream cone | `ICE_CREAM_COST_REAMS` (2 reams) | Cosmetic prop held by avatar | `ICE_CREAM_DURATION_MS` (60 s) |
| Chair upgrade | 50 reams/level | +0.2 energy regen/min while seated | Permanent |
| Monitor upgrade | Tiered | +1 ream/min (first 3 levels) | Permanent |

---

## Where to find the code

| Concern | File |
|---|---|
| All tunable constants | `src/gameConfig.ts` |
| Energy drain/regen logic | `src/focusEnergyModel.ts` |
| Chair upgrade constants | `src/chairUpgradeConstants.ts` |
| Monitor upgrade costs & income | `src/monitorUpgradeConstants.ts` |
| Paper accrual tick | `src/store/useGameStore.ts` — `tickTimer()` |
| Leaderboard lifetime paper | `src/paperReamsLifetime.ts` |
| Server-side purchase validation | `server.ts` — `purchaseChairUpgradeTxn`, `purchaseMonitorUpgradeTxn` |
