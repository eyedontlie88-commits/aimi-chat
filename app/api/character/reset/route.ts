import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/require-auth'
import { sendBackupToTelegram, type BackupData } from '@/lib/telegram-backup'

/**
 * 🔄 Factory Reset API for Character
 * POST /api/character/reset
 * 
 * NEW FLOW (with Telegram backup):
 * 1. Fetch all messages, memories, relationship
 * 2. Send backup to Telegram (@AimiBackupBot)
 * 3. Wait for Telegram confirmation
 * 4. HARD DELETE from database (permanent - saves storage)
 * 5. Reset relationship to STRANGER
 * 
 * SAFETY: If Telegram backup fails, data is NOT deleted!
 */

export async function POST(req: NextRequest) {
    try {
        // Auth check - get Prisma client from auth context
        const authContext = await getAuthContext(req)
        const { uid, prisma, isAuthed } = authContext

        if (!isAuthed) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            )
        }

        // Get characterId from request body
        const body = await req.json()
        const { characterId, userEmail } = body

        if (!characterId) {
            return NextResponse.json(
                { error: 'characterId is required' },
                { status: 400 }
            )
        }

        console.log(`[RESET] 🔄 Starting factory reset for CharID: ${characterId} by User: ${userEmail || uid}`)

        // ============================================
        // STEP 1: FETCH DATA FOR BACKUP (BEFORE DELETING)
        // ============================================

        console.log('[RESET] 📦 Step 1: Fetching data for backup...')

        // Get character info for backup metadata
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: { name: true }
        })

        // Fetch messages (non-deleted only)
        const messagesToBackup = await prisma.message.findMany({
            where: {
                characterId: characterId,
                isDeleted: false
            },
            orderBy: { createdAt: 'asc' }
        })

        // Fetch memories (non-deleted only)
        const memoriesToBackup = await prisma.memory.findMany({
            where: {
                characterId: characterId,
                isDeleted: false
            },
            orderBy: { createdAt: 'asc' }
        })

        // Fetch relationship
        const relationshipToBackup = await prisma.relationshipConfig.findFirst({
            where: {
                characterId: characterId,
                userId: uid
            }
        })

        console.log(`[RESET] 📊 Data fetched: ${messagesToBackup.length} messages, ${memoriesToBackup.length} memories`)

        // ============================================
        // STEP 2: BACKUP TO TELEGRAM (BEFORE DELETING!)
        // ============================================

        let telegramBackupSuccess = false
        let telegramFileId: string | null = null

        // Only backup if there's data to backup
        if (messagesToBackup.length > 0 || memoriesToBackup.length > 0) {
            console.log('[RESET] 📤 Step 2: Sending backup to Telegram...')

            const backupData: BackupData = {
                characterId,
                characterName: character?.name || 'Unknown',
                userId: uid,
                userEmail: userEmail || uid,
                timestamp: Date.now(),
                messages: messagesToBackup,
                memories: memoriesToBackup,
                relationship: relationshipToBackup
            }

            try {
                // Send to Telegram and WAIT for confirmation
                const result = await sendBackupToTelegram(backupData)
                telegramBackupSuccess = true
                telegramFileId = result.fileId
                console.log('[RESET] ✅ Backup successfully sent to Telegram!')

            } catch (error: any) {
                console.error('[RESET] ❌ Telegram backup FAILED:', error.message)

                // CRITICAL: Don't proceed with delete if backup fails!
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Backup to Telegram failed. Data NOT deleted for safety.',
                        details: error.message,
                        hint: 'Check TELEGRAM_BOT_TOKEN and TELEGRAM_STORAGE_CHAT_ID in .env'
                    },
                    { status: 500 }
                )
            }
        } else {
            console.log('[RESET] ⏭️ No data to backup, skipping Telegram step')
            telegramBackupSuccess = true // Consider empty backup as success
        }

        // ============================================
        // STEP 3: HARD DELETE (PERMANENT - AFTER BACKUP!)
        // ============================================

        console.log('[RESET] 🗑️ Step 3: Hard deleting data from database...')

        const deleted = {
            messages: 0,
            memories: 0,
            relationshipReset: false
        }
        const errors: string[] = []

        // 3a. HARD DELETE Messages (permanent - data is backed up to Telegram)
        try {
            const messagesResult = await prisma.message.deleteMany({
                where: {
                    characterId: characterId,
                    isDeleted: false // Only delete active messages (soft-deleted handled separately)
                }
            })
            deleted.messages = messagesResult.count
            console.log(`[RESET] ✅ Messages HARD deleted: ${messagesResult.count}`)
        } catch (error: any) {
            console.error('[RESET] ❌ Message delete error:', error.message)
            errors.push(`Messages: ${error.message}`)
        }

        // 3b. HARD DELETE Memories (permanent)
        try {
            const memoriesResult = await prisma.memory.deleteMany({
                where: {
                    characterId: characterId,
                    isDeleted: false
                }
            })
            deleted.memories = memoriesResult.count
            console.log(`[RESET] ✅ Memories HARD deleted: ${memoriesResult.count}`)
        } catch (error: any) {
            console.error('[RESET] ❌ Memory delete error:', error.message)
            errors.push(`Memories: ${error.message}`)
        }

        // 3c. Reset Relationship to STRANGER
        try {
            if (relationshipToBackup) {
                await prisma.relationshipConfig.update({
                    where: {
                        id: relationshipToBackup.id
                    },
                    data: {
                        stage: 'STRANGER',               // Code stage
                        status: 'Người lạ',              // Display text (DUAL SYNC)
                        intimacyLevel: 0,
                        affectionPoints: 0,
                        messageCount: 0,
                        lastStageChangeAt: 0,
                        trustDebt: 0.0,
                        emotionalMomentum: 0.0,
                        apologyCount: 0,
                        specialNotes: null,
                        startDate: null,
                    }
                })
                deleted.relationshipReset = true
                console.log(`[RESET] ✅ Relationship reset to STRANGER`)
            } else {
                console.log(`[RESET] ⚠️ No relationship found for user ${uid} with character ${characterId}`)
            }
        } catch (error: any) {
            console.error('[RESET] ❌ Relationship reset error:', error.message)
            errors.push(`Relationship: ${error.message}`)
        }

        // 3d. Clear phone content cache on character
        try {
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    phoneContentJson: null,
                    phoneLastUpdated: null,
                    phoneMessageCount: 0
                }
            })
            console.log(`[RESET] ✅ Phone content cache cleared`)
        } catch (error: any) {
            // Non-critical, just log
            console.log(`[RESET] ⚠️ Phone cache clear skipped: ${error.message}`)
        }

        // ============================================
        // STEP 4: SUCCESS
        // ============================================

        console.log(`[RESET] 🏁 Factory reset completed successfully!`, {
            deleted,
            telegramBackupSuccess,
            telegramFileId,
            errors: errors.length > 0 ? errors : 'none'
        })

        return NextResponse.json({
            success: true,
            deleted,
            backup: {
                sent: telegramBackupSuccess,
                messageCount: messagesToBackup.length,
                memoryCount: memoriesToBackup.length,
                telegramFileId: telegramFileId
            },
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error: any) {
        // Handle auth errors
        if (isAuthError(error)) {
            return NextResponse.json(
                { error: error.message },
                { status: 401 }
            )
        }

        console.error('[RESET] 💥 Server Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
