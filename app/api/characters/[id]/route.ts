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
        const { uid, prisma } = await getAuthContext(request)

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId: id, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

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

                    console.log(`[DELETE] Deleted ${conversations.length} phone conversations for character ${id}`)
                }
            }
        } catch (phoneError) {
            console.warn('[DELETE] Could not delete phone data (Supabase):', phoneError)
            // Continue with character deletion even if phone data fails
        }

        // Delete character
        await prisma.character.delete({
            where: { id: id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error deleting character:', error)
        return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
    }
}

// PATCH is an alias for PUT (partial update)
export const PATCH = PUT
