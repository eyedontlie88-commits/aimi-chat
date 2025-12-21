export type LLMProviderId = 'silicon' | 'gemini' | 'zhipu' | 'default'

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant'
    content: string
}

export interface LLMProviderClient {
    generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string>
}

export interface GenerateOptions {
    provider?: LLMProviderId
    model?: string
}

export interface LLMConfig {
    baseUrl: string
    apiKey: string
    defaultModel?: string
}

export interface SceneState {
    type: 'phone_check' | 'anniversary' | 'date' | 'fight' | 'other'
    description: string
    metadata?: Record<string, any>
}
