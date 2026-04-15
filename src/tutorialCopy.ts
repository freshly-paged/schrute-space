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
    "Welcome to Dunder Mifflin, Scranton! I'm Michael Scott — World's Best Boss. It's on my mug, so it's basically legally binding. You are going to love it here. I am going to make sure of that, because that is what great managers do. Also — that's what she said.",
  desk:
    "Bears. Beets. Battlestar Galactica. Also — DESKS! Follow the yellow line to yours and press [E] to start a Focus Session. That's how we make paper, which is how we make money, which is how I justify basically everything. Go ahead, give it a try!",
  'focus-energy':
    "THAT'S WHAT SHE SAID! ...Sorry, force of habit. See that green bar? That's your Focus Energy. It drains during long sessions and recharges when you take a breather. Drop below 40% and your ream rate slows — kind of like Ryan after his third espresso. Pace yourself.",
  upgrades:
    "Press [F] at your desk to open the computer. Chair Upgrades help your energy regen while seated. Monitor Upgrades earn you more reams per minute. Think of it like Pretzel Day, but for your career. And everyone loves Pretzel Day.",
  'water-cooler':
    "The water cooler — where the magic happens! Gossip, rumors, Jim's pranks on Dwight — all hatched right here. Standing near it recharges your energy faster. Dwight says it's 'inefficient loitering.' I say Dwight is not the Regional Manager. I am.",
  vending:
    "The Vend-O-Matic 3000. Ice cream refills your Focus Energy. Kevin once ate four scoops in one sitting and said it was 'the best day of his life.' I respect that. You work hard, you deserve a treat. That's just good management.",
  customize:
    "See that framed office blueprint on the wall? Click on it to open the Office Customizer. You can rearrange your desk however you like. I've moved mine six times. Feng shui is very real and very important, and I will not hear otherwise.",
  leaderboard:
    "Head count! ...Just kidding. Head over to the conference room — that's where I deliver my best speeches, and also where the Leaderboard lives. It's ranked by lifetime paper earned. I'm not going to tell you where I rank, but let's just say I'm very inspirational.",
  exit:
    "And there's the door. Nobody ever leaves willingly, which is honestly our best HR metric. If you absolutely must go, press [E] near it. But I hope you stay. Because we are not just coworkers — we are family. And I am the cool dad.",
};
