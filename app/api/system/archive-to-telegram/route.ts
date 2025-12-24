import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 📦 TELEGRAM ARCHIVE API
 * POST /api/system/archive-to-telegram
 * 
 * Flow:
 * 1. Fetch all soft-deleted messages (isDeleted: true)
 * 2. Package into JSON backup file
 * 3. Send to Telegram storage chat
 * 4. Hard delete from DB after successful Telegram upload
 */

// 🔥 ADMIN CLIENT (Quyền tối thượng để đọc & xóa DB)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Config Telegram
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_STORAGE_CHAT_ID
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`

export async function POST(req: NextRequest) {
    try {
        console.log('📦 [ARCHIVE] Bắt đầu quy trình dọn kho...')

        // Validate Telegram config
        if (!BOT_TOKEN || !CHAT_ID) {
            return NextResponse.json({
                error: 'Missing Telegram config. Set TELEGRAM_BOT_TOKEN and TELEGRAM_STORAGE_CHAT_ID in .env'
            }, { status: 500 })
        }

        // 1. Quét rác: Lấy tất cả tin nhắn đã bị đánh dấu xóa (Soft Delete)
        // Lấy tối đa 1000 tin mỗi lần để tránh quá tải
        const { data: messages, error: fetchError } = await supabaseAdmin
            .from('Message')
            .select('*')
            .eq('isDeleted', true)
            .limit(1000)

        if (fetchError) throw new Error(`Lỗi lấy dữ liệu: ${fetchError.message}`)

        if (!messages || messages.length === 0) {
            return NextResponse.json({
                success: true,
                message: '✨ Sạch sẽ! Không có gì để backup.',
                archivedCount: 0
            })
        }

        console.log(`📦 [ARCHIVE] Tìm thấy ${messages.length} tin nhắn cần đóng gói.`)

        // 2. Đóng gói: Tạo nội dung file JSON
        const backupData = {
            backup_at: new Date().toISOString(),
            count: messages.length,
            character_id: messages[0].characterId, // Lấy mẫu
            data: messages
        }

        const fileContent = JSON.stringify(backupData, null, 2)
        const fileName = `backup_${messages[0].characterId.slice(0, 5)}_${Date.now()}.json`

        // 3. Gửi sang Telegram (The Transporter)
        const formData = new FormData()
        formData.append('chat_id', CHAT_ID!)
        formData.append('caption', `📦 **AUTO BACKUP**\n- Số lượng: ${messages.length} tin\n- CharID: ${messages[0].characterId}\n- Thời gian: ${new Date().toLocaleString('vi-VN')}`)

        // Tạo File Blob để gửi
        const blob = new Blob([fileContent], { type: 'application/json' })
        formData.append('document', blob, fileName)

        console.log(`📦 [ARCHIVE] Đang gửi hàng sang Telegram...`)
        const teleRes = await fetch(TELEGRAM_API, {
            method: 'POST',
            body: formData
        })

        const teleData = await teleRes.json()

        if (!teleData.ok) {
            console.error('[ARCHIVE] Lỗi Telegram:', teleData)
            throw new Error(`Telegram từ chối nhận hàng: ${teleData.description}`)
        }

        const telegramFileId = teleData.result.document.file_id
        console.log(`📦 [ARCHIVE] ✅ Telegram đã nhận! File ID: ${telegramFileId}`)

        // 4. Tiêu hủy chứng cứ (Hard Delete)
        // Chỉ xóa những ID đã nằm trong gói backup vừa gửi thành công
        const idsToDelete = messages.map(m => m.id)

        const { error: deleteError } = await supabaseAdmin
            .from('Message')
            .delete()
            .in('id', idsToDelete)

        if (deleteError) throw new Error(`Lỗi xóa DB: ${deleteError.message}`)

        console.log(`📦 [ARCHIVE] 🧹 Đã xóa vĩnh viễn ${idsToDelete.length} dòng khỏi Database!`)

        return NextResponse.json({
            success: true,
            archivedCount: idsToDelete.length,
            telegramFileId: telegramFileId,
            message: `Đã chuyển ${idsToDelete.length} tin nhắn sang Tele và xóa khỏi DB.`
        })

    } catch (error: any) {
        console.error('[ARCHIVE] Failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
