// lib/llm/moonshot-presets.ts

export interface MoonshotPresetModel {
    key: string
    id: string
    label: string
    recommended: boolean
}

/**
 * Get Moonshot provider models
 * All models tested and verified working with MOONSHOT_API_KEY
 * 
 * Supported models:
 * - moonshot-v1-32k (32K context)
 * - moonshot-v1-128k (128K context)
 * - kimi-latest (131K + vision)
 * - kimi-k2-turbo-preview (262K fast reasoning)
 */
export function getMoonshotPresets(): MoonshotPresetModel[] {
    if (!process.env.MOONSHOT_API_KEY) {
        console.log('[MoonshotPresets] No API key configured')
        return []
    }

    const models: MoonshotPresetModel[] = [
        {
            key: 'moonshot-v1-32k',
            id: 'moonshot-v1-32k',
            label: '🌙 Moonshot 32K',
            recommended: false
        },
        {
            key: 'moonshot-v1-128k',
            id: 'moonshot-v1-128k',
            label: '🌙 Moonshot 128K (Large Context)',
            recommended: true // Recommended for long conversations
        },
        {
            key: 'kimi-latest',
            id: 'kimi-latest',
            label: '✨ Kimi Latest (Vision + 131K)',
            recommended: false
        },
        {
            key: 'kimi-k2-turbo-preview',
            id: 'kimi-k2-turbo-preview',
            label: '⚡ Kimi K2 Turbo (Fast Reasoning)',
            recommended: false
        }
    ]

    console.log(`[MoonshotPresets] Loaded ${models.length} models`)
    return models
}
