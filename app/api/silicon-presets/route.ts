import { NextResponse } from 'next/server'
import { getSiliconPresets } from '@/lib/llm/silicon-presets'

export async function GET() {
    try {
        const presets = getSiliconPresets()
        return NextResponse.json({ presets })
    } catch (error) {
        console.error('[API] Error getting silicon presets:', error)
        return NextResponse.json({ presets: [] })
    }
}
