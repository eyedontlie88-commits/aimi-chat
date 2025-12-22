import { LLMProviderClient, LLMMessage } from '../types'

/**
 * 🚨 Custom Error class with debug info for DEV toast
 */
export class SiliconFlowError extends Error {
    provider: string = 'SiliconFlow'
    model: string
    keyIndex: number
    statusCode: number
    maskedKey: string

    constructor(message: string, details: { model: string; keyIndex: number; statusCode: number; maskedKey: string }) {
        super(message)
        this.name = 'SiliconFlowError'
        this.model = details.model
        this.keyIndex = details.keyIndex
        this.statusCode = details.statusCode
        this.maskedKey = details.maskedKey
    }

    toDebugString(): string {
        return `🚨 Provider: ${this.provider} | Model: ${this.model} | Key #${this.keyIndex + 1}: ${this.maskedKey} | Status: ${this.statusCode}`
    }
}

/**
 * 🚀 SiliconFlow Provider with Multi-Key Rotation & Auto-Retry
 * Supports multiple API keys for load balancing and quota distribution
 * 
 * ENV: SILICON_API_KEY=key1,key2,key3 (comma-separated)
 * 
 * Features:
 * - Random key rotation for load balancing
 * - Auto-retry on 401 with different key
 * - Key blacklisting to avoid retrying failed keys
 * - Debug info in errors for DEV toast display
 */
export class SiliconFlowProvider implements LLMProviderClient {
    private baseUrl: string
    private defaultModel: string
    private badKeys: Set<string> = new Set() // Track keys that failed with 401

    constructor() {
        this.baseUrl = process.env.SILICON_BASE_URL || 'https://api.siliconflow.cn/v1'
        this.defaultModel = process.env.SILICON_DEFAULT_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
    }

    /**
     * 🔧 Get all sanitized keys from env
     */
    private getAllKeys(): string[] {
        const keyString = process.env.SILICON_API_KEY || ''
        // Sanitize: split, trim, remove ALL types of quotes, filter empty
        return keyString
            .split(',')
            .map(k => k.replace(/['""`]/g, '').trim()) // Remove single, double, backtick quotes
            .filter(k => k.length > 0)
    }

    /**
     * 🔑 Mask a key for safe logging
     */
    private maskKey(key: string): string {
        return key.length > 8 ? key.substring(0, 5) + '...' + key.slice(-3) : '***'
    }

    /**
     * 🔄 Multi-Key Rotation: Returns key + index for debug tracking
     */
    private getRotatedKeyWithIndex(): { key: string; index: number; totalKeys: number } {
        const allKeys = this.getAllKeys()

        if (allKeys.length === 0) {
            console.error('[SiliconFlow] ❌ No API keys found! Check SILICON_API_KEY in .env')
            return { key: '', index: -1, totalKeys: 0 }
        }

        // Filter out bad keys
        const goodKeys = allKeys.filter(k => !this.badKeys.has(k))

        if (goodKeys.length === 0) {
            console.warn('[SiliconFlow] ⚠️ All keys are blacklisted! Clearing blacklist and retrying...')
            this.badKeys.clear()
            return { key: allKeys[0], index: 0, totalKeys: allKeys.length }
        }

        // Random rotation for load balancing
        const selectedIndex = Math.floor(Math.random() * goodKeys.length)
        const selectedKey = goodKeys[selectedIndex]
        const actualIndex = allKeys.indexOf(selectedKey) // Get original index in allKeys

        // Debug log with masked key
        console.log(`[SiliconFlow] 🔑 Key ${actualIndex + 1}/${allKeys.length}: "${this.maskKey(selectedKey)}" (len: ${selectedKey.length})`)

        return { key: selectedKey, index: actualIndex, totalKeys: allKeys.length }
    }

    /**
     * 🚫 Mark a key as bad (401 error)
     */
    private blacklistKey(key: string): void {
        this.badKeys.add(key)
        console.warn(`[SiliconFlow] 🚫 Blacklisted key: ${this.maskKey(key)}`)
    }

    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        const model = options.model || this.defaultModel
        const allKeys = this.getAllKeys()
        const maxRetries = Math.min(3, allKeys.length) // Max 3 retries or number of keys

        let lastKeyIndex = -1
        let lastMaskedKey = '***'

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const { key: apiKey, index: keyIndex, totalKeys } = this.getRotatedKeyWithIndex()
            lastKeyIndex = keyIndex
            lastMaskedKey = this.maskKey(apiKey)

            if (!apiKey) {
                throw new SiliconFlowError(
                    'SiliconFlow API key not configured',
                    { model, keyIndex: -1, statusCode: 0, maskedKey: 'NONE' }
                )
            }

            try {
                console.log(`[SiliconFlow] 🚀 Attempt ${attempt}/${maxRetries} - Model: ${model} - Key #${keyIndex + 1}/${totalKeys}`)

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
                    const errorBody = await response.json().catch(() => ({ error: 'Unknown error' }))

                    // 🔑 Auto-retry on 401: blacklist this key and try another
                    if (response.status === 401) {
                        console.error(`[SiliconFlow] ❌ 401 Unauthorized! Key #${keyIndex + 1} invalid.`)
                        this.blacklistKey(apiKey)

                        if (attempt < maxRetries) {
                            console.log(`[SiliconFlow] 🔄 Retrying with different key...`)
                            continue // Try next key
                        }
                    }

                    throw new SiliconFlowError(
                        `API error: ${response.status} - ${JSON.stringify(errorBody)}`,
                        { model, keyIndex, statusCode: response.status, maskedKey: lastMaskedKey }
                    )
                }

                const data = await response.json()
                const content = data.choices?.[0]?.message?.content || ''

                console.log(`[SiliconFlow] ✅ Success on attempt ${attempt}! Length: ${content.length}`)
                return content

            } catch (error) {
                console.error(`[SiliconFlow] ❌ Error on attempt ${attempt}:`, error)

                // Only throw on last attempt
                if (attempt >= maxRetries) {
                    if (error instanceof SiliconFlowError) {
                        throw error
                    }
                    // Wrap unknown errors
                    throw new SiliconFlowError(
                        error instanceof Error ? error.message : 'Unknown error',
                        { model, keyIndex: lastKeyIndex, statusCode: 0, maskedKey: lastMaskedKey }
                    )
                }
            }
        }

        throw new SiliconFlowError(
            'All retry attempts failed',
            { model, keyIndex: lastKeyIndex, statusCode: 0, maskedKey: lastMaskedKey }
        )
    }
}

export const siliconProvider = new SiliconFlowProvider()


