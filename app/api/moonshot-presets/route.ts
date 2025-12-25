import { NextResponse } from 'next/server'
import { getMoonshotPresets } from '@/lib/llm/moonshot-presets'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const presets = getMoonshotPresets()
        return NextResponse.json({ presets })
    } catch (error) {
        console.error('[Moonshot Presets API] Error:', error)
        return NextResponse.json({ presets: [] })
    }
}
