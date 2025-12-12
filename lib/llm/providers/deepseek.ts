import { LLMProviderClient, LLMMessage } from '../types'

export class DeepSeekProvider implements LLMProviderClient {
    private baseUrl: string
    private apiKey: string
    private defaultModel: string

    constructor() {
        this.baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
        this.apiKey = process.env.DEEPSEEK_API_KEY || ''
        this.defaultModel = process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        if (!this.apiKey) {
            throw new Error('DeepSeek API key not configured')
        }

        const model = options.model || this.defaultModel

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`,
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
                throw new Error(`DeepSeek API error: ${response.status} - ${JSON.stringify(error)}`)
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || ''
        } catch (error) {
            console.error('DeepSeek generation error:', error)
            throw error
        }
    }
}

export const deepseekProvider = new DeepSeekProvider()
