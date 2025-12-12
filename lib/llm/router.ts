import { LLMMessage, LLMProviderId, GenerateOptions } from './types'
import { siliconProvider } from './providers/silicon'
import { geminiProvider } from './providers/gemini-provider'

// Valid provider IDs (deepseek and moonshot removed)
const VALID_PROVIDERS: LLMProviderId[] = ['silicon', 'gemini']

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
    const tried: { provider: LLMProviderId; error: any }[] = []

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
            console.error(`[LLM Router] Provider ${candidateId} failed:`, error?.response?.data || error?.message || error)
            tried.push({ provider: candidateId, error })

            // Check if fallback is enabled
            if (process.env.LLM_ENABLE_FALLBACK !== 'true') {
                console.log(`[LLM Router] Fallback disabled, throwing error`)
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
    console.error('[LLM Router] All providers failed')
    const lastError = tried[tried.length - 1]?.error
    const detail = lastError?.response?.data || lastError?.message ||
        'Tất cả nhà cung cấp LLM đều gặp lỗi (quota hoặc server).'

    const aggregatedError = new Error(
        typeof detail === 'string' ? detail : 'LLM providers unavailable or quota exceeded.'
    ) as any
    aggregatedError.code = 'LLM_ALL_PROVIDERS_FAILED'
    aggregatedError.providersTried = tried.map(t => t.provider)
    aggregatedError.lastError = lastError

    throw aggregatedError
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
        const defaultProvider = VALID_PROVIDERS.includes(envDefault as LLMProviderId)
            ? envDefault as LLMProviderId
            : 'gemini' // Default to gemini
        console.log(`[LLM Router] Using default provider from env: ${process.env.LLM_DEFAULT_PROVIDER} → ${defaultProvider}`)
        candidates.push(defaultProvider)
    }

    // 2. Fallbacks (only if enabled, and filter only valid ones)
    if (process.env.LLM_ENABLE_FALLBACK === 'true') {
        const fallbackRaw = (process.env.LLM_FALLBACK_PROVIDERS || '')
            .split(',')
            .map(p => p.trim())
            .filter(p => p && p !== candidates[0])

        const fallbackList = filterValidProviders(fallbackRaw)
        candidates.push(...fallbackList)
        console.log(`[LLM Router] Fallback providers: ${fallbackList.join(', ') || 'none'}`)
    }

    return Array.from(new Set(candidates)) // Unique
}

async function callProvider(
    id: LLMProviderId,
    messages: LLMMessage[],
    model?: string
): Promise<string> {
    switch (id) {
        case 'silicon':
            return siliconProvider.generateResponse(messages, { model })
        case 'gemini':
            return geminiProvider.generateResponse(messages, { model })
        default:
            throw new Error(`Unknown provider: ${id}`)
    }
}
