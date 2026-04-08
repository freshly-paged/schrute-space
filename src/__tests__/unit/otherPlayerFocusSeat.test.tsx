import { describe, expect, it } from 'vitest';
import type { Player, DeskItem } from '../../types';
import { getFocusedDeskTransform } from '../../components/player/OtherPlayer';

describe('getFocusedDeskTransform', () => {
  const basePlayer: Player = {
    id: 'p1',
    name: 'Alice',
    color: '#fff',
    position: [10, 0, 10],
    rotation: [0, 0.2, 0],
    isFocused: true,
    focusProgress: 0.5,
    activeDeskId: 'desk-a',
  };

  it('anchors focused player to active desk chair transform', () => {
    const desk: DeskItem = {
      id: 'desk-a',
      type: 'desk',
      position: [2, 0, 4],
      rotation: [0, Math.PI / 2, 0],
      config: { ownerEmail: 'a@local.test', ownerName: 'Alice' },
    };
    const transform = getFocusedDeskTransform(basePlayer, [desk]);
    expect(transform).not.toBeNull();

    const props = transform!;
    // Chair offset is [0,0,0.8] rotated by desk yaw (pi/2) => [0.8,0,0]
    expect(props.position?.[0]).toBeCloseTo(2.8, 4);
    expect(props.position?.[1]).toBeCloseTo(0, 4);
    expect(props.position?.[2]).toBeCloseTo(4, 4);
    expect(props.rotation?.[1]).toBeCloseTo(Math.PI / 2 + Math.PI, 4);
  });

  it('returns null when focused desk is missing', () => {
    expect(getFocusedDeskTransform(basePlayer, [])).toBeNull();
  });

  it('returns null when player is not focused', () => {
    expect(getFocusedDeskTransform({ ...basePlayer, isFocused: false }, [])).toBeNull();
  });
});
