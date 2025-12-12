import { LLMProviderClient, LLMMessage } from '../types'
import { callGemini } from './gemini'

export const geminiProvider: LLMProviderClient = {
    async generateResponse(messages: LLMMessage[], options: { model?: string }): Promise<string> {
        return callGemini(messages, options.model)
    },
}
