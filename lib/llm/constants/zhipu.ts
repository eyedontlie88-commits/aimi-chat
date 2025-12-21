/**
 * 🇨🇳 ZHIPU AI (BIGMODEL) - MODEL CONSTANTS
 * Full listing of Free-to-Use models
 * Reference: https://open.bigmodel.cn/
 */

// --- 🚀 TEXT GENERATION (Tốc độ cao) ---
export const ZHIPU_MODEL_SPEED = 'glm-4-flash'
export const ZHIPU_MODEL_STABLE = 'glm-4-flash-250414'

// --- 🧠 DEEP THINKING (Suy luận sâu) ---
export const ZHIPU_MODEL_THINKING = 'glm-4.5-flash'

// --- 👁️ VISION (Đa phương thức - Hình ảnh) ---
export const ZHIPU_MODEL_VISION = 'glm-4v-flash'
export const ZHIPU_MODEL_VISION_LATEST = 'glm-4.6v-flash'

// --- 🎭 CHARACTER (Nhân vật hóa - Cho Dating Sim!) ---
export const ZHIPU_MODEL_CHARACTER = 'charglm-4'
export const ZHIPU_MODEL_EMOTIONAL = 'emohaa'

// --- 📋 FULL MODEL CATALOG ---
export const ZHIPU_MODELS = {
    // Speed tier (Nhanh, Miễn phí)
    SPEED: 'glm-4-flash',
    STABLE: 'glm-4-flash-250414',

    // Thinking tier (Suy luận)
    THINKING: 'glm-4.5-flash',

    // Vision tier (Xử lý ảnh)
    VISION: 'glm-4v-flash',
    VISION_LATEST: 'glm-4.6v-flash',

    // Character tier (Roleplay/Dating Sim)
    CHARACTER: 'charglm-4',        // Personalized Character Interactions
    EMOTIONAL: 'emohaa',           // Therapist-style emotional responses
} as const

// Default model for general use
export const ZHIPU_DEFAULT = ZHIPU_MODELS.SPEED

// Type for model selection
export type ZhipuModelId = typeof ZHIPU_MODELS[keyof typeof ZHIPU_MODELS]

/**
 * Get model by use case
 */
export function getZhipuModelFor(useCase: 'chat' | 'roleplay' | 'thinking' | 'vision'): string {
    switch (useCase) {
        case 'chat':
            return ZHIPU_MODELS.SPEED
        case 'roleplay':
            return ZHIPU_MODELS.CHARACTER
        case 'thinking':
            return ZHIPU_MODELS.THINKING
        case 'vision':
            return ZHIPU_MODELS.VISION_LATEST
        default:
            return ZHIPU_MODELS.SPEED
    }
}
