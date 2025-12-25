// lib/llm/google-presets.ts
export interface GooglePresetModel {
    key: string       // internal key
    id: string        // model id thật
    label: string     // label hiển thị cho user
    recommended: boolean // có phải model đề xuất không
}

// Recommended Google model IDs for starring
const RECOMMENDED_MODELS = [
    'gemini-3-flash-preview',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
]

/**
 * Danh sách Google Gemini models
 * 
 * Priority:
 * 1. Đọc từ env: GOOGLE_MODEL_1 đến GOOGLE_MODEL_20
 * 2. Nếu không có env, dùng danh sách hardcoded mặc định
 */
export function getGooglePresets(): GooglePresetModel[] {
    // Try to read from env variables first (GOOGLE_MODEL_1 to GOOGLE_MODEL_20)
    const envModels: GooglePresetModel[] = []

    for (let i = 1; i <= 20; i++) {
        const modelId = process.env[`GOOGLE_MODEL_${i}`]
        if (modelId) {
            // Generate friendly label from model ID
            const label = formatModelLabel(modelId)
            const isRecommended = RECOMMENDED_MODELS.includes(modelId)

            envModels.push({
                key: `google-model-${i}`,
                id: modelId,
                label: isRecommended ? `⭐ ${label}` : label,
                recommended: isRecommended,
            })
        }
    }

    // If we found env models, use them
    if (envModels.length > 0) {
        console.log(`[GooglePresets] Loaded ${envModels.length} models from env`)
        return envModels
    }

    // Fallback to hardcoded defaults - User's actual Google AI Studio models
    console.log('[GooglePresets] Using hardcoded defaults (4 verified models)')
    return [
        {
            key: 'gemini-3-flash-preview',
            id: 'gemini-3-flash-preview',
            label: '⭐ Gemini 3 Flash Preview',
            recommended: true,
        },
        {
            key: 'gemini-2.5-flash',
            id: 'gemini-2.5-flash',
            label: '⭐ Gemini 2.5 Flash',
            recommended: true,
        },
        {
            key: 'gemini-2.5-flash-lite',
            id: 'gemini-2.5-flash-lite',
            label: '⭐ Gemini 2.5 Flash Lite',
            recommended: true,
        },
        {
            key: 'gemini-2.5-flash-preview-0925',
            id: 'gemini-2.5-flash-preview-0925',
            label: 'Gemini 2.5 Flash Preview 09 2025',
            recommended: false,
        },
    ]
}

/**
 * Format model ID into human-readable label
 * e.g., "gemini-2.5-flash-preview" → "Gemini 2.5 Flash Preview"
 */
function formatModelLabel(modelId: string): string {
    return modelId
        .split('-')
        .map(part => {
            // Keep version numbers as-is
            if (/^\d/.test(part)) return part
            // Capitalize first letter
            return part.charAt(0).toUpperCase() + part.slice(1)
        })
        .join(' ')
}
