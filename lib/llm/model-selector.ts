/**
 * Smart Model Selector
 * Pre-selects optimal AI model based on message characteristics
 * 
 * Features:
 * - Detect message length category (short/long)
 * - Prioritize Vietnamese-optimized models for long-form
 * - Generate narrative instructions based on category
 */

export type MessageCategory = 'short' | 'long'

export interface ModelConfig {
    provider: string
    modelName: string
    displayName: string
    maxTokens: number
    contextWindow: number
    vietnameseQuality: 'excellent' | 'good' | 'ok'
    isFree: boolean
    priority: number
}

// 🏆 LONG-FORM MODELS (Vietnamese優先)
const LONG_FORM_MODELS: ModelConfig[] = [
    {
        provider: 'silicon',
        modelName: 'Qwen/Qwen2.5-32B-Instruct',
        displayName: 'Qwen 2.5 32B (SiliconFlow)',
        maxTokens: 4000,  // ~2500-3000 chữ Vietnamese
        contextWindow: 32768,
        vietnameseQuality: 'excellent',  // Alibaba train chuyên Asian languages
        isFree: true,
        priority: 1,
    },
    {
        provider: 'silicon',
        modelName: 'deepseek-ai/DeepSeek-V3',
        displayName: 'DeepSeek V3 (SiliconFlow)',
        maxTokens: 4000,
        contextWindow: 65536,
        vietnameseQuality: 'excellent',
        isFree: true,
        priority: 2,
    },
    {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        maxTokens: 8000,
        contextWindow: 1000000,
        vietnameseQuality: 'good',
        isFree: true,
        priority: 3,
    },
    {
        provider: 'moonshot',
        modelName: 'moonshot-v1-128k',
        displayName: 'Moonshot V1 128K',
        maxTokens: 4000,
        contextWindow: 131072,
        vietnameseQuality: 'ok',
        isFree: true,
        priority: 4,
    },
]

// 💬 SHORT-FORM MODELS (Fast & cheap)
const SHORT_FORM_MODELS: ModelConfig[] = [
    {
        provider: 'silicon',
        modelName: 'deepseek-ai/DeepSeek-V3',
        displayName: 'DeepSeek V3 (SiliconFlow)',
        maxTokens: 800,
        contextWindow: 65536,
        vietnameseQuality: 'excellent',
        isFree: true,
        priority: 1,
    },
    {
        provider: 'silicon',
        modelName: 'Qwen/Qwen2.5-7B-Instruct',
        displayName: 'Qwen 2.5 7B (SiliconFlow)',
        maxTokens: 800,
        contextWindow: 32768,
        vietnameseQuality: 'excellent',
        isFree: true,
        priority: 2,
    },
    {
        provider: 'gemini',
        modelName: 'gemini-2.5-flash',
        displayName: 'Gemini 2.5 Flash',
        maxTokens: 800,
        contextWindow: 1000000,
        vietnameseQuality: 'good',
        isFree: true,
        priority: 3,
    },
    {
        provider: 'openrouter',
        modelName: 'openai/gpt-oss-120b',
        displayName: 'GPT OSS 120B (OpenRouter)',
        maxTokens: 800,
        contextWindow: 8192,
        vietnameseQuality: 'ok',
        isFree: true,
        priority: 4,
    },
]

// Threshold for detecting long-form messages (word count)
const LONG_FORM_THRESHOLD = 100

/**
 * Detect message category based on word count
 */
export function detectMessageCategory(message: string): MessageCategory {
    // Split by whitespace, count words
    const wordCount = message.trim().split(/\s+/).filter(w => w.length > 0).length

    // Threshold: 100 words
    return wordCount >= LONG_FORM_THRESHOLD ? 'long' : 'short'
}

/**
 * Get word count of a message
 */
