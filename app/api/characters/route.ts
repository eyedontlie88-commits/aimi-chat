import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'
import { MAX_CHARACTERS_PER_USER } from '@/lib/config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)

        const characters = await prisma.character.findMany({
            orderBy: { name: 'asc' },
            where: {
                relationshipConfig: {
                    userId: uid,
                },
            },
            include: {
                relationshipConfig: true,
            },
        })

        return NextResponse.json({ characters })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error fetching characters:', error)
        return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(request)
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
            relationshipStatus,
            modelName,
            provider,
        } = body

        // Check character limit for this user
        const currentCount = await prisma.relationshipConfig.count({
            where: { userId: uid },
        })

        if (currentCount >= MAX_CHARACTERS_PER_USER) {
            return NextResponse.json(
                { error: 'MAX_CHARACTERS_REACHED', message: 'Bạn đã đạt giới hạn 10 nhân vật.' },
                { status: 400 }
            )
        }

        // Validate required fields
        if (!name || !gender || !shortDescription || !persona || !speakingStyle || !boundaries) {
            return NextResponse.json(
                { error: 'Missing required fields: name, gender, shortDescription, persona, speakingStyle, boundaries' },
                { status: 400 }
            )
        }

        // Create character
        const character = await prisma.character.create({
            data: {
                name,
                avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
                gender,
                shortDescription,
                persona,
                speakingStyle,
                boundaries,
                tags: tags || '',
                modelName: modelName || null,
                provider: provider || 'default',
            },
        })

        // Ensure user profile exists (for authenticated users)
        await prisma.userProfile.upsert({
            where: { id: uid },
            create: {
                id: uid,
                displayName: 'Bạn',
                nicknameForUser: 'em',
            },
            update: {},
        })

        // Create relationship config linking to user
        await prisma.relationshipConfig.create({
            data: {
                characterId: character.id,
                userId: uid,
                status: relationshipStatus || 'đang hẹn hò',
                startDate: new Date(),
                specialNotes: 'Mới gặp nhau!',
            },
        })

        return NextResponse.json({ character }, { status: 201 })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error creating character:', error)
        return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
    }
}
