import type { Player } from './types';

/** Five vending flavors — index is synced over the socket for other players. */
export const ICE_CREAM_FLAVORS = [
  { label: 'Berry', color: '#d946ef' },
  { label: 'Mint', color: '#34d399' },
  { label: 'Lemon', color: '#facc15' },
  { label: 'Chocolate', color: '#78350f' },
  { label: 'Bubblegum', color: '#60a5fa' },
] as const;

export const ICE_CREAM_FLAVOR_COUNT = ICE_CREAM_FLAVORS.length;

export function iceCreamColorForIndex(index: number): string {
  const f = ICE_CREAM_FLAVORS[Math.min(Math.max(0, index), ICE_CREAM_FLAVOR_COUNT - 1)];
  return f ? f.color : ICE_CREAM_FLAVORS[0]!.color;
}

/** Normalize socket payload so other clients always render held ice cream when valid. */
export function getSyncedIceCreamState(
  player: Pick<Player, 'iceCreamFlavorIndex' | 'iceCreamExpiresAt'>
): { flavorIndex: number; expiresAt: number } | null {
  const exRaw = player.iceCreamExpiresAt;
  const fiRaw = player.iceCreamFlavorIndex;
  if (exRaw == null || fiRaw == null) return null;
  const expiresAt = typeof exRaw === 'number' ? exRaw : Number(exRaw);
  const flavorIndex = typeof fiRaw === 'number' ? fiRaw : Number(fiRaw);
  if (!Number.isFinite(expiresAt) || !Number.isFinite(flavorIndex)) return null;
  if (flavorIndex !== Math.floor(flavorIndex) || flavorIndex < 0 || flavorIndex > ICE_CREAM_FLAVOR_COUNT - 1) {
    return null;
  }
  return { flavorIndex, expiresAt };
}
