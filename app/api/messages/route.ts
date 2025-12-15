import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')
        const limit = parseInt(searchParams.get('limit') || '50')

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        const messages = await prisma.message.findMany({
            where: { characterId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                replyTo: {
                    select: {
                        id: true,
                        role: true,
                        content: true,
                    },
                },
            },
        })

        // Reverse to get chronological order (oldest first)
        return NextResponse.json({ messages: messages.reverse() })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error fetching messages:', error)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')

        if (!characterId) {
            return NextResponse.json({ error: 'Missing characterId' }, { status: 400 })
        }

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        console.log(`[Reset API] 🔄 Full reset for character: ${characterId}`)

        // Use transaction for atomic reset
        await prisma.$transaction(async (tx) => {
            // 1. Delete all messages
            const deletedMessages = await tx.message.deleteMany({
                where: { characterId },
            })
            console.log(`[Reset API] Deleted ${deletedMessages.count} messages`)

            // 2. Delete all memories
            const deletedMemories = await tx.memory.deleteMany({
                where: { characterId },
            })
            console.log(`[Reset API] Deleted ${deletedMemories.count} memories`)

            // 3. Reset RelationshipConfig to initial state (including momentum fields)
            await tx.relationshipConfig.update({
                where: { characterId },
                data: {
                    affectionPoints: 0,
                    intimacyLevel: 0,
                    stage: 'STRANGER',
                    messageCount: 0,
                    lastStageChangeAt: 0,
                    lastActiveAt: new Date(),
                    // Reset emotional momentum system
                    trustDebt: 0,
                    emotionalMomentum: 0,
                    apologyCount: 0,
                    lastMessageHash: null,
                    // Keep specialNotes (meeting context) - user may want to keep this
                },
            })
            console.log(`[Reset API] Reset relationship: stage=STRANGER, affection=0, trustDebt=0, momentum=0`)
        })

        // Fetch and return the reset state for frontend
        const resetConfig = await prisma.relationshipConfig.findUnique({
            where: { characterId },
        })

        console.log(`[Reset API] ✅ Reset complete`)

        return NextResponse.json({
            success: true,
            relationship: {
                affectionPoints: resetConfig?.affectionPoints ?? 0,
                intimacyLevel: resetConfig?.intimacyLevel ?? 0,
                stage: resetConfig?.stage ?? 'STRANGER',
                messageCount: resetConfig?.messageCount ?? 0,
            },
        })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('[Reset API] ❌ Error:', error)
        return NextResponse.json({ error: 'Failed to reset' }, { status: 500 })
    }
}
