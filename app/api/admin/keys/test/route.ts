import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-check'
import { siliconProvider } from '@/lib/llm/providers/silicon'
import { geminiProvider } from '@/lib/llm/providers/gemini-provider'
import { zhipuProvider } from '@/lib/llm/providers/zhipu'
import { moonshotProvider } from '@/lib/llm/providers/moonshot'
import { openrouterProvider } from '@/lib/llm/providers/openrouter'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/keys/test
 * Test a provider with minimal prompt (dev/admin only)
 */
export async function POST(request: NextRequest) {
    // Auth check
    const authError = await requireAdmin(request)
    if (authError) return authError

    try {
        const body = await request.json()
        const { provider, model } = body

        if (!provider) {
            return NextResponse.json({ error: 'Provider required' }, { status: 400 })
        }

        // Minimal test message
        const testMessages = [{ role: 'user' as const, content: 'ping' }]
        const startTime = Date.now()

        // 5-second timeout
        const TIMEOUT_MS = 5000

        let result: any
        let providerInstance: any

        // Select provider
        switch (provider) {
            case 'gemini':
                providerInstance = geminiProvider
                break
            case 'silicon':
                providerInstance = siliconProvider
                break
            case 'zhipu':
                providerInstance = zhipuProvider
                break
            case 'moonshot':
                providerInstance = moonshotProvider
                break
            case 'openrouter':
                providerInstance = openrouterProvider
                break
            default:
                return NextResponse.json({ error: 'Invalid provider' }, { status: 400 })
        }

        try {
            // Test with timeout
            result = await Promise.race([
                providerInstance.generateResponse(testMessages, { model }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), TIMEOUT_MS)
                )
            ])

            const latencyMs = Date.now() - startTime

            return NextResponse.json({
                status: 'ok',
                provider,
                model: model || 'default',
                latencyMs,
                reply: result.substring(0, 50), // Truncate to 50 chars
            })
        } catch (error: any) {
            const latencyMs = Date.now() - startTime

            // Extract error details
            const httpStatus = error?.response?.status || error?.status
            const errorMessage = error?.message || 'Unknown error'

            // Determine error code
            let errorCode = 'UNKNOWN'
            if (httpStatus === 401 || httpStatus === 403) errorCode = 'AUTH_ERROR'
            if (errorMessage.toLowerCase().includes('api key')) errorCode = 'API_KEY_INVALID'
            if (errorMessage.toLowerCase().includes('timeout')) errorCode = 'TIMEOUT'
            if (httpStatus === 429) errorCode = 'RATE_LIMIT'
            if (httpStatus === 503) errorCode = 'OVERLOADED'

            return NextResponse.json({
                status: 'fail',
                provider,
                model: model || 'default',
                errorCode,
                errorMessage: errorMessage.substring(0, 100), // Truncate
                httpStatus: httpStatus || null,
                latencyMs,
            })
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: 'Invalid request', detail: error.message },
            { status: 400 }
        )
    }
}
