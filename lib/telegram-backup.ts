/**
 * 📦 TELEGRAM BACKUP SERVICE
 * 
 * Send backup data to Telegram storage chat before deleting from database.
 * Uses HTTPS module directly (more reliable than fetch for Telegram API).
 * 
 * Environment variables required:
 * - TELEGRAM_BOT_TOKEN: Bot token from @BotFather
 * - TELEGRAM_STORAGE_CHAT_ID: Chat ID for backup storage
 */

import https from 'https'

export interface BackupData {
    characterId: string
    characterName?: string
    userId: string
    userEmail: string
    timestamp: number
    messages: any[]
    memories: any[]
    relationship: any
}

/**
 * Send backup to Telegram using raw HTTPS
 * More reliable than fetch for some proxied environments
 */
export async function sendBackupToTelegram(backupData: BackupData): Promise<{ fileId: string; messageId: number }> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_STORAGE_CHAT_ID

    // Validate config
    if (!BOT_TOKEN || !CHAT_ID) {
        throw new Error('Telegram credentials not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_STORAGE_CHAT_ID in .env')
    }

    // Create filename with timestamp
    const shortCharId = backupData.characterId.slice(0, 8)
    const fileName = `backup_${shortCharId}_${backupData.timestamp}.json`

    // Convert to JSON string
    const fileContent = JSON.stringify(backupData, null, 2)

    // Create caption with metadata
    const caption = `📦 **AUTO BACKUP**
- Số lượng: ${backupData.messages.length} tin nhắn
- Ký ức: ${backupData.memories.length} memories
- CharID: ${backupData.characterId}
- Character: ${backupData.characterName || 'Unknown'}
- User: ${backupData.userEmail}
- Thời gian: ${new Date(backupData.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`

    console.log(`[Telegram Backup] 📤 Sending ${fileName} (${backupData.messages.length} msgs, ${backupData.memories.length} mems)...`)
    console.log(`[Telegram Backup] Chat ID: ${CHAT_ID}`)

    // Create multipart form data manually
    const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)

    let body = ''

    // chat_id field
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n`
    body += `${CHAT_ID}\r\n`

    // caption field
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="caption"\r\n\r\n`
    body += `${caption}\r\n`

    // parse_mode field
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="parse_mode"\r\n\r\n`
    body += `Markdown\r\n`

    // document field (file)
    body += `--${boundary}\r\n`
    body += `Content-Disposition: form-data; name="document"; filename="${fileName}"\r\n`
    body += `Content-Type: application/json\r\n\r\n`
    body += fileContent + '\r\n'

    body += `--${boundary}--\r\n`

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendDocument`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': Buffer.byteLength(body)
            },
            timeout: 60000 // 60s timeout for large files
        }

        const req = https.request(options, (res) => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            })

            res.on('end', () => {
                try {
                    const result = JSON.parse(data)

                    if (!result.ok) {
                        console.error('[Telegram Backup] ❌ Telegram API error:', result)
                        reject(new Error(`Telegram rejected backup: ${result.description || 'Unknown error'}`))
                        return
                    }

                    const fileId = result.result.document.file_id
                    const messageId = result.result.message_id

                    console.log(`[Telegram Backup] ✅ Success! File ID: ${fileId}, Message ID: ${messageId}`)
                    resolve({ fileId, messageId })

                } catch (e: any) {
                    console.error('[Telegram Backup] ❌ Parse error:', e.message)
                    console.error('[Telegram Backup] Raw response:', data)
                    reject(new Error(`Failed to parse Telegram response: ${e.message}`))
                }
            })
        })

        req.on('error', (error: any) => {
            console.error('[Telegram Backup] ❌ HTTPS request failed')
            console.error('[Telegram Backup] Error code:', error.code)
            console.error('[Telegram Backup] Error message:', error.message)

            if (error.code === 'ECONNRESET') {
                reject(new Error('Connection reset by Telegram. Please try again.'))
            } else if (error.code === 'ENOTFOUND') {
                reject(new Error('Cannot reach api.telegram.org. Check network connection.'))
            } else if (error.code === 'ETIMEDOUT') {
                reject(new Error('Request timeout. Network may be slow.'))
            } else {
                reject(new Error(`Telegram backup failed: ${error.message}`))
            }
        })

        req.on('timeout', () => {
            req.destroy()
            reject(new Error('Request timeout (60s). Network may be slow.'))
        })

        // Write body and send
        req.write(body)
        req.end()
    })
}

/**
 * Test Telegram connection using HTTPS module
 */
export async function testTelegramConnection(): Promise<{ success: boolean; bot?: any; error?: string }> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

    if (!BOT_TOKEN) {
        return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
    }

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/getMe`,
            method: 'GET',
            timeout: 10000
        }

        const req = https.request(options, (res) => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            })

            res.on('end', () => {
                try {
                    const result = JSON.parse(data)

                    if (result.ok) {
                        console.log(`[Telegram] ✅ Connected as @${result.result.username}`)
                        resolve({ success: true, bot: result.result })
                    } else {
                        console.error('[Telegram] ❌ API error:', result.description)
                        resolve({ success: false, error: result.description })
                    }
                } catch (e: any) {
                    console.error('[Telegram] ❌ Parse error:', e.message)
                    resolve({ success: false, error: e.message })
                }
            })
        })

        req.on('error', (error: any) => {
            console.error('[Telegram] ❌ Connection error:', error.code, error.message)
            resolve({ success: false, error: `${error.code}: ${error.message}` })
        })

        req.on('timeout', () => {
            req.destroy()
            resolve({ success: false, error: 'Connection timeout (10s)' })
        })

        req.end()
    })
}

/**
 * Send test message to chat using HTTPS module
 */
export async function sendTestMessage(): Promise<{ success: boolean; messageId?: number; error?: string }> {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_STORAGE_CHAT_ID

    if (!BOT_TOKEN || !CHAT_ID) {
        return { success: false, error: 'Telegram credentials not configured' }
    }

    const message = `✅ TEST MESSAGE from AImi Chat\n\nTimestamp: ${new Date().toLocaleString('vi-VN')}\n\nTelegram backup connection is working!`

    const postData = JSON.stringify({
        chat_id: CHAT_ID,
        text: message
    })

    return new Promise((resolve) => {
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 10000
        }

        const req = https.request(options, (res) => {
            let data = ''

            res.on('data', (chunk) => {
                data += chunk
            })

            res.on('end', () => {
                try {
                    const result = JSON.parse(data)

                    if (result.ok) {
                        console.log(`[Telegram] ✅ Test message sent! Message ID: ${result.result.message_id}`)
                        resolve({ success: true, messageId: result.result.message_id })
                    } else {
                        console.error('[Telegram] ❌ Send failed:', result.description)
                        resolve({ success: false, error: result.description })
                    }
                } catch (e: any) {
                    console.error('[Telegram] ❌ Parse error:', e.message)
                    resolve({ success: false, error: e.message })
                }
            })
        })

        req.on('error', (error: any) => {
            console.error('[Telegram] ❌ Send error:', error.code, error.message)
            resolve({ success: false, error: `${error.code}: ${error.message}` })
        })

        req.on('timeout', () => {
            req.destroy()
            resolve({ success: false, error: 'Request timeout (10s)' })
        })

        req.write(postData)
        req.end()
    })
}
