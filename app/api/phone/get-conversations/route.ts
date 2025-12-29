import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/auth/require-auth'

// 🔓 DEV EMAILS - Auto unlock phone for dev users
const DEV_EMAILS = [
    'eyedontlie88@gmail.com',
    'giangcm987@gmail.com',
]

/**
 * API Route: Get Phone Conversations List (READ FROM DATABASE)
 * GET /api/phone/get-conversations
 * 
 * Returns existing phone conversations for a character from the database.
 * This is READ-ONLY - does NOT trigger AI generation.
 */

export async function GET(req: NextRequest) {
    try {
        const { uid, prisma, email } = await getAuthContext(req)

        // Get characterId from query params
        const { searchParams } = new URL(req.url)
        const characterId = searchParams.get('characterId')

        if (!characterId) {
            return NextResponse.json({ error: 'characterId is required' }, { status: 400 })
        }

        // 🔓 Check if dev user
        const isDevUser = email && DEV_EMAILS.includes(email)

        console.log(`[Phone GetConv] 📖 Fetching conversations for character: ${characterId}, user: ${uid}, dev: ${isDevUser}`)

        // Fetch existing conversations from database
        let conversations = await prisma.phoneConversation.findMany({
            where: {
                characterId: characterId,
                userId: uid
            },
            orderBy: {
                timestamp: 'desc'
            }
        })

        // 🔓 DEV BYPASS: Auto-create default conversations if dev user has none
        if (isDevUser && conversations.length === 0) {
            console.log(`[Phone GetConv] 🔓 DEV BYPASS: Creating default conversations for dev user`)

            // Create 5 default conversations for dev user
            const defaultContacts = [
                { contactName: 'Mẹ', lastMessage: 'Con về ăn cơm nhé! 💕' },
                { contactName: 'Ngân hàng', lastMessage: 'Giao dịch 500,000 VND thành công' },
                { contactName: 'Shopee', lastMessage: 'Đơn hàng #1234 đã giao thành công! 📦' },
                { contactName: 'Grab', lastMessage: 'Tài xế đang đến đón bạn 🚗' },
                { contactName: 'Bạn thân', lastMessage: 'Ê tối nay đi cafe không? ☕' },
            ]

            for (const contact of defaultContacts) {
                await prisma.phoneConversation.create({
                    data: {
                        characterId: characterId,
                        userId: uid,
                        contactName: contact.contactName,
                        lastMessage: contact.lastMessage,
                        timestamp: new Date(),
                        unread: true,
                    }
                })
            }

            // Re-fetch after creating
            conversations = await prisma.phoneConversation.findMany({
                where: {
                    characterId: characterId,
                    userId: uid
                },
                orderBy: {
                    timestamp: 'desc'
                }
            })

            console.log(`[Phone GetConv] ✅ DEV: Created ${defaultContacts.length} default conversations`)
        }

        console.log(`[Phone GetConv] ✅ Found ${conversations.length} conversations`)

        // Transform to front-end format
        const formattedConversations = conversations.map((conv, idx) => ({
            id: idx + 1, // Use index-based ID for UI
            dbId: conv.id, // Keep DB ID for reference
            name: conv.contactName,
            avatar: getAvatarForContact(conv.contactName),
            lastMessage: conv.lastMessage || '...',
            time: formatTime(conv.timestamp),
            unread: 0 // TODO: Implement unread tracking
        }))

        return NextResponse.json({
            conversations: formattedConversations,
            source: isDevUser && conversations.length > 0 ? 'dev' : 'database',
            count: conversations.length,
            isDevUser
        })

    } catch (error: any) {
        console.error('[Phone GetConv] Error:', error)
        return NextResponse.json({
            conversations: [],
            source: 'error',
            error: error.message
        }, { status: 500 })
    }
}

// Helper: Get emoji avatar based on contact name
function getAvatarForContact(name: string): string {
    const lower = name.toLowerCase()

    if (lower.includes('mẹ') || lower.includes('mom') || lower.includes('mother')) return '👩'
    if (lower.includes('bố') || lower.includes('dad') || lower.includes('father')) return '👨'
    if (lower.includes('sếp') || lower.includes('boss') || lower.includes('manager')) return '👔'
    if (lower.includes('bank') || lower.includes('ngân hàng')) return '🏦'
    if (lower.includes('bạn') || lower.includes('friend') || lower.includes('bestie')) return '👫'
    if (lower.includes('shopee') || lower.includes('lazada')) return '📦'
    if (lower.includes('grab') || lower.includes('uber')) return '🚗'

    return '👤'
}

// Helper: Format timestamp for display
function formatTime(date: Date | null): string {
    if (!date) return 'Now'

    const now = new Date()
    const diff = now.getTime() - date.getTime()

    // Less than 24 hours
    if (diff < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }

    // Less than 7 days
    if (diff < 7 * 24 * 60 * 60 * 1000) {
        return 'Hôm qua'
    }

    return date.toLocaleDateString('vi-VN')
}
