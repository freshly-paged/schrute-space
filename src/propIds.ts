/** ThrowableObject id for the Regional Manager office “Michael Suit” (ms_body.glb). */
export const MS_BODY_THROWABLE_ID = 'ms_body';

/** Inspect-only floating prop when Team Pyramid room buff is active (not throwable). */
export const TEAM_PYRAMID_INSPECT_ID = 'team_pyramid';

export function isWearableThrowableId(id: string): boolean {
  return id === MS_BODY_THROWABLE_ID;
}
