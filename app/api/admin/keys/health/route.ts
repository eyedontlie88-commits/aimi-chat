import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/admin-check'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/keys/health
 * Returns provider availability and config (dev/admin only)
 */
export async function GET(request: NextRequest) {
    // Auth check
    const authError = await requireAdmin(request)
    if (authError) return authError

    // Check provider availability (reuse logic from router)
    const providers = {
        gemini: { available: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY) },
        silicon: { available: !!process.env.SILICON_API_KEY },
        zhipu: { available: !!process.env.ZHIPU_API_KEY },
        moonshot: { available: !!process.env.MOONSHOT_API_KEY },
        openrouter: { available: !!process.env.OPENROUTER_API_KEY },
        deepseek: { available: !!process.env.DEEPSEEK_API_KEY },
    }

    // Read config from env
    const config = {
        defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'silicon',
        fallbackEnabled: process.env.LLM_ENABLE_FALLBACK === 'true',
        maxAttempts: 2, // hardcoded from fallback.ts
    }

    return NextResponse.json({ providers, config })
}
