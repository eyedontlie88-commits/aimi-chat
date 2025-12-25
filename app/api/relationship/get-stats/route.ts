// app/api/relationship/get-stats/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { getIntimacyLevel, LEVEL_NAMES, LEVEL_EMOJIS, isBroken, shouldTriggerRescue } from '@/lib/relationship-levels';

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

        // Fetch relationship stats
        const { data: stats, error } = await supabase
            .from('relationship_stats')
            .select('*')
            .eq('user_id', userId)
            .eq('character_id', characterId)
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
            });
        }

        if (error) {
            console.error('[Get Stats] Database error:', error);
            return NextResponse.json(
                { error: 'Failed to fetch stats', details: error.message },
                { status: 500 }
            );
        }

        const currentLevel = stats.intimacy_level;
        const points = stats.affection_points;

        return NextResponse.json({
            exists: true,
            affectionPoints: points,
            intimacyLevel: currentLevel,
            levelName: LEVEL_NAMES[currentLevel as keyof typeof LEVEL_NAMES],
            levelEmoji: LEVEL_EMOJIS[currentLevel as keyof typeof LEVEL_EMOJIS],
            isBroken: stats.is_broken,
            rescuePlanTriggered: stats.rescue_plan_triggered,
            createdAt: stats.created_at,
            updatedAt: stats.updated_at,
        });

    } catch (error: any) {
        console.error('[Get Stats] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
