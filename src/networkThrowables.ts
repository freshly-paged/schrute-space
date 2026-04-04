import type { AssetKey } from './hooks/useGameAsset';

/** Throwable ids allowed for `playerHeldThrowable` sync (must match scene `ThrowableObject` ids). */
export const NETWORK_HELD_THROWABLE_IDS = ['ms_body', 'dundie', 'dwight_bobblehead'] as const;
export type NetworkHeldThrowableId = (typeof NETWORK_HELD_THROWABLE_IDS)[number];

const ID_SET = new Set<string>(NETWORK_HELD_THROWABLE_IDS);

/** `null` clears held state; non-null must be in `NETWORK_HELD_THROWABLE_IDS`. */
export function isAllowedHeldThrowableId(id: string | null): boolean {
  if (id === null) return true;
  return ID_SET.has(id);
}

export const heldThrowableIdToDisplay: Record<
  NetworkHeldThrowableId,
  { assetKey: AssetKey; scale: number }
> = {
  ms_body: { assetKey: 'ms_body', scale: 0.4 },
  dundie: { assetKey: 'dundie', scale: 0.45 },
  dwight_bobblehead: { assetKey: 'dwight_bobblehead', scale: 0.45 },
};
