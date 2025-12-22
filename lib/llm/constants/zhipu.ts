/**
 * 🇨🇳 ZHIPU AI (BIGMODEL) - MODEL CONSTANTS
 * Simplified: Only glm-4.5-flash (Free & Smart)
 */

// --- 🧠 SINGLE MODEL (Best Free Option) ---
export const ZHIPU_MODEL_FLASH = 'glm-4.5-flash'

// --- 📋 MODEL CATALOG (Simplified) ---
export const ZHIPU_MODELS = {
    FLASH_4_5: 'glm-4.5-flash',
} as const

// Default model
export const ZHIPU_DEFAULT = 'glm-4.5-flash'

// Type for model selection
export type ZhipuModelId = typeof ZHIPU_MODELS[keyof typeof ZHIPU_MODELS]
