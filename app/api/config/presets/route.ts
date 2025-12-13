import { NextResponse } from 'next/server'
import { getSiliconPresets } from '@/lib/llm/silicon-presets'

export async function GET() {
    const presets = getSiliconPresets()
    return NextResponse.json({ presets })
}
