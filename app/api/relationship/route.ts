import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const USER_ID = 'me'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const characterId = searchParams.get('characterId')

        if (characterId) {
            const config = await prisma.relationshipConfig.findUnique({
                where: { characterId },
            })
            return NextResponse.json({ config })
        }

        const configs = await prisma.relationshipConfig.findMany({
            where: { userId: USER_ID },
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
        console.error('Error fetching relationship configs:', error)
        return NextResponse.json({ error: 'Failed to fetch relationship configs' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { characterId, status, startDate, specialNotes } = body

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        const config = await prisma.relationshipConfig.upsert({
            where: { characterId },
            update: {
                status: status || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                specialNotes: specialNotes !== undefined ? specialNotes : undefined,
            },
            create: {
                characterId,
                userId: USER_ID,
                status: status || 'dating',
                startDate: startDate ? new Date(startDate) : new Date(),
                specialNotes,
            },
        })

        return NextResponse.json({ config })
    } catch (error) {
        console.error('Error updating relationship config:', error)
        return NextResponse.json({ error: 'Failed to update relationship config' }, { status: 500 })
    }
}
