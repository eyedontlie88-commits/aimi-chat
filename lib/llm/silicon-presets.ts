// lib/llm/silicon-presets.ts
export interface SiliconPresetModel {
    key: string       // internal key
    id: string        // model id thật
    label: string     // label hiển thị cho user
    recommended: boolean // có phải model đề xuất không
}

// Recommended model IDs for starring
const RECOMMENDED_MODELS = [
    'deepseek-ai/DeepSeek-V3',
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-14B-Instruct',
    'Qwen/Qwen2.5-32B-Instruct',
    'MiniMaxAI/MiniMax-M2',
]

/**
 * Danh sách SiliconFlow models
 * 
 * Priority:
 * 1. Đọc từ env: SILICON_MODEL_1 đến SILICON_MODEL_20
 * 2. Nếu không có env, dùng danh sách hardcoded mặc định
 */
export function getSiliconPresets(): SiliconPresetModel[] {
    // Try to read from env variables first (SILICON_MODEL_1 to SILICON_MODEL_20)
    const envModels: SiliconPresetModel[] = []

    for (let i = 1; i <= 20; i++) {
        const modelId = process.env[`SILICON_MODEL_${i}`]
        if (modelId) {
            // Extract short name from model ID for label
            const parts = modelId.split('/')
            const shortName = parts.length > 1 ? parts[1] : modelId
            const isRecommended = RECOMMENDED_MODELS.includes(modelId)

            envModels.push({
                key: `silicon-model-${i}`,
                id: modelId,
                label: isRecommended ? `⭐ ${shortName}` : shortName,
                recommended: isRecommended,
            })
        }
    }

    // If we found env models, use them
    if (envModels.length > 0) {
        console.log(`[SiliconPresets] Loaded ${envModels.length} models from env`)
        return envModels
    }

    // Fallback to hardcoded defaults
    console.log('[SiliconPresets] Using hardcoded defaults')
    return [
        // ⭐ NHÓM ĐỀ XUẤT (recommended = true)
        {
            key: 'deepseek-v3',
            id: 'deepseek-ai/DeepSeek-V3',
            label: '⭐ Đề xuất – DeepSeek V3',
            recommended: true,
        },
        {
            key: 'qwen-7b',
            id: 'Qwen/Qwen2.5-7B-Instruct',
            label: '⭐ Đề xuất – Qwen 2.5 7B Instruct',
            recommended: true,
        },
        {
            key: 'qwen-14b',
            id: 'Qwen/Qwen2.5-14B-Instruct',
            label: '⭐ Đề xuất – Qwen 2.5 14B Instruct',
            recommended: true,
        },
        {
            key: 'qwen-32b',
            id: 'Qwen/Qwen2.5-32B-Instruct',
            label: '⭐ Đề xuất – Qwen 2.5 32B Instruct',
            recommended: true,
        },
        {
            key: 'minimax-m2',
            id: 'MiniMaxAI/MiniMax-M2',
            label: '⭐ Đề xuất – MiniMax M2',
            recommended: true,
        },

        // ── CÁC MODEL KHÁC (recommended = false)
        {
            key: 'deepseek-r1',
            id: 'deepseek-ai/DeepSeek-R1',
            label: 'DeepSeek R1 (deepseek-ai/DeepSeek-R1)',
            recommended: false,
        },
        {
            key: 'glm-4-9b',
            id: 'THUDM/glm-4-9b-chat',
            label: 'GLM-4 9B Chat (THUDM/glm-4-9b-chat)',
            recommended: false,
        },
    ]
}
