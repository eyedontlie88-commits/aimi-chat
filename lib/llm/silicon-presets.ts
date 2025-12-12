// lib/llm/silicon-presets.ts
export interface SiliconPresetModel {
    key: string       // internal key
    id: string        // model id thật
    label: string     // label hiển thị cho user
    recommended: boolean // có phải model đề xuất không
}

/**
 * Danh sách SiliconFlow models đã được lọc và đánh giá
 * - Nhóm ĐỀ XUẤT: trả lời tốt, tâm lý, nhớ ngữ cảnh, tiếng Việt ổn
 * - Nhóm KHÁC: dùng được nhưng không ổn định bằng
 * 
 * Đã loại bỏ: Z-Image-Turbo, Yi-1.5-9B, DeepSeek-R1-Distill series, Llama 3.1
 * (vì: đa ngôn ngữ, lộ thinking, tiếng Việt yếu)
 */
export function getSiliconPresets(): SiliconPresetModel[] {
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
