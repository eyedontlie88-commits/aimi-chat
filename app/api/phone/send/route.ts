import { NextRequest, NextResponse } from 'next/server'
import { generateWithProviders } from '@/lib/llm/router'

// 🚑 SAFETY VERSION: Fail-Open (Allow message if AI crashes)

interface SendRequest {
    characterName: string
    characterDescription?: string
    recipientName: string
    userMessage: string
    relationshipContext?: {
        intimacyLevel?: number
        status?: string
        affectionPoints?: number
    }
    userLanguage?: 'en' | 'vi'
}

export async function POST(req: NextRequest) {
    try {
        const body: SendRequest = await req.json()
        const {
            characterName,
            characterDescription,
            recipientName,
            userMessage,
            relationshipContext,
            userLanguage = 'vi'
        } = body

        if (!characterName || !recipientName || !userMessage) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
        }

        // Setup defaults
        const intimacyLevel = relationshipContext?.intimacyLevel ?? 2
        const status = relationshipContext?.status ?? 'NEUTRAL'
        const isEnglish = userLanguage === 'en'

        console.log(`[Phone Send] 🎭 Check: ${characterName} -> ${recipientName} | Status: ${status}`)

        const systemPrompt = `You are ${characterName}. User is texting [${recipientName}]: "${userMessage}".
Relationship: Intimacy ${intimacyLevel}/4, Status: ${status}.

DECISION:
- ALLOW (true) usually.
- DENY (false) ONLY if Intimacy is 0 OR Status is ARGUING.

RESPONSE JSON:
{"allowed": boolean, "refusalMessage": "string (optional, ${isEnglish ? 'English' : 'Vietnamese'})"}`

        try {
            // 🔥 FIX: generateWithProviders takes (messages[], options) not (object)
            const result = await generateWithProviders(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: "Decide now." }
                ],
                { provider: 'default' }
            )

            // Parse result - generateWithProviders returns { reply, providerUsed, modelUsed }
            if (result.reply) {
                let jsonString = result.reply.trim().replace(/^```json\s?/, '').replace(/```$/, '').trim()
                const decision = JSON.parse(jsonString)

                console.log(`[Phone Send] 🤖 AI Decision: ${decision.allowed}`)

                return NextResponse.json({
                    allowed: decision.allowed,
                    refusalMessage: decision.refusalMessage,
                    source: 'ai'
                })
            }
        } catch (aiError) {
            console.error('[Phone Send] ⚠️ AI CRASHED:', aiError)
            // Đừng return lỗi 500, hãy return ALLOW để user chơi tiếp!
        }

        // 🛡️ FALLBACK: Nếu AI sập, MẶC ĐỊNH CHO PHÉP (để không bị kẹt)
        console.log('[Phone Send] 🛡️ Fallback: ALLOWED (AI Failed)')
        return NextResponse.json({
            allowed: true,
            source: 'fallback_safety'
        })

    } catch (error) {
        console.error('[Phone Send] Critical System Error:', error)
        // Kể cả lỗi hệ thống cũng cho qua luôn cho sếp đi ngủ ngon
        return NextResponse.json({ allowed: true, source: 'critical_fallback' })
    }
}
