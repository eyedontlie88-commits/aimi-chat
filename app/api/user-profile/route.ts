import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { uid, prisma, isAuthed, role, schema } = await getAuthContext(request)

        let profile = await prisma.userProfile.findUnique({
            where: { id: uid },
        })

        // If authenticated user doesn't have a profile, create one
        if (!profile && isAuthed) {
            profile = await prisma.userProfile.create({
                data: {
                    id: uid,
                    displayName: 'Bạn',
                    nicknameForUser: 'em',
                },
            })
        }

        if (!profile) {
            return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
        }

        return NextResponse.json({
            profile,
            _meta: { isAuthed, role, schema }
        })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error fetching user profile:', error)
        return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const { uid, prisma, isAuthed } = await getAuthContext(request)
        const body = await request.json()

        // Upsert to handle both existing and new profiles
        const profile = await prisma.userProfile.upsert({
            where: { id: uid },
            create: {
                id: uid,
                displayName: body.displayName || 'Bạn',
                nicknameForUser: body.nicknameForUser || 'em',
                gender: body.gender,
                age: body.age ? parseInt(body.age) : null,
                occupation: body.occupation,
                personalityDescription: body.personalityDescription,
                likes: body.likes,
                dislikes: body.dislikes,
                chatTheme: body.chatTheme,
                chatTextTone: body.chatTextTone,
            },
            update: {
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

        return NextResponse.json({ profile, _meta: { isAuthed } })
    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('Error updating user profile:', error)
        return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 })
    }
}
