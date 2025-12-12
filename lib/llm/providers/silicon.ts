import { LLMProviderClient, LLMMessage } from '../types'

export class SiliconFlowProvider implements LLMProviderClient {
    private baseUrl: string
    private apiKey: string
    private defaultModel: string

    constructor() {
        this.baseUrl = process.env.SILICON_BASE_URL || 'https://api.siliconflow.cn/v1'
        this.apiKey = process.env.SILICON_API_KEY || ''
        this.defaultModel = process.env.SILICON_DEFAULT_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        if (!this.apiKey) {
            throw new Error('SiliconFlow API key not configured')
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
                throw new Error(`SiliconFlow API error: ${response.status} - ${JSON.stringify(error)}`)
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || ''
        } catch (error) {
            console.error('SiliconFlow generation error:', error)
            throw error
        }
    }
}

export const siliconProvider = new SiliconFlowProvider()
