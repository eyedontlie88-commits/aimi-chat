/**
 * Smart Fallback Chain System
 * 
 * "Không bỏ lại User phía sau" - Never leave a user behind
 * 
 * Strategy:
 * - If primary model fails (429/500/network), automatically try alternatives
 * - Each fallback should be "lighter" and "faster" than the previous
 * - Maximum 3 attempts per request
 * 
 * NEW: Smart Model Selection
 * - Pre-selects optimal model based on message length
 * - Long messages (≥100 words) → Vietnamese-optimized models (Qwen, DeepSeek)
 * - Short messages (<100 words) → Fast models (DeepSeek, Qwen 7B)
 */

import { LLMMessage, LLMProviderId } from './types'
import { generateWithProviders } from './router'
import {
    selectModelForMessage,
    getNarrativeInstruction,
    getRecommendedMaxTokens,
    getRecommendedTemperature,
    type MessageCategory,
    type ModelConfig
} from './model-selector'

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
 * - gemini-2.5-flash (stable, recommended)
 * - gemini-3-flash-preview (latest)
 */

// Get stable Gemini model from env or use safe default
const getGeminiFlashModel = (): string => {
    // Priority: env var -> stable alias
    return process.env.GOOGLE_MODEL_3 || 'gemini-2.5-flash'
}

// Check which providers have valid API keys
const hasGeminiKey = (): boolean => !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
const hasSiliconKey = (): boolean => !!process.env.SILICON_API_KEY
const hasMoonshotKey = (): boolean => !!process.env.MOONSHOT_API_KEY
const hasOpenRouterKey = (): boolean => !!process.env.OPENROUTER_API_KEY

