import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        const memories = await prisma.memory.findMany({
            where: { characterId },
            orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
        })

        return NextResponse.json({ memories })
    } catch (error) {
        console.error('Error fetching memories:', error)
        return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            characterId,
            type,
            content,
            importanceScore,
            sourceMessageId,
            category,    // "fact" | "event" | "relationship" | "diary"
            visibility,  // "public" | "private"
        } = body

        if (!characterId || !type || !content) {
            return NextResponse.json({ error: 'characterId, type, and content are required' }, { status: 400 })
        }

        const memory = await prisma.memory.create({
            data: {
                characterId,
                type,
                content,
                importanceScore: importanceScore || 5,
                sourceMessageId: sourceMessageId || null,
                category: category || 'fact',
                visibility: visibility || 'public',
            },
        })

        return NextResponse.json({ memory })
    } catch (error) {
        console.error('Error creating memory:', error)
        return NextResponse.json({ error: 'Failed to create memory' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        await prisma.memory.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting memory:', error)
        return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
    }
}
