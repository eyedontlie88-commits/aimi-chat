// app/api/dev/set-relationship/route.ts
// 🛠️ DEV TOOL: Manually set relationship stats for testing
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin Client - bypasses RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DEV emails whitelist (sync with ADMIN_EMAILS in ChatPage)
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

export async function POST(req: NextRequest) {
    try {
        const { characterId, userId, stage, status, points, userEmail } = await req.json()

        // 🔐 Security check
        if (!userEmail || !DEV_EMAILS.includes(userEmail)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        if (!characterId || !userId) {
            return NextResponse.json({ error: 'Missing characterId or userId' }, { status: 400 })
        }

        console.log(`🛠️ [DEV TOOL] Setting Relationship: ${stage} (${points}pts) for ${characterId}`)

        // 1. Check if record exists and get current affectionPoints
        const { data: existing } = await supabaseAdmin
            .from('RelationshipConfig')
            .select('id, affectionPoints')
            .eq('characterId', characterId)
            .single()

        const now = new Date().toISOString()
        let error

        if (existing) {
            // \ud83d\udee0\ufe0f FIX: ACCUMULATE points instead of SET
            let newPoints = (existing.affectionPoints || 0) + points

            // Special case: Toxic (-5000 or less) = instant reset to negative
            if (points <= -1000) {
                newPoints = points
            }

            // Clamp to 5000-point scale
            newPoints = Math.min(5000, Math.max(-100, newPoints))

            // Calculate stage based on new points (5000-point scale)
            let newStage = 'STRANGER'
            if (newPoints <= -10) newStage = 'BROKEN'
            else if (newPoints <= 10) newStage = 'STRANGER'
            else if (newPoints <= 100) newStage = 'ACQUAINTANCE'
            else if (newPoints <= 1000) newStage = 'CRUSH'
            else if (newPoints <= 3000) newStage = 'DATING'
            else newStage = 'COMMITTED'

            // Calculate intimacy level (5000-point scale)
            const newIntimacy = newPoints >= 3001 ? 4 : (newPoints >= 1001 ? 3 : (newPoints >= 101 ? 2 : (newPoints >= 11 ? 1 : 0)))

            console.log(`[DEV TOOL] Accumulating: ${existing.affectionPoints} + ${points} = ${newPoints} (Stage: ${newStage})`)

            // \u2705 UPDATE (Record exists)
            const res = await supabaseAdmin
                .from('RelationshipConfig')
                .update({
                    stage: newStage,
                    affectionPoints: newPoints,
                    intimacyLevel: newIntimacy,
                    updatedAt: now,
                    lastActiveAt: now,
                })
                .eq('characterId', characterId)
            error = res.error
        } else {
            // ✅ INSERT (New character)
            const generatedId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            console.log(`[DEV TOOL] Creating new record: ${generatedId}`)
            const res = await supabaseAdmin
                .from('RelationshipConfig')
                .insert({
                    id: generatedId,
                    characterId,
                    userId,
                    stage,
                    status,
                    affectionPoints: points,
                    intimacyLevel: points > 40 ? 3 : (points > 20 ? 2 : 1),
                    createdAt: now,
                    updatedAt: now,
                    lastActiveAt: now,
                    // Default values for required fields
                    messageCount: 0,
                    trustDebt: 0,
                    emotionalMomentum: 0,
                    apologyCount: 0,
                    lastStageChangeAt: 0,
                })
            error = res.error
        }

        if (error) {
            console.error('[DEV TOOL] DB Error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        console.log(`💕 [DEV TOOL] Relationship set successfully!`)
        return NextResponse.json({
            success: true,
            stage,
            status,
            points,
            action: existing ? 'updated' : 'created'
        })
    } catch (e: any) {
        console.error('[DEV TOOL] Exception:', e)
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