// Build fallback chains dynamically, EXCLUDING providers without keys
export const getFallbackChains = (): Record<string, FallbackModel[]> => {
    const geminiFlash = getGeminiFlashModel()
    const geminiAvailable = hasGeminiKey()
    const siliconAvailable = hasSiliconKey()
    const moonshotAvailable = hasMoonshotKey()
    const openrouterAvailable = hasOpenRouterKey()

    // Log available providers for debugging
    console.log(`[Fallback] Provider availability: Gemini=${geminiAvailable}, Silicon=${siliconAvailable}, Moonshot=${moonshotAvailable}, OpenRouter=${openrouterAvailable}`)

    // Define all possible models
    const geminiModel: FallbackModel = { provider: 'gemini', model: geminiFlash, name: 'Gemini 2.5 Flash' }
    const qwenModel: FallbackModel = { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', name: 'Qwen 2.5 14B' }
    const deepseekModel: FallbackModel = { provider: 'silicon', model: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' }
    const moonshotModel: FallbackModel = { provider: 'moonshot', model: 'moonshot-v1-32k', name: 'Moonshot V1 32K' }
    const openrouterModel: FallbackModel = { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (OpenRouter)' }

    // Filter function to only include models with valid keys
    const filterByAvailableKeys = (models: FallbackModel[]): FallbackModel[] => {
        return models.filter(model => {
            if (model.provider === 'gemini') return geminiAvailable
            if (model.provider === 'silicon') return siliconAvailable
            if (model.provider === 'moonshot') return moonshotAvailable
            if (model.provider === 'openrouter') return openrouterAvailable
            return true // Unknown providers pass through
        })
    }

    // Build chains with filtering
    const rawChains = {
        // Google Gemini chain
        gemini: [geminiModel, qwenModel, deepseekModel, moonshotModel, openrouterModel],
        google: [geminiModel, qwenModel, deepseekModel, moonshotModel, openrouterModel],

        // SiliconFlow chain
        silicon: [deepseekModel, qwenModel, geminiModel, moonshotModel, openrouterModel],
        siliconflow: [deepseekModel, qwenModel, geminiModel, moonshotModel, openrouterModel],

        // DeepSeek chain (hosted on SiliconFlow)
        deepseek: [deepseekModel, qwenModel, geminiModel, moonshotModel, openrouterModel],

        // Moonshot chain
        moonshot: [moonshotModel, geminiModel, qwenModel, deepseekModel, openrouterModel],

        // OpenRouter chain
        openrouter: [openrouterModel, geminiModel, qwenModel, deepseekModel, moonshotModel],

        // Default: Silicon first (most reliable), then Gemini, then Moonshot, then OpenRouter
        default: [qwenModel, deepseekModel, geminiModel, moonshotModel, openrouterModel],
    }

    // Apply filtering to all chains
    const filteredChains: Record<string, FallbackModel[]> = {}
    for (const [key, chain] of Object.entries(rawChains)) {
        filteredChains[key] = filterByAvailableKeys(chain)
        // Ensure at least one provider is available
        if (filteredChains[key].length === 0) {
            console.error(`[Fallback] ⚠️ No providers available for chain '${key}'! Check your API keys.`)
        }
    }

    return filteredChains
}

export interface FallbackResult {
    reply: string
    providerUsed: LLMProviderId
    modelUsed: string
    attemptCount: number
    fallbackUsed: boolean
}

// Extended result with category info
export interface SmartFallbackResult extends FallbackResult {
    category: MessageCategory
    wordCount: number
    maxTokensUsed: number
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

/**
 * 🆕 SMART FALLBACK WITH MESSAGE CATEGORY DETECTION
 * 
 * Pre-selects optimal models based on user message length
 * - Long messages (≥100 words): Vietnamese-optimized models (Qwen 32B, DeepSeek V3)
 * - Short messages (<100 words): Fast models (DeepSeek V3, Qwen 7B)
 * 
 * Falls back WITHIN THE SAME CATEGORY (long→long, short→short)
 * 
 * @param messages - Conversation messages (last one is user's current message)
 * @param userLanguage - User's preferred language ('en' or 'vi')
 * @returns Generated response with category metadata
 */
export async function generateWithSmartFallback(
    messages: LLMMessage[],
    userLanguage: string = 'vi'
): Promise<SmartFallbackResult> {
    const MAX_ATTEMPTS = 3

    // Extract user's latest message for category detection
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || ''

    // Detect category and select optimal models
    const { category, models, wordCount } = selectModelForMessage(latestUserMessage)
    const maxTokens = getRecommendedMaxTokens(category)
    const temperature = getRecommendedTemperature(category)

    console.log(`[Smart Fallback] 📊 Category: ${category.toUpperCase()} | Words: ${wordCount} | MaxTokens: ${maxTokens}`)
    console.log(`[Smart Fallback] 🎯 Model priority: ${models.map(m => m.displayName).join(' → ')}`)

    // Get narrative instruction to inject
    const narrativeInstruction = getNarrativeInstruction(category, userLanguage)

    // Inject narrative instruction into system message (first message)
    const enhancedMessages = [...messages]
    if (enhancedMessages.length > 0 && enhancedMessages[0].role === 'system') {
        enhancedMessages[0] = {
            ...enhancedMessages[0],
            content: enhancedMessages[0].content + '\n\n' + narrativeInstruction
        }
    } else {
        // Prepend system message if not exists
        enhancedMessages.unshift({
            role: 'system',
            content: narrativeInstruction
        })
    }

    // Filter models by available API keys
    const availableModels = models.filter(m => {
        if (m.provider === 'silicon') return hasSiliconKey()
        if (m.provider === 'gemini') return hasGeminiKey()
        if (m.provider === 'moonshot') return hasMoonshotKey()
        if (m.provider === 'openrouter') return hasOpenRouterKey()
        return true
    })

    if (availableModels.length === 0) {
        throw new Error('[Smart Fallback] No models available with valid API keys!')
    }

    // Try each model in priority order (same category)
    const attempts: { model: string; error: string }[] = []

    for (let i = 0; i < Math.min(availableModels.length, MAX_ATTEMPTS); i++) {
        const modelConfig = availableModels[i]

        try {
            console.log(`[Smart Fallback] Attempt ${i + 1}/${MAX_ATTEMPTS}: ${modelConfig.displayName}`)

            const result = await generateWithProviders(enhancedMessages, {
                provider: modelConfig.provider as LLMProviderId,
                model: modelConfig.modelName
            })

            console.log(`[Smart Fallback] ✅ Success with ${modelConfig.displayName} | Response length: ${result.reply.length} chars`)

            return {
                reply: result.reply,
                providerUsed: result.providerUsed,
                modelUsed: result.modelUsed,
                attemptCount: i + 1,
                fallbackUsed: i > 0,
                category,
                wordCount,
                maxTokensUsed: maxTokens
            }

        } catch (error: any) {
            const errorMsg = error?.message || 'Unknown error'
            console.warn(`[Smart Fallback] ❌ ${modelConfig.displayName} failed: ${errorMsg}`)

            attempts.push({
                model: modelConfig.displayName,
                error: errorMsg
            })

            // Continue to next model in SAME category
            console.log(`[Smart Fallback] Trying next model in ${category.toUpperCase()} category...`)
        }
    }

    // All category-specific models failed
    const aggregatedError = new Error(
        `Tất cả ${attempts.length} model ${category} đều thất bại. Vui lòng thử lại sau.`
    ) as any
    aggregatedError.code = 'ALL_CATEGORY_MODELS_FAILED'
    aggregatedError.category = category
    aggregatedError.attempts = attempts
    throw aggregatedError
}

