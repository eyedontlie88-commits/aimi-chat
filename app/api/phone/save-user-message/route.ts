import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/require-auth'

/**
 * API Route: Save User's Reply Message (PRISMA VERSION)
 * POST /api/phone/save-user-message
 * 
 * MIGRATED from Supabase to Prisma to avoid RLS and cache issues.
 */

export async function POST(req: NextRequest) {
    try {
        const { uid, prisma } = await getAuthContext(req)
        const body = await req.json()

        console.log('[API SaveMsg] 📥 Received Body:', JSON.stringify(body, null, 2))

        const { conversationId, content, characterId, senderName, is_from_character } = body

        // 1. Validation
        if (!content?.trim()) {
            console.error('[API SaveMsg] ❌ Missing content')
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
        }

        if (!characterId) {
            console.error('[API SaveMsg] ❌ Missing characterId')
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        if (!senderName) {
            console.error('[API SaveMsg] ❌ Missing senderName')
            return NextResponse.json({ error: 'senderName is required' }, { status: 400 })
        }

        console.log(`[API SaveMsg] 🔍 Looking for conversation: "${senderName}" + Character ${characterId}`)

        // 2. Find or create conversation using Prisma
        let finalConvId: string

        // Search for existing conversation
        const existingConv = await prisma.phoneConversation.findFirst({
            where: {
                characterId: characterId,
                contactName: senderName,
                userId: uid
            }
        })

        if (existingConv) {
            finalConvId = existingConv.id
            console.log(`[API SaveMsg] ✅ Found existing conversation: ${finalConvId}`)
        } else {
            // Create new conversation
            console.log(`[API SaveMsg] 🆕 Creating new conversation for "${senderName}"`)
            const newConv = await prisma.phoneConversation.create({
                data: {
                    characterId: characterId,
                    userId: uid,
                    contactName: senderName,
                    lastMessage: content.slice(0, 50)
                }
            })
            finalConvId = newConv.id
            console.log(`[API SaveMsg] ✅ Created conversation: ${finalConvId}`)
        }

        // 3. Save message to database
        // ✅ CORRECT MAPPING (FIXED 2025-12-27):
        // is_from_character=true → Message FROM contact (Mẹ gửi) → role: 'contact' (LEFT side)
        // is_from_character=false → Message FROM user (Hiếu trả lời) → role: 'user' (RIGHT side)
        const role = is_from_character ? 'contact' : 'user'
        console.log(`[API SaveMsg] 💾 Saving message to conversation ${finalConvId} (role: ${role}, is_from_character: ${is_from_character})`)

        const savedMessage = await prisma.phoneMessage.create({
            data: {
                conversationId: finalConvId,
                content: content.trim(),
                role: role,
                timestamp: new Date()
            }
        })

        console.log(`[API SaveMsg] ✅ Message saved successfully! ID: ${savedMessage.id}`)

        // 4. Update conversation preview
        console.log(`[API SaveMsg] 📝 Updating conversation preview`)
        await prisma.phoneConversation.update({
            where: { id: finalConvId },
            data: {
                lastMessage: content.slice(0, 50),
                timestamp: new Date()
            }
        })

        console.log(`[API SaveMsg] ✅ SUCCESS! Returning conversation ID: ${finalConvId}`)

        return NextResponse.json({
            success: true,
            message: savedMessage,
            conversationId: finalConvId
        })

    } catch (error: any) {
        console.error('[API SaveMsg] 🔥 CRITICAL ERROR:', error)
        console.error('[API SaveMsg] Error stack:', error.stack)

        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 })
    }
}
