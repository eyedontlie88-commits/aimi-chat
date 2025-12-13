import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const USER_ID = 'me'

export async function GET() {
    try {
        const profile = await prisma.userProfile.findUnique({
            where: { id: USER_ID },
        })

        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error fetching user profile:', error)
        return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()

        const profile = await prisma.userProfile.update({
            where: { id: USER_ID },
            data: {
                displayName: body.displayName,
                nicknameForUser: body.nicknameForUser,
                gender: body.gender,
                age: body.age ? parseInt(body.age) : null,
                occupation: body.occupation,
                personalityDescription: body.personalityDescription,
                likes: body.likes,
                dislikes: body.dislikes,
                chatTheme: body.chatTheme,
                chatTextTone: body.chatTextTone,
            },
        })

        return NextResponse.json({ profile })
    } catch (error) {
        console.error('Error updating user profile:', error)
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }
}
