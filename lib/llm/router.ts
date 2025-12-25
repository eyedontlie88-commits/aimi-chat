import { LLMMessage, LLMProviderId, GenerateOptions } from './types'
import { siliconProvider } from './providers/silicon'
import { geminiProvider } from './providers/gemini-provider'
import { zhipuProvider } from './providers/zhipu'
import { moonshotProvider } from './providers/moonshot'
import { deepseekProvider } from './providers/deepseek'

// Valid provider IDs
const VALID_PROVIDERS: LLMProviderId[] = ['silicon', 'gemini', 'zhipu', 'moonshot']

/**
 * Check if error is retriable (quota/rate limit/overloaded)
 */
function isRetriableLLMError(error: any): boolean {
    // Check HTTP status
    const status = error?.response?.status || error?.status || error?.code
    if (status === 429 || status === 503) return true

    // Check error message for common patterns
    const msg = String(error?.message || '').toLowerCase()
    if (msg.includes('quota') || msg.includes('rate limit')) return true
    if (msg.includes('overload') || msg.includes('unavailable')) return true
    if (msg.includes('network') || msg.includes('fetch failed')) return true
    if (msg.includes('503') || msg.includes('429')) return true

    return false
}

/**
 * Filter only valid providers from a list
 */
function filterValidProviders(providers: string[]): LLMProviderId[] {
    return providers.filter(p => VALID_PROVIDERS.includes(p as LLMProviderId)) as LLMProviderId[]
}

/**
 * 🔑 CHECK IF PROVIDER HAS API KEY
 * CRITICAL: Never add a provider to the candidate list if it has no key!
 */
function hasProviderKey(provider: string): boolean {
    if (provider === 'gemini' || provider === 'google') {
        // Support both GEMINI_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY
        return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    }
    if (provider === 'silicon' || provider === 'siliconflow') {
        return !!process.env.SILICON_API_KEY
    }
    if (provider === 'zhipu' || provider === 'bigmodel') {
        return !!process.env.ZHIPU_API_KEY
    }
    if (provider === 'moonshot') {
        return !!process.env.MOONSHOT_API_KEY
    }
    // Unknown providers - assume they have keys (might fail later with clear error)
    return true
}

export async function generateWithProviders(
    messages: LLMMessage[],
    options: GenerateOptions
): Promise<{ reply: string; providerUsed: LLMProviderId; modelUsed: string }> {
    const { provider = 'default', model } = options

    // 1. Determine candidate providers
    const candidates = getCandidateProviders(provider)
    if (candidates.length === 0) {
        throw new Error('No LLM providers configured')
    }

    // 2. Track all tried providers for error reporting
    const tried: { provider: LLMProviderId; model: string; error: any }[] = []

    // 3. Try each candidate
    for (const candidateId of candidates) {
        try {
            console.log(`[LLM Router] Trying provider: ${candidateId} (preferred: ${provider})`)

            const reply = await callProvider(candidateId, messages, model)

            console.log(`[LLM Router] Success with ${candidateId}`)
            return {
                reply,
                providerUsed: candidateId,
                modelUsed: model || 'default-for-provider',
            }
        } catch (error: any) {
            const isDev = process.env.NODE_ENV === 'development'

            // Log detailed error for dev
            if (isDev) {
                console.error(
                    `[LLM Router] Provider ${candidateId} failed with model ${model || 'default'}:`,
                    {
                        model: model,
                        provider: candidateId,
                        error: error?.response?.data || error?.message || error,
                        status: error?.response?.status || error?.status
                    }
                )
            } else {
                // Production: simple log
                console.error(`[LLM Router] Provider ${candidateId} failed`)
            }

            tried.push({ provider: candidateId, model: model || 'default', error })

            // Check if fallback is enabled
            if (process.env.LLM_ENABLE_FALLBACK !== 'true') {
                // In dev mode, throw detailed error
                if (isDev) {
                    const detailError = new Error(
                        `Provider ${candidateId} failed with model "${model || 'default'}": ${error?.message || 'Unknown error'}`
                    ) as any
                    detailError.provider = candidateId
                    detailError.model = model
                    detailError.originalError = error
                    throw detailError
                }
                // In production, throw simple error
                throw error
            }

            // Check if error is retriable (429/503/network)
            if (!isRetriableLLMError(error)) {
                console.log(`[LLM Router] Error is not retriable (not 429/503), throwing error`)
                throw error
            }

            // Error is retriable, continue to next provider
            console.log(`[LLM Router] Error is retriable, trying next provider...`)
            continue
        }
    }

    // 4. All providers failed - throw detailed error
    const isDev = process.env.NODE_ENV === 'development'
    const lastError = tried[tried.length - 1]?.error

    if (isDev) {
        // Dev mode: show all attempted providers + models
        console.error('[LLM Router] All providers failed:', tried.map(t => ({
            provider: t.provider,
            model: t.model,
            error: t.error?.message
        })))

        const detailError = new Error(
            `All LLM providers failed. Tried: ${tried.map(t => `${t.provider}/${t.model}`).join(', ')}`
        ) as any
        detailError.code = 'LLM_ALL_PROVIDERS_FAILED'
        detailError.providersTried = tried
        throw detailError
    } else {
        // Production mode: simple user-friendly error
        console.error('[LLM Router] All providers failed')
        const simpleError = new Error(
            'AI service temporarily unavailable. Please try again.'
        ) as any
        simpleError.code = 'LLM_ALL_PROVIDERS_FAILED'
        throw simpleError
    }
}

