import { LLMProviderClient, LLMMessage } from '../types'

/**
 * 🚨 Custom Error class with debug info for DEV toast
 */
export class OpenRouterError extends Error {
    provider: string = 'OpenRouter'
    model: string
    statusCode: number
    maskedKey: string

    constructor(message: string, details: { model: string; statusCode: number; maskedKey: string }) {
        super(message)
        this.name = 'OpenRouterError'
        this.model = details.model
        this.statusCode = details.statusCode
        this.maskedKey = details.maskedKey
    }

    toDebugString(): string {
        return `🚨 Provider: ${this.provider} | Model: ${this.model} | Key: ${this.maskedKey} | Status: ${this.statusCode}`
    }
}

/**
 * 🚀 OpenRouter Provider - Access 35+ FREE models
 * 
 * ENV: OPENROUTER_API_KEY=sk-or-v1-xxxxx
 * 
 * Features:
 * - 35+ free models from various providers
 * - OpenAI-compatible API format
 * - Required headers: HTTP-Referer, X-Title
 * - Debug logging for troubleshooting
 */
export class OpenRouterProvider implements LLMProviderClient {
    private baseUrl: string
    private defaultModel: string

    constructor() {
        this.baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
        this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'meta-llama/llama-3.3-70b-instruct'
    }

    /**
     * 🔑 Get API key from environment
     */
    private getApiKey(): string {
        return process.env.OPENROUTER_API_KEY || ''
    }

    /**
     * 🔑 Mask a key for safe logging
     */
    private maskKey(key: string): string {
        return key.length > 8 ? key.substring(0, 8) + '...' + key.slice(-4) : '***'
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        const model = options.model || this.defaultModel
        const apiKey = this.getApiKey()

        if (!apiKey) {
            throw new OpenRouterError(
                'OpenRouter API key not configured',
                { model, statusCode: 0, maskedKey: 'NONE' }
            )
        }

        const maskedKey = this.maskKey(apiKey)
        console.log(`[OpenRouter] 🚀 Calling model: ${model}`)

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
                    'X-Title': 'Almi Chat'
                },
                body: JSON.stringify({
                    model,
                    messages: messages.map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    temperature: 0.8,
                    max_tokens: 1000
                })
            })

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }))
                console.error(`[OpenRouter] ❌ HTTP ${response.status}:`, errorBody)

                throw new OpenRouterError(
                    `API error: ${response.status} - ${JSON.stringify(errorBody)}`,
                    { model, statusCode: response.status, maskedKey }
                )
            }

            const data = await response.json()

            if (!data.choices || data.choices.length === 0) {
                console.error('[OpenRouter] ❌ No choices in response:', data)
                throw new OpenRouterError(
                    'No response generated',
                    { model, statusCode: 200, maskedKey }
                )
            }

            const content = data.choices[0]?.message?.content || ''

            if (!content) {
                throw new OpenRouterError(
                    'Empty response content',
                    { model, statusCode: 200, maskedKey }
                )
            }

            console.log(`[OpenRouter] ✅ Success! Response length: ${content.length}`)
            return content

        } catch (error) {
            console.error('[OpenRouter] ❌ Error:', error)

            if (error instanceof OpenRouterError) {
                throw error
            }

            throw new OpenRouterError(
                error instanceof Error ? error.message : 'Unknown error',
                { model, statusCode: 0, maskedKey }
            )
        }
    }
}

export const openrouterProvider = new OpenRouterProvider()
