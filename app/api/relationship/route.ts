import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')

        if (characterId) {
            // Get specific character's relationship config
            const config = await prisma.relationshipConfig.findFirst({
                where: {
                    characterId,
                    userId: uid,
                },
            })
            return NextResponse.json({ config })
        }

        // Get all relationship configs for this user
        const configs = await prisma.relationshipConfig.findMany({
            where: { userId: uid },
            include: {
                character: {
                    select: {
                        id: true,
                        name: true,
                        avatarUrl: true,
                    },
                },
            },
        })

        return NextResponse.json({ configs })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error fetching relationship configs:', error)
        return NextResponse.json({ error: 'Failed to fetch relationship configs' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
        const body = await request.json()
        const { characterId, status, startDate, specialNotes } = body

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        // Ensure user profile exists
        await prisma.userProfile.upsert({
            where: { id: uid },
            create: {
                id: uid,
                displayName: 'Bạn',
                nicknameForUser: 'em',
            },
            update: {},
        })

        const config = await prisma.relationshipConfig.upsert({
            where: { characterId },
            update: {
                status: status || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                specialNotes: specialNotes !== undefined ? specialNotes : undefined,
            },
            create: {
                characterId,
                userId: uid,
                status: status || 'dating',
                startDate: startDate ? new Date(startDate) : new Date(),
                specialNotes,
            },
        })

        return NextResponse.json({ config })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error updating relationship config:', error)
        return NextResponse.json({ error: 'Failed to update relationship config' }, { status: 500 })
    }
}
