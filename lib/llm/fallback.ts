/**
 * Smart Fallback Chain System
 * 
 * "Không bỏ lại User phía sau" - Never leave a user behind
 * 
 * Strategy:
 * - If primary model fails (429/500/network), automatically try alternatives
 * - Each fallback should be "lighter" and "faster" than the previous
 * - Maximum 3 attempts per request
 */

import { LLMMessage, LLMProviderId } from './types'
import { generateWithProviders } from './router'

export interface FallbackModel {
    provider: LLMProviderId
    model: string
    name: string // Human-readable name for logging
}

/**
 * Fallback chains by primary provider
 * Order: Primary -> Fallback 1 -> Fallback 2
 * Rule: Each subsequent model should be lighter/faster
 * 
 * IMPORTANT: Use STABLE model aliases only!
 * - gemini-2.5-flash (NOT gemini-2.5-flash-preview-XX-XX)
 * - gemini-1.5-flash (fallback)
 */

// Get stable Gemini model from env or use safe default
const getGeminiFlashModel = (): string => {
    // Priority: env var -> stable alias
    return process.env.GOOGLE_MODEL_3 || 'gemini-2.5-flash'
}

// Build fallback chains dynamically to pick up env vars
export const getFallbackChains = (): Record<string, FallbackModel[]> => {
    const geminiFlash = getGeminiFlashModel()

    return {
        // Google Gemini chain
        gemini: [
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
        ],
        google: [
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
        ],

        // SiliconFlow chain
        silicon: [
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
        ],
        siliconflow: [
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
        ],

        // DeepSeek chain (hosted on SiliconFlow)
        deepseek: [
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
        ],

        // Default fallback chain for unknown providers
        default: [
            { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' },
            { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' },
            { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
        ],
    }
}

export interface FallbackResult {
    reply: string
    providerUsed: LLMProviderId
    modelUsed: string
    attemptCount: number
    fallbackUsed: boolean
}

/**
 * Generate with smart fallback chain
 * Tries primary model first, then falls back through the chain
 * 
 * @param messages - Conversation messages
 * @param primaryProvider - User's preferred provider
 * @param primaryModel - User's preferred model (optional)
 * @returns Generated response with metadata about which model was used
 */
export async function generateWithFallback(
    messages: LLMMessage[],
    primaryProvider: LLMProviderId,
    primaryModel?: string
): Promise<FallbackResult> {
    const attempts: { provider: string; model: string; error: string }[] = []
    const MAX_ATTEMPTS = 3

    // Build attempt chain: Primary first, then fallbacks
    const chain: FallbackModel[] = []

    // Add primary model as first attempt
    if (primaryModel) {
        chain.push({
            provider: primaryProvider,
            model: primaryModel,
            name: `${primaryProvider}/${primaryModel}`
        })
    }

    // Add fallback chain (dynamically built to pick up env vars)
    const chains = getFallbackChains()
    const fallbackChain = chains[primaryProvider.toLowerCase()] || chains.default
    for (const fallback of fallbackChain) {
        // Skip if same as primary
        if (fallback.provider === primaryProvider && fallback.model === primaryModel) continue
        chain.push(fallback)
    }

    // Try each model in the chain
    for (let i = 0; i < Math.min(chain.length, MAX_ATTEMPTS); i++) {
        const attempt = chain[i]

        try {
            console.log(`[Fallback] Attempt ${i + 1}/${MAX_ATTEMPTS}: ${attempt.name}`)

            const result = await generateWithProviders(messages, {
                provider: attempt.provider,
                model: attempt.model
            })

            console.log(`[Fallback] ✅ Success with ${attempt.name}`)

            return {
                reply: result.reply,
                providerUsed: result.providerUsed,
                modelUsed: result.modelUsed,
                attemptCount: i + 1,
                fallbackUsed: i > 0
            }

        } catch (error: any) {
            const errorMsg = error?.message || 'Unknown error'
            console.warn(`[Fallback] ❌ ${attempt.name} failed: ${errorMsg}`)

            attempts.push({
                provider: attempt.provider,
                model: attempt.model,
                error: errorMsg
            })

            // If this was the last attempt, throw aggregated error
            if (i === Math.min(chain.length, MAX_ATTEMPTS) - 1) {
                const aggregatedError = new Error(
                    `Tất cả ${attempts.length} model đều thất bại. Vui lòng thử lại sau.`
                ) as any
                aggregatedError.code = 'ALL_FALLBACKS_FAILED'
                aggregatedError.attempts = attempts
                throw aggregatedError
            }

            // Otherwise, continue to next fallback
            console.log(`[Fallback] Trying next fallback...`)
        }
    }

    // Should never reach here, but just in case
    throw new Error('Fallback chain exhausted without result')
}
