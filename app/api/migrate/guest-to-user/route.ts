import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError, ANONYMOUS_USER_ID } from '@/lib/auth/require-auth'

export const dynamic = 'force-dynamic'

/**
 * Migrate guest data to authenticated user
 * 
 * Updates ownership of characters, relationships, messages, and memories
 * from guest account (userId="me") to the authenticated user's account.
 * 
 * With single-database architecture, this just changes the userId field
 * instead of copying data between schemas.
 */
export async function POST(request: NextRequest) {
    try {
        const ctx = await getAuthContext(request)

        // Must be authenticated
        if (!ctx.isAuthed || ctx.uid === ANONYMOUS_USER_ID) {
            return NextResponse.json(
                { error: 'Must be logged in to migrate data' },
                { status: 400 }
            )
        }

        const { uid, prisma } = ctx

        // Check if there's guest data to migrate
        const guestProfile = await prisma.userProfile.findUnique({
            where: { id: ANONYMOUS_USER_ID },
        })

        const guestRelationships = await prisma.relationshipConfig.findMany({
            where: { userId: ANONYMOUS_USER_ID },
            include: {
                character: true,
            },
        })

        if (!guestProfile && guestRelationships.length === 0) {
            return NextResponse.json({
                imported: false,
                reason: 'no_guest_data',
                message: 'No guest data found to migrate',
            })
        }

        // Check if user already has data (avoid double migration)
        const existingUserRelationships = await prisma.relationshipConfig.count({
            where: { userId: uid },
        })

        if (existingUserRelationships > 0) {
            return NextResponse.json({
                imported: false,
                reason: 'already_has_data',
                message: `User already has ${existingUserRelationships} characters`,
            })
        }

        let migratedRelationships = 0

        // 1. Migrate/Create user profile
        if (guestProfile) {
            await prisma.userProfile.upsert({
                where: { id: uid },
                create: {
                    id: uid,
                    displayName: guestProfile.displayName,
                    nicknameForUser: guestProfile.nicknameForUser,
                    gender: guestProfile.gender,
                    age: guestProfile.age,
                    occupation: guestProfile.occupation,
                    personalityDescription: guestProfile.personalityDescription,
                    likes: guestProfile.likes,
                    dislikes: guestProfile.dislikes,
                    chatTheme: guestProfile.chatTheme,
                    chatTextTone: guestProfile.chatTextTone,
                },
                update: {}, // Don't overwrite if exists
            })
        }

        // 2. Transfer ownership of relationships from "me" to authenticated user
        for (const rel of guestRelationships) {
            await prisma.relationshipConfig.update({
                where: { id: rel.id },
                data: { userId: uid },
            })
            migratedRelationships++
        }

        console.log(`[Migrate] Transferred ${migratedRelationships} relationships from "me" to ${uid.substring(0, 8)}...`)

        return NextResponse.json({
            imported: true,
            counts: {
                relationships: migratedRelationships,
            },
            userId: uid,
        })

    } catch (error) {
        if (isAuthError(error)) {
            return NextResponse.json({ error: error.message }, { status: 401 })
        }
        console.error('[Migrate] Error:', error)
        return NextResponse.json(
            { error: 'Migration failed' },
            { status: 500 }
        )
    }
}
