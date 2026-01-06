/**
 * LLM Provider Status Diagnostic Endpoint
 * Shows which providers are configured (without exposing keys)
 * 
 * SECURITY: Requires admin authentication
 * - DEV_ADMIN_SECRET header OR
 * - APP_ENV=dev/development
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
    // Security check: only allow in dev environment OR with admin secret
    const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'production'
    const isDev = appEnv === 'dev' || appEnv === 'development'
    const adminSecret = req.headers.get('x-admin-secret')
    const expectedSecret = process.env.DEV_ADMIN_SECRET

    // Check authentication
    const isAuthenticated = isDev || (expectedSecret && adminSecret === expectedSecret)

    if (!isAuthenticated) {
        // Return 404 in production to avoid exposing endpoint existence
        return new NextResponse('Not Found', { status: 404 })
    }
    // Check which providers have API keys configured
    const providers = {
        gemini: {
            configured: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
            keyName: 'GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY'
        },
        silicon: {
            configured: !!process.env.SILICON_API_KEY,
            keyName: 'SILICON_API_KEY'
        },
        deepseek: {
            configured: !!process.env.DEEPSEEK_API_KEY,
            keyName: 'DEEPSEEK_API_KEY'
        },
        moonshot: {
            configured: !!process.env.MOONSHOT_API_KEY,
            keyName: 'MOONSHOT_API_KEY'
        },
        zhipu: {
            configured: !!process.env.ZHIPU_API_KEY,
            keyName: 'ZHIPU_API_KEY'
        },
        openrouter: {
            configured: !!process.env.OPENROUTER_API_KEY,
            keyName: 'OPENROUTER_API_KEY'
        }
    }

    // Check LLM configuration
    const config = {
        defaultProvider: process.env.LLM_DEFAULT_PROVIDER || 'not set',
        fallbackEnabled: process.env.LLM_ENABLE_FALLBACK === 'true',
        fallbackProviders: process.env.LLM_FALLBACK_PROVIDERS || 'not set'
    }

    // Count configured providers
    const configuredCount = Object.values(providers).filter(p => p.configured).length
    const totalCount = Object.keys(providers).length

    return NextResponse.json({
        summary: {
            total: totalCount,
            configured: configuredCount,
            missing: totalCount - configuredCount,
            status: configuredCount > 0 ? 'operational' : 'no_providers'
        },
        providers,
        config,
        timestamp: new Date().toISOString()
    })
}
