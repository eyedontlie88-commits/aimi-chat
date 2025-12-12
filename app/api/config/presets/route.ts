import { NextResponse } from 'next/server'
import { getSiliconPresetModels } from '@/lib/llm/silicon-presets'

export async function GET() {
    const presets = getSiliconPresetModels()
    return NextResponse.json({ presets })
}
