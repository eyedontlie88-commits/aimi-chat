import { NextResponse } from 'next/server'
import { zhipuProvider } from '@/lib/llm/providers/zhipu'

/**
 * 🧪 TEST ENDPOINT: Zhipu AI (BigModel)
 * GET /api/test/zhipu
 * 
 * Tests connection to Zhipu API with glm-4-flash model
 */
export async function GET() {
    console.log('[Zhipu Test] Starting connection test...')

    try {
        // Check if API key is configured
        if (!process.env.ZHIPU_API_KEY) {
            return NextResponse.json({
                success: false,
                error: 'ZHIPU_API_KEY not configured in .env',
                hint: 'Add ZHIPU_API_KEY=your-api-key to your .env file'
            }, { status: 500 })
        }

        console.log('[Zhipu Test] API key found, calling model...')

        // Test call with simple prompt
        const reply = await zhipuProvider.generateResponse(
            [
                { role: 'system', content: 'You are a helpful assistant. Respond briefly.' },
                { role: 'user', content: 'Hello, who are you? Reply in 1-2 sentences.' }
            ],
            { model: 'glm-4-flash' }
        )

        console.log('[Zhipu Test] ✅ Success!')

        return NextResponse.json({
            success: true,
            reply: reply,
            model: 'glm-4-flash',
            provider: 'zhipu',
            timestamp: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('[Zhipu Test] ❌ Error:', error)

        return NextResponse.json({
            success: false,
            error: error?.message || 'Unknown error',
            details: error?.response?.data || null
        }, { status: 500 })
    }
}
