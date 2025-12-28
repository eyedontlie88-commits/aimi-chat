// app/api/relationship/get-stats/route.ts
// 
// ⚠️ IMPORTANT: This API uses the `RelationshipConfig` table as the single source of truth
// for relationship data including affection points and phone unlock status.
// Do NOT reference any other table (like "relationship_stats") - it does not exist.

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getIntimacyLevel, LEVEL_NAMES, LEVEL_EMOJIS, isBroken, shouldTriggerRescue } from '@/lib/relationship-levels';

// 🔓 PHONE UNLOCK THRESHOLD
// Phone feature unlocks when affection points reach this value
const PHONE_UNLOCK_THRESHOLD = 101;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const characterId = searchParams.get('characterId');

        // Validation
        if (!userId || !characterId) {
            return NextResponse.json(
                { error: 'userId and characterId are required' },
                { status: 400 }
            );
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[Get Stats] Supabase not configured');
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        console.log(`[Get Stats] Fetching stats for user ${userId}, character ${characterId}`);

        // ✅ Fetch from RelationshipConfig - the REAL table in Supabase
        // Columns: id, userId, characterId, intimacyLevel, affectionPoints, stage, 
        //          lastActiveAt, messageCount, lastStageChangeAt, trustDebt, phone_unlocked, etc.
        const { data: stats, error } = await supabase
            .from('RelationshipConfig')
            .select('*')
            .eq('userId', userId)
            .eq('characterId', characterId)
            .limit(1)
            .single();

        // If no relationship exists yet, return default values
        if (error && error.code === 'PGRST116') {
            console.log('[Get Stats] No relationship found, returning defaults');
            return NextResponse.json({
                exists: false,
                affectionPoints: 0,
                intimacyLevel: 0,
                levelName: LEVEL_NAMES[0],
                levelEmoji: LEVEL_EMOJIS[0],
                isBroken: false,
                rescuePlanTriggered: false,
                phoneUnlocked: false,
                phoneJustUnlocked: false,
            });
        }

        if (error) {
            console.error('[Get Stats] Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch stats', details: error.message },
                { status: 500 }
            );
        }

        // ✅ Use camelCase column names from RelationshipConfig
        const currentLevel = stats.intimacyLevel ?? 0;
        const points = stats.affectionPoints ?? 0;

        // 🔓 PHONE UNLOCK LOGIC
        // Check if phone should be unlocked based on affection points
        const wasPhoneUnlocked = stats.phone_unlocked === true;
        const shouldUnlockPhone = points >= PHONE_UNLOCK_THRESHOLD;
        let phoneJustUnlocked = false;

        // First-time unlock: affection crossed threshold but flag not yet set
        if (!wasPhoneUnlocked && shouldUnlockPhone) {
            console.log(`[Get Stats] 🔓 PHONE UNLOCKED! Affection: ${points} >= ${PHONE_UNLOCK_THRESHOLD}`);

            // Persist the unlock flag to RelationshipConfig
            const { error: updateError } = await supabase
                .from('RelationshipConfig')
                .update({ phone_unlocked: true })
                .eq('userId', userId)
                .eq('characterId', characterId);

            if (updateError) {
                console.error('[Get Stats] Failed to persist phone_unlocked:', updateError);
            } else {
                phoneJustUnlocked = true;
                console.log('[Get Stats] ✅ phone_unlocked flag persisted to RelationshipConfig');
            }
        }

        const phoneUnlocked = wasPhoneUnlocked || shouldUnlockPhone;

        return NextResponse.json({
            exists: true,
            affectionPoints: points,
            intimacyLevel: currentLevel,
            levelName: LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES],
            levelEmoji: LEVEL_EMOJIS[currentLevel as keyof typeof LEVEL_EMOJIS],
            // Map RelationshipConfig fields (some may not exist, use defaults)
            stage: stats.stage ?? 'STRANGER',
            isBroken: stats.stage === 'BROKEN',
            rescuePlanTriggered: false, // Not tracked in RelationshipConfig
            createdAt: stats.createdAt,
            updatedAt: stats.updatedAt,
            // 🔓 Phone unlock status
            phoneUnlocked,
            phoneJustUnlocked,
        });

    } catch (error: any) {
        console.error('[Get Stats] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
