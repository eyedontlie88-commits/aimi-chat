// lib/llm/zhipu-presets.ts

export interface ZhipuPresetModel {
    key: string
    id: string
    label: string
    provider: 'zhipu' // Zhipu only
    recommended: boolean
}

/**
 * Get Zhipu provider models
 * 
 * Note: Moonshot is now a SEPARATE provider (use /api/moonshot-presets)
 */
export function getZhipuPresets(): ZhipuPresetModel[] {
    const models: ZhipuPresetModel[] = []

    // Only add Zhipu GLM-4 if key is available
    if (process.env.ZHIPU_API_KEY) {
        models.push({
            key: 'glm-4-flash',
            id: 'glm-4-flash',
            label: '⭐ GLM-4 Flash (Zhipu)',
            provider: 'zhipu',
            recommended: true
        })
    }

    console.log(`[ZhipuPresets] Loaded ${models.length} models`)
    return models
}
