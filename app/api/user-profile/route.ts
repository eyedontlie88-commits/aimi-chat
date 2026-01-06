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
            return NextResponse.json({ 
                profile: null, 
                error: 'User profile not found',
                _meta: { isAuthed, role, schema }
            }, { status: 404 })
        }

        return NextResponse.json({
            profile,
            _meta: { isAuthed, role, schema }
        })
    } catch (error: any) {
        if (isAuthError(error)) {
            console.error('[API /user-profile GET] Auth error:', error.message)
            return NextResponse.json({ 
                profile: null,
                error: error.message,
                _meta: { isAuthed: false, role: 'guest', schema: 'user' }
            }, { status: 401 })
        }
        // Log full error details for debugging
        console.error('[API /user-profile GET] Error:', {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
            name: error?.name || 'Unknown error'
        })
        // Always return consistent shape
        return NextResponse.json({ 
            profile: null,
            error: 'Failed to fetch user profile',
            _meta: { isAuthed: false, role: 'guest', schema: 'user' }
        }, { status: 500 })
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
                chatFont: body.chatFont,
                chatFontSize: body.chatFontSize,
                textColor: body.textColor,
                backgroundColor: body.backgroundColor,
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
                chatFont: body.chatFont,
                chatFontSize: body.chatFontSize,
                textColor: body.textColor,
                backgroundColor: body.backgroundColor,
            },
        })

        return NextResponse.json({ profile, _meta: { isAuthed } })
    } catch (error: any) {
        if (isAuthError(error)) {
            console.error('[API /user-profile PUT] Auth error:', error.message)
            return NextResponse.json({ 
                profile: null,
                error: error.message,
                _meta: { isAuthed: false }
            }, { status: 401 })
        }
        console.error('[API /user-profile PUT] Error:', {
            message: error?.message || String(error),
            stack: error?.stack?.split('\n').slice(0, 3).join('\n') || 'No stack trace',
            name: error?.name || 'Unknown error'
        })
        return NextResponse.json({ 
            profile: null,
            error: 'Failed to update user profile',
            _meta: { isAuthed: false }
        }, { status: 500 })
    }
}
