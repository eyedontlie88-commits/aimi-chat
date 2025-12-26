// lib/llm/openrouter-presets.ts

export interface OpenRouterPresetModel {
    key: string
    id: string
    label: string
    recommended: boolean
    category?: string
}

/**
 * OpenRouter FREE models list
 * 
 * ⚠️ CLEANUP 2025-12-26: 19 models removed after production testing
 * - 3 models exposed JSON in responses
 * - 16 models non-functional (404/errors)
 * 
 * Only 1 working model remains: gpt-oss-120b
 */
export const openrouterPresets: OpenRouterPresetModel[] = [
    // ===== OpenAI OSS (only working model) =====
    {
        key: 'gpt-oss-120b',
        id: 'openai/gpt-oss-120b',
        label: '🟢 OpenAI GPT OSS 120B',
        recommended: true
    }
]

export function getOpenRouterPresets(): OpenRouterPresetModel[] {
    if (!process.env.OPENROUTER_API_KEY) {
        console.log('[OpenRouterPresets] No API key configured')
        return []
    }

    console.log(`[OpenRouterPresets] Loaded ${openrouterPresets.length} free models`)
    return openrouterPresets
}
