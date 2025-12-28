// app/api/relationship/update-affection/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { Sentiment } from '@/lib/affection-calculator';
import { LEVEL_NAMES } from '@/lib/relationship-levels';
import { updateAffection } from '@/lib/relationship/update-affection-helper';

interface UpdateAffectionRequest {
    userId: string;
    characterId: string;
    sentiment: Sentiment;
    messageContent?: string; // Optional, for history tracking
}

export async function POST(req: NextRequest) {
    try {
        const body: UpdateAffectionRequest = await req.json();
        const { userId, characterId, sentiment } = body;

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

        if (!isSupabaseConfigured()) {
            console.error('[Update Affection] Supabase not configured');
            return NextResponse.json(
                { error: 'Database not configured' },
                { status: 500 }
            );
        }

        console.log(`[Update Affection] Processing: user=${userId}, char=${characterId}, sentiment=${sentiment}`);

        // Call shared helper (centralizes all logic)
        const result = await updateAffection(userId, characterId, sentiment);

        if (!result.success) {
            console.error('[Update Affection] Helper error:', result.error);
            return NextResponse.json(
                { error: 'Failed to update affection', details: result.error },
                { status: 500 }
            );
        }

        console.log(`[Update Affection] Success: ${result.affectionPoints} points, Level ${result.intimacyLevel}, Phone unlock: ${result.phoneJustUnlocked}`);

        // Return response
        return NextResponse.json({
            success: true,
            affectionPoints: result.affectionPoints,
            intimacyLevel: result.intimacyLevel,
            levelName: LEVEL_NAMES[result.intimacyLevel as keyof typeof LEVEL_NAMES],
            stage: result.stage,
            // 🔓 Phone unlock status
            phoneUnlocked: result.phoneUnlocked,
            phoneJustUnlocked: result.phoneJustUnlocked,
        });

    } catch (error: any) {
        console.error('[Update Affection] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
