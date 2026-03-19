# Feature Wishlist

> Schrute Space — virtual office workspace with The Office easter eggs, clicker-game progression, and real productivity tools.

---

## Legend
| Status | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Done |

---

## Clicker Game / Progression

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| C1 | **In-game currency (paper reams)** | Passive income during focus sessions (1 ream/30s) — already implemented | `[x]` |
| C2 | **Level progression** | XP from focus time, tasks completed, activities; visible level badge on avatar | `[ ]` |
| C3 | **Shop** | Spend reams on premium outfits, desk items, office decorations | `[ ]` |
| C4 | **Upgrades** | Better chair, dual monitor, bobblehead, Dwight's beet farm poster, etc. | `[ ]` |
| C5 | **Dundie Awards** | Long-term achievement trophies (e.g. "100 Hours Focused") displayed on desk; grant stat boosts | `[ ]` |

---

## Productivity Tools

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| P1 | **Pomodoro timer** | 25-min focus sessions with desk locking — already implemented | `[x]` |
| P2 | **Todo list** | Personal per-player task list; completing tasks awards XP/reams | `[ ]` |
| P3 | **Break activities** | Triggered when pomodoro ends: visit break room for coffee buff, water cooler chat for team synergy buff | `[ ]` |

---

## Social & Team Features

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| S1 | **Team rooms with player limits** | Fixed assigned seats per room; unlimited visitors; room assignment persists in DB | `[ ]` |
| S2 | **Shared team progress bar** | Collective goal tracking (e.g. team focus hours, tasks closed) visible in HUD | `[ ]` |
| S3 | **Team synergy buffs** | Reward coordinated breaks, water cooler interactions, shared goals with passive bonuses | `[ ]` |
| S4 | **Chat / emotes** | Basic chat + emotes already implemented | `[x]` |

---

## Real-Life Integration

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| R1 | **Calendar / meeting sync** | If user is in a real meeting, avatar enters a "In Meeting" state (e.g. sits in conference room) | `[ ]` |
| R2 | **Status sync** | Slack / Google Calendar presence reflected on avatar (focused, away, in meeting) | `[ ]` |

---

## World & Visuals

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| W1 | **Office visual revamp** | Current Three.js scene is bare; needs proper textures, furniture models, lighting, and The Office set dressing | `[ ]` |
| W2 | **Break room** | Separate area / sub-room with coffee machine, couch, fridge; triggers break activity buffs | `[ ]` |
| W3 | **Water cooler** | Interactable prop near common area for team synergy interactions | `[ ]` |
| W4 | **Conference room** | Dedicated space for meeting state (R1) and potential minigames | `[ ]` |

---

## Minigames

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| M1 | **Minigames** | Short break-time games (e.g. "Pretzel Day" clicker, Threat Level Midnight trivia) | `[ ]` |
| M2 | **Team bonding activities** | Multiplayer mini-events triggered by team milestones | `[ ]` |

---

## Easter Eggs

Discoverable moments and reactive gags referencing The Office. Should feel surprising and optional — never intrusive.

| # | Feature | Trigger | Notes | Status |
|---|---------|---------|-------|--------|
| E1 | **Identity theft** | Two players share the same avatar appearance | One or both players get a prompt: *"Identity theft is not a joke, ____! Millions of families suffer every year!"* — filling in the blank scores a ream bonus | `[ ]` |
| E2 | **That's what she said** | Player sends a message matching a list of innocent double-entendre phrases | A nearby NPC (Michael Scott) interjects with *"That's what she said"* as a chat bubble | `[ ]` |
| E3 | **Pretzel Day** | Once a year (or on National Pretzel Day, April 26) | A pretzel cart appears in the break room; interacting with it grants a large ream bonus and a temporary XP buff | `[ ]` |
| E4 | **Bears. Beets. Battlestar Galactica.** | Player idles at their desk for 5+ minutes | Dwight NPC walks over and stares; dismissing him gives a small ream reward | `[ ]` |
| E5 | **Threat Level Midnight screening** | Team reaches a shared focus milestone | A movie-night event triggers in the conference room; all present players get a synergy buff | `[ ]` |
| E6 | **FIRE! (Panic mode)** | Very rare random event during a work session | Dwight starts a fire drill; players must navigate to the exit within 30 seconds or lose a small ream penalty | `[ ]` |
| E7 | **World's Best Boss mug** | Reach level 10 | Cosmetic mug appears on your desk; hovering it shows *"I'm the best boss. I think you'd have to ask my employees but…"* | `[ ]` |

---

## Infrastructure / DX

| # | Feature | Notes | Status |
|---|---------|-------|--------|
| I1 | **Test suite** | No tests currently exist; add unit + integration coverage | `[ ]` |
| I2 | **CI/CD pipeline** | Automated lint, build, and deploy on push | `[ ]` |

---

## Prioritization Notes

**High value / lower effort (do first)**
- P2 Todo list — core productivity feature, self-contained
- C2 Level progression — unlocks motivation loop for most other features
- W1 Office visual revamp — first impression; affects all users immediately

**High value / higher effort**
- C3/C4 Shop + Upgrades — depends on C2 (levels) for gating
- S1 Team rooms — requires DB schema + socket changes
- R1 Real-life calendar sync — third-party OAuth scope

**Nice to have / later**
- M1 Minigames
- R2 Status sync beyond calendar
