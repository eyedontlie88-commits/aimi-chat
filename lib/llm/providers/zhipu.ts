import { LLMProviderClient, LLMMessage } from '../types'
import { ZHIPU_MODELS, ZHIPU_DEFAULT } from '../constants/zhipu'

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
        this.defaultModel = process.env.ZHIPU_DEFAULT_MODEL || ZHIPU_DEFAULT
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        if (!this.apiKey) {
            throw new Error('Zhipu API key not configured (ZHIPU_API_KEY)')
        }

        // Allow dynamic model selection
        const model = options.model || this.defaultModel

        try {
            console.log(`[Zhipu] 🚀 Calling model: ${model}`)

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages,
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
        return ZHIPU_MODELS
    }
}

export const zhipuProvider = new ZhipuProvider()
