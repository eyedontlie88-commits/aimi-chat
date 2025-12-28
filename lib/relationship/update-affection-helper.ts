// lib/relationship/update-affection-helper.ts
//
// 🎯 SHARED AFFECTION UPDATE LOGIC
// Used by both:
// - Normal chat flow (update-affection API)
// - Dev Generator (for seeding conversations)
//
// Centralizes Phone unlock logic to avoid duplication

import { supabase } from '@/lib/supabase/client';
import { calculatePointsDelta, Sentiment } from '@/lib/affection-calculator';
import { getIntimacyLevel, isBroken } from '@/lib/relationship-levels';

// 🔓 PHONE UNLOCK THRESHOLD (centralized constant)
export const PHONE_UNLOCK_THRESHOLD = 101;

export interface AffectionUpdateResult {
    success: boolean;
    affectionPoints: number;
    intimacyLevel: number;
    stage: string;
    phoneUnlocked: boolean;
    phoneJustUnlocked: boolean;
    error?: string;
}

/**
 * Core affection update logic - updates RelationshipConfig and returns new state
 * 
 * @param userId - User ID
 * @param characterId - Character ID  
 * @param sentiment - POSITIVE, NEUTRAL, or NEGATIVE
 * @returns Updated relationship state with Phone unlock flags
 */
export async function updateAffection(
    userId: string,
    characterId: string,
    sentiment: Sentiment
): Promise<AffectionUpdateResult> {
    try {
        // 1. Fetch existing relationship (use .limit(1) to avoid duplicate crashes)
        const { data: statsArray, error: fetchError } = await supabase
            .from('RelationshipConfig')
            .select('*')
            .eq('userId', userId)
            .eq('characterId', characterId)
            .limit(1);

        let stats = statsArray?.[0];

        // 2. Create if doesn't exist
        if (!stats && (!fetchError || fetchError.code === 'PGRST116')) {
            const { data: newStatsArray, error: createError } = await supabase
                .from('RelationshipConfig')
                .insert({
                    userId,
                    characterId,
                    affectionPoints: 0,
                    intimacyLevel: 0,
                    stage: 'STRANGER',
                    status: 'Người lạ',
                    phone_unlocked: false,
                })
                .select()
                .limit(1);

            if (createError) {
                return {
                    success: false,
                    affectionPoints: 0,
                    intimacyLevel: 0,
                    stage: 'STRANGER',
                    phoneUnlocked: false,
                    phoneJustUnlocked: false,
                    error: createError.message,
                };
            }

            stats = newStatsArray?.[0];
        } else if (fetchError) {
            return {
                success: false,
                affectionPoints: 0,
                intimacyLevel: 0,
                stage: 'STRANGER',
                phoneUnlocked: false,
                phoneJustUnlocked: false,
                error: fetchError.message,
            };
        }

        if (!stats) {
            return {
                success: false,
                affectionPoints: 0,
                intimacyLevel: 0,
                stage: 'STRANGER',
                phoneUnlocked: false,
                phoneJustUnlocked: false,
                error: 'Failed to retrieve relationship data',
            };
        }

        // 3. Calculate new points
        const currentPoints = stats.affectionPoints || 0;
        const currentLevel = stats.intimacyLevel || 0;
        const pointsDelta = calculatePointsDelta(sentiment, currentLevel);
        const newPoints = currentPoints + pointsDelta;

        // 4. Determine new level and stage
        const newLevel = getIntimacyLevel(newPoints);
        const nowBroken = isBroken(newPoints);
        const stage = nowBroken ? 'BROKEN' : (stats.stage || 'STRANGER');

        // 🔓 5. Phone unlock logic (CENTRALIZED)
        const wasPhoneUnlocked = stats.phone_unlocked === true;
        const shouldUnlockPhone = newPoints >= PHONE_UNLOCK_THRESHOLD;
        let phoneJustUnlocked = false;

        if (!wasPhoneUnlocked && shouldUnlockPhone) {
            phoneJustUnlocked = true;
        }

        // 6. Update database
        const { error: updateError } = await supabase
            .from('RelationshipConfig')
            .update({
                affectionPoints: newPoints,
                intimacyLevel: newLevel,
                stage: stage,
                phone_unlocked: wasPhoneUnlocked || shouldUnlockPhone,
                updatedAt: new Date().toISOString(),
            })
            .eq('userId', userId)
            .eq('characterId', characterId);

        if (updateError) {
            return {
                success: false,
                affectionPoints: currentPoints,
                intimacyLevel: currentLevel,
                stage: stats.stage || 'STRANGER',
                phoneUnlocked: wasPhoneUnlocked,
                phoneJustUnlocked: false,
                error: updateError.message,
            };
        }

        // 7. Return success with new state
        return {
            success: true,
            affectionPoints: newPoints,
            intimacyLevel: newLevel,
            stage: stage,
            phoneUnlocked: wasPhoneUnlocked || shouldUnlockPhone,
            phoneJustUnlocked: phoneJustUnlocked,
        };

    } catch (error: any) {
        return {
            success: false,
            affectionPoints: 0,
            intimacyLevel: 0,
            stage: 'STRANGER',
            phoneUnlocked: false,
            phoneJustUnlocked: false,
            error: error.message || 'Unknown error',
        };
    }
}
