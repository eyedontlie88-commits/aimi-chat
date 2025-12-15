import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError, ANONYMOUS_USER_ID } from '@/lib/auth/require-auth'
import { getPrismaForSchema } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Migrate guest data to authenticated user
 * 
 * Copies characters, relationships, messages, and memories from 
 * guest account (userId="me") to the authenticated user's account.
 * 
 * Always reads from 'public' schema (where guest data lives)
 * Writes to user's target schema (based on role)
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

        const { uid, prisma: prismaTarget, schema: targetSchema } = ctx

        // Read guest data from public schema (where "me" data lives)
        const prismaPublic = getPrismaForSchema('public')

        // Read guest profile
        const guestProfile = await prismaPublic.userProfile.findUnique({
            where: { id: ANONYMOUS_USER_ID },
        })

        // Read guest characters with their relationships
        const guestRelationships = await prismaPublic.relationshipConfig.findMany({
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
        const existingUserRelationships = await prismaTarget.relationshipConfig.count({
            where: { userId: uid },
        })

        if (existingUserRelationships > 0) {
            return NextResponse.json({
                imported: false,
                reason: 'already_has_data',
                message: `User already has ${existingUserRelationships} characters`,
            })
        }

        let importedCharacters = 0
        let importedRelationships = 0
        let importedMessages = 0
        let importedMemories = 0

        // 1. Migrate/Create user profile
        if (guestProfile) {
            await prismaTarget.userProfile.upsert({
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

        // 2. Migrate each character with relationships
        for (const rel of guestRelationships) {
            const guestCharacter = rel.character

            // Check if character already exists in target schema
            const existingChar = await prismaTarget.character.findUnique({
                where: { id: guestCharacter.id },
            })

            let targetCharId = guestCharacter.id

            if (!existingChar) {
                // Copy character to target schema
                await prismaTarget.character.create({
                    data: {
                        id: guestCharacter.id,
                        name: guestCharacter.name,
                        avatarUrl: guestCharacter.avatarUrl,
                        gender: guestCharacter.gender,
                        shortDescription: guestCharacter.shortDescription,
                        persona: guestCharacter.persona,
                        speakingStyle: guestCharacter.speakingStyle,
                        boundaries: guestCharacter.boundaries,
                        tags: guestCharacter.tags,
                        provider: guestCharacter.provider,
                        modelName: guestCharacter.modelName,
                    },
                })
                importedCharacters++
            }

            // Create relationship for new user
            await prismaTarget.relationshipConfig.upsert({
                where: { characterId: targetCharId },
                create: {
                    characterId: targetCharId,
                    userId: uid,
                    status: rel.status,
                    startDate: rel.startDate,
                    specialNotes: rel.specialNotes,
                    intimacyLevel: rel.intimacyLevel,
                    affectionPoints: rel.affectionPoints,
                    stage: rel.stage,
                    lastActiveAt: rel.lastActiveAt,
                    messageCount: rel.messageCount,
                    lastStageChangeAt: rel.lastStageChangeAt,
                    trustDebt: rel.trustDebt,
                    emotionalMomentum: rel.emotionalMomentum,
                    apologyCount: rel.apologyCount,
                    lastMessageHash: rel.lastMessageHash,
                },
                update: {}, // Don't overwrite if exists
            })
            importedRelationships++

            // 3. Migrate messages for this character
            const guestMessages = await prismaPublic.message.findMany({
                where: { characterId: guestCharacter.id },
                orderBy: { createdAt: 'asc' },
            })

            for (const msg of guestMessages) {
                const existingMsg = await prismaTarget.message.findUnique({
                    where: { id: msg.id },
                })

                if (!existingMsg) {
                    await prismaTarget.message.create({
                        data: {
                            id: msg.id,
                            characterId: targetCharId,
                            role: msg.role,
                            content: msg.content,
                            sceneState: msg.sceneState,
                            replyToMessageId: msg.replyToMessageId,
                            reactionType: msg.reactionType,
                            createdAt: msg.createdAt,
                        },
                    })
                    importedMessages++
                }
            }

            // 4. Migrate memories for this character
            const guestMemories = await prismaPublic.memory.findMany({
                where: { characterId: guestCharacter.id },
            })

            for (const mem of guestMemories) {
                const existingMem = await prismaTarget.memory.findUnique({
                    where: { id: mem.id },
                })

                if (!existingMem) {
                    await prismaTarget.memory.create({
                        data: {
                            id: mem.id,
                            characterId: targetCharId,
                            type: mem.type,
                            content: mem.content,
                            importanceScore: mem.importanceScore,
                            sourceMessageId: mem.sourceMessageId,
                            category: mem.category,
                            visibility: mem.visibility,
                            createdAt: mem.createdAt,
                        },
                    })
                    importedMemories++
                }
            }
        }

        console.log(`[Migrate] Imported for user ${uid.substring(0, 8)}...: ` +
            `${importedCharacters} characters, ${importedRelationships} relationships, ` +
            `${importedMessages} messages, ${importedMemories} memories → schema "${targetSchema}"`)

        return NextResponse.json({
            imported: true,
            counts: {
                characters: importedCharacters,
                relationships: importedRelationships,
                messages: importedMessages,
                memories: importedMemories,
            },
            targetSchema,
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