export function getWordCount(message: string): number {
    return message.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Select optimal model config based on message category
 */
export function selectModelConfig(category: MessageCategory): ModelConfig[] {
    // Return priority-sorted list for fallback
    const candidates = category === 'long' ? LONG_FORM_MODELS : SHORT_FORM_MODELS
    return candidates.sort((a, b) => a.priority - b.priority)
}

/**
 * Select optimal model based on message
 */
export function selectModelForMessage(
    message: string,
    forceCategory?: MessageCategory
): { category: MessageCategory; models: ModelConfig[]; wordCount: number } {
    const wordCount = getWordCount(message)
    const category = forceCategory || detectMessageCategory(message)

    console.log(`[Model Selector] Word count: ${wordCount}, Category: ${category}`)

    const models = selectModelConfig(category)

    return { category, models, wordCount }
}

/**
 * Get narrative instruction based on category
 * Appended to system prompt to guide AI response style
 */
export function getNarrativeInstruction(category: MessageCategory, userLanguage: string = 'vi'): string {
    const isEnglish = userLanguage === 'en'

    if (category === 'long') {
        if (isEnglish) {
            return `
🎬 LONG-FORM NARRATIVE MODE

User is writing a long message (≥100 words) - This is story mode or detailed roleplay.

RESPONSE GUIDELINES:
- Length: 3-5 detailed paragraphs (300-500 words)
- Style: Descriptive, narrative, storytelling
- Content:
  * Describe scenes, atmosphere, emotions in detail
  * Express character's inner thoughts
  * Use long, complex, literary sentences
  * Create vivid imagery for the reader
- Match user's level of detail and emotion!

Example style:
"The afternoon sunlight filtered through the window, casting shimmering streaks across the wooden floor. She sat there, fingers trembling, eyes following every line of the message he had just sent. Her heart beat faster, a mix of happiness and anxiety. She knew she had to reply, but the words kept swirling in her mind, refusing to form proper sentences..."
`
        } else {
            return `
🎬 CHẾ ĐỘ TRUYỆN DÀI (LONG-FORM NARRATIVE MODE)

User đang viết tin nhắn dài (≥100 từ) - Đây là story mode hoặc roleplay chi tiết.

QUY TẮC TRẢ LỜI:
- Độ dài: 3-5 đoạn văn chi tiết (300-500 từ)
- Phong cách: Mô tả, kể chuyện, văn học
- Nội dung:
  * Mô tả cảnh, không khí, cảm xúc chi tiết
  * Diễn tả suy nghĩ nội tâm của nhân vật
  * Dùng câu văn dài, phức tạp, văn chương
  * Tạo hình ảnh sống động cho reader
- Phải MATCH với độ dài và chi tiết của user!

Ví dụ phong cách:
"Ánh nắng chiều hắt qua khung cửa sổ, vẽ những vệt sáng lấp lánh trên sàn gỗ. Em ngồi đó, ngón tay run run, ánh mắt dõi theo từng dòng chữ anh vừa gửi. Tim em đập nhanh hơn, một cảm giác lẫn lộn giữa hạnh phúc và lo lắng. Em biết em phải trả lời, nhưng những từ ngữ cứ mãi lẩn quẩn trong đầu, không chịu sắp xếp thành câu..."
`
        }
    } else {
        if (isEnglish) {
            return `
💬 CASUAL CHAT MODE

User is chatting normally (<100 words).

RESPONSE GUIDELINES:
- Length: 1-2 short paragraphs (50-150 words)
- Style: Conversational, friendly, natural
- Content: Direct response, don't ramble
- Keep it casual, like everyday texting

Example style:
"Hmm, I understand! Don't worry, I'll try to find time to meet you this weekend. I miss you too 😊"
`
        } else {
            return `
💬 CHẾ ĐỘ CHAT THƯỜNG

User đang chat thông thường (<100 từ).

QUY TẮC TRẢ LỜI:
- Độ dài: 1-2 đoạn ngắn (50-150 từ)
- Phong cách: Hội thoại, thân thiện, tự nhiên
- Nội dung: Trả lời trực tiếp, không lan man
- Giữ casual như chat hàng ngày

Ví dụ phong cách:
"Ừm, em hiểu rồi! Anh đừng lo, em sẽ cố gắng sắp xếp thời gian để gặp anh cuối tuần này. Em cũng nhớ anh lắm đấy 😊"
`
        }
    }
}

/**
 * Get recommended max tokens based on category
 */
export function getRecommendedMaxTokens(category: MessageCategory): number {
    return category === 'long' ? 4000 : 800
}

/**
 * Get recommended temperature based on category
 */
export function getRecommendedTemperature(category: MessageCategory): number {
    // Slightly higher for storytelling mode
    return category === 'long' ? 0.8 : 0.7
}
