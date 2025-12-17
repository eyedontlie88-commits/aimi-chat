/**
 * Phone Content Generator
 * Generates realistic phone content based on conversation context
 * Content types: Calls, Messages, Notes, Calendar
 * 
 * IMPORTANT: This generates content from CHARACTER's perspective about USER
 * The phone belongs to the character, so all content reflects character's thoughts
 */

export interface PhoneContent {
    callLogs: CallLog[]
    messages: PhoneMessage[]
    notes: Note[]
    calendar: CalendarEvent[]
    generatedAt: string
}

export interface CallLog {
    contact: string
    type: 'incoming' | 'outgoing' | 'missed'
    duration?: string // "2:34" or null for missed
    timestamp: string // ISO string
}

export interface PhoneMessage {
    contact: string
    preview: string
    isDraft: boolean
    isUnsent: boolean // thought but not sent
    timestamp: string
}

export interface Note {
    title: string
    content: string
    category: 'feelings' | 'quotes' | 'reminders' | 'thoughts'
    timestamp: string
}

export interface CalendarEvent {
    title: string
    date: string // ISO string
    time?: string
    description?: string
    type: 'plan' | 'reminder' | 'date'
}

// Simple message interface for this module
interface SimpleMessage {
    role: string
    content: string
}

/**
 * Check if message is trivial (skip for quota optimization)
 */
