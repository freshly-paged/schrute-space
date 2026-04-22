export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { tag: 'new' | 'fix' | 'improvement'; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.6',
    date: '2026-04-21',
    changes: [
      { tag: 'new', text: 'Desk treadmill upgrade — walk while you focus for a productivity boost' },
      { tag: 'fix', text: 'Player position no longer resets when temporarily losing connection — your spot is restored on reconnect' },
    ],
  },
  {
    version: '0.5',
    date: '2026-04-14',
    changes: [
      { tag: 'new', text: 'Daily copier — stand at the copier to double your reams (up to 5 uses per day)' },
      { tag: 'new', text: 'Manager desk kick — press [K] to eject a squatter from your own desk' },
      { tag: 'improvement', text: 'Multiplayer movement is smoother — positions are batched and client-side interpolation added' },
      { tag: 'improvement', text: 'Focus energy syncs position on reconnect' },
    ],
  },
  {
    version: '0.4',
    date: '2026-04-07',
    changes: [
      { tag: 'new', text: 'Focus Bubble redesign — shared FocusOverheadBar shows session progress above other players' },
      { tag: 'new', text: 'Tutorial replay button in the game HUD' },
      { tag: 'new', text: 'Team Pyramid room buff — pool reams with colleagues for a 1.5× earn multiplier' },
      { tag: 'improvement', text: 'Chair upgrade now adds seated energy regen during focus sessions' },
    ],
  },
  {
    version: '0.3',
    date: '2026-03-31',
    changes: [
      { tag: 'new', text: 'Vend-O-Matic ice cream — buy flavors from the break room vending machine' },
      { tag: 'new', text: 'Michael Scott body suit — pick it up in the manager\'s office and wear it' },
      { tag: 'new', text: 'Water cooler energy buff — standing near the cooler boosts focus energy regen' },
      { tag: 'new', text: 'Focus saving mode — hides UI and reduces render cost during deep work' },
    ],
  },
  {
    version: '0.2',
    date: '2026-03-24',
    changes: [
      { tag: 'new', text: 'Monitor upgrades — add up to 8 screens to your desk, first 3 boost ream income' },
      { tag: 'new', text: 'Desk customization shop — buy and place trophies and decorations on your desk' },
      { tag: 'new', text: 'Room leaderboard — ranked by lifetime paper reams earned' },
      { tag: 'improvement', text: 'Parkour moves (double jump, forward roll) now cost focus energy' },
    ],
  },
  {
    version: '0.1',
    date: '2026-03-17',
    changes: [
      { tag: 'new', text: 'Initial release — 3D office, multiplayer movement, chat, focus timer, and paper reams' },
      { tag: 'new', text: 'Chair upgrades — improve your seat for seated focus energy regen' },
      { tag: 'new', text: 'Office layout editor — drag and rotate desks as an admin' },
      { tag: 'new', text: 'Avatar customization — shirt color, skin tone, and pants' },
    ],
  },
];
