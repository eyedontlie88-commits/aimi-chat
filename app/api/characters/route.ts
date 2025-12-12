import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_CHARACTERS_PER_USER, DEFAULT_USER_ID } from '@/lib/config'

export async function GET() {
    try {
        const characters = await prisma.character.findMany({
            orderBy: { name: 'asc' },
            include: {
                relationshipConfig: true,
            },
        })

        return NextResponse.json({ characters })
    } catch (error) {
        console.error('Error fetching characters:', error)
        return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
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
            relationshipStatus,
            modelName,
            provider,
        } = body

        // Check character limit
        const currentCount = await prisma.relationshipConfig.count({
            where: { userId: DEFAULT_USER_ID },
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

        // Create default relationship config
        await prisma.relationshipConfig.create({
            data: {
                characterId: character.id,
                userId: DEFAULT_USER_ID,
                status: relationshipStatus || 'đang hẹn hò',
                startDate: new Date(),
                specialNotes: 'Mới gặp nhau!',
            },
        })

        return NextResponse.json({ character }, { status: 201 })
    } catch (error) {
        console.error('Error creating character:', error)
        return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
    }
}

