import { LLMProvider, LLMMessage, LLMConfig } from './types'

export class OpenAICompatibleProvider implements LLMProvider {
    constructor(private config: LLMConfig) { }

    async generateResponse(messages: LLMMessage[], modelOverride?: string): Promise<string> {
        const { baseUrl, apiKey, model } = this.config

        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: modelOverride || model,
                    messages,
                    temperature: 0.8,
                    max_tokens: 500,
                }),
            })

            if (!response.ok) {
                const error = await response.json().catch(() => ({ error: 'Unknown error' }))
                throw new Error(`LLM API error: ${response.status} - ${JSON.stringify(error)}`)
            }

            const data = await response.json()
            return data.choices?.[0]?.message?.content || 'I apologize, but I couldn\'t generate a response.'
        } catch (error) {
            console.error('LLM generation error:', error)
            throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
}