function isTrivialMessage(content: string): boolean {
    const trivialPhrases = [
        'ok', 'okay', 'yes', 'no', 'yeah', 'yep', 'nope',
        'ừ', 'à', 'ờ', 'ô', 'ồ', 'ừm', 'uhm', 'hm', 'hmm',
        'lol', 'haha', 'hihi', '😂', '😅', '👍', '❤️'
    ]

    const normalized = content.toLowerCase().trim()

    // Less than 5 characters
    if (normalized.length < 5) return true

    // Only emojis (simplified check - just check if very short and no letters)
    if (normalized.length < 10 && !/[a-zA-Zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(normalized)) return true

    // Common trivial phrases
    if (trivialPhrases.some(phrase => normalized === phrase)) return true

    return false
}

/**
 * Filter out trivial messages from conversation
 */
function filterMeaningfulMessages(messages: SimpleMessage[]): SimpleMessage[] {
    return messages.filter(msg => !isTrivialMessage(msg.content))
}

/**
 * Build conversation context for AI prompt
 * Uses clear labels: "User" for person chatting, character's name for character
 */
function buildConversationContext(messages: SimpleMessage[], characterName: string, userName: string): string {
    const recentMessages = messages.slice(-30) // Last 30 messages
    const meaningful = filterMeaningfulMessages(recentMessages)

    if (meaningful.length === 0) {
        return "Chưa có cuộc trò chuyện đáng kể nào."
    }

    return meaningful.map(msg => {
        // User is the person chatting with character
        const speaker = msg.role === 'user' ? userName : characterName
        return `${speaker}: ${msg.content}`
    }).join('\n')
}

/**
 * Replace placeholders with actual names
 */
function replaceNamePlaceholders(content: PhoneContent, characterName: string, userName: string): PhoneContent {
    const replaceInString = (str: string): string => {
        if (!str) return str
        return str
            .replace(/\{user\}/gi, userName)
            .replace(/\{char\}/gi, characterName)
            .replace(/User/g, userName) // Also replace literal "User"
    }

    return {
        ...content,
        callLogs: content.callLogs?.map(call => ({
            ...call,
            contact: replaceInString(call.contact)
        })) || [],
        messages: content.messages?.map(msg => ({
            ...msg,
            contact: replaceInString(msg.contact),
            preview: replaceInString(msg.preview)
        })) || [],
        notes: content.notes?.map(note => ({
            ...note,
            title: replaceInString(note.title),
            content: replaceInString(note.content)
        })) || [],
        calendar: content.calendar?.map(event => ({
            ...event,
            title: replaceInString(event.title),
            description: replaceInString(event.description || '')
        })) || [],
        generatedAt: content.generatedAt
    }
}

/**
 * Generate phone content using AI
 * 
 * CRITICAL: Content is generated from CHARACTER's perspective about USER
 * - The phone belongs to CHARACTER (e.g., "Minh's phone")
 * - All notes, messages, etc. are CHARACTER's thoughts about USER
 * - Example: If character is Minh and user is Alex:
 *   - Calendar shows: "Hẹn với Alex" (Minh's date with Alex)
 *   - Notes show: Minh's feelings about Alex
 */
export async function generatePhoneContent(
    messages: SimpleMessage[],
    characterName: string,
    characterPersona: string,
    userName: string = 'Bạn' // Default fallback
): Promise<PhoneContent> {
    console.log('[PhoneContent] Starting generation...')
    console.log('[PhoneContent] Messages count:', messages.length)
    console.log('[PhoneContent] Character:', characterName)
    console.log('[PhoneContent] User:', userName)

    const conversationContext = buildConversationContext(messages, characterName, userName)
    console.log('[PhoneContent] Context length:', conversationContext.length)

    // Build AI prompt - CRITICAL: From CHARACTER's perspective about USER
    const prompt = `Bạn là ${characterName}. Đây là điện thoại của bạn. Hãy tạo nội dung điện thoại dựa trên cuộc trò chuyện gần đây với ${userName}.

Persona của bạn: ${characterPersona}

Cuộc trò chuyện gần đây:
${conversationContext}

QUAN TRỌNG: Tất cả nội dung phải từ góc nhìn của ${characterName} (bạn) về ${userName}:
- Nhật ký gọi: Cuộc gọi của bạn với ${userName} hoặc người khác
- Tin nhắn: Tin nhắn bạn gửi/nhận, bản nháp bạn định gửi cho ${userName}
- Ghi chú: Suy nghĩ, cảm xúc CỦA BẠN về ${userName}
- Lịch: Kế hoạch BẠN muốn làm với ${userName}

Tạo JSON với format sau:
{
  "callLogs": [{"contact": "tên người (ví dụ: ${userName})", "type": "incoming|outgoing|missed", "duration": "MM:SS", "timestamp": "ISO date"}],
  "messages": [{"contact": "tên người", "preview": "nội dung tin nhắn", "isDraft": boolean, "isUnsent": boolean, "timestamp": "ISO date"}],
  "notes": [{"title": "tiêu đề", "content": "nội dung suy nghĩ của bạn", "category": "feelings|quotes|reminders|thoughts", "timestamp": "ISO date"}],
  "calendar": [{"title": "tên sự kiện với ${userName}", "date": "ISO date", "time": "HH:MM", "description": "mô tả", "type": "plan|reminder|date"}]
}

Hãy viết tự nhiên, chân thực như một người thật. Dùng tiếng Việt.
Trả về CHỈ JSON, không có text khác.`

    try {
        // Use existing LLM infrastructure
        console.log('[PhoneContent] Calling LLM...')
        const { generateWithProviders } = await import('@/lib/llm')

        const response = await generateWithProviders(
            [
                { role: 'system', content: `Bạn là ${characterName}. Tạo nội dung điện thoại thực tế trong JSON.` },
                { role: 'user', content: prompt }
            ],
            {
                provider: 'silicon',
                model: 'deepseek-chat'
            }
        )

        console.log('[PhoneContent] LLM Response received')

        const generatedText = response.reply
        console.log('[PhoneContent] Generated text length:', generatedText.length)
        console.log('[PhoneContent] Generated text preview:', generatedText.substring(0, 300))

        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = generatedText.match(/```json\n?([\s\S]*?)\n?```/) ||
            generatedText.match(/\{[\s\S]*\}/)

        if (!jsonMatch) {
            console.error('[PhoneContent] No JSON found in response')
            throw new Error('No valid JSON found in response')
        }

        const jsonString = jsonMatch[1] || jsonMatch[0]
        console.log('[PhoneContent] Extracted JSON length:', jsonString.length)

        let phoneContent = JSON.parse(jsonString)
        console.log('[PhoneContent] Parsed successfully:', {
            calls: phoneContent.callLogs?.length || 0,
            messages: phoneContent.messages?.length || 0,
            notes: phoneContent.notes?.length || 0,
            calendar: phoneContent.calendar?.length || 0
        })

        // Replace any remaining placeholders
        phoneContent = replaceNamePlaceholders(phoneContent, characterName, userName)

        return {
            ...phoneContent,
            generatedAt: new Date().toISOString()
        }
    } catch (error: any) {
        console.error('[PhoneContent] Generation error:', error.message)
        console.error('[PhoneContent] Error stack:', error.stack)

        // Fallback: return sample content for testing
        console.log('[PhoneContent] Returning sample fallback data')
        return generateFallbackContent(characterName, userName)
    }
}

/**
 * Generate fallback sample content when LLM fails
 */
function generateFallbackContent(characterName: string, userName: string): PhoneContent {
    const now = Date.now()

    return {
        callLogs: [
            {
                contact: userName,
                type: 'incoming',
                duration: '5:34',
                timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString()
            },
            {
                contact: 'Bạn thân',
                type: 'outgoing',
                duration: '2:15',
                timestamp: new Date(now - 5 * 60 * 60 * 1000).toISOString()
            },
            {
                contact: userName,
                type: 'missed',
                timestamp: new Date(now - 24 * 60 * 60 * 1000).toISOString()
            }
        ],
        messages: [
            {
                contact: userName,
                preview: `Mình nhớ ${userName} quá... sao giờ này vẫn chưa nhắn tin nhỉ?`,
                isDraft: true,
                isUnsent: true,
                timestamp: new Date(now - 30 * 60 * 1000).toISOString()
            },
            {
                contact: 'Mẹ',
                preview: 'Con nhớ ăn uống đầy đủ nhé',
                isDraft: false,
                isUnsent: false,
                timestamp: new Date(now - 3 * 60 * 60 * 1000).toISOString()
            },
            {
                contact: userName,
                preview: 'Hí, lúc nào rảnh mình gặp nhau nha!',
                isDraft: false,
                isUnsent: false,
                timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString()
            }
        ],
        notes: [
            {
                title: `Cảm xúc về ${userName}`,
                content: `Hôm nay trò chuyện với ${userName} vui lắm. Thấy ấm áp và được quan tâm. Mong có thể gặp ${userName} sớm.`,
                category: 'feelings',
                timestamp: new Date(now).toISOString()
            },
            {
                title: 'Câu nói đáng nhớ',
                content: `"${userName} nói nghe dễ thương quá trời..."`,
                category: 'quotes',
                timestamp: new Date(now - 1 * 60 * 60 * 1000).toISOString()
            },
            {
                title: 'Nhắc nhở',
                content: `Nhớ hỏi thăm ${userName} về công việc ngày mai`,
                category: 'reminders',
                timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString()
            }
        ],
        calendar: [
            {
                title: `Hẹn với ${userName} 💕`,
                date: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
                time: '18:00',
                description: `Đi xem phim và ăn tối cùng ${userName}`,
                type: 'date'
            },
            {
                title: 'Mua quà',
                date: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
                time: '14:00',
                description: `Tìm món quà ý nghĩa cho ${userName}`,
                type: 'reminder'
            }
        ],
        generatedAt: new Date().toISOString()
    }
}

/**
 * Check if conversation is substantial enough for generation
 */
export function shouldGenerateContent(messages: SimpleMessage[]): boolean {
    const meaningful = filterMeaningfulMessages(messages)

    // Lowered requirements for easier testing
    // Need at least 5 meaningful messages (was 10)
    if (meaningful.length < 5) return false

    // Skip if in greeting phase (first 3 messages, was 6)
    if (messages.length < 3) return false

    return true
}
