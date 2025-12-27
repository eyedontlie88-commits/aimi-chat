import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/require-auth'

/**
 * API Route: Get Conversation Detail (PRISMA VERSION)
 * POST /api/phone/get-conversation-detail
 * 
 * MIGRATED from Supabase to Prisma to avoid RLS and cache issues.
 * 
 * Body: { senderName, characterId, conversationId?, forceRegenerate?, userEmail?, characterDescription? }
 * Returns: { messages: [], conversationId, source: 'database' }
 */

// 🔐 DEV EMAILS - can bypass restrictions
const DEV_EMAILS = ['eyedontlie88@gmail.com', 'giangcm987@gmail.com']

export async function POST(req: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(req)
        const body = await req.json()
        const {
            senderName,
            characterId,
            characterName,
            characterDescription,
            conversationId,
            userLanguage = 'vi',
            forceRegenerate = false,
            userEmail
        } = body

        console.log(`[Phone Detail] 📖 Request for: "${senderName}" (Char: ${characterId}) | forceRegenerate: ${forceRegenerate}`)

        // Validation
        if (!senderName || !characterId) {
            return NextResponse.json({ error: 'Missing senderName or characterId' }, { status: 400 })
        }

        // 1. Find or create conversation using Prisma
        let convId = conversationId
        let conversation

        // ALWAYS search by name first (ignore temp/fake IDs from frontend)
        if (!convId || convId.startsWith('temp-')) {
            console.log(`[Phone Detail] 🔍 Searching for conversation: "${senderName}" + Character ${characterId}`)

            conversation = await prisma.phoneConversation.findFirst({
                where: {
                    characterId: characterId,
                    contactName: senderName,
                    userId: uid
                }
            })

            if (conversation) {
                convId = conversation.id
                console.log(`[Phone Detail] ✅ Found existing conversation: ${convId}`)
            } else {
                // Create empty conversation placeholder (no messages yet)
                console.log(`[Phone Detail] 🆕 Creating empty conversation for "${senderName}"`)
                conversation = await prisma.phoneConversation.create({
                    data: {
                        characterId: characterId,
                        userId: uid,
                        contactName: senderName,
                        lastMessage: '...'
                    }
                })
                convId = conversation.id
                console.log(`[Phone Detail] ✅ Created conversation: ${convId}`)
            }
        } else {
            console.log(`[Phone Detail] Using provided conversation ID: ${convId}`)
        }

        // 2. If forceRegenerate, trigger AI reply first
        let regenerated = false

        // 🏦 BANKING AUTO-BLOCK - Skip AI generation for banking contacts
        const isBankingContact = senderName.toLowerCase().includes('ngân hàng') ||
            senderName.toLowerCase().includes('bank')

        if (forceRegenerate && isBankingContact) {
            console.log('[Phone Detail] 🚫 Skipping AI generation for banking contact (notification-only)')
            // Do nothing - just return messages without generating AI reply
        } else if (forceRegenerate) {
            console.log(`[Phone Detail] 🤖 Force regenerate requested, triggering AI reply...`)

            try {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
                const regenRes = await fetch(`${appUrl}/api/phone/generate-ai-reply`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversationId: convId,
                        characterId,
                        senderName,
                        characterName,
                        characterDescription,
                        userEmail,
                        userLanguage,
                        forceTrigger: false // Respect rate limit unless dev
                    })
                })

                if (regenRes.ok) {
                    console.log('[Phone Detail] ✅ AI reply generated')
                    regenerated = true
                } else {
                    const errorData = await regenRes.json().catch(() => ({}))
                    console.log('[Phone Detail] ⚠️ AI generation skipped:', errorData.message || regenRes.status)
                }
            } catch (err) {
                console.error('[Phone Detail] AI generation error (non-blocking):', err)
            }
        }

        // 3. Read messages from database using Prisma
        console.log(`[Phone Detail] 📖 Reading messages from conversation: ${convId}`)
        const messages = await prisma.phoneMessage.findMany({
            where: { conversationId: convId },
            orderBy: { timestamp: 'asc' }
        })

        // 4. Return messages
        const messageCount = messages?.length || 0
        console.log(`[Phone Detail] ✅ Returning ${messageCount} messages from DB${regenerated ? ' (AI reply included)' : ''}`)

        return NextResponse.json({
            messages: messages || [],
            conversationId: convId,
            source: 'database',
            regenerated
        })

    } catch (error: any) {
        console.error('[Phone Detail] Error:', error)
        return NextResponse.json({
            error: error.message || 'Unknown error'
        }, { status: 500 })
    }
}
