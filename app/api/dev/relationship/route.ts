import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

/**
 * TASK C: Dev-only API to quickly manipulate relationship state
 * Only available in non-production environments
 */

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
    // Guard: Only allow in development
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
            { error: 'Dev tools not available in production' },
            { status: 403 }
        )
    }

    try {
        const { prisma, uid } = await getAuthContext(request)
        const body = await request.json()
        const { characterId, action, ...params } = body

        if (!characterId) {
            return NextResponse.json({ error: 'characterId required' }, { status: 400 })
        }

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        console.log(`[Dev API] 🧪 ${action} for character: ${characterId}`, params)

        let updatedConfig

        switch (action) {
            case 'setStage':
                // Set stage directly: STRANGER, ACQUAINTANCE, CRUSH, DATING, COMMITTED
                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        stage: params.stage || 'STRANGER',
                    },
                })
                break

            case 'setAffection':
                // Set affection points directly (0-100)
                const affection = Math.max(0, Math.min(100, params.affection || 0))
                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        affectionPoints: affection,
                    },
                })
                break

            case 'applyImpact':
                // Apply impact directly (+6 or -6 for testing)
                const currentConfig = await prisma.relationshipConfig.findUnique({
                    where: { characterId },
                })
                if (!currentConfig) {
                    return NextResponse.json({ error: 'Config not found' }, { status: 404 })
                }

                const impact = params.impact || 0
                const scaledImpact = impact * 3
                const newAffection = Math.max(0, Math.min(100, currentConfig.affectionPoints + scaledImpact))

                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        affectionPoints: Math.round(newAffection),
                    },
                })
                break

            case 'jumpTo':
                // Quick jump to specific stage with appropriate affection
                const stagePresets: Record<string, { stage: string; affection: number }> = {
                    STRANGER: { stage: 'STRANGER', affection: 5 },
                    ACQUAINTANCE: { stage: 'ACQUAINTANCE', affection: 25 },
                    CRUSH: { stage: 'CRUSH', affection: 45 },
                    DATING: { stage: 'DATING', affection: 70 },
                    COMMITTED: { stage: 'COMMITTED', affection: 90 },
                }

                const preset = stagePresets[params.target] || stagePresets.STRANGER
                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        stage: preset.stage,
                        affectionPoints: preset.affection,
                        lastStageChangeAt: 0,
                        // Reset momentum for clean slate
                        trustDebt: 0,
                        emotionalMomentum: 0.3, // Slightly positive
                        apologyCount: 0,
                    },
                })
                break

            case 'resetRelationshipOnly':
                // Reset only relationship, keep messages/memories
                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        affectionPoints: 0,
                        intimacyLevel: 0,
                        stage: 'STRANGER',
                        messageCount: 0,
                        lastStageChangeAt: 0,
                        // Reset momentum
                        trustDebt: 0,
                        emotionalMomentum: 0,
                        apologyCount: 0,
                        lastMessageHash: null,
                    },
                })
                break

            case 'simulateTimeGap':
                // Simulate time passage by setting lastActiveAt to N hours ago
                // This is dev-only for testing time-gap decay behavior
                const hoursAgo = params.hours || 24
                const simulatedTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)
                updatedConfig = await prisma.relationshipConfig.update({
                    where: { characterId },
                    data: {
                        lastActiveAt: simulatedTime,
                    },
                })
                console.log(`[Dev API] ⏰ Simulated ${hoursAgo}h time gap (lastActiveAt = ${simulatedTime.toISOString()})`)
                break

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
        }

        console.log(`[Dev API] ✅ Updated:`, updatedConfig)

        return NextResponse.json({
            success: true,
            relationship: {
                affectionPoints: updatedConfig.affectionPoints,
                intimacyLevel: updatedConfig.intimacyLevel,
                stage: updatedConfig.stage,
                messageCount: updatedConfig.messageCount,
            },
        })
    } catch (error: any) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('[Dev API] ❌ Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
