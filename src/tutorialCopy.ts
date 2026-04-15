export type OfficeTutorialPhase =
  | 'intro'
  | 'desk'
  | 'focus-energy'
  | 'upgrades'
  | 'water-cooler'
  | 'vending'
  | 'customize'
  | 'leaderboard'
  | 'exit';

export const PHASE_ORDER: OfficeTutorialPhase[] = [
  'intro',
  'desk',
  'focus-energy',
  'upgrades',
  'water-cooler',
  'vending',
  'customize',
  'leaderboard',
  'exit',
];

export const TUTORIAL_DIALOGUE: Record<OfficeTutorialPhase, string> = {
  intro:
    "Welcome to Dunder Mifflin, Scranton. I'm Michael Scott — Regional Manager, and also your friend. Mostly manager though. This is your orientation. Please hold your applause until the end.",
  desk:
    "First rule of corporate life: butts in seats. Follow the yellow line to your desk and press [E] to start a Focus Session. That's how paper gets made. Literally. Your legacy starts now.",
  'focus-energy':
    "See that blue bar? That's your will to live. It drains while you grind and refills when you slack off. Drop below 40% and you'll earn reams slower. Corporate calls it 'burnout'. I call it Tuesday.",
  upgrades:
    "Press [F] at your desk to open the computer. Buy Monitor Upgrades to earn more reams per minute. Chair Upgrades help you regen energy faster while seated. It's called investing in yourself. Very HR-approved.",
  'water-cooler':
    "The water cooler: where careers pause and rumors flourish. Standing near it regenerates your energy faster. Use it wisely. Or use it to gossip. Ideally both, simultaneously.",
  vending:
    "The Vend-O-Matic 3000. Ice cream refills your energy. Is it medically recommended? I said yes and nobody corrected me. Also: Chair Upgrades are sold here. You deserve nice things.",
  customize:
    "See that framed office blueprint on the wall? Walk up and press [E] to open the Office Customizer. You can rearrange your desk however you like. I've moved mine six times. Feng shui is very important to me.",
  leaderboard:
    "The conference room is where important meetings happen and where I deliver my best speeches. It also has the Leaderboard — ranked by lifetime paper earned. First place gets bragging rights. I'm usually first.",
  exit:
    "And finally — the door. Nobody ever uses it, which is the correct choice. But technically, if you absolutely had to leave — press [E] near the door. Please don't though. We're a family here. I'll know.",
};
