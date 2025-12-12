import type { LLMMessage } from '../types'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

export async function callGemini(
    messages: LLMMessage[],
    model?: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY
    const modelId = model || process.env.GEMINI_DEFAULT_MODEL || 'gemini-1.5-flash'

    if (!apiKey) {
        throw new Error('Missing GEMINI_API_KEY')
    }

    if (!messages.length) {
        throw new Error('No messages provided to Gemini')
    }

    // Separate system instruction if present
    let systemInstruction: string | null = null
    const conversation: LLMMessage[] = []

    for (const msg of messages) {
        if (msg.role === 'system' && !systemInstruction) {
            systemInstruction = msg.content
        } else {
            conversation.push(msg)
        }
    }

    const contents = conversation.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
    }))

    // Fallback safety: if contents is empty (should never happen after route.ts fix)
    // provide a dummy user message to prevent 400 error
    if (contents.length === 0) {
        console.warn('[Gemini] Empty contents array detected, adding fallback message')
        contents.push({
            role: 'user',
            parts: [{ text: 'Hãy bắt đầu một cuộc trò chuyện ngọt ngào bằng tiếng Việt với người yêu của bạn.' }],
        })
    }

    const body: any = { contents }
    if (systemInstruction) {
        body.systemInstruction = {
            role: 'system',
            parts: [{ text: systemInstruction }],
        }
    }

    const resp = await fetch(
        `${GEMINI_BASE_URL}/models/${modelId}:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }
    )

    if (!resp.ok) {
        const errorText = await resp.text()
        throw new Error(`Gemini API error: ${resp.status} ${errorText}`)
    }

    const json = await resp.json()
    const text =
        json.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text || '')
            .join(' ') || ''

    return text.trim()
}
