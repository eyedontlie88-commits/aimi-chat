import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')

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

        const memories = await prisma.memory.findMany({
            where: { characterId },
            orderBy: [{ importanceScore: 'desc' }, { createdAt: 'desc' }],
        })

        return NextResponse.json({ memories })
    } catch (error: any) {
        if (isAuthError(error)) {
            console.error('[API /memories GET] Auth error:', error.message)
            return NextResponse.json({ 
                memories: [], 
                error: error.message 
            }, { status: 401 })
        }
        // Log full error details for debugging
        console.error('[API /memories GET] Error:', {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
            name: error?.name || 'Unknown error'
        })
        // Always return consistent shape
        return NextResponse.json({ 
            memories: [], 
            error: 'Failed to fetch memories' 
        }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
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

        // Verify character belongs to this user
        const relationship = await prisma.relationshipConfig.findFirst({
            where: { characterId, userId: uid },
        })

        if (!relationship) {
            return NextResponse.json({ error: 'Character not found' }, { status: 404 })
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
    } catch (error: any) {
        if (isAuthError(error)) {
            console.error('[API /memories POST] Auth error:', error.message)
            return NextResponse.json({ 
                memory: null, 
                error: error.message 
            }, { status: 401 })
        }
        console.error('[API /memories POST] Error:', {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
            name: error?.name || 'Unknown error'
        })
        return NextResponse.json({ 
            memory: null, 
            error: 'Failed to create memory' 
        }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        // Get the memory to verify ownership
        const memory = await prisma.memory.findUnique({
            where: { id },
            include: {
                character: {
                    include: {
                        relationshipConfig: true,
                    },
                },
            },
        })

        if (!memory || memory.character.relationshipConfig?.userId !== uid) {
            return NextResponse.json({ error: 'Memory not found' }, { status: 404 })
        }

        await prisma.memory.delete({
            where: { id },
        })

        return NextResponse.json({ success: true })
    } catch (error: any) {
        if (isAuthError(error)) {
            console.error('[API /memories DELETE] Auth error:', error.message)
            return NextResponse.json({ 
                success: false, 
                error: error.message 
            }, { status: 401 })
        }
        console.error('[API /memories DELETE] Error:', {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
            name: error?.name || 'Unknown error'
        })
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to delete memory' 
        }, { status: 500 })
    }
}
