import { NextResponse } from 'next/server'
import { getGooglePresets } from '@/lib/llm/google-presets'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const presets = getGooglePresets()
        return NextResponse.json({ presets })
    } catch (error) {
        console.error('[Google Presets API] Error:', error)
        return NextResponse.json({ presets: [] })
    }
}
