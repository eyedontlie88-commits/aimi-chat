import { NextResponse } from 'next/server'
import { getZhipuPresets } from '@/lib/llm/zhipu-presets'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const presets = getZhipuPresets()
        return NextResponse.json({ presets })
    } catch (error) {
        console.error('[Zhipu Presets API] Error:', error)
        return NextResponse.json({ presets: [] })
    }
}
