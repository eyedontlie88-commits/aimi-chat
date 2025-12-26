import { NextResponse } from 'next/server'
import { getOpenRouterPresets } from '@/lib/llm/openrouter-presets'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const presets = getOpenRouterPresets()
        return NextResponse.json({ presets })
    } catch (error) {
        console.error('[OpenRouter Presets API] Error:', error)
        return NextResponse.json({ presets: [] })
    }
}
