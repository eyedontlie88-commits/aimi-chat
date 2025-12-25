// lib/affection-calculator.ts

import { INTIMACY_LEVELS } from './relationship-levels';

export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

interface PointsRange {
    min: number;
    max: number;
}

/**
 * Get points range based on sentiment and current intimacy level
 */
export function getPointsRange(sentiment: Sentiment, level: number): PointsRange {
    // Level 0 (STRANGER): ±3 to ±5
    if (level === INTIMACY_LEVELS.STRANGER) {
        if (sentiment === 'POSITIVE') return { min: 3, max: 5 };
        if (sentiment === 'NEGATIVE') return { min: -5, max: -3 };
        return { min: 0, max: 0 }; // NEUTRAL
    }

    // Level 1 (ACQUAINTANCE): ±5 to ±7
    if (level === INTIMACY_LEVELS.ACQUAINTANCE) {
        if (sentiment === 'POSITIVE') return { min: 5, max: 7 };
        if (sentiment === 'NEGATIVE') return { min: -7, max: -5 };
        return { min: 0, max: 0 };
    }

    // Level 2 (CRUSH): ±7 to ±10
    if (level === INTIMACY_LEVELS.CRUSH) {
        if (sentiment === 'POSITIVE') return { min: 7, max: 10 };
        if (sentiment === 'NEGATIVE') return { min: -10, max: -7 };
        return { min: 0, max: 0 };
    }

    // Level 3 (DATING): ±8 to ±10
    if (level === INTIMACY_LEVELS.DATING) {
        if (sentiment === 'POSITIVE') return { min: 8, max: 10 };
        if (sentiment === 'NEGATIVE') return { min: -10, max: -8 };
        return { min: 0, max: 0 };
    }

    // Level 4 (COMMITTED): ±10 (max)
    if (sentiment === 'POSITIVE') return { min: 10, max: 10 };
    if (sentiment === 'NEGATIVE') return { min: -10, max: -10 };
    return { min: 0, max: 0 };
}

/**
 * Calculate affection points delta based on sentiment and current level
 * Returns a random value within the appropriate range
 */
export function calculatePointsDelta(sentiment: Sentiment, currentLevel: number): number {
    const range = getPointsRange(sentiment, currentLevel);

    if (range.min === range.max) return range.min;

    // Random value between min and max (inclusive)
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}
