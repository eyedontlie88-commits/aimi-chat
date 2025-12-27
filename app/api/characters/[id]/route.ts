import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Unwrap params Promise (Next.js 16 requirement)
        const { id } = await params
        const { uid, prisma } = await getAuthContext(request)

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId: id, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        const character = await prisma.character.findUnique({
            where: { id: id },
            include: {
                relationshipConfig: true,
                _count: {
                    select: {
                        messages: true,
                        memories: true,
                    },
                },
            },
        })

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        return NextResponse.json({ character })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error fetching character:', error)
        return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Unwrap params Promise (Next.js 16 requirement)
        const { id } = await params
        const { uid, prisma } = await getAuthContext(request)
        const body = await request.json()

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId: id, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        const {
            name,
            avatarUrl,
            gender,
            age,  // NEW: age for pronoun logic
            shortDescription,
            persona,
            speakingStyle,
            boundaries,
            tags,
            modelName,
            provider,
            meetingContext, // New field for relationship context
        } = body

        const character = await prisma.character.update({
            where: { id: id },
            data: {
                ...(name && { name }),
                ...(avatarUrl && { avatarUrl }),
                ...(gender && { gender }),
                ...(age !== undefined && { age: age ?? null }),  // NEW: update age
                ...(shortDescription && { shortDescription }),
                ...(persona && { persona }),
                ...(speakingStyle && { speakingStyle }),
                ...(boundaries && { boundaries }),
                ...(tags !== undefined && { tags }),
                ...(modelName !== undefined && { modelName }),
                ...(provider !== undefined && { provider }),
            },
            include: {
                relationshipConfig: true,
            },
        })

        // If meetingContext is provided, update RelationshipConfig
        if (meetingContext !== undefined) {
            const hasContext = meetingContext?.trim().length > 0
            await prisma.relationshipConfig.update({
                where: { characterId: id },
                data: {
                    specialNotes: meetingContext,
                    // If user provides any context, upgrade from UNDEFINED to STRANGER
                    stage: hasContext ? 'STRANGER' : 'UNDEFINED',
                },
            })
        }

        // Fetch updated character with relationshipConfig
        const updatedCharacter = await prisma.character.findUnique({
            where: { id: id },
            include: { relationshipConfig: true },
        })

        return NextResponse.json({ character: updatedCharacter })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error updating character:', error)
        return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        // Unwrap params Promise (Next.js 16 requirement)
        const { id } = await params
        const { uid, prisma, email } = await getAuthContext(request)

        console.log(`[DELETE] 🗑️ Starting permanent delete for CharID: ${id}`)

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId: id, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        // ============================================
        // STEP 1: FETCH ALL DATA FOR BACKUP
        // ============================================
        console.log('[DELETE] 📦 Step 1: Fetching all data for backup...')

        const character = await prisma.character.findUnique({
            where: { id: id },
        })

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        const messages = await prisma.message.findMany({
            where: { characterId: id },
            orderBy: { createdAt: 'asc' }
        })

        const memories = await prisma.memory.findMany({
            where: { characterId: id },
            orderBy: { createdAt: 'asc' }
        })

        const messageCount = messages.length
        const memoryCount = memories.length

        console.log(`[DELETE] 📊 Data fetched: ${messageCount} messages, ${memoryCount} memories`)

        // ============================================
        // STEP 2: BACKUP TO TELEGRAM (BEFORE DELETION!)
        // ============================================
        if (messageCount > 0 || memoryCount > 0) {
            console.log('[DELETE] 📤 Step 2: Sending backup to Telegram...')

            try {
                const { sendBackupToTelegram } = await import('@/lib/telegram-backup')

                const backupData = {
                    characterId: character.id,
                    characterName: character.name,
                    userId: uid,
                    userEmail: email || 'unknown',
                    timestamp: Date.now(),
                    messages: messages.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        createdAt: m.createdAt,
                        reactionType: m.reactionType
                    })),
                    memories: memories.map(m => ({
                        id: m.id,
                        type: m.type,
                        content: m.content,
                        importanceScore: m.importanceScore,
                        category: m.category,
                        createdAt: m.createdAt
                    })),
                    relationship: relationship
                }

                await sendBackupToTelegram(backupData)
                console.log('[DELETE] ✅ Backup successfully sent to Telegram!')

            } catch (backupError: any) {
                console.error('[DELETE] ❌ Telegram backup FAILED:', backupError.message)
                // SAFETY: Don't delete if backup fails
                return NextResponse.json({
                    success: false,
                    error: 'Backup failed. Character NOT deleted for safety.',
                    details: backupError.message,
                    hint: 'Check Telegram configuration or try again later.'
                }, { status: 500 })
            }
        } else {
            console.log('[DELETE] ⏭️ No data to backup, skipping Telegram step')
        }

        // ============================================
        // STEP 3: DELETE ALL DATA (AFTER BACKUP SUCCESS)
        // ============================================
        console.log('[DELETE] 🗑️ Step 3: Hard deleting all data from database...')

        // Delete related data first (in case cascade doesn't work)
        await prisma.memory.deleteMany({ where: { characterId: id } })
        await prisma.message.deleteMany({ where: { characterId: id } })
        await prisma.relationshipConfig.deleteMany({ where: { characterId: id } })

        // Delete phone data from Supabase (if configured)
        try {
            const { supabase, isSupabaseConfigured } = await import('@/lib/supabase/client')
            if (isSupabaseConfigured() && supabase) {
                // Find all conversations for this character
                const { data: conversations } = await supabase
                    .from('phone_conversations')
                    .select('id')
                    .eq('character_id', id)

                if (conversations && conversations.length > 0) {
                    const conversationIds = conversations.map(c => c.id)

                    // Delete messages first (FK constraint)
                    await supabase
                        .from('phone_messages')
                        .delete()
                        .in('conversation_id', conversationIds)

                    // Delete conversations
                    await supabase
                        .from('phone_conversations')
                        .delete()
                        .eq('character_id', id)

                    console.log(`[DELETE] ✅ Deleted ${conversations.length} phone conversations`)
                }
            }
        } catch (phoneError) {
            console.warn('[DELETE] ⚠️ Could not delete phone data (Supabase):', phoneError)
            // Continue with character deletion even if phone data fails
        }

        // Delete character
        await prisma.character.delete({
            where: { id: id },
        })

        console.log('[DELETE] ✅ Character HARD deleted from database')
        console.log('[DELETE] 🏁 Character deletion completed successfully!', {
            deleted: {
                character: character.name,
                messages: messageCount,
                memories: memoryCount
            },
            backupSent: messageCount > 0 || memoryCount > 0
        })

        return NextResponse.json({
            success: true,
            deleted: {
                character: character.name,
                messages: messageCount,
                memories: memoryCount
            },
            backupSent: messageCount > 0 || memoryCount > 0
        })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('[DELETE] ❌ Error deleting character:', error)
        return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
    }
}

// PATCH is an alias for PUT (partial update)
export const PATCH = PUT