function getCandidateProviders(preferred: LLMProviderId | 'default'): LLMProviderId[] {
    const candidates: LLMProviderId[] = []

    // 1. Preferred
    if (preferred !== 'default') {
        // Only add if it's a valid provider
        if (VALID_PROVIDERS.includes(preferred)) {
            candidates.push(preferred)
        } else {
            console.warn(`[LLM Router] Invalid provider ${preferred}, falling back to default`)
        }
    }

    // If no valid preferred, use default
    if (candidates.length === 0) {
        const envDefault = process.env.LLM_DEFAULT_PROVIDER as string

        // Smart default: only use providers that have API keys configured
        let defaultProvider: LLMProviderId

        // Check if env default is valid AND has a key
        if (VALID_PROVIDERS.includes(envDefault as LLMProviderId) && hasProviderKey(envDefault)) {
            defaultProvider = envDefault as LLMProviderId
        } else if (process.env.SILICON_API_KEY) {
            // Prefer Silicon if key is available (most reliable)
            defaultProvider = 'silicon'
        } else if (process.env.GEMINI_API_KEY) {
            // Fall back to Gemini if key is available
            defaultProvider = 'gemini'
        } else {
            // No keys configured - will fail gracefully with clear error
            console.error('[LLM Router] ⚠️ No API keys configured! Set SILICON_API_KEY or GEMINI_API_KEY in .env')
            defaultProvider = 'silicon' // Will fail with clear "missing key" message
        }

        console.log(`[LLM Router] Selected default provider: ${defaultProvider} (env: ${process.env.LLM_DEFAULT_PROVIDER || 'not set'})`)
        candidates.push(defaultProvider)
    }

    // 2. Fallbacks (only if enabled, and filter only valid ones)
    if (process.env.LLM_ENABLE_FALLBACK === 'true') {
        const fallbackRaw = (process.env.LLM_FALLBACK_PROVIDERS || '')
            .split(',')
            .map(p => p.trim())
            .filter(p => p && p !== candidates[0])

        // 🔑 CRITICAL: Filter out providers WITHOUT keys!
        const fallbackList = filterValidProviders(fallbackRaw).filter(p => hasProviderKey(p))
        candidates.push(...fallbackList)
        console.log(`[LLM Router] Fallback providers (key-filtered): ${fallbackList.join(', ') || 'none'}`)
    }

    return Array.from(new Set(candidates)) // Unique
}

async function callProvider(
    id: LLMProviderId,
    messages: LLMMessage[],
    model?: string
): Promise<string> {
    // Direct provider routing
    switch (id) {
        case 'silicon':
            return siliconProvider.generateResponse(messages, { model })
        case 'gemini':
            return geminiProvider.generateResponse(messages, { model })
        case 'zhipu':
            return zhipuProvider.generateResponse(messages, { model })
        case 'moonshot':
            return moonshotProvider.generateResponse(messages, { model })
        default:
            throw new Error(`Unknown provider: ${id}`)
    }
}
