// lib/relationship-levels.ts

export const INTIMACY_LEVELS = {
  STRANGER: 0,
  ACQUAINTANCE: 1,
  CRUSH: 2,
  DATING: 3,
  COMMITTED: 4,
} as const;

export const LEVEL_NAMES = {
  0: 'STRANGER',
  1: 'ACQUAINTANCE', 
  2: 'CRUSH',
  3: 'DATING',
  4: 'COMMITTED',
} as const;

export const LEVEL_EMOJIS = {
  0: '🙂',
  1: '😊',
  2: '🤝',
  3: '💖',
  4: '💍',
} as const;

export const LEVEL_THRESHOLDS = {
  STRANGER: { min: 0, max: 10 },
  ACQUAINTANCE: { min: 11, max: 100 },
  CRUSH: { min: 101, max: 1000 },
  DATING: { min: 1001, max: 3000 },
  COMMITTED: { min: 3001, max: 5000 },
} as const;

export const BROKEN_THRESHOLD = -10;
export const RESCUE_THRESHOLD = -5;

/**
 * Determine intimacy level based on total affection points
 */
export function getIntimacyLevel(points: number): number {
  if (points <= LEVEL_THRESHOLDS.STRANGER.max) return INTIMACY_LEVELS.STRANGER;
  if (points <= LEVEL_THRESHOLDS.ACQUAINTANCE.max) return INTIMACY_LEVELS.ACQUAINTANCE;
  if (points <= LEVEL_THRESHOLDS.CRUSH.max) return INTIMACY_LEVELS.CRUSH;
  if (points <= LEVEL_THRESHOLDS.DATING.max) return INTIMACY_LEVELS.DATING;
  return INTIMACY_LEVELS.COMMITTED;
}

/**
 * Check if relationship is broken (≤ -10)
 */
export function isBroken(points: number): boolean {
  return points <= BROKEN_THRESHOLD;
}

/**
 * Check if rescue plan should be triggered (≤ -5 but > -10)
 */
export function shouldTriggerRescue(points: number): boolean {
  return points <= RESCUE_THRESHOLD && points > BROKEN_THRESHOLD;
}
