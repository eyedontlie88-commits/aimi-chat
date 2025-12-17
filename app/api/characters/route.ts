import { NextRequest, NextResponse } from 'next/server'
import { withAuth, AuthContext } from '@/lib/auth'
import { MAX_CHARACTERS_PER_USER } from '@/lib/config'

export const dynamic = 'force-dynamic'

// GET /api/characters - List characters for current user
export const GET = withAuth(async (request: NextRequest, ctx: AuthContext) => {
    const { uid, role, prisma, schema } = ctx

    console.log(`[Characters API] uid=${uid}, role=${role}, schema=${schema}`)

    // TEMP: Bỏ where clause để test - hiển thị TẤT CẢ characters trong schema
    const characters = await prisma.character.findMany({
        orderBy: { name: 'asc' },
        include: {
            relationshipConfig: true,
        },
    })

    console.log(`[Characters API] Found ${characters.length} characters`)

    return NextResponse.json({ characters })
})

// POST /api/characters - Create new character
export const POST = withAuth(async (request: NextRequest, ctx: AuthContext) => {
    const { uid, prisma } = ctx
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

    // Ensure UserProfile exists
    await prisma.userProfile.upsert({
        where: { id: uid },
        create: {
            id: uid,
            displayName: 'User',
            nicknameForUser: 'bạn',
        },
        update: {},
    })

    // Create character with relationship
    const character = await prisma.character.create({
        data: {
            name,
            avatarUrl: avatarUrl || '/default-avatar.png',
            gender: gender || 'female',
            shortDescription: shortDescription || '',
            persona: persona || '',
            speakingStyle: speakingStyle || '',
            boundaries: boundaries || '',
            tags: tags || '',
            modelName: modelName || null,
            provider: provider || 'default',
            relationshipConfig: {
                create: {
                    userId: uid,
                    status: relationshipStatus || 'Stranger',
                    stage: 'STRANGER',
                },
            },
        },
        include: {
            relationshipConfig: true,
        },
    })

    return NextResponse.json({ character })
})
