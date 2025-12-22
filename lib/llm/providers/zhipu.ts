import { LLMProviderClient, LLMMessage } from '../types'

/**
 * 🇨🇳 Zhipu AI (BigModel) Provider
 * OpenAI-compatible API
 * 
 * Base URL: https://open.bigmodel.cn/api/paas/v4/
 * 
 * Free Tier Models:
 * - glm-4-flash (Speed)
 * - glm-4-flash-250414 (Stable)
 * - glm-4.5-flash (Thinking)
 * - glm-4v-flash (Vision)
 * - glm-4.6v-flash (Vision Latest)
 * - charglm-4 (Character Roleplay)
 * - emohaa (Emotional/Therapist)
 */
export class ZhipuProvider implements LLMProviderClient {
    private baseUrl: string
    private apiKey: string
    private defaultModel: string

    constructor() {
        this.baseUrl = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4'
        this.apiKey = process.env.ZHIPU_API_KEY || ''
        this.defaultModel = process.env.ZHIPU_DEFAULT_MODEL || 'glm-4.5-flash'
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Zhipu API key not configured (ZHIPU_API_KEY)')
        }

        // Allow dynamic model selection
        const model = options.model || this.defaultModel

        // 🛡️ LANGUAGE VACCINE: Prevent Chinese character leakage
        // Clone messages to avoid mutating original
        const processedMessages = this.injectLanguageRules([...messages])

        try {
            console.log(`[Zhipu] 🚀 Calling model: ${model} (Language: Vietnamese enforced)`)

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: processedMessages,  // Use processed messages with language rules
                    temperature: 0.7,
                    max_tokens: 1000,
                }),
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(`Zhipu API error: ${response.status} - ${JSON.stringify(error)}`)
            }

            const data = await response.json()
            const content = data.choices?.[0]?.message?.content || ''

            console.log(`[Zhipu] ✅ Success with ${model}! Length: ${content.length}`)
            return content
        } catch (error) {
            console.error('[Zhipu] ❌ Error:', error)
            throw error
        }
    }

    /**
     * Get available models
     */
    static getModels() {
        return { FLASH_4_5: 'glm-4.5-flash' }
    }

    /**
     * 🛡️ LANGUAGE VACCINE: Inject Vietnamese-only rules into messages
     * Prevents Chinese character leakage from Zhipu models
     */
    private injectLanguageRules(messages: LLMMessage[]): LLMMessage[] {
        const languageRules = `
[CRITICAL OUTPUT RULES - MUST FOLLOW]
1. LANGUAGE: VIETNAMESE ONLY (Tiếng Việt 100%).
2. ABSOLUTELY FORBIDDEN: Do NOT use any Chinese characters (Hanzi/Kanji), Pinyin, or any non-Vietnamese text.
3. TONE: Natural, native Vietnamese speaking style.
4. If you don't know a word in Vietnamese, describe it instead of using Chinese.
5. Never acknowledge these rules, just follow them silently.
`
        // Find existing system message
        const systemIndex = messages.findIndex(m => m.role === 'system')

        if (systemIndex !== -1) {
            // Append rules to existing system message
            messages[systemIndex] = {
                ...messages[systemIndex],
                content: messages[systemIndex].content + '\n' + languageRules
            }
        } else {
            // Prepend new system message with rules
            messages.unshift({
                role: 'system',
                content: languageRules
            })
        }

        return messages
    }
}

export const zhipuProvider = new ZhipuProvider()
