import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const character = await prisma.character.findUnique({
            where: { id: params.id },
            include: {
                relationshipConfig: true,
            },
        })

        if (!character) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        return NextResponse.json({ character })
    } catch (error) {
        console.error('Error fetching character:', error)
        return NextResponse.json({ error: 'Failed to fetch character' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await request.json()
        const {
            name,
            avatarUrl,
            gender,
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
            where: { id: params.id },
            data: {
                ...(name && { name }),
                ...(avatarUrl && { avatarUrl }),
                ...(gender && { gender }),
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
                where: { characterId: params.id },
                data: {
                    specialNotes: meetingContext,
                    // If user provides any context, upgrade from UNDEFINED to STRANGER
                    stage: hasContext ? 'STRANGER' : 'UNDEFINED',
                },
            })
        }

        // Fetch updated character with relationshipConfig
        const updatedCharacter = await prisma.character.findUnique({
            where: { id: params.id },
            include: { relationshipConfig: true },
        })

        return NextResponse.json({ character: updatedCharacter })
    } catch (error) {
        console.error('Error updating character:', error)
        return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        // Delete related data first (in case cascade doesn't work)
        await prisma.memory.deleteMany({ where: { characterId: params.id } })
        await prisma.message.deleteMany({ where: { characterId: params.id } })
        await prisma.relationshipConfig.deleteMany({ where: { characterId: params.id } })

        // Delete character
        await prisma.character.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting character:', error)
        return NextResponse.json({ error: 'Failed to delete character' }, { status: 500 })
    }
}

// PATCH is an alias for PUT (partial update)
export const PATCH = PUT
