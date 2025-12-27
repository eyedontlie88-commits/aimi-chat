import { NextResponse } from 'next/server'
import { testTelegramConnection, sendTestMessage } from '@/lib/telegram-backup'

/**
 * 🧪 Telegram Connection Test
 * GET /api/test-telegram
 * 
 * Test if Telegram bot token and chat ID are configured correctly.
 * Uses HTTPS module (same as reset endpoint) for consistent behavior.
 */

export async function GET() {
    const token = process.env.TELEGRAM_BOT_TOKEN
    const chatId = process.env.TELEGRAM_STORAGE_CHAT_ID

    console.log('[Telegram Test] ========================================')
    console.log('[Telegram Test] Testing Telegram connection...')
    console.log('[Telegram Test] Token exists:', !!token)
    console.log('[Telegram Test] Token (first 15 chars):', token ? token.substring(0, 15) + '...' : 'N/A')
    console.log('[Telegram Test] Token length:', token?.length || 0)
    console.log('[Telegram Test] Chat ID:', chatId || 'N/A')
    console.log('[Telegram Test] ========================================')

    if (!token) {
        return NextResponse.json({
            success: false,
            error: 'TELEGRAM_BOT_TOKEN not found in .env',
            hint: 'Add TELEGRAM_BOT_TOKEN=your_token to .env file'
        }, { status: 500 })
    }

    if (!chatId) {
        return NextResponse.json({
            success: false,
            error: 'TELEGRAM_STORAGE_CHAT_ID not found in .env',
            hint: 'Add TELEGRAM_STORAGE_CHAT_ID=-123456789 to .env file'
        }, { status: 500 })
    }

    // Test 1: Bot connection (getMe)
    console.log('[Telegram Test] Step 1: Testing bot connection...')
    const botTest = await testTelegramConnection()

    if (!botTest.success) {
        console.error('[Telegram Test] ❌ Bot connection failed:', botTest.error)
        return NextResponse.json({
            success: false,
            step: 'bot_connection',
            error: 'Bot connection failed',
            details: botTest.error,
            hint: 'Check if TELEGRAM_BOT_TOKEN is correct'
        }, { status: 500 })
    }

    console.log('[Telegram Test] ✅ Bot connection successful!')
    console.log('[Telegram Test] Bot:', botTest.bot?.username)

    // Test 2: Send test message to chat
    console.log('[Telegram Test] Step 2: Sending test message...')
    const msgTest = await sendTestMessage()

    if (!msgTest.success) {
        console.error('[Telegram Test] ❌ Send message failed:', msgTest.error)
        return NextResponse.json({
            success: false,
            step: 'send_message',
            error: 'Send message failed',
            details: msgTest.error,
            bot: botTest.bot,
            hint: 'Check if TELEGRAM_STORAGE_CHAT_ID is correct and bot is in the group'
        }, { status: 500 })
    }

    console.log('[Telegram Test] ✅ Test message sent successfully!')

    return NextResponse.json({
        success: true,
        bot: botTest.bot,
        chatId: chatId,
        testMessageId: msgTest.messageId,
        message: 'Telegram connection OK! ✅ Check your Telegram group for test message.'
    })
}
