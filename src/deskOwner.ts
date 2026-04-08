import type { DeskItem, FurnitureItem } from './types';

/** Email of the desk owner for a given desk id in the room layout, if it is a valid desk. */
export function getDeskOwnerEmailForDeskId(
  layout: FurnitureItem[],
  deskId: string | null
): string | undefined {
  if (!deskId) return undefined;
  const item = layout.find((f) => f.id === deskId && f.type === 'desk');
  if (!item) return undefined;
  const email = (item as DeskItem).config?.ownerEmail;
  return typeof email === 'string' && email.length > 0 ? email : undefined;
}

/**
 * While focusing at a desk, upgrades apply to the workstation (desk owner), not the sitter.
 * Falls back to the local user's email if the layout has no matching desk yet.
 */
export function getEffectiveDeskUpgradeEmail(
  layout: FurnitureItem[],
  activeDeskId: string | null,
  localUserEmail: string | undefined
): string | undefined {
  return getDeskOwnerEmailForDeskId(layout, activeDeskId) ?? localUserEmail;
}
