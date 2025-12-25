// app/api/relationship/update-affection/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { calculatePointsDelta, Sentiment } from '@/lib/affection-calculator';
import { getIntimacyLevel, isBroken, shouldTriggerRescue, LEVEL_NAMES } from '@/lib/relationship-levels';

interface UpdateAffectionRequest {
    userId: string;
    characterId: string;
    sentiment: Sentiment;
    messageContent?: string; // Optional, for history tracking
}

export async function POST(req: NextRequest) {
    try {
        const body: UpdateAffectionRequest = await req.json();
        const { userId, characterId, sentiment, messageContent } = body;

        // Validation
        if (!userId || !characterId || !sentiment) {
            return NextResponse.json(
                { error: 'userId, characterId, and sentiment are required' },
                { status: 400 }
            );
        }

        if (!['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(sentiment)) {
            return NextResponse.json(
                { error: 'sentiment must be POSITIVE, NEUTRAL, or NEGATIVE' },
                { status: 400 }
            );
        }

        if (!isSupabaseConfigured() || !supabase) {
            console.error('[Update Affection] Supabase not configured');
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        console.log(`[Update Affection] Processing: user=${userId}, char=${characterId}, sentiment=${sentiment}`);

        // 1. Fetch or create relationship stats
        let { data: stats, error: fetchError } = await supabase
            .from('relationship_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('character_id', characterId)
            .limit(1)
            .single();

        // If doesn't exist, create new relationship
        if (fetchError && fetchError.code === 'PGRST116') {
            console.log('[Update Affection] Creating new relationship');
            const { data: newStats, error: createError } = await supabase
                .from('relationship_stats')
                .insert({
                    user_id: userId,
                    character_id: characterId,
                    affection_points: 0,
                    intimacy_level: 0,
                    is_broken: false,
                    rescue_plan_triggered: false,
                })
                .select()
                .single();

            if (createError) {
                console.error('[Update Affection] Error creating relationship:', createError);
                return NextResponse.json(
                    { error: 'Failed to create relationship', details: createError.message },
                    { status: 500 }
                );
            }

            stats = newStats;
        } else if (fetchError) {
            console.error('[Update Affection] Error fetching relationship:', fetchError);
            return NextResponse.json(
                { error: 'Failed to fetch relationship', details: fetchError.message },
                { status: 500 }
            );
        }

        if (!stats) {
            return NextResponse.json(
                { error: 'Failed to retrieve relationship data' },
                { status: 500 }
            );
        }

        // 2. Calculate points delta based on current level
        const currentPoints = stats.affection_points;
        const currentLevel = stats.intimacy_level;
        const pointsDelta = calculatePointsDelta(sentiment, currentLevel);
        const newPoints = currentPoints + pointsDelta;

        console.log(`[Update Affection] Current: ${currentPoints} points (Level ${currentLevel}), Delta: ${pointsDelta}, New: ${newPoints}`);

        // 3. Determine new level
        const newLevel = getIntimacyLevel(newPoints);
        const levelChanged = newLevel !== currentLevel;

        // 4. Check broken state and rescue plan
        const nowBroken = isBroken(newPoints);
        const triggerRescue = shouldTriggerRescue(newPoints) && !stats.rescue_plan_triggered;

        console.log(`[Update Affection] Level change: ${currentLevel} → ${newLevel}, Broken: ${nowBroken}, Trigger rescue: ${triggerRescue}`);

        // 5. Update relationship stats
        const { error: updateError } = await supabase
            .from('relationship_stats')
            .update({
                affection_points: newPoints,
                intimacy_level: newLevel,
                is_broken: nowBroken,
                rescue_plan_triggered: triggerRescue ? true : stats.rescue_plan_triggered,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('character_id', characterId);

        if (updateError) {
            console.error('[Update Affection] Error updating stats:', updateError);
            return NextResponse.json(
                { error: 'Failed to update affection', details: updateError.message },
                { status: 500 }
            );
        }

        // 6. Save to history (optional, graceful failure)
        const { error: historyError } = await supabase
            .from('affection_history')
            .insert({
                relationship_id: stats.id,
                points_delta: pointsDelta,
                sentiment,
                message_content: messageContent || null,
                old_level: currentLevel,
                new_level: newLevel,
            });

        if (historyError) {
            console.warn('[Update Affection] Failed to save history (non-critical):', historyError);
        }

        // 7. Return response
        return NextResponse.json({
            success: true,
            affectionPoints: newPoints,
            pointsDelta,
            intimacyLevel: newLevel,
            levelName: LEVEL_NAMES[newLevel as keyof typeof LEVEL_NAMES],
            levelChanged,
            oldLevel: currentLevel,
            isBroken: nowBroken,
            rescuePlanTriggered: triggerRescue,
        });

    } catch (error: any) {
        console.error('[Update Affection] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
