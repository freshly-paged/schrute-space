import { TEAM_PYRAMID_COST_REAMS, TEAM_PYRAMID_DURATION_MS } from './gameConfig';

export interface TeamUpgradeDef {
  target: number;
  durationMs: number;
  displayName: string;
  description: string;
}

export const TEAM_UPGRADE_DEFS: Record<string, TeamUpgradeDef> = {
  pyramid: {
    target: TEAM_PYRAMID_COST_REAMS,
    durationMs: TEAM_PYRAMID_DURATION_MS,
    displayName: 'Team Pyramid',
    description:
      'Team-wide buff: 3 hours of +50% paper reams for everyone while focusing. Pool reams together to activate — anyone can contribute any amount. Unleash the power of the pyramid!',
  },
};
