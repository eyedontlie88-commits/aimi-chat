import { LLMProviderClient, LLMMessage } from '../types'

/**
 * 🚀 SiliconFlow Provider with Multi-Key Rotation
 * Supports multiple API keys for load balancing and quota distribution
 * 
 * ENV: SILICON_API_KEY=key1,key2,key3 (comma-separated)
 */
export class SiliconFlowProvider implements LLMProviderClient {
    private baseUrl: string
    private defaultModel: string

    constructor() {
        this.baseUrl = process.env.SILICON_BASE_URL || 'https://api.siliconflow.cn/v1'
        this.defaultModel = process.env.SILICON_DEFAULT_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
    }

    /**
     * 🔄 Multi-Key Rotation: Random selection from comma-separated keys
     * Distributes load across multiple accounts to avoid quota exhaustion
     */
    private getRotatedKey(): string {
        const keyString = process.env.SILICON_API_KEY || ''
        // Sanitize: split, trim, remove quotes, filter empty
        const allKeys = keyString
            .split(',')
            .map(k => k.trim().replace(/['"]/g, ''))
            .filter(k => k.length > 0)

        if (allKeys.length === 0) {
            console.error('[SiliconFlow] ❌ No API keys found! Check SILICON_API_KEY in .env')
            return ''
        }

        // Random rotation for load balancing
        const selectedIndex = Math.floor(Math.random() * allKeys.length)
        const selectedKey = allKeys[selectedIndex]

        // Debug log with masked key
        const maskedKey = selectedKey.length > 8
            ? selectedKey.substring(0, 5) + '...' + selectedKey.slice(-3)
            : '***'
        console.log(`[SiliconFlow] 🔑 Key ${selectedIndex + 1}/${allKeys.length}: "${maskedKey}" (len: ${selectedKey.length})`)

        return selectedKey
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        const apiKey = this.getRotatedKey()

        if (!apiKey) {
            throw new Error('SiliconFlow API key not configured (SILICON_API_KEY)')
        }

        const model = options.model || this.defaultModel

        try {
            console.log(`[SiliconFlow] 🚀 Calling model: ${model}`)

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
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
            const content = data.choices?.[0]?.message?.content || ''

            console.log(`[SiliconFlow] ✅ Success! Length: ${content.length}`)
            return content
        } catch (error) {
            console.error('[SiliconFlow] ❌ Error:', error)
            throw error
        }
    }
}

export const siliconProvider = new SiliconFlowProvider()
